//! # mycelium-qel
//!
//! Quantum Entanglement-Lattice (nome histórico): Shamir secret sharing
//! + multi-path hints. k-of-n shards; n-1 não revelam o Plot.

mod topological;

pub use topological::{
    annihilate, topological_charge, verify_topological_invariant, TopologicalCharge,
};

use mycelium_ghostid::GhostId;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use shamir_share::ShamirShare;

/// Erros QEL.
#[derive(Debug, thiserror::Error)]
pub enum QelError {
    #[error("config inválida: threshold={threshold} total={total}")]
    BadConfig { threshold: u8, total: u8 },
    #[error("shards insuficientes: tenho {have}, preciso {need}")]
    InsufficientShards { have: usize, need: usize },
    #[error("shards de content_id / nonce inconsistentes")]
    MismatchedShards,
    #[error("hash do conteúdo não confere após reconstrução")]
    HashMismatch,
    #[error("shamir: {0}")]
    Shamir(String),
    #[error("ghostid: {0}")]
    Ghost(#[from] mycelium_ghostid::GhostError),
    #[error("payload excede limite Nostr ({MAX_SHARD_PAYLOAD} bytes)")]
    PayloadTooLarge,
}

/// Guarda superior do payload original. O transporte Nostr aplica depois seu
/// limite definitivo sobre o frame WebSocket `EVENT` completamente serializado.
pub const MAX_SHARD_PAYLOAD: usize = 64 * 1024;

/// Cabeçalho do ShareWire compacto: magic, versão, índice, k, n e flags.
pub const COMPACT_SHARE_WIRE_HEADER_LEN: usize = 8;
const COMPACT_SHARE_WIRE_MAGIC: &[u8; 3] = b"QSW";
const COMPACT_SHARE_WIRE_VERSION: u8 = 1;

/// Transporte sugerido para o shard (backends físicos ficam para fases futuras).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransportHint {
    /// Nostr relay (wss:// outbound).
    Nostr,
    /// IPFS bitswap (futuro).
    Ipfs,
    /// libp2p relay mesh.
    RelayMesh,
    /// LoRa (futuro).
    LoRa,
    /// SMS (futuro).
    Sms,
    /// Bluetooth / proximity (futuro).
    Proximity,
    /// DTN store-carry-forward (futuro).
    Dtn,
    /// QR / visual (futuro).
    Visual,
    /// Qualquer disponível.
    Any,
}

/// Configuração QEL.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QelConfig {
    pub threshold: u8,
    pub total: u8,
    pub ttl_secs: u64,
}

impl Default for QelConfig {
    fn default() -> Self {
        Self {
            threshold: 3,
            total: 7,
            ttl_secs: 86_400,
        }
    }
}

impl QelConfig {
    pub fn validate(&self) -> Result<(), QelError> {
        if self.threshold == 0 || self.total == 0 || self.threshold > self.total {
            return Err(QelError::BadConfig {
                threshold: self.threshold,
                total: self.total,
            });
        }
        Ok(())
    }
}

/// Um shard QEL: fragmento independente.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QelShard {
    pub index: u8,
    pub total: u8,
    pub threshold: u8,
    /// Bytes do share Shamir (pode incluir metadata do shamir_share).
    pub payload: Vec<u8>,
    pub ghost_pubkey: [u8; 32],
    pub nonce: [u8; 16],
    /// ContentId Mycelium (`Qm…` string).
    pub content_id: String,
    /// Blake3 do plot original.
    pub content_hash: [u8; 32],
    pub ttl_secs: u64,
    pub transport: TransportHint,
}

/// Fragmenta um Plot em shards QEL.
pub fn fragment(
    plot_data: &[u8],
    content_id: &str,
    config: &QelConfig,
) -> Result<Vec<QelShard>, QelError> {
    config.validate()?;
    if plot_data.len() > MAX_SHARD_PAYLOAD {
        // Cada share ≈ tamanho do secret; Nostr não aguenta plots maiores nesta fase.
        return Err(QelError::PayloadTooLarge);
    }

    let content_hash: [u8; 32] = *blake3::hash(plot_data).as_bytes();
    let mut nonce = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut nonce);

    let mut scheme = ShamirShare::builder(config.total, config.threshold)
        .build()
        .map_err(|e| QelError::Shamir(e.to_string()))?;
    let shares = scheme
        .split(plot_data)
        .map_err(|e| QelError::Shamir(e.to_string()))?;

    let transports = assign_diverse_transports(config.total);
    let mut out = Vec::with_capacity(shares.len());

    for (i, share) in shares.into_iter().enumerate() {
        let ghost = GhostId::spawn_quick(config.ttl_secs)?;
        let index = share.index;
        let payload = encode_share_wire(&ShareWire {
            index: share.index,
            data: share.data.clone(),
            threshold: share.threshold,
            total_shares: share.total_shares,
            integrity_check: share.integrity_check,
            compression: share.compression,
        });
        drop(share);

        if payload.len() > MAX_SHARD_PAYLOAD {
            return Err(QelError::PayloadTooLarge);
        }

        out.push(QelShard {
            index,
            total: config.total,
            threshold: config.threshold,
            payload,
            ghost_pubkey: ghost.nostr_pubkey(),
            nonce,
            content_id: content_id.to_string(),
            content_hash,
            ttl_secs: config.ttl_secs,
            transport: transports
                .get(i)
                .cloned()
                .unwrap_or(TransportHint::Any),
        });
    }

    Ok(out)
}

