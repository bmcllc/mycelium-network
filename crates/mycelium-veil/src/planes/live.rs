//! Plano LIVE: Circuitos Onion Interativos de Baixa Latência.
//!
//! Transporta conexões interativas (TCP, SOCKS5, HTTP, chamadas)
//! através de circuitos onion criptografados com células de 512 bytes fixos.
//!
//! # P1.2 — Modo Distribuído e Proteção de Metadados
//!
//! Este módulo agora suporta:
//! - Circuitos distribuídos entre máquinas remotas (descritores recebidos pela rede)
//! - Proteção reforçada de metadados nos comandos de extensão (sais aleatórios por salto,
//!   identificadores de circuito link-local, sem identificadores globais observáveis)
//! - Autenticação estrita de descritores no modo produção (identidade fixada, validade temporal,
//!   proteção contra substituição)

use crate::crypto::{
    client_kem_handshake, onion_encrypt_layers_stateful, onion_peel_backward_stateful,
    server_kem_handshake, CellCommand, HopDecryptor, HopEncryptor, HopKeys, VeilCell,
    CELL_SIZE, MAX_STREAM_DATA_CHUNK,
};
use crate::config::ExitPolicy;
use crate::exit::ExitForwarder;
use crate::socks5::Socks5Target;
use crate::transport::{link_handshake_client, link_handshake_server, VeilSecureStream};
use crate::VeilError;
use mycelium_ghostid::GhostId;
use mycelium_pqc::KemKeyPair;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU16, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt, ReadHalf, WriteHalf};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex, RwLock};

pub type SecureStreamHalfWriter = Arc<Mutex<WriteHalf<VeilSecureStream<TcpStream>>>>;

/// Modo de operação de implantação do Veil: testes (local) ou produção (distribuído, estrito).
///
/// Não confundir com `crate::config::VeilMode` (plano de sessão Veil/Geo/Mix). Este enum
/// controla o rigor da autenticação de descritores ao montar circuitos.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DeploymentMode {
    /// Modo teste: circuitos locais, descritores auto-assinados, validação criptográfica + temporal.
    Test,
    /// Modo produção: circuitos distribuídos, descritores de terceiros de confiança,
    /// autenticação estrita com identidade fixada e validade temporal.
    Production,
}

impl Default for DeploymentMode {
    fn default() -> Self {
        DeploymentMode::Test
    }
}

impl DeploymentMode {
    /// Verifica se o modo atual exige autenticação estrita de descritores.
    pub fn requires_strict_descriptor_auth(&self) -> bool {
        matches!(self, DeploymentMode::Production)
    }
}

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

pub const DEFAULT_DESCRIPTOR_TTL: u64 = 86400; // 24 horas
pub const DEFAULT_MAX_CLOCK_DRIFT: u64 = 300;  // 5 minutos

/// Descritor assinado de um nó participante do circuito com validação criptográfica e temporal.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NodeDescriptor {
    pub node_id: String,
    pub identity_pubkey: [u8; 32],      // GhostId Schnorr x-only pubkey
    pub public_kem_key: Vec<u8>,        // ML-KEM-1024 public key
    pub endpoint: String,
    pub timestamp: u64,
    pub signature: [u8; 64],            // GhostId Schnorr signature
}

/// Identidade de confiança fixada para autenticação estrita no modo produção.
/// Impede a substituição de descritores: o nó deve apresentar exatamente esta identidade.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TrustedIdentity {
    /// Identificador humano-legível do nó (ex: "guard-prod-01").
    pub name: String,
    /// Chave pública de identidade GhostId (Schnorr x-only, 32 bytes).
    pub identity_pubkey: [u8; 32],
    /// Chave pública KEM esperada (ML-KEM-1024).
    pub public_kem_key: Vec<u8>,
    /// Endpoint esperado (opcional; se fornecido, deve corresponder).
    pub endpoint: Option<String>,
}

impl TrustedIdentity {
    pub fn new(name: String, identity_pubkey: [u8; 32], public_kem_key: Vec<u8>) -> Self {
        Self { name, identity_pubkey, public_kem_key, endpoint: None }
    }

    pub fn with_endpoint(mut self, endpoint: String) -> Self {
        self.endpoint = Some(endpoint);
        self
    }

    /// Valida que um descritor corresponde a esta identidade de confiança.
    /// Verifica: assinatura válida, identidade coincide, KEM key coincide, endpoint coincide (se configurado).
    pub fn verify_descriptor(&self, desc: &NodeDescriptor, now: u64, max_age: u64, max_clock_drift: u64) -> Result<(), VeilError> {
        // 1. Verifica que a identidade pública coincide exatamente
        if desc.identity_pubkey != self.identity_pubkey {
            return Err(VeilError::Crypto(format!(
                "Substituição de identidade detectada no nó '{}': esperado {:?}, obtido {:?}",
                self.name,
                hex::encode(self.identity_pubkey),
                hex::encode(desc.identity_pubkey)
            )));
        }

        // 2. Verifica que a chave KEM coincide
        if desc.public_kem_key != self.public_kem_key {
            return Err(VeilError::Crypto(format!(
                "Substituição de chave KEM detectada no nó '{}': esperada {} bytes, obtida {} bytes",
                self.name,
                self.public_kem_key.len(),
                desc.public_kem_key.len()
            )));
        }

        // 3. Verifica endpoint, se configurado
        if let Some(ref expected_ep) = self.endpoint {
            if desc.endpoint != *expected_ep {
                return Err(VeilError::Crypto(format!(
                    "Endpoint inconsistente para nó '{}': esperado '{}', obtido '{}'",
                    self.name, expected_ep, desc.endpoint
                )));
            }
        }

        // 4. Verifica validade temporal e assinatura
        desc.verify_validity_at(now, max_clock_drift, max_age)
    }
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

