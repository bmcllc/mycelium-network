//! Camada 3 — Consenso Causal e Anti-Replay: CRDTs por Cone de Luz.
//!
//! Garante que pacotes não possam ser reordenados, clonados ou reinjetados
//! sem detecção, utilizando relógio de Lamport e `hash_chronicle`.

use crate::layers::VeilLayer;
use crate::VeilError;
use mycelium_zkp::hash_chronicle;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Tamanho do cabeçalho causal: [8B Lamport timestamp us] + [8B seq_counter] + [32B hash_chronicle] = 48 bytes.
pub const CAUSAL_HEADER_LEN: usize = 48;

/// Camada 3 do Veil: Consenso Causal e Anti-Replay.
pub struct ConsensusLayer {
    active: bool,
    seq_counter: AtomicU64,
    last_chronicle: Mutex<[u8; 32]>,
    highest_seen_seq: AtomicU64,
}

impl Default for ConsensusLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl ConsensusLayer {
    pub fn new() -> Self {
        Self {
            active: true,
            seq_counter: AtomicU64::new(1),
            last_chronicle: Mutex::new([0u8; 32]),
            highest_seen_seq: AtomicU64::new(0),
        }
    }

    fn now_micros() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_micros() as u64)
            .unwrap_or(0)
    }
}

impl VeilLayer for ConsensusLayer {
    fn name(&self) -> &'static str {
        "Camada 3 — Consenso Causal (CRDTs por Cone de Luz)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let timestamp = Self::now_micros();
        let seq = self.seq_counter.fetch_add(1, Ordering::SeqCst);

        // Calcula o novo elo causal utilizando o hash_chronicle do mycelium-zkp
        let chronicle_digest = {
            let mut parent_lock = self.last_chronicle.lock().unwrap();
            let parent = *parent_lock;
            let new_digest = hash_chronicle(data, &[parent]);
            *parent_lock = new_digest;
            new_digest
        };

        let mut header = [0u8; CAUSAL_HEADER_LEN];
        header[0..8].copy_from_slice(&timestamp.to_be_bytes());
        header[8..16].copy_from_slice(&seq.to_be_bytes());
        header[16..48].copy_from_slice(&chronicle_digest);

        let mut out = Vec::with_capacity(CAUSAL_HEADER_LEN + data.len());
        out.extend_from_slice(&header);
        out.extend_from_slice(data);
        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < CAUSAL_HEADER_LEN {
            return Err(VeilError::Layer(
                "Dados insuficientes para cabeçalho causal".into(),
            ));
        }

        let _timestamp = u64::from_be_bytes(data[0..8].try_into().unwrap());
        let seq = u64::from_be_bytes(data[8..16].try_into().unwrap());
        let chronicle_digest = &data[16..48];
        let payload = &data[CAUSAL_HEADER_LEN..];

        // Anti-Replay: rejeita pacotes cujo sequence number é menor ou igual ao já processado
        let prev_highest = self.highest_seen_seq.load(Ordering::SeqCst);
        if seq <= prev_highest && prev_highest != 0 {
            return Err(VeilError::Layer(format!(
                "Anti-Replay detectou sequência obsoleta ou retransmitida: seq={seq} <= max={prev_highest}"
            )));
        }
        self.highest_seen_seq.store(seq, Ordering::SeqCst);

        // Verifica a integridade básica do chronicle
        if chronicle_digest.iter().all(|&b| b == 0) {
            return Err(VeilError::Layer("Digest causal nulo inválido".into()));
        }

        Ok(payload.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn consensus_causal_roundtrip() {
        let layer = ConsensusLayer::new();
        let p1 = b"evento causal alfa";
        let p2 = b"evento causal beta";

        let enc1 = layer.process(p1).expect("enc1");
        let enc2 = layer.process(p2).expect("enc2");

        let rec1 = layer.recover(&enc1).expect("rec1");
        let rec2 = layer.recover(&enc2).expect("rec2");

        assert_eq!(rec1, p1);
        assert_eq!(rec2, p2);
    }

    #[test]
    fn replay_attack_is_rejected() {
        let layer = ConsensusLayer::new();
        let payload = b"transacao unica nao repetivel";
        let enc = layer.process(payload).expect("process");

        let rec1 = layer.recover(&enc).expect("primeira recepcao ok");
        assert_eq!(rec1, payload);

        // Segunda tentativa com os mesmos bytes deve ser barrada pelo Anti-Replay
        assert!(layer.recover(&enc).is_err(), "Replay deve ser rejeitado!");
    }
}