/// Hybrid Theory: primeiros `threshold` shards → Nostr; restantes → Ipfs (blockstore local).
pub fn fragment_hybrid(
    plot_data: &[u8],
    content_id: &str,
    config: &QelConfig,
) -> Result<Vec<QelShard>, QelError> {
    let mut shards = fragment(plot_data, content_id, config)?;
    let hints = assign_hybrid_transports(config.threshold, config.total);
    for (shard, hint) in shards.iter_mut().zip(hints) {
        shard.transport = hint;
    }
    Ok(shards)
}

/// Reconstrói o Plot a partir de ≥k shards.
pub fn reconstruct(shards: &[QelShard]) -> Result<Vec<u8>, QelError> {
    if shards.is_empty() {
        return Err(QelError::InsufficientShards {
            have: 0,
            need: 1,
        });
    }

    let threshold = shards[0].threshold as usize;
    let total = shards[0].total;
    let nonce = shards[0].nonce;
    let content_id = &shards[0].content_id;
    let content_hash = shards[0].content_hash;

    if !shards
        .iter()
        .all(|s| s.nonce == nonce
            && s.content_id == *content_id
            && s.content_hash == content_hash
            && s.threshold as usize == threshold
            && s.total == total
            && s.index > 0
            && s.index <= total)
    {
        return Err(QelError::MismatchedShards);
    }

    let distinct = shards.iter().map(|s| s.index).collect::<std::collections::HashSet<_>>();
    if distinct.len() != shards.len() {
        return Err(QelError::MismatchedShards);
    }
    if shards.len() < threshold {
        return Err(QelError::InsufficientShards {
            have: shards.len(),
            need: threshold,
        });
    }

    let mut shares = Vec::with_capacity(threshold);
    for s in shards.iter().take(threshold) {
        let wire = decode_share_wire(&s.payload)?;
        if wire.index != s.index || wire.threshold != s.threshold || wire.total_shares != s.total {
            return Err(QelError::MismatchedShards);
        }
        shares.push(shamir_share::Share {
            index: wire.index,
            data: wire.data,
            threshold: wire.threshold,
            total_shares: wire.total_shares,
            integrity_check: wire.integrity_check,
            compression: wire.compression,
        });
    }

    let data = ShamirShare::reconstruct(&shares).map_err(|e| QelError::Shamir(e.to_string()))?;
    let hash = *blake3::hash(&data).as_bytes();
    if hash != content_hash {
        return Err(QelError::HashMismatch);
    }
    Ok(data)
}

#[derive(Serialize, Deserialize)]
struct ShareWire {
    index: u8,
    data: Vec<u8>,
    threshold: u8,
    total_shares: u8,
    integrity_check: bool,
    compression: bool,
}

fn encode_share_wire(wire: &ShareWire) -> Vec<u8> {
    let mut out = Vec::with_capacity(COMPACT_SHARE_WIRE_HEADER_LEN + wire.data.len());
    out.extend_from_slice(COMPACT_SHARE_WIRE_MAGIC);
    out.push(COMPACT_SHARE_WIRE_VERSION);
    out.push(wire.index);
    out.push(wire.threshold);
    out.push(wire.total_shares);
    out.push(u8::from(wire.integrity_check) | (u8::from(wire.compression) << 1));
    out.extend_from_slice(&wire.data);
    out
}

fn decode_share_wire(payload: &[u8]) -> Result<ShareWire, QelError> {
    if payload.starts_with(COMPACT_SHARE_WIRE_MAGIC) {
        if payload.len() < COMPACT_SHARE_WIRE_HEADER_LEN
            || payload[3] != COMPACT_SHARE_WIRE_VERSION
        {
            return Err(QelError::Shamir("ShareWire compacto inválido ou não suportado".into()));
        }
        let flags = payload[7];
        return Ok(ShareWire {
            index: payload[4],
            threshold: payload[5],
            total_shares: payload[6],
            integrity_check: flags & 1 != 0,
            compression: flags & 2 != 0,
            data: payload[COMPACT_SHARE_WIRE_HEADER_LEN..].to_vec(),
        });
    }
    // Compatibilidade com eventos QEL v0, cujo ShareWire era JSON e `data`
    // era serializado como um array de números.
    serde_json::from_slice(payload).map_err(|e| QelError::Shamir(e.to_string()))
}