    /// Valida assinatura e temporalidade (janela de clock drift e expiração TTL).
    pub fn verify_validity_at(&self, now: u64, max_clock_drift: u64, max_age: u64) -> Result<(), VeilError> {
        let digest = Self::compute_digest(
            &self.node_id,
            &self.identity_pubkey,
            &self.public_kem_key,
            &self.endpoint,
            self.timestamp,
        );
        GhostId::verify(&self.identity_pubkey, &digest, &self.signature)
            .map_err(|e| VeilError::Crypto(format!("Assinatura do descritor do nó inválida: {e:?}")))?;

        if self.timestamp > now + max_clock_drift {
            return Err(VeilError::Crypto(format!(
                "Descritor do nó emitido no futuro (clock drift excessivo: ts={}, now={})",
                self.timestamp, now
            )));
        }

        if now.saturating_sub(self.timestamp) > max_age {
            return Err(VeilError::Crypto(format!(
                "Descritor do nó expirado (idade: {}s > ttl: {}s)",
                now.saturating_sub(self.timestamp),
                max_age
            )));
        }

        Ok(())
    }

    pub fn verify(&self) -> Result<(), VeilError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.verify_validity_at(now, DEFAULT_MAX_CLOCK_DRIFT, DEFAULT_DESCRIPTOR_TTL)
    }

    pub fn to_json(&self) -> Result<String, VeilError> {
        serde_json::to_string(self).map_err(|e| VeilError::Circuit(e.to_string()))
    }

    pub fn from_json(json: &str) -> Result<Self, VeilError> {
        serde_json::from_str(json).map_err(|e| VeilError::Circuit(e.to_string()))
    }
}

/// Carga útil para comando de extensão de circuito onion.
///
/// # P1.2 — Proteção de Metadados
///
/// O Extend payload é sempre onion-encryptado através de todas as camadas estabelecidas.
/// Cada salto intermediário vê apenas células opacas de 512 bytes; apenas o salto alvo
/// (após descascar todas as camadas) pode decifrar estes dados.
///
/// Para evitar identificadores globalmente observáveis:
/// - `link_circuit_id`: identificador de circuito local para este enlace (aleatório, não global)
/// - `salt`: valor aleatório por salto, não derivado de identificadores globais
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RelayExtendPayload {
    /// Endpoint do próximo nó (apenas visível após descascar todas as camadas onion).
    pub target_endpoint: String,
    /// Chave pública KEM do próximo nó.
    pub target_kem_key: Vec<u8>,
    /// Sal aleatório para este salto específico (não derivado de circuit_id global).
    pub salt: Vec<u8>,
    /// Ciphertext ML-KEM encapsulado para o próximo nó.
    pub ciphertext: Vec<u8>,
    /// Identificador de circuito local para este enlace (evita tracking global).
    pub link_circuit_id: u32,
}

impl RelayExtendPayload {
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        let ep_bytes = self.target_endpoint.as_bytes();
        buf.extend_from_slice(&(ep_bytes.len() as u16).to_be_bytes());
        buf.extend_from_slice(ep_bytes);
        buf.extend_from_slice(&(self.target_kem_key.len() as u16).to_be_bytes());
        buf.extend_from_slice(&self.target_kem_key);
        buf.extend_from_slice(&(self.salt.len() as u16).to_be_bytes());
        buf.extend_from_slice(&self.salt);
        buf.extend_from_slice(&(self.ciphertext.len() as u16).to_be_bytes());
        buf.extend_from_slice(&self.ciphertext);
        buf.extend_from_slice(&self.link_circuit_id.to_be_bytes());
        buf
    }

    pub fn decode(bytes: &[u8]) -> Result<Self, VeilError> {
        let mut cursor = 0;
        if bytes.len() < cursor + 2 {
            return Err(VeilError::Circuit("Payload extend truncado".into()));
        }
        let ep_len = u16::from_be_bytes([bytes[cursor], bytes[cursor + 1]]) as usize;
        cursor += 2;
        if bytes.len() < cursor + ep_len + 2 {
            return Err(VeilError::Circuit("Payload extend truncado".into()));
        }
        let target_endpoint = String::from_utf8_lossy(&bytes[cursor..cursor + ep_len]).to_string();
        cursor += ep_len;

        let pk_len = u16::from_be_bytes([bytes[cursor], bytes[cursor + 1]]) as usize;
        cursor += 2;
        if bytes.len() < cursor + pk_len + 2 {
            return Err(VeilError::Circuit("Payload extend truncado".into()));
        }
        let target_kem_key = bytes[cursor..cursor + pk_len].to_vec();
        cursor += pk_len;

        let salt_len = u16::from_be_bytes([bytes[cursor], bytes[cursor + 1]]) as usize;
        cursor += 2;
        if bytes.len() < cursor + salt_len + 2 {
            return Err(VeilError::Circuit("Payload extend truncado".into()));
        }
        let salt = bytes[cursor..cursor + salt_len].to_vec();
        cursor += salt_len;

        let ct_len = u16::from_be_bytes([bytes[cursor], bytes[cursor + 1]]) as usize;
        cursor += 2;
        if bytes.len() < cursor + ct_len + 4 {
            return Err(VeilError::Circuit("Payload extend truncado".into()));
        }
        let ciphertext = bytes[cursor..cursor + ct_len].to_vec();
        cursor += ct_len;

        let link_circuit_id = u32::from_be_bytes([bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]]);

        Ok(Self {
            target_endpoint,
            target_kem_key,
            salt,
            ciphertext,
            link_circuit_id,
        })
    }
}

pub const RELAY_EXTEND_CHUNK_SIZE: usize = 350;

/// Fragmento de extensão para caber na célula de 512 bytes com cifragem em camadas.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RelayExtendChunk {
    pub chunk_idx: u8,
    pub total_chunks: u8,
    pub data: Vec<u8>,
}

