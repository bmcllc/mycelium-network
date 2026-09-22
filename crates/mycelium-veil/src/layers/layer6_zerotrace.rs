//! Camada 6 — Zero-Trace: Operação em RAM e Logs Criptográficos ZK.
//!
//! Elimina qualquer rastro em disco persistente e utiliza Pedersen Commitments
//! auditados (com gerador $H$ independente) para provar a existência de datagramas
//! sem revelar conteúdo, IPs ou identificadores de nós.

use crate::layers::VeilLayer;
use crate::VeilError;
use mycelium_zkp::{pedersen_commit, pedersen_open};
use rand::RngCore;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Comprimento do compromisso de Pedersen (32 bytes).
pub const ZK_COMMITMENT_LEN: usize = 32;

/// Registro de log Zero-Trace volátil mantido temporariamente em RAM.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct ZeroTraceRecord {
    pub commitment: [u8; 32],
    pub blinding: [u8; 32],
    pub value_length: u64,
}

/// Camada 6 do Veil: Zero-Trace e Provas ZK.
pub struct ZeroTraceLayer {
    active: bool,
}

impl Default for ZeroTraceLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl ZeroTraceLayer {
    pub fn new() -> Self {
        Self { active: true }
    }

    /// Gera um commitment de Pedersen auditado para comprovar a transmissão em RAM.
    pub fn create_zk_record(&self, data: &[u8]) -> ZeroTraceRecord {
        let mut blinding = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut blinding);
        let value = data.len() as u64;
        let commitment = pedersen_commit(value, blinding);

        ZeroTraceRecord {
            commitment,
            blinding,
            value_length: value,
        }
    }

    /// Verifica a abertura do compromisso de Pedersen.
    pub fn verify_zk_record(&self, record: &ZeroTraceRecord) -> bool {
        pedersen_open(&record.commitment, record.value_length, record.blinding)
    }
}

impl VeilLayer for ZeroTraceLayer {
    fn name(&self) -> &'static str {
        "Camada 6 — Zero-Trace (RAM-Only + ZK-Logs)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let record = self.create_zk_record(data);

        // Anexa o commitment de Pedersen de 32 bytes no início do payload
        let mut out = Vec::with_capacity(ZK_COMMITMENT_LEN + data.len());
        out.extend_from_slice(&record.commitment);
        out.extend_from_slice(data);
        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < ZK_COMMITMENT_LEN {
            return Err(VeilError::Layer(
                "Dados insuficientes para compromisso ZK de Camada 6".into(),
            ));
        }

        let commitment = &data[..ZK_COMMITMENT_LEN];
        let payload = &data[ZK_COMMITMENT_LEN..];

        // Garante que o compromisso não é nulo
        if commitment.iter().all(|&b| b == 0) {
            return Err(VeilError::Layer("Compromisso ZK nulo inválido".into()));
        }

        Ok(payload.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_trace_layer_roundtrip() {
        let layer = ZeroTraceLayer::new();
        let payload = b"transmissao ram-only sem rastros em disco";

        let processed = layer.process(payload).expect("process zero-trace");
        assert_eq!(processed.len(), ZK_COMMITMENT_LEN + payload.len());

        let recovered = layer.recover(&processed).expect("recover zero-trace");
        assert_eq!(recovered, payload);
    }

    #[test]
    fn pedersen_zk_record_verification() {
        let layer = ZeroTraceLayer::new();
        let data = b"conteudo confidencial";
        let record = layer.create_zk_record(data);
        assert!(layer.verify_zk_record(&record));

        let mut tampered = record.clone();
        tampered.value_length += 1;
        assert!(!layer.verify_zk_record(&tampered));
    }
}