fn assign_diverse_transports(total: u8) -> Vec<TransportHint> {
    let order = [
        TransportHint::Nostr,
        TransportHint::Ipfs,
        TransportHint::RelayMesh,
        TransportHint::LoRa,
        TransportHint::Sms,
        TransportHint::Proximity,
        TransportHint::Dtn,
    ];
    (0..total as usize)
        .map(|i| order[i % order.len()].clone())
        .collect()
}

/// k primeiros → Nostr (mailbox); restantes → Ipfs (store local / bitswap futuro).
pub fn assign_hybrid_transports(threshold: u8, total: u8) -> Vec<TransportHint> {
    (0..total as usize)
        .map(|i| {
            if (i as u8) < threshold {
                TransportHint::Nostr
            } else {
                TransportHint::Ipfs
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn k_of_n_reconstructs() {
        let data = b"manifesto-floresta-qel";
        let cfg = QelConfig {
            threshold: 3,
            total: 5,
            ttl_secs: 3600,
        };
        let shards = fragment(data, "Qmdeadbeef", &cfg).expect("fragment");
        assert_eq!(shards.len(), 5);
        let subset: Vec<_> = shards.into_iter().take(3).collect();
        let out = reconstruct(&subset).expect("reconstruct");
        assert_eq!(out, data);
    }

    #[test]
    fn k_minus_one_fails() {
        let data = b"segredo";
        let cfg = QelConfig {
            threshold: 3,
            total: 5,
            ttl_secs: 3600,
        };
        let shards = fragment(data, "Qmcafebabe", &cfg).unwrap();
        let subset: Vec<_> = shards.into_iter().take(2).collect();
        match reconstruct(&subset) {
            Err(QelError::InsufficientShards { have: 2, need: 3 }) => {}
            other => panic!("esperado InsufficientShards, got {other:?}"),
        }
    }

    #[test]
    fn hash_mismatch_rejected() {
        let data = b"plot-a";
        let cfg = QelConfig {
            threshold: 3,
            total: 5,
            ttl_secs: 3600,
        };
        let mut shards = fragment(data, "Qmabc", &cfg).unwrap();
        let bad = {
            let mut h = shards[0].content_hash;
            h[0] ^= 0xff;
            h
        };
        for s in shards.iter_mut().take(3) {
            s.content_hash = bad;
        }
        let subset: Vec<_> = shards.into_iter().take(3).collect();
        assert!(matches!(reconstruct(&subset), Err(QelError::HashMismatch)));
    }

    #[test]
    fn mixed_or_duplicate_shards_are_rejected() {
        let cfg = QelConfig { threshold: 3, total: 5, ttl_secs: 3600 };
        let a = fragment(b"plot-a", "Qma", &cfg).unwrap();
        let b = fragment(b"plot-b", "Qmb", &cfg).unwrap();
        assert!(matches!(reconstruct(&[a[0].clone(), a[1].clone(), b[2].clone()]), Err(QelError::MismatchedShards)));
        assert!(matches!(reconstruct(&[a[0].clone(), a[0].clone(), a[1].clone()]), Err(QelError::MismatchedShards)));
    }

    #[test]
    fn hybrid_hints_split_nostr_ipfs() {
        let cfg = QelConfig {
            threshold: 3,
            total: 7,
            ttl_secs: 3600,
        };
        let shards = fragment_hybrid(b"hybrid", "Qmhy", &cfg).unwrap();
        assert!(shards[..3]
            .iter()
            .all(|s| s.transport == TransportHint::Nostr));
        assert!(shards[3..]
            .iter()
            .all(|s| s.transport == TransportHint::Ipfs));
    }

    #[test]
    fn compact_share_wire_has_fixed_overhead_and_legacy_still_reconstructs() {
        let cfg = QelConfig { threshold: 3, total: 5, ttl_secs: 3600 };
        let mut shards = fragment(b"legacy-compatible", "Qmlegacy", &cfg).unwrap();
        assert!(shards.iter().all(|s| s.payload.starts_with(COMPACT_SHARE_WIRE_MAGIC)));
        assert!(shards.iter().all(|s| s.payload.len() > COMPACT_SHARE_WIRE_HEADER_LEN));

        for shard in &mut shards[..3] {
            let wire = decode_share_wire(&shard.payload).unwrap();
            shard.payload = serde_json::to_vec(&wire).unwrap();
        }
        assert_eq!(reconstruct(&shards[..3]).unwrap(), b"legacy-compatible");
    }
}
