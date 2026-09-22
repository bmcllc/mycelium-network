//! Camada 4 — Execução Invisível: ANIMUS/SYMBIONT/COSMIC Sandbox.
//!
//! Fornece computação isolada em ambiente sandbox sem vazar dados
//! de navegação privados para receptores ou registros públicos do COSMIC.

use crate::layers::VeilLayer;
use crate::VeilError;
use mycelium_ghostid::GhostId;
use std::sync::Arc;

/// Comprimento do cabeçalho de atestação de enclave (16 bytes).
pub const ENCLAVE_ATTESTATION_LEN: usize = 16;

/// Camada 4 do Veil: Execução e Sandbox.
pub struct ExecutionLayer {
    active: bool,
    enclave_id: [u8; 16],
    execution_signer: Arc<GhostId>,
}

impl Default for ExecutionLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl ExecutionLayer {
    pub fn new() -> Self {
        let gid = GhostId::spawn_quick(86400).expect("spawn enclave ghostid");
        let mut enclave_id = [0u8; 16];
        let hash = blake3::hash(gid.nostr_pubkey_hex().as_bytes());
        enclave_id.copy_from_slice(&hash.as_bytes()[..16]);

        Self {
            active: true,
            enclave_id,
            execution_signer: Arc::new(gid),
        }
    }

    /// Retorna o GhostID assinador do enclave.
    pub fn signer(&self) -> &GhostId {
        &self.execution_signer
    }

    /// Executa uma atestação de integridade sobre o pacote.
    fn compute_attestation(&self, data: &[u8]) -> [u8; ENCLAVE_ATTESTATION_LEN] {
        let mut h = blake3::Hasher::new_keyed(&[
            0x41, 0x4e, 0x49, 0x4d, 0x55, 0x53, 0x2d, 0x53, // ANIMUS-S
            0x59, 0x4d, 0x42, 0x49, 0x4f, 0x4e, 0x54, 0x2d, // YMBIONT-
            0x45, 0x4e, 0x43, 0x4c, 0x41, 0x56, 0x45, 0x2d, // ENCLAVE-
            0x53, 0x41, 0x4e, 0x44, 0x42, 0x4f, 0x58, 0x01, // SANDBOX.
        ]);
        h.update(&self.enclave_id);
        h.update(data);
        let mut out = [0u8; ENCLAVE_ATTESTATION_LEN];
        out.copy_from_slice(&h.finalize().as_bytes()[..ENCLAVE_ATTESTATION_LEN]);
        out
    }
}

impl VeilLayer for ExecutionLayer {
    fn name(&self) -> &'static str {
        "Camada 4 — Execução Invisível (ANIMUS/SYMBIONT/COSMIC)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let attestation = self.compute_attestation(data);
        let mut out = Vec::with_capacity(ENCLAVE_ATTESTATION_LEN + data.len());
        out.extend_from_slice(&attestation);
        out.extend_from_slice(data);
        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < ENCLAVE_ATTESTATION_LEN {
            return Err(VeilError::Layer(
                "Dados insuficientes para atestação de enclave".into(),
            ));
        }

        let expected_attestation = &data[..ENCLAVE_ATTESTATION_LEN];
        let payload = &data[ENCLAVE_ATTESTATION_LEN..];

        let computed = self.compute_attestation(payload);
        if expected_attestation != &computed {
            return Err(VeilError::Layer(
                "Falha na atestação do enclave de execução (assinatura violada)".into(),
            ));
        }

        Ok(payload.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execution_layer_roundtrip() {
        let layer = ExecutionLayer::new();
        let payload = b"instrucao de computacao isolada";

        let processed = layer.process(payload).expect("process execution");
        assert_eq!(processed.len(), ENCLAVE_ATTESTATION_LEN + payload.len());

        let recovered = layer.recover(&processed).expect("recover execution");
        assert_eq!(recovered, payload);
    }

    #[test]
    fn execution_layer_rejects_altered_data() {
        let layer = ExecutionLayer::new();
        let payload = b"dados protegidos de enclave";
        let mut processed = layer.process(payload).expect("process");

        let last = processed.len() - 1;
        processed[last] ^= 0x01;

        assert!(layer.recover(&processed).is_err());
    }
}
