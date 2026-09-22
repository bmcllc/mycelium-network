//! Camada 1 — Fragmentação Segura: QEL Tunneling (Quantum Entanglement-Lattice).
//!
//! Corrige a vulnerabilidade do GhostVPN legado: nenhuma chave de sessão (`sessionKey`)
//! é serializada junto aos fragmentos. A segurança do segredo depende do quorum $k$-de-$n$
//! de shards matematicamente independentes via Shamir Secret Sharing.

use crate::layers::VeilLayer;
use crate::VeilError;
use mycelium_qel::{fragment, reconstruct, QelConfig, QelShard};
use serde::{Deserialize, Serialize};

/// Envelope seguro de fragmentos QEL para transporte no túnel.
#[derive(Serialize, Deserialize)]
struct QelEnvelope {
    threshold: u8,
    total: u8,
    shards: Vec<QelShard>,
}

/// Camada 1 do Veil: Fragmentação e dispersão QEL.
pub struct FragmentationLayer {
    active: bool,
    threshold: u8,
    total: u8,
}

impl Default for FragmentationLayer {
    fn default() -> Self {
        Self::new(2, 3) // 2-de-3 por padrão para baixa latência
    }
}

impl FragmentationLayer {
    pub fn new(threshold: u8, total: u8) -> Self {
        Self {
            active: true,
            threshold,
            total,
        }
    }

    /// Fragmenta os dados brutos em shards QEL seguros.
    pub fn fragment_data(&self, data: &[u8]) -> Result<Vec<QelShard>, VeilError> {
        let config = QelConfig {
            threshold: self.threshold,
            total: self.total,
            ttl_secs: 3600,
        };
        fragment(data, "veil-datagram", &config)
            .map_err(|e| VeilError::Layer(format!("falha na fragmentação QEL: {e}")))
    }

    /// Reconstrói os dados originais a partir de um conjunto de shards (mínimo k).
    pub fn reconstruct_data(&self, shards: &[QelShard]) -> Result<Vec<u8>, VeilError> {
        reconstruct(shards)
            .map_err(|e| VeilError::Layer(format!("falha na reconstrução QEL: {e}")))
    }
}

impl VeilLayer for FragmentationLayer {
    fn name(&self) -> &'static str {
        "Camada 1 — Fragmentação Segura (QEL Tunneling)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        // Sharding Shamir sem vazar sessionKey
        let shards = self.fragment_data(data)?;
        let envelope = QelEnvelope {
            threshold: self.threshold,
            total: self.total,
            shards,
        };

        serde_json::to_vec(&envelope)
            .map_err(|e| VeilError::Layer(format!("falha na serialização do envelope QEL: {e}")))
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let envelope: QelEnvelope = serde_json::from_slice(data)
            .map_err(|e| VeilError::Layer(format!("falha na desserialização do envelope QEL: {e}")))?;

        // Reconstrói a partir dos shards presentes no envelope
        self.reconstruct_data(&envelope.shards)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qel_fragmentation_roundtrip_without_session_key_leak() {
        let layer = FragmentationLayer::new(2, 3);
        let secret_payload = b"dados confidenciais que nunca revelam a chave de sessao";

        let encoded = layer.process(secret_payload).expect("process sharding");

        // Garante que a string 'sessionKey' não existe no payload serializado
        let serialized_str = String::from_utf8_lossy(&encoded);
        assert!(
            !serialized_str.contains("sessionKey"),
            "Vulnerabilidade legada detectada: sessionKey nao pode estar no envelope!"
        );

        let recovered = layer.recover(&encoded).expect("recover reconstruction");
        assert_eq!(recovered, secret_payload);
    }

    #[test]
    fn partial_shards_reconstruction() {
        let layer = FragmentationLayer::new(2, 3);
        let data = b"reconhecimento com quorum minimo";
        let shards = layer.fragment_data(data).expect("fragment");
        assert_eq!(shards.len(), 3);

        // Apenas 2 shards (quorum atingido) devem ser suficientes
        let partial = vec![shards[0].clone(), shards[2].clone()];
        let recovered = layer.reconstruct_data(&partial).expect("reconstruct 2-of-3");
        assert_eq!(recovered, data);
    }
}
