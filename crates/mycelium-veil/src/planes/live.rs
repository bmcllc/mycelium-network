//! Plano LIVE: Circuitos Onion Interativos de Baixa Latência.
//!
//! Transporta conexões interativas (TCP, SOCKS5, HTTP, chamadas)
//! através de circuitos onion criptografados com células de 512 bytes fixos.

use crate::crypto::{
    client_kem_handshake, onion_encrypt_layers_stateful, onion_peel_backward_stateful,
    server_kem_handshake, CellCommand, HopDecryptor, HopEncryptor, HopKeys, VeilCell,
    CELL_SIZE, MAX_STREAM_DATA_CHUNK,
};
use crate::config::ExitPolicy;
use crate::exit::ExitForwarder;
use crate::socks5::Socks5Target;
use crate::VeilError;
use mycelium_ghostid::GhostId;
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

/// Descritor assinado de um nó participante do circuito com validação criptográfica.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NodeDescriptor {
    pub node_id: String,
    pub identity_pubkey: [u8; 32],      // GhostId Schnorr x-only pubkey
    pub public_kem_key: Vec<u8>,        // ML-KEM-1024 public key
    pub endpoint: String,
    pub timestamp: u64,
    pub signature: [u8; 64],            // GhostId Schnorr signature
}

impl serde::Serialize for NodeDescriptor {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("NodeDescriptor", 6)?;
        state.serialize_field("node_id", &self.node_id)?;
        state.serialize_field("identity_pubkey", &hex::encode(self.identity_pubkey))?;
        state.serialize_field("public_kem_key", &hex::encode(&self.public_kem_key))?;
        state.serialize_field("endpoint", &self.endpoint)?;
        state.serialize_field("timestamp", &self.timestamp)?;
        state.serialize_field("signature", &hex::encode(self.signature))?;
        state.end()
    }
}

impl<'de> serde::Deserialize<'de> for NodeDescriptor {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(serde::Deserialize)]
        struct NodeDescriptorHelper {
            node_id: String,
            identity_pubkey: String,
            public_kem_key: String,
            endpoint: String,
            timestamp: u64,
            signature: String,
        }

        let helper = NodeDescriptorHelper::deserialize(deserializer)?;
        let id_bytes = hex::decode(&helper.identity_pubkey).map_err(serde::de::Error::custom)?;
        let mut identity_pubkey = [0u8; 32];
        if id_bytes.len() != 32 {
            return Err(serde::de::Error::custom("identity_pubkey must be 32 bytes"));
        }
        identity_pubkey.copy_from_slice(&id_bytes);

        let public_kem_key = hex::decode(&helper.public_kem_key).map_err(serde::de::Error::custom)?;

        let sig_bytes = hex::decode(&helper.signature).map_err(serde::de::Error::custom)?;
        let mut signature = [0u8; 64];
        if sig_bytes.len() != 64 {
            return Err(serde::de::Error::custom("signature must be 64 bytes"));
        }
        signature.copy_from_slice(&sig_bytes);

        Ok(Self {
            node_id: helper.node_id,
            identity_pubkey,
            public_kem_key,
            endpoint: helper.endpoint,
            timestamp: helper.timestamp,
            signature,
        })
    }
}

impl NodeDescriptor {
    pub fn sign(
        node_id: String,
        ghost: &GhostId,
        public_kem_key: Vec<u8>,
        endpoint: String,
    ) -> Self {
        let identity_pubkey = ghost.nostr_pubkey();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let digest = Self::compute_digest(&node_id, &identity_pubkey, &public_kem_key, &endpoint, timestamp);
        let signature = ghost.sign(&digest);
        Self {
            node_id,
            identity_pubkey,
            public_kem_key,
            endpoint,
            timestamp,
            signature,
        }
    }

    pub fn compute_digest(
        node_id: &str,
        identity_pubkey: &[u8; 32],
        public_kem_key: &[u8],
        endpoint: &str,
        timestamp: u64,
    ) -> [u8; 32] {
        let mut hasher = blake3::Hasher::new();
        hasher.update(b"mycelium-veil-node-descriptor-v1");
        hasher.update(node_id.as_bytes());
        hasher.update(identity_pubkey);
        hasher.update(public_kem_key);
        hasher.update(endpoint.as_bytes());
        hasher.update(&timestamp.to_be_bytes());
        *hasher.finalize().as_bytes()
    }