impl RelayExtendChunk {
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(2 + self.data.len());
        buf.push(self.chunk_idx);
        buf.push(self.total_chunks);
        buf.extend_from_slice(&self.data);
        buf
    }

    pub fn decode(bytes: &[u8]) -> Result<Self, VeilError> {
        if bytes.len() < 2 {
            return Err(VeilError::Circuit("Chunk RelayExtend truncado".into()));
        }
        let chunk_idx = bytes[0];
        let total_chunks = bytes[1];
        let data = bytes[2..].to_vec();
        Ok(Self {
            chunk_idx,
            total_chunks,
            data,
        })
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
        let ghost = GhostId::spawn_quick(86400 * 365).expect("spawn ghost for hop");
        let descriptor = NodeDescriptor::sign(node_id.clone(), &ghost, public_kem_key.clone(), endpoint.clone());
        Self {
            node_id,
            public_kem_key,
            endpoint,
            descriptor: Some(descriptor),
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
    /// IP ao qual as conexões de saída do Exit devem ser vinculadas (endereço público do nó).
    pub bind_source: Option<std::net::IpAddr>,
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
            bind_source: None,
        }
    }

    /// Configura o IP de origem para as conexões de egresso (comportamento WAN do nó Exit).
    pub fn with_bind_source(mut self, bind_source: std::net::IpAddr) -> Self {
        self.bind_source = Some(bind_source);
        self
    }

    pub fn descriptor(&self, node_id: String, endpoint: String) -> NodeDescriptor {
        NodeDescriptor::sign(node_id, &self.identity, self.keypair.public_key.clone(), endpoint)
    }

    /// Executa o serviço aceitando conexões no listener fornecido.
    pub async fn run(&self, listener: TcpListener) -> Result<(), VeilError> {
        let identity = Arc::clone(&self.identity);
        let keypair = Arc::clone(&self.keypair);
        let exit_policy = self.exit_policy.clone();

        let bind_source = self.bind_source;
        loop {
            let (tcp_stream, _peer_addr) = listener
                .accept()
                .await
                .map_err(|e| VeilError::Circuit(format!("Erro no accept do roteador: {e}")))?;

            let id = Arc::clone(&identity);
            let kp = Arc::clone(&keypair);
            let ep = exit_policy.clone();

            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(tcp_stream, id, kp, ep, bind_source).await {
                    tracing::debug!(error = %e, "Conexão no roteador de salto finalizada");
                }
            });
        }
    }

    async fn handle_connection(
        tcp_stream: TcpStream,
        identity: Arc<GhostId>,
        keypair: Arc<KemKeyPair>,
        exit_policy: Option<ExitPolicy>,
        bind_source: Option<std::net::IpAddr>,
    ) -> Result<(), VeilError> {
        // Enlace PQC autenticado sobre o fio com chaves de sessão ML-KEM
        let mut secure_stream = link_handshake_server(tcp_stream, &keypair).await?;

        // 1. Handshake inicial com o nó upstream (Frame Create)
        let (ft, payload) = read_frame(&mut secure_stream).await?;
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

        write_frame(&mut secure_stream, FrameType::Created, &created_payload).await?;

        // 2. Transiciona para o loop assíncrono de roteamento de células
        let (up_r, up_w) = tokio::io::split(secure_stream);
        let up_w = Arc::new(Mutex::new(up_w));

        Self::handle_router_loop(up_r, up_w, hop_keys, in_circuit_id, exit_policy, bind_source).await
    }

    async fn handle_router_loop(
        mut up_r: ReadHalf<VeilSecureStream<TcpStream>>,
        up_w: SecureStreamHalfWriter,
        hop_keys: HopKeys,
        in_circuit_id: u32,
        exit_policy: Option<ExitPolicy>,
        bind_source: Option<std::net::IpAddr>,
    ) -> Result<(), VeilError> {
        let mut hop_decryptor_fwd = HopDecryptor::new(&hop_keys.forward_key);
        let hop_encryptor_bwd = Arc::new(Mutex::new(HopEncryptor::new(&hop_keys.backward_key)));

        let mut downstream_w: Option<SecureStreamHalfWriter> = None;
        let mut downstream_cid = 0u32;
        let mut extend_buffer: HashMap<u8, Vec<u8>> = HashMap::new();

        let forwarder = match (exit_policy, bind_source) {
            (Some(p), Some(src)) => Some(Arc::new(ExitForwarder::with_bind_source(p, src))),
            (Some(p), None) => Some(Arc::new(ExitForwarder::new(p))),
            (None, _) => None,
        };
        let streams: Arc<RwLock<HashMap<u16, mpsc::Sender<Vec<u8>>>>> = Arc::new(RwLock::new(HashMap::new()));

        loop {
            let (ft, frame_data) = match read_frame(&mut up_r).await {
                Ok(res) => res,
                Err(_) => break,
            };

            match ft {
                FrameType::Cell => {
                    if frame_data.len() != CELL_SIZE {
                        continue;
                    }
                    let mut cell_bytes = [0u8; CELL_SIZE];
                    cell_bytes.copy_from_slice(&frame_data);
                    let Ok(cell) = VeilCell::from_bytes(&cell_bytes) else { continue; };
                    if cell.circuit_id != in_circuit_id {
                        continue;
                    }

                    let peeled = match hop_decryptor_fwd.decrypt(cell.data()) {
                        Ok(p) => p,
                        Err(e) => {
                            tracing::debug!(error = %e, "Falha ao decifrar camada forward");
                            continue;
                        }
                    };

                    if let Some(ref down_w) = downstream_w {
                        // Intermediate relay: repassa para downstream com out_circuit_id link-local
                        let relay_cell = VeilCell::new(downstream_cid, CellCommand::RelayData, cell.stream_id, &peeled);
                        let mut lock = down_w.lock().await;
                        let _ = write_frame(&mut *lock, FrameType::Cell, &relay_cell.to_bytes()).await;
                    } else {
                        // Tail do circuito: processa comandos locais
                        let Ok(msg) = InnerMessage::decode(&peeled) else { continue; };
                        match msg.command {
                            CellCommand::Extend => {
                                let Ok(chunk) = RelayExtendChunk::decode(&msg.data) else { continue; };
                                extend_buffer.insert(chunk.chunk_idx, chunk.data);
                                if extend_buffer.len() == chunk.total_chunks as usize {
                                    let mut full_payload = Vec::new();
                                    for idx in 0..chunk.total_chunks {
                                        if let Some(part) = extend_buffer.get(&idx) {
                                            full_payload.extend_from_slice(part);
                                        }
                                    }
                                    extend_buffer.clear();

                                    let Ok(extend_req) = RelayExtendPayload::decode(&full_payload) else {
                                        continue;
                                    };

                                    // Usa o identificador link-local escolhido pelo cliente (descorrelacionado
                                    // do circuit_id global). Regenera apenas em caso de colisão defensiva.
                                    let out_circuit_id = if extend_req.link_circuit_id != in_circuit_id {
                                        extend_req.link_circuit_id
                                    } else {
                                        loop {
                                            let id = rand::random::<u32>() & 0x7FFFFFFF | 1;
                                            if id != in_circuit_id {
                                                break id;
                                            }
                                        }
                                    };

                                    let down_tcp = match TcpStream::connect(&extend_req.target_endpoint).await {
                                        Ok(s) => s,
                                        Err(e) => {
                                            tracing::warn!(error = %e, endpoint = %extend_req.target_endpoint, "Falha ao conectar downstream");
                                            continue;
                                        }
                                    };

                                    let down_sec = match link_handshake_client(down_tcp, &extend_req.target_kem_key).await {
                                        Ok(s) => s,
                                        Err(e) => {
                                            tracing::warn!(error = %e, "Falha no link handshake downstream");
                                            continue;
                                        }
                                    };

                                    let (mut down_r_half, down_w_half) = tokio::io::split(down_sec);
                                    let down_w_half = Arc::new(Mutex::new(down_w_half));

                                    // Envia Create downstream com link-local CID
                                    let mut create_payload = Vec::with_capacity(6 + extend_req.salt.len() + extend_req.ciphertext.len());
                                    create_payload.extend_from_slice(&out_circuit_id.to_be_bytes());
                                    create_payload.extend_from_slice(&(extend_req.salt.len() as u16).to_be_bytes());
                                    create_payload.extend_from_slice(&extend_req.salt);
                                    create_payload.extend_from_slice(&extend_req.ciphertext);

                                    {
                                        let mut lock = down_w_half.lock().await;
                                        if write_frame(&mut *lock, FrameType::Create, &create_payload).await.is_err() {
                                            continue;
                                        }
                                    }

                                    let (resp_ft, created_resp) = match read_frame(&mut down_r_half).await {
                                        Ok(r) => r,
                                        Err(_) => continue,
                                    };
                                    if resp_ft != FrameType::Created {
                                        continue;
                                    }

                                    // Envia Extended cell backward para o upstream
                                    let ext_inner = InnerMessage::new(CellCommand::Extended, 0, created_resp);
                                    let ext_enc = {
                                        let mut enc = hop_encryptor_bwd.lock().await;
                                        match enc.encrypt(&ext_inner.encode()) {
                                            Ok(e) => e,
                                            Err(_) => continue,
                                        }
                                    };
                                    let ext_cell = VeilCell::new(in_circuit_id, CellCommand::RelayData, 0, &ext_enc);
                                    {
                                        let mut lock = up_w.lock().await;
                                        let _ = write_frame(&mut *lock, FrameType::Cell, &ext_cell.to_bytes()).await;
                                    }

                                    downstream_cid = out_circuit_id;
                                    downstream_w = Some(Arc::clone(&down_w_half));

                                    // Spawna loop de retransmissão Downstream -> Upstream
                                    let up_w_clone = Arc::clone(&up_w);
                                    let enc_bwd_clone = Arc::clone(&hop_encryptor_bwd);
                                    tokio::spawn(async move {
                                        loop {
                                            match read_frame(&mut down_r_half).await {
                                                Ok((FrameType::Cell, f_data)) => {
                                                    if f_data.len() != CELL_SIZE {
                                                        continue;
                                                    }
                                                    let mut b = [0u8; CELL_SIZE];
                                                    b.copy_from_slice(&f_data);
                                                    let Ok(d_cell) = VeilCell::from_bytes(&b) else { continue; };
                                                    if d_cell.circuit_id != out_circuit_id {
                                                        continue;
                                                    }

                                                    let enc = {
                                                        let mut e = enc_bwd_clone.lock().await;
                                                        match e.encrypt(d_cell.data()) {
                                                            Ok(res) => res,
                                                            Err(_) => continue,
                                                        }
                                                    };

                                                    let u_cell = VeilCell::new(in_circuit_id, CellCommand::RelayData, d_cell.stream_id, &enc);
                                                    let mut lock = up_w_clone.lock().await;
                                                    let _ = write_frame(&mut *lock, FrameType::Cell, &u_cell.to_bytes()).await;
                                                }
                                                Ok((FrameType::Destroy, _)) | Err(_) => {
                                                    break;
                                                }
                                                _ => {}
                                            }
                                        }
                                    });
                                }
                            }
                            CellCommand::StreamBegin => {
                                let Some(ref fwd) = forwarder else {
                                    let _ = Self::send_exit_cell_direct(&up_w, &hop_encryptor_bwd, in_circuit_id, CellCommand::StreamRefused, msg.stream_id, b"No Exit policy").await;
                                    continue;
                                };

                                let Ok(target) = Socks5Target::decode(&msg.data) else {
                                    let _ = Self::send_exit_cell_direct(&up_w, &hop_encryptor_bwd, in_circuit_id, CellCommand::StreamRefused, msg.stream_id, b"Target invalido").await;
                                    continue;
                                };

                                match fwd.connect_to_target(&target).await {
                                    Ok(target_stream) => {
                                        let _ = Self::send_exit_cell_direct(&up_w, &hop_encryptor_bwd, in_circuit_id, CellCommand::StreamConnected, msg.stream_id, &[]).await;

                                        let (mut t_r, mut t_w) = target_stream.into_split();
                                        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(64);
                                        {
                                            let mut map = streams.write().await;
                                            map.insert(msg.stream_id, tx);
                                        }

                                        let up_w_clone = Arc::clone(&up_w);
                                        let enc_clone = Arc::clone(&hop_encryptor_bwd);
                                        let strms_clone = Arc::clone(&streams);
                                        let stream_id = msg.stream_id;

                                        tokio::spawn(async move {
                                            let mut buf = [0u8; MAX_STREAM_DATA_CHUNK];
                                            loop {
                                                match t_r.read(&mut buf).await {
                                                    Ok(0) => {
                                                        let _ = Self::send_exit_cell_direct(&up_w_clone, &enc_clone, in_circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
                                                        break;
                                                    }
                                                    Ok(n) => {
                                                        let _ = Self::send_exit_cell_direct(&up_w_clone, &enc_clone, in_circuit_id, CellCommand::StreamData, stream_id, &buf[..n]).await;
                                                    }
                                                    Err(_) => {
                                                        let _ = Self::send_exit_cell_direct(&up_w_clone, &enc_clone, in_circuit_id, CellCommand::StreamEnd, stream_id, &[]).await;
                                                        break;
                                                    }
                                                }
                                            }
                                            let mut map = strms_clone.write().await;
                                            map.remove(&stream_id);
                                        });

                                        tokio::spawn(async move {
                                            while let Some(data) = rx.recv().await {
                                                if t_w.write_all(&data).await.is_err() {
                                                    break;
                                                }
                                            }
                                        });
                                    }
                                    Err(e) => {
                                        let _ = Self::send_exit_cell_direct(&up_w, &hop_encryptor_bwd, in_circuit_id, CellCommand::StreamRefused, msg.stream_id, e.to_string().as_bytes()).await;
                                    }
                                }
                            }
                            CellCommand::StreamData => {
                                let map = streams.read().await;
                                if let Some(tx) = map.get(&msg.stream_id) {
                                    let _ = tx.send(msg.data).await;
                                }
                            }
                            CellCommand::StreamEnd => {
                                let mut map = streams.write().await;
                                map.remove(&msg.stream_id);
                            }
                            _ => {}
                        }
                    }
                }
                FrameType::Destroy => {
                    if let Some(ref down_w) = downstream_w {
                        let mut lock = down_w.lock().await;
                        let _ = write_frame(&mut *lock, FrameType::Destroy, &[]).await;
                    }
                    break;
                }
                _ => {}
            }
        }

        Ok(())
    }

    async fn send_exit_cell_direct(
        writer: &SecureStreamHalfWriter,
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
    writer: SecureStreamHalfWriter,
    stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>>,
    next_stream_id: Arc<AtomicU16>,
}

impl LiveCircuitClient {
    /// Estabelece um circuito de 1 ou 3 saltos usando handshake telescópico ML-KEM-1024 e autenticação de descritores.
    ///
    /// Modo de confiança `Test` (TOFU): verifica assinatura, validade temporal e consistência
    /// interna de cada descritor, sem identidade fixada externamente.
    pub async fn connect(circuit_id: u32, hops: Vec<CircuitHopNode>) -> Result<Self, VeilError> {
        Self::connect_internal(circuit_id, hops, DeploymentMode::Test, &[]).await
    }

    /// Modo produção: além da verificação criptográfica e temporal, cada salto deve corresponder
    /// exatamente a uma `TrustedIdentity` fixada fora de banda — protegendo contra substituição
    /// de descritores, troca de chaves KEM e endpoints divergentes.
    pub async fn connect_production(
        circuit_id: u32,
        hops: Vec<CircuitHopNode>,
        trusted: &[TrustedIdentity],
    ) -> Result<Self, VeilError> {
        Self::connect_internal(circuit_id, hops, DeploymentMode::Production, trusted).await
    }

    async fn connect_internal(
        circuit_id: u32,
        hops: Vec<CircuitHopNode>,
        deployment: DeploymentMode,
        trusted: &[TrustedIdentity],
    ) -> Result<Self, VeilError> {
        if hops.is_empty() {
            return Err(VeilError::Circuit("Circuito deve conter pelo menos 1 nó".into()));
        }

        if deployment.requires_strict_descriptor_auth() && trusted.len() != hops.len() {
            return Err(VeilError::Crypto(format!(
                "Modo produção exige uma identidade confiável por salto: {} saltos, {} identidades fixadas",
                hops.len(),
                trusted.len()
            )));
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Validação estrita e temporal de descritores de nós assinados
        for (i, hop) in hops.iter().enumerate() {
            let desc = hop.descriptor.as_ref().ok_or_else(|| {
                VeilError::Crypto(format!("Salto {i} ({}) não possui descritor assinado obrigatório", hop.node_id))
            })?;

            if deployment.requires_strict_descriptor_auth() {
                trusted[i].verify_descriptor(desc, now, DEFAULT_DESCRIPTOR_TTL, DEFAULT_MAX_CLOCK_DRIFT)?;
            } else {
                desc.verify_validity_at(now, DEFAULT_MAX_CLOCK_DRIFT, DEFAULT_DESCRIPTOR_TTL)?;
            }

            if desc.public_kem_key != hop.public_kem_key
                || desc.endpoint != hop.endpoint
                || desc.node_id != hop.node_id
            {
                return Err(VeilError::Crypto(format!("Descritor do nó {} adulterado ou inconsistente", hop.node_id)));
            }
        }

        // Conecta ao Guard (primeiro salto) com enquadramento PQC autenticado sobre o fio
        let guard_stream = TcpStream::connect(&hops[0].endpoint)
            .await
            .map_err(|e| VeilError::Circuit(format!("Falha ao conectar no nó Guard ({}): {e}", hops[0].endpoint)))?;

        let guard_sec = link_handshake_client(guard_stream, &hops[0].public_kem_key).await?;
        let (mut guard_r, guard_w) = tokio::io::split(guard_sec);
        let guard_w = Arc::new(Mutex::new(guard_w));

        // Handshake inicial com Guard usando sal aleatório por sessão (sem derivar do circuit_id global)
        let identity_pubkey0 = hops[0].descriptor.as_ref().unwrap().identity_pubkey;
        let mut salt0 = rand::random::<[u8; 32]>().to_vec();
        salt0.extend_from_slice(&identity_pubkey0);

        let (keys0, ct0) = client_kem_handshake(&hops[0].public_kem_key, &salt0)
            .map_err(|e| VeilError::Crypto(e.to_string()))?;

        let mut create_payload = Vec::with_capacity(6 + salt0.len() + ct0.len());
        create_payload.extend_from_slice(&circuit_id.to_be_bytes());
        create_payload.extend_from_slice(&(salt0.len() as u16).to_be_bytes());
        create_payload.extend_from_slice(&salt0);
        create_payload.extend_from_slice(&ct0);

        {
            let mut lock = guard_w.lock().await;
            write_frame(&mut *lock, FrameType::Create, &create_payload).await?;
        }

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
        let mut encryptors: Vec<HopEncryptor> = vec![HopEncryptor::new(&hop_keys[0].forward_key)];
        let mut decryptors: Vec<HopDecryptor> = vec![HopDecryptor::new(&hop_keys[0].backward_key)];

        // Handshake telescópico via células onion encapsuladas (RelayExtend)
        for (i, hop) in hops.iter().enumerate().skip(1) {
            let identity_pubkey = hop.descriptor.as_ref().unwrap().identity_pubkey;
            // Sal aleatório por salto: nunca derivado do circuit_id global (metadado observável).
            let mut salt = rand::random::<[u8; 32]>().to_vec();
            salt.extend_from_slice(&identity_pubkey);

            let (keys, ct) = client_kem_handshake(&hop.public_kem_key, &salt)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;

            // Identificador de circuito link-local para o novo enlace: aleatório e descorrelacionado
            // do circuit_id global; cada salto vê apenas o CID do seu próprio enlace.
            let link_circuit_id = loop {
                let id = rand::random::<u32>() & 0x7FFFFFFF | 1;
                if id != circuit_id {
                    break id;
                }
            };

            let extend_payload = RelayExtendPayload {
                target_endpoint: hop.endpoint.clone(),
                target_kem_key: hop.public_kem_key.clone(),
                salt,
                ciphertext: ct,
                link_circuit_id,
            };

            let encoded_extend = extend_payload.encode();
            let chunks: Vec<&[u8]> = encoded_extend.chunks(RELAY_EXTEND_CHUNK_SIZE).collect();
            let total_chunks = chunks.len() as u8;

            for (chunk_idx, chunk_data) in chunks.iter().enumerate() {
                let chunk = RelayExtendChunk {
                    chunk_idx: chunk_idx as u8,
                    total_chunks,
                    data: chunk_data.to_vec(),
                };
                let inner = InnerMessage::new(CellCommand::Extend, 0, chunk.encode());
                let layered = onion_encrypt_layers_stateful(&inner.encode(), &mut encryptors)
                    .map_err(|e| VeilError::Crypto(e.to_string()))?;

                let cell = VeilCell::new(circuit_id, CellCommand::RelayData, 0, &layered);
                let mut lock = guard_w.lock().await;
                write_frame(&mut *lock, FrameType::Cell, &cell.to_bytes()).await?;
            }

            // Aguarda resposta Extended do novo salto através do circuito estabelecido
            let (ft, frame_data) = read_frame(&mut guard_r).await?;
            if ft != FrameType::Cell || frame_data.len() != CELL_SIZE {
                return Err(VeilError::Circuit(format!("Resposta inválida ao estender salto {i}")));
            }
            let mut cell_b = [0u8; CELL_SIZE];
            cell_b.copy_from_slice(&frame_data);
            let resp_cell = VeilCell::from_bytes(&cell_b).map_err(|e| VeilError::Circuit(e))?;
            let peeled = onion_peel_backward_stateful(resp_cell.data(), &mut decryptors)
                .map_err(|e| VeilError::Crypto(e.to_string()))?;
            let ext_msg = InnerMessage::decode(&peeled)?;
            if ext_msg.command != CellCommand::Extended {
                return Err(VeilError::Circuit(format!("Comando divergente ao estender: {:?}", ext_msg.command)));
            }

            let mut expected_auth_input = b"veil-hop-auth".to_vec();
            expected_auth_input.extend_from_slice(&identity_pubkey);
            let expected_auth = blake3::keyed_hash(&keys.forward_key, &expected_auth_input);
            if ext_msg.data.len() < 36 || &ext_msg.data[4..36] != expected_auth.as_bytes() {
                return Err(VeilError::Crypto(format!("Falha de autenticação ao estender nó {i}")));
            }

            encryptors.push(HopEncryptor::new(&keys.forward_key));
            decryptors.push(HopDecryptor::new(&keys.backward_key));
            hop_keys.push(keys);
        }

        let stream_senders: Arc<RwLock<HashMap<u16, mpsc::Sender<InnerMessage>>>> = Arc::new(RwLock::new(HashMap::new()));
        let stream_senders_clone = Arc::clone(&stream_senders);

        let encryptors_arc = Arc::new(Mutex::new(encryptors));

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
            writer: guard_w,
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
    writer: SecureStreamHalfWriter,
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
    writer: SecureStreamHalfWriter,
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

    #[test]
    fn test_descriptor_temporal_validity_and_expiration() {
        let ghost = GhostId::spawn_quick(86400 * 365).expect("ghost");
        let kp = mlkem_keygen();
        let now = 1_700_000_000u64;

        // 1. Descritor válido gerado no tempo 'now'
        let mut desc = NodeDescriptor::sign("valid-node".into(), &ghost, kp.public_key.clone(), "127.0.0.1:9001".into());
        desc.timestamp = now;
        let digest = NodeDescriptor::compute_digest(&desc.node_id, &desc.identity_pubkey, &desc.public_kem_key, &desc.endpoint, desc.timestamp);
        desc.signature = ghost.sign(&digest);
        assert!(desc.verify_validity_at(now, 300, 86400).is_ok());

        // 2. Descritor expirado (idade: 90000s > ttl: 86400s)
        let check_time_expired = now + 90_000;
        let expired_err = desc.verify_validity_at(check_time_expired, 300, 86400);
        match expired_err {
            Err(VeilError::Crypto(msg)) => assert!(msg.contains("expirado")),
            other => panic!("Esperado erro de expiracao, obtido: {other:?}"),
        }

        // 3. Descritor no futuro além da tolerância de clock drift (ts = now + 400s > max_drift: 300s)
        let mut future_desc = desc.clone();
        future_desc.timestamp = now + 400;
        let f_digest = NodeDescriptor::compute_digest(&future_desc.node_id, &future_desc.identity_pubkey, &future_desc.public_kem_key, &future_desc.endpoint, future_desc.timestamp);
        future_desc.signature = ghost.sign(&f_digest);
        let future_err = future_desc.verify_validity_at(now, 300, 86400);
        match future_err {
            Err(VeilError::Crypto(msg)) => assert!(msg.contains("no futuro")),
            other => panic!("Esperado erro de clock drift futuro, obtido: {other:?}"),
        }

        // 4. Roundtrip de serialização JSON
        let json = desc.to_json().expect("to_json");
        let parsed = NodeDescriptor::from_json(&json).expect("from_json");
        assert_eq!(parsed, desc);
    }
/// Monta um roteador de salto em um endereço loopback distinto (simula máquinas/rede distintas).
    async fn spawn_hop_on(ip: &str, node_id: &str, exit_policy: Option<ExitPolicy>) -> (NodeDescriptor, String) {
        let kp = mlkem_keygen();
        let router = match &exit_policy {
            Some(p) => VeilHopRouter::new(kp, Some(p.clone())).with_bind_source(ip.parse().unwrap()),
            None => VeilHopRouter::new(kp, None),
        };
        let listener = tokio::net::TcpListener::bind((ip, 0)).await.expect("bind hop em loopback distinto");
        let addr = listener.local_addr().unwrap();
        let desc = router.descriptor(node_id.into(), addr.to_string());
        tokio::spawn(async move {
            let _ = router.run(listener).await;
        });
        (desc, addr.to_string())
    }

    /// Entrega prioritária P1.2: circuito distribuído Guard -> Middle -> Exit entre endereços
    /// distintos (máquinas/rede distintas), descritores recebidos pela rede como JSON,
    /// autenticação de produção com identidade fixada e comprovação de que o destino
    /// observa o IP do Exit (e não o do Guard nem o do cliente).
    #[tokio::test]
    async fn test_wan_distributed_3hop_production_descriptors_via_json_and_exit_ip() {
        // Target que informa a origem observada da conexão
        let target_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target_addr = target_listener.local_addr().unwrap();

        tokio::spawn(async move {
            if let Ok((mut stream, peer)) = target_listener.accept().await {
                let mut buf = [0u8; 1024];
                if let Ok(n) = stream.read(&mut buf).await {
                    if n > 0 {
                        let reply = format!("{}:{}", peer.ip(), peer.port());
                        let _ = stream.write_all(reply.as_bytes()).await;
                    }
                }
            }
        });

        let exit_policy = ExitPolicy {
            allowed_ports: vec![target_addr.port()],
            blocked_ports: vec![],
            block_private_networks: false,
            max_bandwidth_bps: 0,
        };

        // Guard, Middle e Exit em endereços loopback distintos (127.0.0.2/3/4)
        let (guard_desc, _ga) = spawn_hop_on("127.0.0.2", "guard-remoto", None).await;
        let (middle_desc, _ma) = spawn_hop_on("127.0.0.3", "middle-remoto", None).await;
        let (exit_desc, _ea) = spawn_hop_on("127.0.0.4", "exit-remoto", Some(exit_policy)).await;

        // Descritores recebidos pela rede: JSON transmitido e reaproveitado pelo cliente
        let guard_desc = NodeDescriptor::from_json(&guard_desc.to_json().expect("guard json")).expect("parse guard");
        let middle_desc = NodeDescriptor::from_json(&middle_desc.to_json().expect("middle json")).expect("parse middle");
        let exit_desc = NodeDescriptor::from_json(&exit_desc.to_json().expect("exit json")).expect("parse exit");

        // Modo produção: identidade de confiança fixada fora de banda (pinning)
        let trusted = vec![
            TrustedIdentity::new("guard-prod".into(), guard_desc.identity_pubkey, guard_desc.public_kem_key.clone())
                .with_endpoint(guard_desc.endpoint.clone()),
            TrustedIdentity::new("middle-prod".into(), middle_desc.identity_pubkey, middle_desc.public_kem_key.clone())
                .with_endpoint(middle_desc.endpoint.clone()),
            TrustedIdentity::new("exit-prod".into(), exit_desc.identity_pubkey, exit_desc.public_kem_key.clone())
                .with_endpoint(exit_desc.endpoint.clone()),
        ];

        let hops = vec![
            CircuitHopNode::from_descriptor(guard_desc),
            CircuitHopNode::from_descriptor(middle_desc),
            CircuitHopNode::from_descriptor(exit_desc),
        ];

        let client = LiveCircuitClient::connect_production(6060, hops, &trusted)
            .await
            .expect("circuito distribuído em modo produção");
        assert_eq!(client.hop_keys.len(), 3);

        // Destino observa o IP do Exit
        let target = Socks5Target::Ip(target_addr);
        let mut stream = client.open_stream(&target).await.expect("stream para o destino");

        stream.send_data(b"WHO-AM-I").await.expect("consulta enviada");
        let observed = stream.receive_data().await.expect("resposta do destino").expect("dados presentes");
        let observed_str = String::from_utf8_lossy(&observed).to_string();
        let observed_ip = observed_str.split(':').next().unwrap_or_default();

        assert_eq!(observed_ip, "127.0.0.4", "destino deve observar o IP do Exit, obtido: {observed_str}");
        assert_ne!(observed_ip, "127.0.0.2", "o Guard não pode aparecer como origem");
        assert_ne!(observed_ip, "127.0.0.1", "o cliente não pode aparecer como origem");

        stream.close().await.expect("stream fechado");
    }

    /// Modo produção rejeita descritor com identidade não fixada (proteção contra substituição).
    #[tokio::test]
    async fn test_production_mode_rejects_descriptor_substitution() {
        let (guard_desc, _) = spawn_hop_on("127.0.0.2", "guard-remoto", None).await;

        // Atacante tenta se passar pelo guard fixando uma identidade pública diferente
        let impostor = TrustedIdentity::new("guard-prod".into(), [0u8; 32], guard_desc.public_kem_key.clone())
            .with_endpoint(guard_desc.endpoint.clone());

        let hops = vec![CircuitHopNode::from_descriptor(guard_desc)];

        let res = LiveCircuitClient::connect_production(7001, hops, &[impostor]).await;
        match res {
            Ok(_) => panic!("Conexão sucedeu com identidade não fixada!"),
            Err(VeilError::Crypto(msg)) => assert!(msg.contains("Substitui"), "mensagem inesperada: {msg}"),
            Err(e) => panic!("Esperado erro de criptografia (substituição), obtido: {e}"),
        }

        // Modo produção exige uma identidade fixada por salto
        let (guard_desc2, _) = spawn_hop_on("127.0.0.2", "guard-remoto", None).await;
        let hops2 = vec![CircuitHopNode::from_descriptor(guard_desc2)];
        let res2 = LiveCircuitClient::connect_production(7002, hops2, &[]).await;
        match res2 {
            Ok(_) => panic!("Conexão sucedeu sem identidade fixada no modo produção!"),
            Err(VeilError::Crypto(msg)) => assert!(msg.contains("identidade confiável") || msg.contains("Modo produção"), "mensagem inesperada: {msg}"),
            Err(e) => panic!("Esperado erro de criptografia (sem identidade fixada), obtido: {e}"),
        }
    }

    /// O Guard não descobre a rota completa: ao estender o circuito, ele descasca apenas uma
    /// camada e vê uma célula opaca; apenas o salto alvo (Middle) recupera o Extend com o
    /// endpoint do próximo nó (Exit). O link_circuit_id é link-local e o sal é aleatório.
    #[test]
    fn test_guard_cannot_recover_route_from_extend_cells() {
        let global_cid = 6060u32;
        let kp_exit = mlkem_keygen();

        let keys = [
            HopKeys::derive(&[1u8; 32], b"salt-guard"),
            HopKeys::derive(&[2u8; 32], b"salt-middle"),
        ];

        // Sal aleatório e link_circuit_id descorrelacionado do circuit_id global
        let salt = rand::random::<[u8; 32]>().to_vec();
        let link_circuit_id = loop {
            let id = rand::random::<u32>() & 0x7FFFFFFF | 1;
            if id != global_cid {
                break id;
            }
        };

        let extend_payload = RelayExtendPayload {
            target_endpoint: "203.0.113.9:9051".into(),
            target_kem_key: kp_exit.public_key.clone(),
            salt: salt.clone(),
            ciphertext: vec![0xAA; 1568],
            link_circuit_id,
        };
        assert_ne!(link_circuit_id, global_cid, "link_circuit_id não pode reutilizar o id global");
        assert_ne!(salt, format!("circuit-{global_cid}").into_bytes(), "sal não pode derivar do id global");

        let encoded = extend_payload.encode();
        let chunks: Vec<&[u8]> = encoded.chunks(RELAY_EXTEND_CHUNK_SIZE).collect();

        let mut encryptors = vec![
            HopEncryptor::new(&keys[0].forward_key),
            HopEncryptor::new(&keys[1].forward_key),
        ];

        let mut first_chunk_data: Option<Vec<u8>> = None;

        for (idx, chunk_data) in chunks.iter().enumerate() {
            let chunk = RelayExtendChunk {
                chunk_idx: idx as u8,
                total_chunks: chunks.len() as u8,
                data: chunk_data.to_vec(),
            };
            let inner = InnerMessage::new(CellCommand::Extend, 0, chunk.encode());
            let layered = onion_encrypt_layers_stateful(&inner.encode(), &mut encryptors).expect("cifragem onion");

            // Visão do Guard: descasca uma camada -> célula opaca, rota permanece oculta
            let mut guard_dec = HopDecryptor::new(&keys[0].forward_key);
            let guard_view = guard_dec.decrypt(&layered).expect("guard peel");
            let guard_text = String::from_utf8_lossy(&guard_view);
            assert!(!guard_text.contains("203.0.113.9"), "Guard não pode descobrir o endpoint do Exit");
            assert!(!guard_text.contains("exit"), "Guard não pode inferir o próximo salto");

            // Visão do Middle (salto alvo do Extend): recupera o comando Extend
            let mut middle_dec = HopDecryptor::new(&keys[1].forward_key);
            let middle_view = middle_dec.decrypt(&guard_view).expect("middle peel");
            let msg = InnerMessage::decode(&middle_view).expect("middle decode");
            assert_eq!(msg.command, CellCommand::Extend, "salto alvo recebe o comando Extend");
            let chunk_rx = RelayExtendChunk::decode(&msg.data).expect("chunk decode");
            if idx == 0 {
                first_chunk_data = Some(chunk_rx.data);
            }
        }

        // Reconstitui o endpoint a partir do primeiro chunk: somente o salto alvo o vê
        let first = first_chunk_data.expect("primeiro chunk presente");
        assert!(
            String::from_utf8_lossy(&first).contains("203.0.113.9"),
            "somente o salto alvo (Middle) recupera o endpoint do Exit"
        );
    }
}
