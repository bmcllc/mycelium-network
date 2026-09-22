//! Plano LIVE: Circuitos Onion Interativos de Baixa Latência.
//!
//! Transporta conexões interativas (TCP, SOCKS5, HTTP, chamadas)
//! através de circuitos onion criptografados com células de 512 bytes fixos.

use crate::crypto::{
    client_kem_handshake, onion_encrypt_layers, onion_peel_layer, onion_peel_layer_backward,
    server_kem_handshake, CellCommand, HopCipher, HopKeys, VeilCell, CELL_SIZE,
    MAX_STREAM_DATA_CHUNK,
};
use crate::config::ExitPolicy;
use crate::exit::ExitForwarder;
use crate::socks5::Socks5Target;
use crate::VeilError;
use mycelium_pqc::KemKeyPair;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU16, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex, RwLock};

/// Magic header padronizado para quadros de controle e células Veil ("VL01").
pub const VEIL_FRAME_MAGIC: [u8; 4] = *b"VL01";

/// Tipos de quadros no protocolo de transporte entre nós Veil.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum FrameType {
    Create = 0x01,
    Created = 0x02,
    Extend = 0x03,
    Extended = 0x04,
    Cell = 0x05,
    Destroy = 0x06,
}

impl TryFrom<u8> for FrameType {
    type Error = VeilError;
    fn try_from(val: u8) -> Result<Self, Self::Error> {
        match val {
            0x01 => Ok(FrameType::Create),
            0x02 => Ok(FrameType::Created),
            0x03 => Ok(FrameType::Extend),
            0x04 => Ok(FrameType::Extended),
            0x05 => Ok(FrameType::Cell),
            0x06 => Ok(FrameType::Destroy),
            other => Err(VeilError::Circuit(format!("Tipo de quadro desconhecido: 0x{other:02x}"))),
        }
    }
}

/// Envia um quadro estruturado pelo socket de rede.
pub async fn write_frame<W: AsyncWriteExt + Unpin>(
    writer: &mut W,
    frame_type: FrameType,
    payload: &[u8],
) -> Result<(), VeilError> {
    let mut header = [0u8; 7];
    header[0..4].copy_from_slice(&VEIL_FRAME_MAGIC);
    header[4] = frame_type as u8;
    header[5..7].copy_from_slice(&(payload.len() as u16).to_be_bytes());
    writer.write_all(&header).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    if !payload.is_empty() {
        writer.write_all(payload).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    }
    writer.flush().await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    Ok(())
}

/// Lê um quadro estruturado do socket de rede.
pub async fn read_frame<R: AsyncReadExt + Unpin>(
    reader: &mut R,
) -> Result<(FrameType, Vec<u8>), VeilError> {
    let mut header = [0u8; 7];
    reader.read_exact(&mut header).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    if &header[0..4] != &VEIL_FRAME_MAGIC {
        return Err(VeilError::Circuit("Magic inválido no quadro Veil".into()));
    }
    let frame_type = FrameType::try_from(header[4])?;
    let payload_len = u16::from_be_bytes([header[5], header[6]]) as usize;
    let mut payload = vec![0u8; payload_len];
    if payload_len > 0 {
        reader.read_exact(&mut payload).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    }
    Ok((frame_type, payload))
}

/// Mensagem interna transportada no payload útil protegido por cifragem onion.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InnerMessage {
    pub command: CellCommand,
    pub stream_id: u16,
    pub data: Vec<u8>,
}

impl InnerMessage {
    pub fn new(command: CellCommand, stream_id: u16, data: Vec<u8>) -> Self {
        Self { command, stream_id, data }
    }

    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(5 + self.data.len());
        buf.push(self.command as u8);
        buf.extend_from_slice(&self.stream_id.to_be_bytes());
        buf.extend_from_slice(&(self.data.len() as u16).to_be_bytes());
        buf.extend_from_slice(&self.data);
        buf
    }

    pub fn decode(bytes: &[u8]) -> Result<Self, VeilError> {
        if bytes.len() < 5 {
            return Err(VeilError::Circuit("Mensagem interna muito curta".into()));
        }
        let command = CellCommand::try_from(bytes[0])
            .map_err(|e| VeilError::Circuit(e))?;
        let stream_id = u16::from_be_bytes([bytes[1], bytes[2]]);
        let data_len = u16::from_be_bytes([bytes[3], bytes[4]]) as usize;
        if bytes.len() < 5 + data_len {
            return Err(VeilError::Circuit("Tamanho de payload incompatível na mensagem interna".into()));
        }
        let data = bytes[5..5 + data_len].to_vec();
        Ok(Self { command, stream_id, data })
    }
}

