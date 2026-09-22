//! # mycelium-veil — Protocolo VEIL Ω
//!
//! Infraestrutura P2P pós-quântica de privacidade, comunicação e anonimato
//! sobre o Mycelium Network, fundindo:
//! - Criptografia em Camadas ML-KEM-1024 + AEAD ChaCha20-Poly1305.
//! - Plano LIVE (circuitos onion interativos em 1 ou 3 saltos).
//! - Plano MIX (mixnet estocástica com atrasos de Poisson e tráfego de cobertura).
//! - As 7 Camadas Herdadas e Corrigidas do ET-COSMIC-OLD (GhostVPN):
//!   0. Identidade (GhostID efêmero + MAC local administrado)
//!   1. Fragmentação Segura (QEL sem vazar sessionKey)
//!   2. Transporte Fantasma (DistanceBridge multi-canal)
//!   3. Consenso Causal e Anti-Replay (HashChronicle + Cone de Luz)
//!   4. Execução Invisível (ANIMUS/COSMIC Sandbox)
//!   5. Ofuscação Temporal (QRC + Padding Estocástico)
//!   6. Zero-Trace em RAM & Auditabilidade ZKP (Pedersen H Independente)
//! - Proxy SOCKS5 Local (RFC 1928) com Prevenção Total de Vazamento DNS.
//! - Nó de Saída (Exit Node) com Proteção Anti-SSRF.
//! - Kill Switch Fail-Closed e Abstração de Túnel de Sistema.

pub mod config;
pub mod crypto;
pub mod exit;
pub mod layers;
pub mod planes;
pub mod socks5;
pub mod tunnel;

pub use config::{ExitPolicy, VeilConfig, VeilMode};
pub use crypto::cell::{CellCommand, VeilCell, CELL_SIZE};
pub use crypto::{HopKeys, CryptoError};
pub use exit::{ExitForwarder, ExitPolicyValidator};
pub use layers::{LayerPipeline, VeilLayer};
pub use planes::live::{CircuitHopNode, LiveCircuit, LiveCircuitManager};
pub use planes::mix::{MixMessage, MixPlane};
pub use socks5::{proxy_socks5_connection, Socks5Server, Socks5Target};
pub use tunnel::{KillSwitch, KillSwitchState, PlatformTunnelType, SystemTunnel};
pub use mycelium_pqc;

use std::sync::{Arc, Mutex};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Erros centrais do Mycelium VEIL Ω.
#[derive(Debug, thiserror::Error)]
pub enum VeilError {
    #[error("erro criptográfico: {0}")]
    Crypto(String),
    #[error("erro em camada do pipeline: {0}")]
    Layer(String),
    #[error("erro de circuito: {0}")]
    Circuit(String),
    #[error("erro SOCKS5: {0}")]
    Socks5(String),
    #[error("erro no nó Exit: {0}")]
    Exit(String),
    #[error("erro no túnel de sistema: {0}")]
    Tunnel(String),
    #[error("nenhuma sessão ativa")]
    NoActiveSession,
}

/// Sessão ativa do Veil com isolamento e descarte seguro em memória.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct VeilSession {
    #[zeroize(skip)]
    pub session_id: String,
    #[zeroize(skip)]
    pub mode: VeilMode,
    #[zeroize(skip)]
    pub started_at: u64,
    pub bytes_routed: u64,
    #[zeroize(skip)]
    pub active_layers: usize,
    pub mac_address: [u8; 6],
    #[zeroize(skip)]
    pub exit_node: String,
}

/// Motor principal do Mycelium VEIL Ω.
pub struct VeilEngine {
    config: VeilConfig,
    pipeline: LayerPipeline,
    live_manager: LiveCircuitManager,
    mix_plane: MixPlane,
    tunnel: SystemTunnel,
    session: Arc<Mutex<Option<VeilSession>>>,
}

impl VeilEngine {
    pub fn new(config: VeilConfig) -> Self {
        let mut pipeline = LayerPipeline::new();
        pipeline.activate_all();

        let live_manager = LiveCircuitManager::new();
        let mix_plane = MixPlane::new(1, config.mix_cover_rate_hz);
        let tunnel = SystemTunnel::new("veil0".into(), PlatformTunnelType::UserspaceProxy);

        Self {
            config,
            pipeline,
            live_manager,
            mix_plane,
            tunnel,
            session: Arc::new(Mutex::new(None)),
        }
    }