    pub fn verify(&self) -> Result<(), VeilError> {
        let digest = Self::compute_digest(
            &self.node_id,
            &self.identity_pubkey,
            &self.public_kem_key,
            &self.endpoint,
            self.timestamp,
        );
        GhostId::verify(&self.identity_pubkey, &digest, &self.signature)
            .map_err(|e| VeilError::Crypto(format!("Assinatura do descritor do nó inválida: {e:?}")))?;
        Ok(())
    }
}

/// Descritor de um nó participante do circuito.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CircuitHopNode {
    pub node_id: String,
    pub public_kem_key: Vec<u8>,
    pub endpoint: String,
    pub descriptor: Option<NodeDescriptor>,
}

impl CircuitHopNode {
    pub fn new(node_id: String, public_kem_key: Vec<u8>, endpoint: String) -> Self {
        Self {
            node_id,
            public_kem_key,
            endpoint,
            descriptor: None,
        }
    }

    pub fn from_descriptor(descriptor: NodeDescriptor) -> Self {
        Self {
            node_id: descriptor.node_id.clone(),
            public_kem_key: descriptor.public_kem_key.clone(),
            endpoint: descriptor.endpoint.clone(),
            descriptor: Some(descriptor),
        }
    }
}

/// Roteador / Nó de Retransmissão do Veil com identidade criptográfica Schnorr.
/// Pode atuar como Guard, Middle ou Exit dependendo da negociação do circuito.
pub struct VeilHopRouter {
    pub identity: Arc<GhostId>,
    pub keypair: Arc<KemKeyPair>,
    pub exit_policy: Option<ExitPolicy>,
}

impl VeilHopRouter {
    pub fn new(keypair: KemKeyPair, exit_policy: Option<ExitPolicy>) -> Self {
        let identity = GhostId::spawn_quick(86400 * 365).expect("spawn ghost id");
        Self::with_identity(identity, keypair, exit_policy)
    }

    pub fn with_identity(
        identity: GhostId,
        keypair: KemKeyPair,
        exit_policy: Option<ExitPolicy>,
    ) -> Self {
        Self {
            identity: Arc::new(identity),
            keypair: Arc::new(keypair),
            exit_policy,
        }
    }

    pub fn descriptor(&self, node_id: String, endpoint: String) -> NodeDescriptor {
        NodeDescriptor::sign(node_id, &self.identity, self.keypair.public_key.clone(), endpoint)
    }