/// Descritor de um nó participante do circuito.
#[derive(Clone, Debug)]
pub struct CircuitHopNode {
    pub node_id: String,
    pub public_kem_key: Vec<u8>,
    pub endpoint: String,
}

/// Roteador / Nó de Retransmissão do Veil.
/// Pode atuar como Guard, Middle ou Exit dependendo da negociação do circuito.
pub struct VeilHopRouter {
    pub keypair: Arc<KemKeyPair>,
    pub exit_policy: Option<ExitPolicy>,
}

impl VeilHopRouter {
    pub fn new(keypair: KemKeyPair, exit_policy: Option<ExitPolicy>) -> Self {
        Self {
            keypair: Arc::new(keypair),
            exit_policy,
        }
    }

    /// Executa o serviço aceitando conexões no listener fornecido.
    pub async fn run(&self, listener: TcpListener) -> Result<(), VeilError> {
        let keypair = Arc::clone(&self.keypair);
        let exit_policy = self.exit_policy.clone();

        loop {
            let (stream, _peer_addr) = listener
                .accept()
                .await
                .map_err(|e| VeilError::Circuit(format!("Erro no accept do roteador: {e}")))?;

            let kp = Arc::clone(&keypair);
            let ep = exit_policy.clone();

            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(stream, kp, ep).await {
                    tracing::debug!(error = %e, "Conexão no roteador de salto finalizada");
                }
            });
        }
    }

    async fn handle_connection(
        mut stream: TcpStream,
        keypair: Arc<KemKeyPair>,
        exit_policy: Option<ExitPolicy>,
    ) -> Result<(), VeilError> {
        // 1. Handshake inicial com o nó upstream (Frame Create)
        let (ft, payload) = read_frame(&mut stream).await?;
        if ft != FrameType::Create {
            return Err(VeilError::Circuit(format!("Esperado quadro Create, obtido {:?}", ft)));
        }

        if payload.len() < 6 {
            return Err(VeilError::Circuit("Payload Create insuficiente".into()));
        }
        let circuit_id = u32::from_be_bytes([payload[0], payload[1], payload[2], payload[3]]);
        let salt_len = u16::from_be_bytes([payload[4], payload[5]]) as usize;
        if payload.len() < 6 + salt_len + 1568 {
            return Err(VeilError::Circuit("Payload Create truncado".into()));
        }
        let salt = &payload[6..6 + salt_len];
        let ct = &payload[6 + salt_len..6 + salt_len + 1568];

        let hop_keys = server_kem_handshake(&keypair, ct, salt)
            .map_err(|e| VeilError::Crypto(format!("Falha no KEM server: {e}")))?;

        let auth_tag = blake3::keyed_hash(&hop_keys.forward_key, b"veil-hop-auth");
        let mut created_payload = Vec::with_capacity(36);
        created_payload.extend_from_slice(&circuit_id.to_be_bytes());
        created_payload.extend_from_slice(auth_tag.as_bytes());

        write_frame(&mut stream, FrameType::Created, &created_payload).await?;

        // 2. Aguarda próximo comando: Extend (Intermediate) ou Cell (Exit)
        let (ft, payload) = read_frame(&mut stream).await?;
        match ft {
            FrameType::Extend => {
                Self::handle_intermediate_relay(stream, hop_keys, payload).await
            }
            FrameType::Cell => {
                Self::handle_exit_node(stream, hop_keys, exit_policy, payload).await
            }
            _ => Err(VeilError::Circuit("Comando inválido pós-handshake".into())),
        }
    }

    async fn handle_intermediate_relay(
        mut upstream: TcpStream,
        hop_keys: HopKeys,
        extend_payload: Vec<u8>,
    ) -> Result<(), VeilError> {
        if extend_payload.len() < 6 {
            return Err(VeilError::Circuit("Payload Extend truncado".into()));
        }
        let ep_len = u16::from_be_bytes([extend_payload[4], extend_payload[5]]) as usize;
        if extend_payload.len() < 6 + ep_len {
            return Err(VeilError::Circuit("Payload Extend inválido para endpoint".into()));
        }
        let endpoint = String::from_utf8_lossy(&extend_payload[6..6 + ep_len]).to_string();
        let nested_create = &extend_payload[6 + ep_len..];

        let mut downstream = TcpStream::connect(&endpoint)
            .await
            .map_err(|e| VeilError::Circuit(format!("Falha ao estender para {endpoint}: {e}")))?;

        write_frame(&mut downstream, FrameType::Create, nested_create).await?;

        let (ft, created_resp) = read_frame(&mut downstream).await?;
        if ft != FrameType::Created {
            return Err(VeilError::Circuit("Resposta inválida do próximo salto (esperado Created)".into()));
        }

        write_frame(&mut upstream, FrameType::Extended, &created_resp).await?;

        let (mut up_r, mut up_w) = upstream.into_split();
        let (mut down_r, mut down_w) = downstream.into_split();

        let hop_keys_fwd = hop_keys.clone();

        // Upstream -> Downstream: Descasca 1 camada forward
        let forward_relay = async move {
            loop {
                let (ft, frame_data) = read_frame(&mut up_r).await?;
                match ft {
                    FrameType::Extend => {
                        write_frame(&mut down_w, FrameType::Extend, &frame_data).await?;
                    }
                    FrameType::Cell => {
                        if frame_data.len() != CELL_SIZE {
                            return Err(VeilError::Circuit("Célula recebida com tamanho divergente de 512 bytes".into()));
                        }
                        let mut cell_bytes = [0u8; CELL_SIZE];
                        cell_bytes.copy_from_slice(&frame_data);
                        let cell = VeilCell::from_bytes(&cell_bytes)
                            .map_err(|e| VeilError::Circuit(e))?;

                        let peeled = onion_peel_layer(cell.data(), &hop_keys_fwd)
                            .map_err(|e| VeilError::Crypto(e.to_string()))?;

                        let peeled_cell = VeilCell::new(cell.circuit_id, CellCommand::RelayData, cell.stream_id, &peeled);
                        write_frame(&mut down_w, FrameType::Cell, &peeled_cell.to_bytes()).await?;
                    }
                    FrameType::Destroy => {
                        let _ = write_frame(&mut down_w, FrameType::Destroy, &frame_data).await;
                        break;
                    }
                    _ => {}
                }
            }
            Ok::<(), VeilError>(())
        };

        let hop_keys_bwd = hop_keys;

        // Downstream -> Upstream: Cifra 1 camada backward
        let backward_relay = async move {
            loop {
                let (ft, frame_data) = read_frame(&mut down_r).await?;
                match ft {
                    FrameType::Extended => {
                        write_frame(&mut up_w, FrameType::Extended, &frame_data).await?;
                    }
                    FrameType::Cell => {
                        if frame_data.len() != CELL_SIZE {
                            return Err(VeilError::Circuit("Célula backward com tamanho divergente de 512 bytes".into()));
                        }
                        let mut cell_bytes = [0u8; CELL_SIZE];
                        cell_bytes.copy_from_slice(&frame_data);
                        let cell = VeilCell::from_bytes(&cell_bytes)
                            .map_err(|e| VeilError::Circuit(e))?;

                        let mut cipher = HopCipher::new(&hop_keys_bwd.backward_key);
                        let enc = cipher.encrypt(cell.data())
                            .map_err(|e| VeilError::Crypto(e.to_string()))?;

                        let enc_cell = VeilCell::new(cell.circuit_id, CellCommand::RelayData, cell.stream_id, &enc);
                        write_frame(&mut up_w, FrameType::Cell, &enc_cell.to_bytes()).await?;
                    }
                    FrameType::Destroy => {
                        let _ = write_frame(&mut up_w, FrameType::Destroy, &frame_data).await;
                        break;
                    }
                    _ => {}
                }
            }
            Ok::<(), VeilError>(())
        };

        tokio::select! {
            res = forward_relay => res,
            res = backward_relay => res,
        }
    }

    async fn handle_exit_node(
        upstream: TcpStream,
        hop_keys: HopKeys,
        exit_policy: Option<ExitPolicy>,
        first_cell_bytes: Vec<u8>,
    ) -> Result<(), VeilError> {
        let policy = exit_policy.ok_or_else(|| VeilError::Exit("Este nó não tem permissão para atuar como nó de saída".into()))?;
        let forwarder = Arc::new(ExitForwarder::new(policy));

        let (mut up_r, up_w) = upstream.into_split();
        let up_w = Arc::new(Mutex::new(up_w));

        let streams: Arc<RwLock<HashMap<u16, mpsc::Sender<Vec<u8>>>>> = Arc::new(RwLock::new(HashMap::new()));
        let hop_keys_arc = Arc::new(hop_keys);

        let process_cell = |cell_data: Vec<u8>,
                            hk: Arc<HopKeys>,
                            fwd: Arc<ExitForwarder>,
                            strms: Arc<RwLock<HashMap<u16, mpsc::Sender<Vec<u8>>>>>,
                            w: Arc<Mutex<OwnedWriteHalf>>| {
            tokio::spawn(async move {
                if cell_data.len() != CELL_SIZE {
                    return;
                }
                let mut cb = [0u8; CELL_SIZE];
                cb.copy_from_slice(&cell_data);
                let Ok(cell) = VeilCell::from_bytes(&cb) else { return; };

                let Ok(peeled) = onion_peel_layer(cell.data(), &hk) else { return; };
                let Ok(msg) = InnerMessage::decode(&peeled) else { return; };

                match msg.command {
                    CellCommand::StreamBegin => {
                        let Ok(target) = Socks5Target::decode(&msg.data) else {
                            let _ = Self::send_exit_cell(&w, &hk, cell.circuit_id, CellCommand::StreamRefused, msg.stream_id, b"target invalido").await;
                            return;
                        };

                        // Executa conexão de saída no Exit com resolução DNS remota e anti-SSRF
                        match fwd.connect_to_target(&target).await {
                            Ok(target_stream) => {
                                let _ = Self::send_exit_cell(&w, &hk, cell.circuit_id, CellCommand::StreamConnected, msg.stream_id, &[]).await;

                                let (mut t_r, mut t_w) = target_stream.into_split();
                                let (tx, mut rx) = mpsc::channel::<Vec<u8>>(64);
                                {
                                    let mut map = strms.write().await;
                                    map.insert(msg.stream_id, tx);
                                }

                                let w_clone = Arc::clone(&w);
                                let hk_clone = Arc::clone(&hk);
                                let strms_clone = Arc::clone(&strms);
                                let stream_id = msg.stream_id;
                                let circuit_id = cell.circuit_id;

                                // Lê do target remoto e envia StreamData cells backward
                                tokio::spawn(async move {
                                    let mut buf = [0u8; MAX_STREAM_DATA_CHUNK];
                                    loop {
                                        match t_r.read(&mut buf).await {
                                            Ok(0) => {
                                                let _ = Self::send_exit_cell(&w_clone, &hk_clone, circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
                                                break;
                                            }
                                            Ok(n) => {
                                                let _ = Self::send_exit_cell(&w_clone, &hk_clone, circuit_id, CellCommand::StreamData, stream_id, &buf[..n]).await;
                                            }
                                            Err(_) => {
                                                let _ = Self::send_exit_cell(&w_clone, &hk_clone, circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
                                                break;
                                            }
                                        }
                                    }
                                    let mut map = strms_clone.write().await;
                                    map.remove(&stream_id);
                                });

                                // Escreve dados vindos do cliente no target remoto
                                tokio::spawn(async move {
                                    while let Some(data) = rx.recv().await {
                                        if t_w.write_all(&data).await.is_err() {
                                            break;
                                        }
                                    }
                                });
                            }
                            Err(e) => {
                                let _ = Self::send_exit_cell(&w, &hk, cell.circuit_id, CellCommand::StreamRefused, msg.stream_id, e.to_string().as_bytes()).await;
                            }
                        }
                    }
                    CellCommand::StreamData => {
                        let map = strms.read().await;
                        if let Some(tx) = map.get(&msg.stream_id) {
                            let _ = tx.send(msg.data).await;
                        }
                    }
                    CellCommand::StreamEnd => {
                        let mut map = strms.write().await;
                        map.remove(&msg.stream_id);
                    }
                    _ => {}
                }
            });
        };

        // Processa a primeira célula recebida
        process_cell(first_cell_bytes, Arc::clone(&hop_keys_arc), Arc::clone(&forwarder), Arc::clone(&streams), Arc::clone(&up_w));

        loop {
            match read_frame(&mut up_r).await {
                Ok((FrameType::Cell, frame_data)) => {
                    process_cell(frame_data, Arc::clone(&hop_keys_arc), Arc::clone(&forwarder), Arc::clone(&streams), Arc::clone(&up_w));
                }
                Ok((FrameType::Destroy, _)) | Err(_) => {
                    break;
                }
                _ => {}
            }
        }

        Ok(())
    }

    async fn send_exit_cell(
        writer: &Arc<Mutex<OwnedWriteHalf>>,
        hop_keys: &HopKeys,
        circuit_id: u32,
        command: CellCommand,
        stream_id: u16,
        data: &[u8],
    ) -> Result<(), VeilError> {
        let inner = InnerMessage::new(command, stream_id, data.to_vec());
        let mut cipher = HopCipher::new(&hop_keys.backward_key);
        let enc = cipher.encrypt(&inner.encode())
            .map_err(|e| VeilError::Crypto(e.to_string()))?;
        let cell = VeilCell::new(circuit_id, CellCommand::RelayData, stream_id, &enc);
        let mut lock = writer.lock().await;
        write_frame(&mut *lock, FrameType::Cell, &cell.to_bytes()).await
    }
}

/// Cliente que conecta e mantém um circuito interativo LIVE com múltiplos saltos.
pub struct LiveCircuitClient {
    pub circuit_id: u32,
    pub hops: Vec<CircuitHopNode>,
    pub hop_keys: Vec<HopKeys>,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
    next_stream_id: Arc<AtomicU16>,
}

impl LiveCircuitClient {
    /// Estabelece um circuito de 1 ou 3 saltos usando handshake telescópico ML-KEM-1024.
    pub async fn connect(circuit_id: u32, hops: Vec<CircuitHopNode>) -> Result<Self, VeilError> {
        if hops.is_empty() {
            return Err(VeilError::Circuit("Circuito deve conter pelo menos 1 nó".into()));
        }

        // Conecta ao Guard (primeiro salto)
        let guard_stream = TcpStream::connect(&hops[0].endpoint)
            .await
            .map_err(|e| VeilError::Circuit(format!("Falha ao conectar no nó Guard ({}): {e}", hops[0].endpoint)))?;

        let (mut guard_r, mut guard_w) = guard_stream.into_split();

        // Handshake inicial com Guard
        let salt0 = format!("circuit-{circuit_id}-hop-0").into_bytes();
        let (keys0, ct0) = client_kem_handshake(&hops[0].public_kem_key, &salt0)
            .map_err(|e| VeilError::Crypto(e.to_string()))?;

        let mut create_payload = Vec::with_capacity(6 + salt0.len() + ct0.len());
        create_payload.extend_from_slice(&circuit_id.to_be_bytes());
        create_payload.extend_from_slice(&(salt0.len() as u16).to_be_bytes());
        create_payload.extend_from_slice(&salt0);
        create_payload.extend_from_slice(&ct0);

        write_frame(&mut guard_w, FrameType::Create, &create_payload).await?;

        let (ft, created_data) = read_frame(&mut guard_r).await?;
        if ft != FrameType::Created {
            return Err(VeilError::Circuit("Resposta inválida no handshake do Guard".into()));
        }
        let expected_auth0 = blake3::keyed_hash(&keys0.forward_key, b"veil-hop-auth");
        if created_data.len() < 36 || &created_data[4..36] != expected_auth0.as_bytes() {
            return Err(VeilError::Crypto("Falha de autenticação no nó Guard".into()));
        }

        let mut hop_keys = vec![keys0];

        // Handshake telescópico para saltos subsequentes
        for (i, hop) in hops.iter().enumerate().skip(1) {
            let salt = format!("circuit-{circuit_id}-hop-{i}").into_bytes();
            let (keys, ct) = client_kem_handshake(&hop.public_kem_key, &salt)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;

            let mut hop_create = Vec::with_capacity(6 + salt.len() + ct.len());
            hop_create.extend_from_slice(&circuit_id.to_be_bytes());
            hop_create.extend_from_slice(&(salt.len() as u16).to_be_bytes());
            hop_create.extend_from_slice(&salt);
            hop_create.extend_from_slice(&ct);

            let ep_bytes = hop.endpoint.as_bytes();
            let mut extend_payload = Vec::with_capacity(6 + ep_bytes.len() + hop_create.len());
            extend_payload.extend_from_slice(&circuit_id.to_be_bytes());
            extend_payload.extend_from_slice(&(ep_bytes.len() as u16).to_be_bytes());
            extend_payload.extend_from_slice(ep_bytes);
            extend_payload.extend_from_slice(&hop_create);

            write_frame(&mut guard_w, FrameType::Extend, &extend_payload).await?;

            let (ft, extended_data) = read_frame(&mut guard_r).await?;
            if ft != FrameType::Extended {
                return Err(VeilError::Circuit(format!("Resposta inválida ao estender salto {i}")));
            }
            let expected_auth = blake3::keyed_hash(&keys.forward_key, b"veil-hop-auth");
            if extended_data.len() < 36 || &extended_data[4..36] != expected_auth.as_bytes() {
                return Err(VeilError::Crypto(format!("Falha de autenticação ao estender nó {i}")));
            }

            hop_keys.push(keys);
        }

        let stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>> = Arc::new(RwLock::new(HashMap::new()));
        let stream_senders_clone = Arc::clone(&stream_senders);
        let hop_keys_clone = hop_keys.clone();

        tokio::spawn(async move {
            loop {
                match read_frame(&mut guard_r).await {
                    Ok((FrameType::Cell, frame_data)) => {
                        if frame_data.len() != CELL_SIZE {
                            continue;
                        }
                        let mut cb = [0u8; CELL_SIZE];
                        cb.copy_from_slice(&frame_data);
                        let Ok(cell) = VeilCell::from_bytes(&cb) else { continue; };

                        // Descasca camadas backward na ordem direta: Guard -> Middle -> Exit
                        let mut current = cell.data().to_vec();
                        let mut failed = false;
                        for k in &hop_keys_clone {
                            match onion_peel_layer_backward(&current, k) {
                                Ok(p) => current = p,
                                Err(_) => {
                                    failed = true;
                                    break;
                                }
                            }
                        }
                        if failed { continue; }

                        let Ok(msg) = InnerMessage::decode(&current) else { continue; };

                        let map = stream_senders_clone.read().await;
                        if let Some(tx) = map.get(&msg.stream_id) {
                            let _ = tx.send(msg).await;
                        }
                    }
                    Ok((FrameType::Destroy, _)) | Err(_) => {
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(Self {
            circuit_id,
            hops,
            hop_keys,
            writer: Arc::new(Mutex::new(guard_w)),
            stream_senders,
            next_stream_id: Arc::new(AtomicU16::new(1)),
        })
    }

    /// Abre um fluxo para o destino remoto através do circuito onion.
    pub async fn open_stream(&self, target: &Socks5Target) -> Result<LiveCircuitStream, VeilError> {
        let stream_id = self.next_stream_id.fetch_add(1, Ordering::SeqCst);
        let (tx, mut rx) = mpsc::channel::<InnerMessage>(64);

        {
            let mut map = self.stream_senders.write().await;
            map.insert(stream_id, tx);
        }

        let inner = InnerMessage::new(CellCommand::StreamBegin, stream_id, target.encode());
        let layered = self.onion_encrypt_forward(&inner.encode())?;
        let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, stream_id, &layered);

        {
            let mut w = self.writer.lock().await;
            write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await?;
        }

        let timeout = tokio::time::Duration::from_secs(10);
        let resp = tokio::time::timeout(timeout, rx.recv())
            .await
            .map_err(|_| VeilError::Circuit("Timeout aguardando nó Exit".into()))?
            .ok_or_else(|| VeilError::Circuit("Canal de resposta fechado prematuramente".into()))?;

        match resp.command {
            CellCommand::StreamConnected => {
                Ok(LiveCircuitStream {
                    circuit_id: self.circuit_id,
                    stream_id,
                    rx,
                    writer: Arc::clone(&self.writer),
                    hop_keys: self.hop_keys.clone(),
                    stream_senders: Arc::clone(&self.stream_senders),
                })
            }
            CellCommand::StreamRefused => {
                let mut map = self.stream_senders.write().await;
                map.remove(&stream_id);
                let reason = String::from_utf8_lossy(&resp.data).to_string();
                Err(VeilError::Exit(reason))
            }
            other => {
                let mut map = self.stream_senders.write().await;
                map.remove(&stream_id);
                Err(VeilError::Circuit(format!("Resposta inesperada do nó Exit: {:?}", other)))
            }
        }
    }

    fn onion_encrypt_forward(&self, plaintext: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut current = plaintext.to_vec();
        for keys in self.hop_keys.iter().rev() {
            let mut cipher = HopCipher::new(&keys.forward_key);
            current = cipher.encrypt(&current)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;
        }
        Ok(current)
    }
}

/// Leitor independente de um fluxo do circuito.
pub struct CircuitStreamReader {
    rx: mpsc::Receiver<InnerMessage>,
}

impl CircuitStreamReader {
    pub async fn receive_data(&mut self) -> Result<Option<Vec<u8>>, VeilError> {
        while let Some(msg) = self.rx.recv().await {
            match msg.command {
                CellCommand::StreamData => return Ok(Some(msg.data)),
                CellCommand::StreamEnd => return Ok(None),
                _ => {}
            }
        }
        Ok(None)
    }
}

/// Escritor independente de um fluxo do circuito.
pub struct CircuitStreamWriter {
    circuit_id: u32,
    stream_id: u16,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    hop_keys: Vec<HopKeys>,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
}

impl CircuitStreamWriter {
    pub async fn send_data(&self, data: &[u8]) -> Result<(), VeilError> {
        for chunk in data.chunks(MAX_STREAM_DATA_CHUNK) {
            let inner = InnerMessage::new(CellCommand::StreamData, self.stream_id, chunk.to_vec());
            let layered = self.onion_encrypt_forward(&inner.encode())?;
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await?;
        }
        Ok(())
    }

    pub async fn close(&self) -> Result<(), VeilError> {
        let inner = InnerMessage::new(CellCommand::StreamEnd, self.stream_id, vec![]);
        if let Ok(layered) = self.onion_encrypt_forward(&inner.encode()) {
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            let _ = write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await;
        }
        let mut map = self.stream_senders.write().await;
        map.remove(&self.stream_id);
        Ok(())
    }

    fn onion_encrypt_forward(&self, plaintext: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut current = plaintext.to_vec();
        for keys in self.hop_keys.iter().rev() {
            let mut cipher = HopCipher::new(&keys.forward_key);
            current = cipher.encrypt(&current)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;
        }
        Ok(current)
    }
}

/// Fluxo de dados ativo sobre um circuito onion LIVE.
pub struct LiveCircuitStream {
    pub circuit_id: u32,
    pub stream_id: u16,
    rx: mpsc::Receiver<InnerMessage>,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    hop_keys: Vec<HopKeys>,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
}

impl LiveCircuitStream {
    /// Divide o fluxo em metades independentes de leitura e escrita.
    pub fn split(self) -> (CircuitStreamReader, CircuitStreamWriter) {
        (
            CircuitStreamReader { rx: self.rx },
            CircuitStreamWriter {
                circuit_id: self.circuit_id,
                stream_id: self.stream_id,
                writer: self.writer,
                hop_keys: self.hop_keys,
                stream_senders: self.stream_senders,
            },
        )
    }

    pub async fn send_data(&self, data: &[u8]) -> Result<(), VeilError> {
        for chunk in data.chunks(MAX_STREAM_DATA_CHUNK) {
            let inner = InnerMessage::new(CellCommand::StreamData, self.stream_id, chunk.to_vec());
            let layered = self.onion_encrypt_forward(&inner.encode())?;
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await?;
        }
        Ok(())
    }

    pub async fn receive_data(&mut self) -> Result<Option<Vec<u8>>, VeilError> {
        while let Some(msg) = self.rx.recv().await {
            match msg.command {
                CellCommand::StreamData => return Ok(Some(msg.data)),
                CellCommand::StreamEnd => return Ok(None),
                _ => {}
            }
        }
        Ok(None)
    }

    pub async fn close(&self) -> Result<(), VeilError> {
        let inner = InnerMessage::new(CellCommand::StreamEnd, self.stream_id, vec![]);
        if let Ok(layered) = self.onion_encrypt_forward(&inner.encode()) {
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            let _ = write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await;
        }
        let mut map = self.stream_senders.write().await;
        map.remove(&self.stream_id);
        Ok(())
    }

    fn onion_encrypt_forward(&self, plaintext: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut current = plaintext.to_vec();
        for keys in self.hop_keys.iter().rev() {
            let mut cipher = HopCipher::new(&keys.forward_key);
            current = cipher.encrypt(&current)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;
        }
        Ok(current)
    }
}

/// Estado de um circuito LIVE para processamento local ou offline.
pub struct LiveCircuit {
    pub circuit_id: u32,
    pub hops: Vec<CircuitHopNode>,
    pub hop_keys: Vec<HopKeys>,
    pub created_at: Instant,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

impl LiveCircuit {
    pub fn build(circuit_id: u32, hops: Vec<CircuitHopNode>) -> Result<Self, VeilError> {
        if hops.is_empty() {
            return Err(VeilError::Circuit("Circuito sem nós definido".into()));
        }

        let mut hop_keys = Vec::with_capacity(hops.len());
        for (i, hop) in hops.iter().enumerate() {
            let salt = format!("circuit-{circuit_id}-hop-{i}").into_bytes();
            let (keys, _ct) = client_kem_handshake(&hop.public_kem_key, &salt)
                .map_err(|e| VeilError::Crypto(format!("Falha no KEM do nó {}: {e}", hop.node_id)))?;
            hop_keys.push(keys);
        }

        Ok(Self {
            circuit_id,
            hops,
            hop_keys,
            created_at: Instant::now(),
            bytes_sent: 0,
            bytes_received: 0,
        })
    }

    pub fn forward_encrypt(&mut self, stream_id: u16, data: &[u8]) -> Result<Vec<[u8; CELL_SIZE]>, VeilError> {
        let max_chunk = MAX_STREAM_DATA_CHUNK;
        let chunks: Vec<&[u8]> = data.chunks(max_chunk).collect();
        let mut encrypted_cells = Vec::with_capacity(chunks.len());

        for chunk in chunks {
            let layered_data = onion_encrypt_layers(chunk, &self.hop_keys)
                .map_err(|e| VeilError::Crypto(format!("Falha ao cifrar camadas onion: {e}")))?;

            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, stream_id, &layered_data);
            encrypted_cells.push(cell.to_bytes());
            self.bytes_sent += CELL_SIZE as u64;
        }

        Ok(encrypted_cells)
    }

    pub fn backward_decrypt(&mut self, cell_bytes: &[u8; CELL_SIZE]) -> Result<Vec<u8>, VeilError> {
        let cell = VeilCell::from_bytes(cell_bytes)
            .map_err(|e| VeilError::Circuit(format!("Célula corrompida recebida: {e}")))?;

        let mut current = cell.data().to_vec();

        for keys in &self.hop_keys {
            current = onion_peel_layer_backward(&current, keys)
                .map_err(|e| VeilError::Crypto(format!("Falha ao descascar camada reversa: {e}")))?;
        }

        self.bytes_received += cell_bytes.len() as u64;
        Ok(current)
    }
}

/// Gerenciador de identificadores de circuitos LIVE.
pub struct LiveCircuitManager {
    next_circuit_id: AtomicU32,
}

impl Default for LiveCircuitManager {
    fn default() -> Self {
        Self::new()
    }
}

impl LiveCircuitManager {
    pub fn new() -> Self {
        Self {
            next_circuit_id: AtomicU32::new(100),
        }
    }

    pub fn next_id(&self) -> u32 {
        self.next_circuit_id.fetch_add(1, Ordering::SeqCst)
    }

    pub fn create_circuit(&self, hops: Vec<CircuitHopNode>) -> Result<Arc<std::sync::Mutex<LiveCircuit>>, VeilError> {
        let id = self.next_id();
        let circuit = LiveCircuit::build(id, hops)?;
        Ok(Arc::new(std::sync::Mutex::new(circuit)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mycelium_pqc::mlkem_keygen;

    #[test]
    fn live_circuit_onion_encryption_and_decryption_flow() {
        let kp1 = mlkem_keygen();
        let kp2 = mlkem_keygen();
        let kp3 = mlkem_keygen();

        let hops = vec![
            CircuitHopNode {
                node_id: "guard-node".into(),
                public_kem_key: kp1.public_key.clone(),
                endpoint: "198.51.100.1:4003".into(),
            },
            CircuitHopNode {
                node_id: "middle-node".into(),
                public_kem_key: kp2.public_key.clone(),
                endpoint: "198.51.100.2:4003".into(),
            },
            CircuitHopNode {
                node_id: "exit-node".into(),
                public_kem_key: kp3.public_key.clone(),
                endpoint: "198.51.100.3:4003".into(),
            },
        ];

        let mut circuit = LiveCircuit::build(101, hops).expect("build circuit");
        let payload = b"GET /privacy.html HTTP/1.1\r\nHost: example.com\r\n\r\n";

        let cells = circuit.forward_encrypt(1, payload).expect("encrypt forward");
        assert!(!cells.is_empty());
        assert_eq!(cells[0].len(), CELL_SIZE);
    }

    #[tokio::test]
    async fn test_telescoping_3hop_circuit_real_network_relay() {
        // 1. Mock Target Server que ecoa dados recebidos
        let target_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_addr = target_listener.local_addr().unwrap();

        tokio::spawn(async move {
            if let Ok((mut stream, _)) = target_listener.accept().await {
                let mut buf = [0u8; 1024];
                if let Ok(n) = stream.read(&mut buf).await {
                    if n > 0 {
                        let _ = stream.write_all(&buf[..n]).await;
                    }
                }
            }
        });

        // 2. Nó Exit (com política permitindo porta do target para teste)
        let exit_kp = mlkem_keygen();
        let exit_pk = exit_kp.public_key.clone();
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false, // Permite loopback neste teste local
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        // 3. Nó Middle
        let middle_kp = mlkem_keygen();
        let middle_pk = middle_kp.public_key.clone();
        let middle_router = VeilHopRouter::new(middle_kp, None);
        let middle_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let middle_addr = middle_listener.local_addr().unwrap();
        tokio::spawn(async move {
            let _ = middle_router.run(middle_listener).await;
        });

        // 4. Nó Guard
        let guard_kp = mlkem_keygen();
        let guard_pk = guard_kp.public_key.clone();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        // 5. Cliente monta circuito de 3 saltos via handshake telescópico ML-KEM-1024
        let hops = vec![
            CircuitHopNode {
                node_id: "guard".into(),
                public_kem_key: guard_pk,
                endpoint: guard_addr.to_string(),
            },
            CircuitHopNode {
                node_id: "middle".into(),
                public_kem_key: middle_pk,
                endpoint: middle_addr.to_string(),
            },
            CircuitHopNode {
                node_id: "exit".into(),
                public_kem_key: exit_pk,
                endpoint: exit_addr.to_string(),
            },
        ];

        let client = LiveCircuitClient::connect(777, hops).await.expect("connect 3-hop circuit");
        assert_eq!(client.hop_keys.len(), 3);

        // 6. Abre fluxo para o target através do circuito onion de 3 saltos
        let target = Socks5Target::Ip(target_addr);
        let mut stream = client.open_stream(&target).await.expect("open stream to target");

        // 7. Envia dados encapsulados em células de 512 bytes
        let test_msg = b"Dados ultraconfidenciais navegando atraves de Guard -> Middle -> Exit";
        stream.send_data(test_msg).await.expect("send data through circuit");

        // 8. Recebe eco devolvido pelo target através do caminho reverso
        let received = stream.receive_data().await.expect("receive data").expect("data present");
        assert_eq!(received, test_msg);

        stream.close().await.expect("close stream");
    }
}