    /// Inicia uma nova sessão Veil com identidade efêmera e MAC administrado localmente.
    pub fn start_session(&self, mode: VeilMode) -> Result<VeilSession, VeilError> {
        let session_id = format!("veil_{}_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis(), hex::encode(&rand::random::<[u8; 4]>()));

        // Obtém MAC da camada 0
        let mac_address = if let Some(l0) = self.pipeline.layers.first() {
            let mut buf = [0u8; 6];
            let out = l0.process(b"")?;
            if out.len() >= 38 {
                buf.copy_from_slice(&out[32..38]);
            }
            buf
        } else {
            [0x02, 0x00, 0x00, 0x00, 0x00, 0x01]
        };

        let exit_hash = blake3::hash(&rand::random::<[u8; 32]>());
        let exit_node = hex::encode(&exit_hash.as_bytes()[..8]);

        let session = VeilSession {
            session_id: session_id.clone(),
            mode,
            started_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
            bytes_routed: 0,
            active_layers: self.pipeline.layers.iter().filter(|l| l.is_active()).count(),
            mac_address,
            exit_node,
        };

        *self.session.lock().unwrap() = Some(session.clone());
        tracing::info!(session_id = %session_id, mode = ?mode, "Sessão VEIL Ω iniciada com sucesso");

        Ok(session)
    }

    /// Roteia dados através das 7 camadas ativas (encapsulamento de saída).
    pub fn route(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        // Verifica Kill Switch
        self.tunnel.kill_switch.allow_traffic()?;

        let mut lock = self.session.lock().unwrap();
        let session = lock.as_mut().ok_or(VeilError::NoActiveSession)?;

        let processed = self.pipeline.process(data)?;
        session.bytes_routed += processed.len() as u64;

        Ok(processed)
    }

    /// Decodifica dados recebidos na ordem reversa das camadas (desencapsulamento de entrada).
    pub fn decode(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        self.tunnel.kill_switch.allow_traffic()?;
        self.pipeline.recover(data)
    }

    /// Encerra a sessão ativa e destrói o material criptográfico volátil em memória.
    pub fn stop_session(&self) {
        let mut lock = self.session.lock().unwrap();
        if let Some(session) = lock.take() {
            tracing::info!(session_id = %session.session_id, bytes = session.bytes_routed, "Sessão VEIL Ω encerrada e memória limpa");
        }
    }

    /// Configuração do motor.
    pub fn config(&self) -> &VeilConfig {
        &self.config
    }

    /// Retorna as estatísticas da sessão atual.
    pub fn is_active(&self) -> bool {
        self.session.lock().unwrap().is_some()
    }

    /// Retorna uma cópia da sessão ativa (se houver).
    pub fn current_session(&self) -> Option<VeilSession> {
        self.session.lock().unwrap().clone()
    }

    /// Acesso ao Kill Switch.
    pub fn kill_switch(&self) -> &KillSwitch {
        &self.tunnel.kill_switch
    }

    /// Acesso ao gerenciador de circuitos LIVE.
    pub fn live_circuits(&self) -> &LiveCircuitManager {
        &self.live_manager
    }

    /// Acesso ao plano MIX.
    pub fn mix_plane(&self) -> &MixPlane {
        &self.mix_plane
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_7_layer_pipeline_roundtrip() {
        let config = VeilConfig::default();
        let engine = VeilEngine::new(config);

        let session = engine.start_session(VeilMode::Veil).expect("start session");
        assert_eq!(session.active_layers, 7);

        let original_data = b"requisicao secreta navegando atraves das 7 camadas do Mycelium VEIL";

        // Encapsula nas 7 camadas (0 -> 6)
        let routed = engine.route(original_data).expect("route through 7 layers");
        assert_ne!(routed, original_data);

        // Desencapsula na ordem reversa (6 -> 0)
        let recovered = engine.decode(&routed).expect("decode through 7 layers");
        assert_eq!(recovered, original_data);

        engine.stop_session();
        assert!(!engine.is_active());
    }

    #[test]
    fn kill_switch_blocks_route_when_triggered() {
        let config = VeilConfig::default();
        let engine = VeilEngine::new(config);
        engine.start_session(VeilMode::Geo).expect("start session");

        // Circuito saudavel: transita normalmente
        assert!(engine.route(b"ping").is_ok());

        // Simula queda de circuito
        engine.kill_switch().trigger("Circuito interrompido");

        // Deve falhar imediatamente (fail-closed)
        assert!(engine.route(b"ping").is_err());
    }
}