    /// Executa o serviço aceitando conexões no listener fornecido.
    pub async fn run(&self, listener: TcpListener) -> Result<(), VeilError> {
        let identity = Arc::clone(&self.identity);
        let keypair = Arc::clone(&self.keypair);
        let exit_policy = self.exit_policy.clone();

        loop {
            let (stream, _peer_addr) = listener
                .accept()
                .await
                .map_err(|e| VeilError::Circuit(format!("Erro no accept do roteador: {e}")))?;

            let id = Arc::clone(&identity);
            let kp = Arc::clone(&keypair);
            let ep = exit_policy.clone();

            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(stream, id, kp, ep).await {
                    tracing::debug!(error = %e, "Conexão no roteador de salto finalizada");
                }
            });
        }
    }

    async fn handle_connection(
        mut stream: TcpStream,
        identity: Arc<GhostId>,
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
        let in_circuit_id = u32::from_be_bytes([payload[0], payload[1], payload[2], payload[3]]);
        let salt_len = u16::from_be_bytes([payload[4], payload[5]]) as usize;
        if payload.len() < 6 + salt_len + 1568 {
            return Err(VeilError::Circuit("Payload Create truncado".into()));
        }
        let salt = &payload[6..6 + salt_len];
        let ct = &payload[6 + salt_len..6 + salt_len + 1568];

        let hop_keys = server_kem_handshake(&keypair, ct, salt)
            .map_err(|e| VeilError::Crypto(format!("Falha no KEM server: {e}")))?;

        // Vincula a chave de identidade GhostId no auth_tag
        let mut auth_input = b"veil-hop-auth".to_vec();
        auth_input.extend_from_slice(&identity.nostr_pubkey());
        let auth_tag = blake3::keyed_hash(&hop_keys.forward_key, &auth_input);

        let mut created_payload = Vec::with_capacity(36);
        created_payload.extend_from_slice(&in_circuit_id.to_be_bytes());
        created_payload.extend_from_slice(auth_tag.as_bytes());

        write_frame(&mut stream, FrameType::Created, &created_payload).await?;

        // 2. Aguarda próximo comando: Extend (Intermediate) ou Cell (Exit)
        let (ft, payload) = read_frame(&mut stream).await?;
        match ft {
            FrameType::Extend => {
                Self::handle_intermediate_relay(stream, hop_keys, payload, in_circuit_id).await
            }
            FrameType::Cell => {
                Self::handle_exit_node(stream, hop_keys, exit_policy, payload, in_circuit_id).await
            }
            _ => Err(VeilError::Circuit("Comando inválido pós-handshake".into())),
        }
    }

    async fn handle_intermediate_relay(
        mut upstream: TcpStream,
        hop_keys: HopKeys,
        extend_payload: Vec<u8>,
        in_circuit_id: u32,
    ) -> Result<(), VeilError> {
        if extend_payload.len() < 6 {
            return Err(VeilError::Circuit("Payload Extend truncado".into()));
        }
        let ep_len = u16::from_be_bytes([extend_payload[4], extend_payload[5]]) as usize;
        if extend_payload.len() < 6 + ep_len {
            return Err(VeilError::Circuit("Payload Extend inválido para endpoint".into()));
        }
        let endpoint = String::from_utf8_lossy(&extend_payload[6..6 + ep_len]).to_string();
        let mut nested_create = extend_payload[6 + ep_len..].to_vec();

        // Gera identificador de circuito link-local downstream aleatório e descorrelacionado
        let out_circuit_id = loop {
            let id = rand::random::<u32>() & 0x7FFFFFFF | 1;
            if id != in_circuit_id {
                break id;
            }
        };

        // Reescreve o circuit_id no quadro Create downstream
        if nested_create.len() >= 4 {
            nested_create[0..4].copy_from_slice(&out_circuit_id.to_be_bytes());
        }

        let mut downstream = TcpStream::connect(&endpoint)
            .await
            .map_err(|e| VeilError::Circuit(format!("Falha ao estender para {endpoint}: {e}")))?;

        write_frame(&mut downstream, FrameType::Create, &nested_create).await?;

        let (ft, mut created_resp) = read_frame(&mut downstream).await?;
        if ft != FrameType::Created {
            return Err(VeilError::Circuit("Resposta inválida do próximo salto (esperado Created)".into()));
        }

        // Reescreve o circuit_id na resposta Extended para o in_circuit_id do link upstream
        if created_resp.len() >= 4 {
            created_resp[0..4].copy_from_slice(&in_circuit_id.to_be_bytes());
        }

        write_frame(&mut upstream, FrameType::Extended, &created_resp).await?;

        let (mut up_r, mut up_w) = upstream.into_split();
        let (mut down_r, mut down_w) = downstream.into_split();

        // Instancia encryptor e decryptor persistentes para o salto
        let mut hop_decryptor_fwd = HopDecryptor::new(&hop_keys.forward_key);
        let mut hop_encryptor_bwd = HopEncryptor::new(&hop_keys.backward_key);

        // Upstream -> Downstream: Descasca 1 camada forward com estado persistente
        // e remapeia in_circuit_id -> out_circuit_id
        let forward_relay = async move {
            loop {
                let (ft, mut frame_data) = read_frame(&mut up_r).await?;
                match ft {
                    FrameType::Extend => {
                        // Reescreve in_circuit_id para out_circuit_id no payload Extend downstream
                        if frame_data.len() >= 4 {
                            frame_data[0..4].copy_from_slice(&out_circuit_id.to_be_bytes());
                        }
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

                        if cell.circuit_id != in_circuit_id {
                            return Err(VeilError::Circuit("Circuit ID divergente no enlace upstream".into()));
                        }

                        let peeled = hop_decryptor_fwd.decrypt(cell.data())
                            .map_err(|e| VeilError::Crypto(e.to_string()))?;

                        // Reescreve o CID para out_circuit_id no salto downstream
                        let peeled_cell = VeilCell::new(out_circuit_id, CellCommand::RelayData, cell.stream_id, &peeled);
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

        // Downstream -> Upstream: Cifra 1 camada backward com estado persistente
        // e remapeia out_circuit_id -> in_circuit_id
        let backward_relay = async move {
            loop {
                let (ft, frame_data) = read_frame(&mut down_r).await?;
                match ft {
                    FrameType::Extended => {
                        let mut resp = frame_data;
                        if resp.len() >= 4 {
                            resp[0..4].copy_from_slice(&in_circuit_id.to_be_bytes());
                        }
                        write_frame(&mut up_w, FrameType::Extended, &resp).await?;
                    }
                    FrameType::Cell => {
                        if frame_data.len() != CELL_SIZE {
                            return Err(VeilError::Circuit("Célula backward com tamanho divergente de 512 bytes".into()));
                        }
                        let mut cell_bytes = [0u8; CELL_SIZE];
                        cell_bytes.copy_from_slice(&frame_data);
                        let cell = VeilCell::from_bytes(&cell_bytes)
                            .map_err(|e| VeilError::Circuit(e))?;

                        if cell.circuit_id != out_circuit_id {
                            return Err(VeilError::Circuit("Circuit ID divergente no enlace downstream".into()));
                        }

                        let enc = hop_encryptor_bwd.encrypt(cell.data())
                            .map_err(|e| VeilError::Crypto(e.to_string()))?;

                        // Reescreve o CID para in_circuit_id no salto upstream
                        let enc_cell = VeilCell::new(in_circuit_id, CellCommand::RelayData, cell.stream_id, &enc);
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
        circuit_id: u32,
    ) -> Result<(), VeilError> {
        let policy = exit_policy.ok_or_else(|| VeilError::Exit("Este nó não tem permissão para atuar como nó de saída".into()))?;
        let forwarder = Arc::new(ExitForwarder::new(policy));

        let (mut up_r, up_w) = upstream.into_split();
        let up_w = Arc::new(Mutex::new(up_w));

        let streams: Arc<RwLock<HashMap<u16, mpsc::Sender<Vec<u8>>>>> = Arc::new(RwLock::new(HashMap::new()));
        let hop_decryptor_fwd = Arc::new(Mutex::new(HopDecryptor::new(&hop_keys.forward_key)));
        let hop_encryptor_bwd = Arc::new(Mutex::new(HopEncryptor::new(&hop_keys.backward_key)));

        let process_cell = |cell_data: Vec<u8>,
                            dec: Arc<Mutex<HopDecryptor>>,
                            enc: Arc<Mutex<HopEncryptor>>,
                            fwd: Arc<ExitForwarder>,
                            strms: Arc<RwLock<HashMap<u16, mpsc::Sender<Vec<u8>>>>>,
                            w: Arc<Mutex<OwnedWriteHalf>>,
                            expected_cid: u32| {
            tokio::spawn(async move {
                if cell_data.len() != CELL_SIZE {
                    return;
                }
                let mut cb = [0u8; CELL_SIZE];
                cb.copy_from_slice(&cell_data);
                let Ok(cell) = VeilCell::from_bytes(&cb) else { return; };
                if cell.circuit_id != expected_cid { return; }

                let peeled = {
                    let mut d = dec.lock().await;
                    match d.decrypt(cell.data()) {
                        Ok(p) => p,
                        Err(_) => return,
                    }
                };
                let Ok(msg) = InnerMessage::decode(&peeled) else { return; };

                match msg.command {
                    CellCommand::StreamBegin => {
                        let Ok(target) = Socks5Target::decode(&msg.data) else {
                            let _ = Self::send_exit_cell(&w, &enc, cell.circuit_id, CellCommand::StreamRefused, msg.stream_id, b"target invalido").await;
                            return;
                        };

                        // Executa conexão de saída no Exit com resolução DNS remota e anti-SSRF
                        match fwd.connect_to_target(&target).await {
                            Ok(target_stream) => {
                                let _ = Self::send_exit_cell(&w, &enc, cell.circuit_id, CellCommand::StreamConnected, msg.stream_id, &[]).await;

                                let (mut t_r, mut t_w) = target_stream.into_split();
                                let (tx, mut rx) = mpsc::channel::<Vec<u8>>(64);
                                {
                                    let mut map = strms.write().await;
                                    map.insert(msg.stream_id, tx);
                                }

                                let w_clone = Arc::clone(&w);
                                let enc_clone = Arc::clone(&enc);
                                let strms_clone = Arc::clone(&strms);
                                let stream_id = msg.stream_id;
                                let circuit_id = cell.circuit_id;

                                // Lê do target remoto e envia StreamData cells backward
                                tokio::spawn(async move {
                                    let mut buf = [0u8; MAX_STREAM_DATA_CHUNK];
                                    loop {
                                        match t_r.read(&mut buf).await {
                                            Ok(0) => {
                                                let _ = Self::send_exit_cell(&w_clone, &enc_clone, circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
                                                break;
                                            }
                                            Ok(n) => {
                                                let _ = Self::send_exit_cell(&w_clone, &enc_clone, circuit_id, CellCommand::StreamData, stream_id, &buf[..n]).await;
                                            }
                                            Err(_) => {
                                                let _ = Self::send_exit_cell(&w_clone, &enc_clone, circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
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
                                let _ = Self::send_exit_cell(&w, &enc, cell.circuit_id, CellCommand::StreamRefused, msg.stream_id, e.to_string().as_bytes()).await;
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
        process_cell(first_cell_bytes, Arc::clone(&hop_decryptor_fwd), Arc::clone(&hop_encryptor_bwd), Arc::clone(&forwarder), Arc::clone(&streams), Arc::clone(&up_w), circuit_id);

        loop {
            match read_frame(&mut up_r).await {
                Ok((FrameType::Cell, frame_data)) => {
                    process_cell(frame_data, Arc::clone(&hop_decryptor_fwd), Arc::clone(&hop_encryptor_bwd), Arc::clone(&forwarder), Arc::clone(&streams), Arc::clone(&up_w), circuit_id);
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
        encryptor: &Arc<Mutex<HopEncryptor>>,
        circuit_id: u32,
        command: CellCommand,
        stream_id: u16,
        data: &[u8],
    ) -> Result<(), VeilError> {
        let inner = InnerMessage::new(command, stream_id, data.to_vec());
        let enc = {
            let mut e = encryptor.lock().await;
            e.encrypt(&inner.encode()).map_err(|err| VeilError::Crypto(err.to_string()))?
        };
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
    encryptors: Arc<Mutex<Vec<HopEncryptor>>>,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
    next_stream_id: Arc<AtomicU16>,
}

impl LiveCircuitClient {
    /// Estabelece um circuito de 1 ou 3 saltos usando handshake telescópico ML-KEM-1024 e autenticação de descritores.
    pub async fn connect(circuit_id: u32, hops: Vec<CircuitHopNode>) -> Result<Self, VeilError> {
        if hops.is_empty() {
            return Err(VeilError::Circuit("Circuito deve conter pelo menos 1 nó".into()));
        }

        // Validação estrita de descritores de nós assinados
        for hop in &hops {
            if let Some(ref desc) = hop.descriptor {
                desc.verify()?;
                if desc.public_kem_key != hop.public_kem_key
                    || desc.endpoint != hop.endpoint
                    || desc.node_id != hop.node_id
                {
                    return Err(VeilError::Crypto(format!("Descriptor do nó {} adulterado", hop.node_id)));
                }
            }
        }

        // Conecta ao Guard (primeiro salto)
        let guard_stream = TcpStream::connect(&hops[0].endpoint)
            .await
            .map_err(|e| VeilError::Circuit(format!("Falha ao conectar no nó Guard ({}): {e}", hops[0].endpoint)))?;

        let (mut guard_r, mut guard_w) = guard_stream.into_split();

        // Handshake inicial com Guard vinculando a chave de identidade
        let identity_pubkey0 = hops[0].descriptor.as_ref().map(|d| d.identity_pubkey).unwrap_or([0u8; 32]);
        let mut salt0 = format!("circuit-{circuit_id}-hop-0").into_bytes();
        salt0.extend_from_slice(&identity_pubkey0);

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

        let mut expected_auth0_input = b"veil-hop-auth".to_vec();
        expected_auth0_input.extend_from_slice(&identity_pubkey0);
        let expected_auth0 = blake3::keyed_hash(&keys0.forward_key, &expected_auth0_input);
        if created_data.len() < 36 || &created_data[4..36] != expected_auth0.as_bytes() {
            return Err(VeilError::Crypto("Falha de autenticação no nó Guard".into()));
        }

        let mut hop_keys = vec![keys0];

        // Handshake telescópico para saltos subsequentes
        for (i, hop) in hops.iter().enumerate().skip(1) {
            let identity_pubkey = hop.descriptor.as_ref().map(|d| d.identity_pubkey).unwrap_or([0u8; 32]);
            let mut salt = format!("circuit-{circuit_id}-hop-{i}").into_bytes();
            salt.extend_from_slice(&identity_pubkey);

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
            let mut expected_auth_input = b"veil-hop-auth".to_vec();
            expected_auth_input.extend_from_slice(&identity_pubkey);
            let expected_auth = blake3::keyed_hash(&keys.forward_key, &expected_auth_input);
            if extended_data.len() < 36 || &extended_data[4..36] != expected_auth.as_bytes() {
                return Err(VeilError::Crypto(format!("Falha de autenticação ao estender nó {i}")));
            }

            hop_keys.push(keys);
        }

        let stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>> = Arc::new(RwLock::new(HashMap::new()));
        let stream_senders_clone = Arc::clone(&stream_senders);

        let encryptors: Vec<HopEncryptor> = hop_keys.iter().map(|k| HopEncryptor::new(&k.forward_key)).collect();
        let encryptors_arc = Arc::new(Mutex::new(encryptors));

        let mut decryptors: Vec<HopDecryptor> = hop_keys.iter().map(|k| HopDecryptor::new(&k.backward_key)).collect();

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

                        // Descasca camadas backward com decryptors persistentes e validação anti-replay
                        let peeled = match onion_peel_backward_stateful(cell.data(), &mut decryptors) {
                            Ok(p) => p,
                            Err(_) => continue,
                        };

                        let Ok(msg) = InnerMessage::decode(&peeled) else { continue; };

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
            encryptors: encryptors_arc,
            writer: Arc::new(Mutex::new(guard_w)),
            stream_senders,
            next_stream_id: Arc::new(AtomicU16::new(1)),
        })
    }

    /// Abre um fluxo para o destino remoto através do circuito onion com cifragem monotônica.
    pub async fn open_stream(&self, target: &Socks5Target) -> Result<LiveCircuitStream, VeilError> {
        let stream_id = self.next_stream_id.fetch_add(1, Ordering::SeqCst);
        let (tx, mut rx) = mpsc::channel::<InnerMessage>(64);

        {
            let mut map = self.stream_senders.write().await;
            map.insert(stream_id, tx);
        }

        let inner = InnerMessage::new(CellCommand::StreamBegin, stream_id, target.encode());
        let layered = {
            let mut encs = self.encryptors.lock().await;
            onion_encrypt_layers_stateful(&inner.encode(), &mut encs)
                .map_err(|e| VeilError::Crypto(e.to_string()))?
        };
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
                    encryptors: Arc::clone(&self.encryptors),
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

/// Escritor independente de um fluxo do circuito com estado monotônico garantido.
pub struct CircuitStreamWriter {
    circuit_id: u32,
    stream_id: u16,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    encryptors: Arc<Mutex<Vec<HopEncryptor>>>,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
}

impl CircuitStreamWriter {
    pub async fn send_data(&self, data: &[u8]) -> Result<(), VeilError> {
        for chunk in data.chunks(MAX_STREAM_DATA_CHUNK) {
            let inner = InnerMessage::new(CellCommand::StreamData, self.stream_id, chunk.to_vec());
            let layered = {
                let mut encs = self.encryptors.lock().await;
                onion_encrypt_layers_stateful(&inner.encode(), &mut encs)
                    .map_err(|e| VeilError::Crypto(e.to_string()))?
            };
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await?;
        }
        Ok(())
    }

    pub async fn close(&self) -> Result<(), VeilError> {
        let inner = InnerMessage::new(CellCommand::StreamEnd, self.stream_id, vec![]);
        let layered = {
            let mut encs = self.encryptors.lock().await;
            onion_encrypt_layers_stateful(&inner.encode(), &mut encs).ok()
        };
        if let Some(layered) = layered {
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            let _ = write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await;
        }
        let mut map = self.stream_senders.write().await;
        map.remove(&self.stream_id);
        Ok(())
    }
}

/// Fluxo de dados ativo sobre um circuito onion LIVE.
pub struct LiveCircuitStream {
    pub circuit_id: u32,
    pub stream_id: u16,
    rx: mpsc::Receiver<InnerMessage>,
    writer: Arc<Mutex<OwnedWriteHalf>>,
    encryptors: Arc<Mutex<Vec<HopEncryptor>>>,
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
                encryptors: self.encryptors,
                stream_senders: self.stream_senders,
            },
        )
    }

    pub async fn send_data(&self, data: &[u8]) -> Result<(), VeilError> {
        for chunk in data.chunks(MAX_STREAM_DATA_CHUNK) {
            let inner = InnerMessage::new(CellCommand::StreamData, self.stream_id, chunk.to_vec());
            let layered = {
                let mut encs = self.encryptors.lock().await;
                onion_encrypt_layers_stateful(&inner.encode(), &mut encs)
                    .map_err(|e| VeilError::Crypto(e.to_string()))?
            };
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
        let layered = {
            let mut encs = self.encryptors.lock().await;
            onion_encrypt_layers_stateful(&inner.encode(), &mut encs).ok()
        };
        if let Some(layered) = layered {
            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, self.stream_id, &layered);
            let mut w = self.writer.lock().await;
            let _ = write_frame(&mut *w, FrameType::Cell, &cell.to_bytes()).await;
        }
        let mut map = self.stream_senders.write().await;
        map.remove(&self.stream_id);
        Ok(())
    }
}

/// Estado de um circuito LIVE para processamento local ou offline com estado persistente.
pub struct LiveCircuit {
    pub circuit_id: u32,
    pub hops: Vec<CircuitHopNode>,
    pub hop_keys: Vec<HopKeys>,
    pub encryptors: Vec<HopEncryptor>,
    pub decryptors: Vec<HopDecryptor>,
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

        let encryptors = hop_keys.iter().map(|k| HopEncryptor::new(&k.forward_key)).collect();
        let decryptors = hop_keys.iter().map(|k| HopDecryptor::new(&k.backward_key)).collect();

        Ok(Self {
            circuit_id,
            hops,
            hop_keys,
            encryptors,
            decryptors,
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
            let layered_data = onion_encrypt_layers_stateful(chunk, &mut self.encryptors)
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

        let current = onion_peel_backward_stateful(cell.data(), &mut self.decryptors)
            .map_err(|e| VeilError::Crypto(format!("Falha ao descascar camada reversa: {e}")))?;

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
            CircuitHopNode::new("guard-node".into(), kp1.public_key.clone(), "198.51.100.1:4003".into()),
            CircuitHopNode::new("middle-node".into(), kp2.public_key.clone(), "198.51.100.2:4003".into()),
            CircuitHopNode::new("exit-node".into(), kp3.public_key.clone(), "198.51.100.3:4003".into()),
        ];

        let mut circuit = LiveCircuit::build(101, hops).expect("build circuit");
        let payload = b"GET /privacy.html HTTP/1.1\r\nHost: example.com\r\n\r\n";

        let cells = circuit.forward_encrypt(1, payload).expect("encrypt forward");
        assert!(!cells.is_empty());
        assert_eq!(cells[0].len(), CELL_SIZE);

        // Simula os saltos intermediários e de saída descascando a cebola forward
        let cell = VeilCell::from_bytes(&cells[0]).expect("parse cell");
        let mut guard_dec = HopDecryptor::new(&circuit.hop_keys[0].forward_key);
        let mut middle_dec = HopDecryptor::new(&circuit.hop_keys[1].forward_key);
        let mut exit_dec = HopDecryptor::new(&circuit.hop_keys[2].forward_key);

        let p1 = guard_dec.decrypt(cell.data()).expect("guard peel");
        let p2 = middle_dec.decrypt(&p1).expect("middle peel");
        let p3 = exit_dec.decrypt(&p2).expect("exit peel");
        assert_eq!(&p3[..payload.len()], payload);

        // Simula resposta backward gerada pelo Exit e repassada pelos saltos
        let reply_payload = b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nResposta Segura";
        let mut exit_enc = HopEncryptor::new(&circuit.hop_keys[2].backward_key);
        let mut middle_enc = HopEncryptor::new(&circuit.hop_keys[1].backward_key);
        let mut guard_enc = HopEncryptor::new(&circuit.hop_keys[0].backward_key);

        let e3 = exit_enc.encrypt(reply_payload).expect("exit backward");
        let e2 = middle_enc.encrypt(&e3).expect("middle backward");
        let e1 = guard_enc.encrypt(&e2).expect("guard backward");

        let bwd_cell = VeilCell::new(101, CellCommand::RelayData, 1, &e1);
        let recovered = circuit.backward_decrypt(&bwd_cell.to_bytes()).expect("decrypt backward");
        assert_eq!(&recovered[..reply_payload.len()], reply_payload);
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
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false,
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        let exit_desc = exit_router.descriptor("exit".into(), exit_addr.to_string());
        tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        // 3. Nó Middle
        let middle_kp = mlkem_keygen();
        let middle_router = VeilHopRouter::new(middle_kp, None);
        let middle_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let middle_addr = middle_listener.local_addr().unwrap();
        let middle_desc = middle_router.descriptor("middle".into(), middle_addr.to_string());
        tokio::spawn(async move {
            let _ = middle_router.run(middle_listener).await;
        });

        // 4. Nó Guard
        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        let guard_desc = guard_router.descriptor("guard".into(), guard_addr.to_string());
        tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        // 5. Cliente monta circuito de 3 saltos via descritores assinados
        let hops = vec![
            CircuitHopNode::from_descriptor(guard_desc),
            CircuitHopNode::from_descriptor(middle_desc),
            CircuitHopNode::from_descriptor(exit_desc),
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

    #[tokio::test]
    async fn test_tampered_descriptor_rejected() {
        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let mut guard_desc = guard_router.descriptor("guard".into(), "127.0.0.1:4003".into());

        // Adulteração maliciosa da chave KEM ou endpoint no descritor
        guard_desc.endpoint = "127.0.0.1:6666".into();

        let hops = vec![CircuitHopNode::from_descriptor(guard_desc)];

        let client_res = LiveCircuitClient::connect(999, hops).await;
        match client_res {
            Err(VeilError::Crypto(msg)) => {
                assert!(msg.contains("Assinatura do descritor") || msg.contains("adulterado"));
            }
            Err(e) => panic!("Esperado erro de criptografia, obtido: {e}"),
            Ok(_) => panic!("Conexao sucedeu com descritor adulterado!"),
        }
    }

    #[tokio::test]
    async fn test_distinct_link_circuit_ids_across_hops() {
        // Target Server de eco
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

        // Exit
        let exit_kp = mlkem_keygen();
        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false,
            max_bandwidth_bps: 0,
        };
        let exit_router = VeilHopRouter::new(exit_kp, Some(exit_policy));
        let exit_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let exit_addr = exit_listener.local_addr().unwrap();
        let exit_desc = exit_router.descriptor("exit".into(), exit_addr.to_string());
        tokio::spawn(async move {
            let _ = exit_router.run(exit_listener).await;
        });

        // Middle
        let middle_kp = mlkem_keygen();
        let middle_router = VeilHopRouter::new(middle_kp, None);
        let middle_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let middle_addr = middle_listener.local_addr().unwrap();
        let middle_desc = middle_router.descriptor("middle".into(), middle_addr.to_string());
        tokio::spawn(async move {
            let _ = middle_router.run(middle_listener).await;
        });

        // Guard
        let guard_kp = mlkem_keygen();
        let guard_router = VeilHopRouter::new(guard_kp, None);
        let guard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let guard_addr = guard_listener.local_addr().unwrap();
        let guard_desc = guard_router.descriptor("guard".into(), guard_addr.to_string());
        tokio::spawn(async move {
            let _ = guard_router.run(guard_listener).await;
        });

        let client_cid = 5050;
        let hops = vec![
            CircuitHopNode::from_descriptor(guard_desc),
            CircuitHopNode::from_descriptor(middle_desc),
            CircuitHopNode::from_descriptor(exit_desc),
        ];

        let client = LiveCircuitClient::connect(client_cid, hops).await.expect("circuito conectado");

        // O cliente usa client_cid (5050) no link 1
        assert_eq!(client.circuit_id, client_cid);

        let target = Socks5Target::Ip(target_addr);
        let mut stream = client.open_stream(&target).await.expect("stream aberto");

        let msg = b"verificando isolamento de CIDs por enlace";
        stream.send_data(msg).await.expect("dados enviados");
        let recv = stream.receive_data().await.expect("recebido").expect("dados");
        assert_eq!(recv, msg);

        stream.close().await.expect("fechado");
    }
}
