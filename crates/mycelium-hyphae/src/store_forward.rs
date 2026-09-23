//! Store-and-forward mínimo via DHT (mailbox).
//!
//! Só funciona **após** o nó já ter entrada na DHT (bootstrap). Não resolve
//! o ovo/galinha de dois peers mutuamente inacessíveis sem seed.

use libp2p::PeerId;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAILBOX_DHT_PREFIX: &[u8] = b"/mycelium/mailbox/";
pub const MAILBOX_ACK_PREFIX: &[u8] = b"/mycelium/mailbox-ack/";
pub const MAX_MAILBOX_BYTES: usize = 64 * 1024;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MailboxContentType {
    Generic,
    IsotopeAtom,
    DtnBundle,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct DtnBundle {
    pub bundle_id: String,
    pub src_peer: String,
    pub dst_peer: String,
    #[serde(default)]
    pub dst_node: Option<mycelium_core::NodeId>,
    #[serde(default)]
    pub binding: Option<mycelium_core::PeerBinding>,
    pub created_at: u64,
    pub ttl_secs: u64,
    pub hops: u32,
    pub max_hops: u32,
    pub payload: Vec<u8>,
}

pub const DEFAULT_MAX_DTN_STORE_BYTES: usize = 50 * 1024 * 1024; // 50 MB
pub const MAX_SEEN_CACHE: usize = 5000;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct DtnBundleStore {
    bundles: std::collections::HashMap<String, DtnBundle>,
    #[serde(skip)]
    storage_dir: Option<std::path::PathBuf>,
    #[serde(skip)]
    seen_bundles: std::collections::HashSet<String>,
    #[serde(skip)]
    current_bytes: usize,
    #[serde(skip)]
    max_bytes: usize,
}

impl DtnBundleStore {
    pub fn new() -> Self {
        Self {
            bundles: std::collections::HashMap::new(),
            storage_dir: None,
            seen_bundles: std::collections::HashSet::new(),
            current_bytes: 0,
            max_bytes: DEFAULT_MAX_DTN_STORE_BYTES,
        }
    }

    /// Cria um DtnBundleStore com persistência durável em diretório de disco.
    /// Recupera automaticamente bundles previamente persistidos (sobrevive a reboots).
    pub fn with_dir(dir: std::path::PathBuf) -> Self {
        let mut store = Self::new();
        std::fs::create_dir_all(&dir).ok();
        store.storage_dir = Some(dir.clone());

        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    if let Ok(bytes) = std::fs::read(&path) {
                        if let Ok(bundle) = serde_json::from_slice::<DtnBundle>(&bytes) {
                            store.current_bytes += bytes.len();
                            store.seen_bundles.insert(bundle.bundle_id.clone());
                            store.bundles.insert(bundle.bundle_id.clone(), bundle);
                        }
                    }
                }
            }
        }
        store
    }

    /// Replay protection / Deduplicação: verifica se o bundle_id já foi visto recentemente.
    pub fn is_seen(&self, bundle_id: &str) -> bool {
        self.seen_bundles.contains(bundle_id)
    }

    pub fn mark_seen(&mut self, bundle_id: &str) {
        if self.seen_bundles.len() >= MAX_SEEN_CACHE {
            self.seen_bundles.clear();
        }
        self.seen_bundles.insert(bundle_id.to_string());
    }

    pub fn insert(&mut self, bundle: DtnBundle) {
        let payload_len = bundle.payload.len();
        if self.current_bytes + payload_len > self.max_bytes && !self.bundles.is_empty() {
            // Se atingir quota máxima, remove bundles expirados ou mais antigos
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            self.prune_expired(now);
        }

        if self.bundles.len() < 1000 && self.current_bytes + payload_len <= self.max_bytes {
            self.mark_seen(&bundle.bundle_id);
            if let Some(ref dir) = self.storage_dir {
                let file_path = dir.join(format!("{}.json", bundle.bundle_id));
                if let Ok(json) = serde_json::to_vec_pretty(&bundle) {
                    let _ = std::fs::write(&file_path, json);
                }
            }
            self.current_bytes += payload_len;
            self.bundles.insert(bundle.bundle_id.clone(), bundle);
        }
    }

    pub fn get(&self, bundle_id: &str) -> Option<&DtnBundle> {
        self.bundles.get(bundle_id)
    }

    pub fn remove(&mut self, bundle_id: &str) -> Option<DtnBundle> {
        if let Some(bundle) = self.bundles.remove(bundle_id) {
            self.current_bytes = self.current_bytes.saturating_sub(bundle.payload.len());
            if let Some(ref dir) = self.storage_dir {
                let file_path = dir.join(format!("{}.json", bundle_id));
                let _ = std::fs::remove_file(&file_path);
            }
            Some(bundle)
        } else {
            None
        }
    }

    pub fn drain_for_peer(&mut self, peer_id: &str) -> Vec<DtnBundle> {
        let matching: Vec<String> = self.bundles.iter()
            .filter(|(_, b)| b.dst_peer == peer_id)
            .map(|(id, _)| id.clone())
            .collect();
        let mut out = Vec::new();
        for id in matching {
            if let Some(b) = self.remove(&id) {
                out.push(b);
            }
        }
        out
    }

    pub fn all_bundles(&self) -> Vec<DtnBundle> {
        self.bundles.values().cloned().collect()
    }

    pub fn prune_expired(&mut self, now: u64) {
        let expired_ids: Vec<String> = self.bundles
            .iter()
            .filter(|(_, b)| now.saturating_sub(b.created_at) >= b.ttl_secs)
            .map(|(id, _)| id.clone())
            .collect();

        for id in expired_ids {
            self.remove(&id);
        }
    }

    pub fn len(&self) -> usize {
        self.bundles.len()
    }

    pub fn is_empty(&self) -> bool {
        self.bundles.is_empty()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MailboxMessage {
    pub id_hex: String,
    pub from: String,
    pub to: String,
    pub content_type: MailboxContentType,
    pub payload: Vec<u8>,
    pub timestamp: u64,
    pub ttl_secs: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MailboxAck {
    pub message_id_hex: String,
    pub receiver: String,
    pub timestamp: u64,
}

pub fn mailbox_key(to: &PeerId, msg_id_hex: &str) -> Vec<u8> {
    let mut k = MAILBOX_DHT_PREFIX.to_vec();
    k.extend_from_slice(to.to_string().as_bytes());
    k.push(b'/');
    k.extend_from_slice(msg_id_hex.as_bytes());
    k
}

pub fn mailbox_prefix(to: &PeerId) -> Vec<u8> {
    let mut k = MAILBOX_DHT_PREFIX.to_vec();
    k.extend_from_slice(to.to_string().as_bytes());
    k.push(b'/');
    k
}

pub fn ack_key(msg_id_hex: &str) -> Vec<u8> {
    let mut k = MAILBOX_ACK_PREFIX.to_vec();
    k.extend_from_slice(msg_id_hex.as_bytes());
    k
}

pub fn make_message(
    from: &PeerId,
    to: &PeerId,
    payload: Vec<u8>,
    content_type: MailboxContentType,
) -> Result<MailboxMessage, String> {
    if payload.len() > MAX_MAILBOX_BYTES {
        return Err(format!(
            "mensagem excede {MAX_MAILBOX_BYTES} bytes ({})",
            payload.len()
        ));
    }
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let material = format!("{from}|{to}|{ts}|{}", payload.len());
    let id_hex = hex::encode(blake3::hash(material.as_bytes()).as_bytes());
    Ok(MailboxMessage {
        id_hex,
        from: from.to_string(),
        to: to.to_string(),
        content_type,
        payload,
        timestamp: ts,
        ttl_secs: 3600,
    })
}

pub fn make_ack(receiver: &PeerId, message_id_hex: &str) -> MailboxAck {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    MailboxAck {
        message_id_hex: message_id_hex.to_string(),
        receiver: receiver.to_string(),
        timestamp: ts,
    }
}

pub fn is_expired(msg: &MailboxMessage) -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    now.saturating_sub(msg.timestamp) > msg.ttl_secs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_oversized() {
        let from = PeerId::random();
        let to = PeerId::random();
        let big = vec![0u8; MAX_MAILBOX_BYTES + 1];
        assert!(make_message(&from, &to, big, MailboxContentType::Generic).is_err());
    }

    #[test]
    fn ttl_expiry() {
        let msg = MailboxMessage {
            id_hex: "ab".into(),
            from: "a".into(),
            to: "b".into(),
            content_type: MailboxContentType::Generic,
            payload: vec![],
            timestamp: 0,
            ttl_secs: 1,
        };
        assert!(is_expired(&msg));
    }
}
