//! Eventos de shard QEL (kind 31234) + NIP-44 opcional.

use crate::nip94::{seal_event, NostrEvent};
use crate::relay_pool::RelayPool;
use crate::NostrError;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use mycelium_ghostid::GhostId;
use mycelium_qel::{QelShard, TransportHint};
use secp256k1::{SecretKey, XOnlyPublicKey};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// Kind custom Mycelium para shards QEL.
///
/// Usa a faixa addressable (30000–39999, NIP-33): cada shard precisa de tag `d`
/// única — sem isso os relays substituem eventos do mesmo autor e só fica 1 shard.
pub const KIND_QEL_SHARD: u16 = 31234;
const QEL_TRANSPORT_VERSION: u8 = 1;

#[derive(Serialize, Deserialize)]
struct CompactQelShard {
    v: u8,
    i: u8,
    n: u8,
    k: u8,
    p: String,
    g: String,
    x: String,
    c: String,
    h: String,
    l: u64,
    t: TransportHint,
}

/// Serializa o envelope QEL de transporte v1. Campos binários usam Base64,
/// evitando arrays JSON de números sem alterar o Spore Print ou o ContentId.
pub fn encode_shard_content(shard: &QelShard) -> Result<String, NostrError> {
    Ok(serde_json::to_string(&CompactQelShard {
        v: QEL_TRANSPORT_VERSION,
        i: shard.index,
        n: shard.total,
        k: shard.threshold,
        p: BASE64.encode(&shard.payload),
        g: BASE64.encode(shard.ghost_pubkey),
        x: BASE64.encode(shard.nonce),
        c: shard.content_id.clone(),
        h: BASE64.encode(shard.content_hash),
        l: shard.ttl_secs,
        t: shard.transport.clone(),
    })?)
}

fn decode_fixed<const N: usize>(value: &str, field: &str) -> Result<[u8; N], NostrError> {
    BASE64.decode(value)
        .map_err(|e| NostrError::Msg(format!("Base64 inválido em {field}: {e}")))?
        .try_into()
        .map_err(|_| NostrError::Msg(format!("tamanho inválido em {field}")))
}

/// Lê tanto o envelope compacto v1 quanto o JSON QelShard legado (v0).
pub fn decode_shard_content(content: &str) -> Result<QelShard, NostrError> {
    let value: serde_json::Value = serde_json::from_str(content)?;
    if value.get("v").is_none() {
        return Ok(serde_json::from_value(value)?);
    }
    let wire: CompactQelShard = serde_json::from_value(value)?;
    if wire.v != QEL_TRANSPORT_VERSION {
        return Err(NostrError::Msg(format!("versão de transporte QEL não suportada: {}", wire.v)));
    }
    Ok(QelShard {
        index: wire.i,
        total: wire.n,
        threshold: wire.k,
        payload: BASE64.decode(&wire.p)
            .map_err(|e| NostrError::Msg(format!("Base64 inválido em payload: {e}")))?,
        ghost_pubkey: decode_fixed(&wire.g, "ghost_pubkey")?,
        nonce: decode_fixed(&wire.x, "nonce")?,
        content_id: wire.c,
        content_hash: decode_fixed(&wire.h, "content_hash")?,
        ttl_secs: wire.l,
        transport: wire.t,
    })
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Cria evento kind 31234 com shard (NIP-44 se recipient, senão JSON plaintext).
pub fn create_shard_event(
    ghost: &GhostId,
    shard: &QelShard,
    recipient_pubkey_hex: Option<&str>,
) -> Result<NostrEvent, NostrError> {
    let created_at = now_secs();
    let plain = encode_shard_content(shard)?;

    let content = if let Some(recip_hex) = recipient_pubkey_hex {
        encrypt_nip44(ghost, recip_hex, &plain)?
    } else {
        plain
    };

    let mut tags = vec![
        // NIP-33: `d` único por shard evita replace entre irmãos do mesmo GhostId
        vec![
            "d".into(),
            format!("{}:{}", shard.content_id, shard.index),
        ],
        vec!["i".into(), shard.content_id.clone()],
        vec![
            "shard".into(),
            format!("{}/{}", shard.index, shard.total),
        ],
        vec![
            "qel".into(),
            format!("{},{}", shard.threshold, shard.total),
        ],
        vec!["transport".into(), "nostr".into()],
    ];
    if let Some(r) = recipient_pubkey_hex {
        tags.push(vec!["p".into(), r.to_string()]);
    }

    seal_event(ghost, created_at, KIND_QEL_SHARD, tags, content)
}

/// NIP-44 encrypt (pubkey x-only hex do destinatário).
pub fn encrypt_nip44(ghost: &GhostId, recipient_hex: &str, plaintext: &str) -> Result<String, NostrError> {
    let sk_bytes = ghost.secret_key_bytes();
    let sk = SecretKey::from_byte_array(sk_bytes).map_err(|e| NostrError::Nip44(e.to_string()))?;
    let recip_bytes: [u8; 32] = hex::decode(recipient_hex)
        .map_err(|e| NostrError::InvalidHex(e.to_string()))?
        .try_into()
        .map_err(|_| NostrError::InvalidHex("pubkey destinatário deve ter 32 bytes".into()))?;
    let xonly = XOnlyPublicKey::from_byte_array(recip_bytes)
        .map_err(|e| NostrError::Nip44(e.to_string()))?;
    let convo = nip44::get_conversation_key(sk, xonly);
    nip44::encrypt(&convo, plaintext).map_err(|e| NostrError::Nip44(e.to_string()))
}

/// Decifra content NIP-44 para string (ou devolve plaintext se já for texto/JSON).
pub fn decrypt_nip44_to_string(
    recipient_secret: &[u8; 32],
    sender_pubkey_hex: &str,
    content: &str,
) -> Result<String, NostrError> {
    if content.trim_start().starts_with('{') {
        return Ok(content.to_string());
    }
    let sk = SecretKey::from_byte_array(*recipient_secret).map_err(|e| NostrError::Nip44(e.to_string()))?;
    let sender_bytes: [u8; 32] = hex::decode(sender_pubkey_hex)
        .map_err(|e| NostrError::InvalidHex(e.to_string()))?
        .try_into()
        .map_err(|_| NostrError::InvalidHex("pubkey remetente deve ter 32 bytes".into()))?;
    let xonly = XOnlyPublicKey::from_byte_array(sender_bytes)
        .map_err(|e| NostrError::Nip44(e.to_string()))?;
    let convo = nip44::get_conversation_key(sk, xonly);
    nip44::decrypt(&convo, content).map_err(|e| NostrError::Nip44(e.to_string()))
}

/// Decifra content NIP-44 (ou passa plaintext JSON).
pub fn decrypt_shard_content(
    recipient_secret: Option<&[u8; 32]>,
    sender_pubkey_hex: &str,
    content: &str,
) -> Result<QelShard, NostrError> {
    let json_str = if content.trim_start().starts_with('{') {
        content.to_string()
    } else if let Some(sec) = recipient_secret {
        decrypt_nip44_to_string(sec, sender_pubkey_hex, content)?
    } else {
        return Err(NostrError::Msg(
            "conteúdo cifrado sem chave do destinatário".into(),
        ));
    };
    decode_shard_content(&json_str)
}

/// Publica anúncio NIP-94 + shards Nos.
pub async fn publish_shards(
    pool: &RelayPool,
    ghost: &GhostId,
    shards: &[QelShard],
    blake3_hex: &str,
    plot_size: usize,
    recipient_pubkey_hex: Option<&str>,
) -> Result<usize, NostrError> {
    if shards.is_empty() {
        return Err(NostrError::Msg("sem shards".into()));
    }
    let first = &shards[0];
    let need = first.threshold as usize;
    if need == 0 || first.threshold > first.total {
        return Err(NostrError::Msg("metadados QEL inválidos".into()));
    }
    let mut seen = std::collections::HashSet::new();
    let selected: Vec<_> = shards
        .iter()
        .filter(|shard| {
            shard.content_id == first.content_id
                && shard.threshold == first.threshold
                && shard.total == first.total
                && shard.nonce == first.nonce
                && shard.content_hash == first.content_hash
                && shard.index > 0
                && shard.index <= first.total
                && seen.insert(shard.index)
        })
        .take(need)
        .collect();
    if selected.len() < need {
        return Err(NostrError::Msg(format!("shards QEL coerentes e distintos insuficientes: {}/{}", selected.len(), need)));
    }
    let cid = &first.content_id;
    let announce = crate::nip94::announce_plot(
        ghost,
        cid,
        blake3_hex,
        plot_size,
        Some((first.threshold, first.total)),
        "giggs/plot",
    )?;
    let mut events = Vec::with_capacity(need + 1);
    events.push(announce);
    for shard in selected {
        events.push(create_shard_event(ghost, shard, recipient_pubkey_hex)?);
    }
    // Invariante MEP-0.3.0: nenhum socket é aberto até todos os frames finais
    // terem sido serializados e validados.
    for event in &events {
        RelayPool::serialized_event(event)?;
    }
    let mut relay_acks = 0;
    for event in &events {
        relay_acks += pool.publish(event).await?;
    }
    Ok(relay_acks)
}

/// Busca shards QEL por ContentId até threshold.
pub async fn fetch_shards(
    pool: &RelayPool,
    content_id: &str,
    threshold: u8,
    recipient_secret: Option<&[u8; 32]>,
) -> Result<Vec<QelShard>, NostrError> {
    let since = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().saturating_sub(3600))
        .unwrap_or(0);

    // Filtro por tag `i` + fallback sem tag (alguns relays indexam mal).
    let filters = [
        json!({
            "kinds": [KIND_QEL_SHARD],
            "#i": [content_id],
            "since": since,
            "limit": 50
        }),
        json!({
            "kinds": [KIND_QEL_SHARD],
            "since": since,
            "limit": 50
        }),
    ];

    let mut shards = Vec::new();

    for filter in filters {
        let events = pool.subscribe(filter).await?;
        tracing::info!(n = events.len(), cid = %content_id, "eventos Nostr recebidos");
        for ev in events {
            // Confirma tag i se presente
            let tag_ok = ev.tags.iter().any(|t| {
                t.len() >= 2 && (t[0] == "i" || t[0] == "cid") && t[1] == content_id
            }) || ev.content.contains(content_id);

            if !tag_ok {
                continue;
            }
            match decrypt_shard_content(recipient_secret, &ev.pubkey, &ev.content) {
                Ok(shard) => merge_coherent_shard(&mut shards, shard, content_id, threshold),
                Err(e) => tracing::debug!(error = %e, "ignorar evento shard"),
            }
            if shards.len() >= threshold as usize {
                return Ok(shards);
            }
        }
        if shards.len() >= threshold as usize {
            break;
        }
    }
    Ok(shards)
}

fn merge_coherent_shard(
    shards: &mut Vec<QelShard>,
    shard: QelShard,
    content_id: &str,
    requested_threshold: u8,
) {
    let coherent = shard.content_id == content_id
        && shard.threshold == requested_threshold
        && shard.threshold > 0
        && shard.threshold <= shard.total
        && shard.index > 0
        && shard.index <= shard.total
        && !shards.iter().any(|s| s.index == shard.index)
        && shards
            .first()
            .map(|s| {
                s.total == shard.total
                    && s.nonce == shard.nonce
                    && s.content_hash == shard.content_hash
            })
            .unwrap_or(true);
    if coherent {
        tracing::info!(index = shard.index, "shard QEL coerente obtido");
        shards.push(shard);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use mycelium_qel::{fragment, QelConfig};
    use serde_json::{json, Value};
    use tokio::net::TcpListener;
    use tokio_tungstenite::tungstenite::Message;

    #[test]
    fn shard_event_roundtrip_plaintext() {
        let ghost = GhostId::spawn_quick(3600).unwrap();
        let shards = fragment(b"hello-qel", "Qmtest", &QelConfig {
            threshold: 2,
            total: 3,
            ttl_secs: 3600,
        })
        .unwrap();
        let ev = create_shard_event(&ghost, &shards[0], None).unwrap();
        assert_eq!(ev.kind, KIND_QEL_SHARD);
        let got = decrypt_shard_content(None, &ev.pubkey, &ev.content).unwrap();
        assert_eq!(got.index, shards[0].index);
        assert_eq!(got.content_id, "Qmtest");
    }

    #[test]
    fn legacy_qel_shard_json_is_still_readable() {
        let shards = fragment(b"legacy-event", "Qmlegacy", &QelConfig {
            threshold: 2, total: 3, ttl_secs: 3600,
        }).unwrap();
        let legacy = serde_json::to_string(&shards[0]).unwrap();
        let got = decode_shard_content(&legacy).unwrap();
        assert_eq!(got.payload, shards[0].payload);
        assert_eq!(got.content_hash, shards[0].content_hash);
    }

    #[test]
    fn shard_event_nip44_roundtrip() {
        let sender = GhostId::spawn_quick(3600).unwrap();
        let recipient = GhostId::spawn_quick(3600).unwrap();
        let shards = fragment(b"secret-plot", "Qmsec", &QelConfig {
            threshold: 2,
            total: 3,
            ttl_secs: 3600,
        })
        .unwrap();
        let recip_hex = recipient.nostr_pubkey_hex();
        let ev = create_shard_event(&sender, &shards[0], Some(&recip_hex)).unwrap();
        assert!(!ev.content.starts_with('{'));
        let got = decrypt_shard_content(
            Some(&recipient.secret_key_bytes()),
            &ev.pubkey,
            &ev.content,
        )
        .unwrap();
        assert_eq!(got.content_hash, shards[0].content_hash);
    }

    #[test]
    fn recovery_filters_duplicates_and_incoherent_sets() {
        let cfg = QelConfig {
            threshold: 3,
            total: 5,
            ttl_secs: 3600,
        };
        let good = fragment(b"recover-me", "Qmrecover", &cfg).unwrap();
        let foreign = fragment(b"other", "Qmother", &cfg).unwrap();
        let mut collected = Vec::new();
        merge_coherent_shard(&mut collected, good[0].clone(), "Qmrecover", 3);
        merge_coherent_shard(&mut collected, good[0].clone(), "Qmrecover", 3);
        merge_coherent_shard(&mut collected, foreign[1].clone(), "Qmrecover", 3);
        merge_coherent_shard(&mut collected, good[1].clone(), "Qmrecover", 3);
        merge_coherent_shard(&mut collected, good[2].clone(), "Qmrecover", 3);
        assert_eq!(collected.len(), 3);
        assert_eq!(mycelium_qel::reconstruct(&collected).unwrap(), b"recover-me");
    }

    #[tokio::test]
    async fn three_valid_shards_publish_and_reconstruct() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = format!("ws://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            for _ in 0..4 {
                let (stream, _) = listener.accept().await.unwrap();
                let mut ws = tokio_tungstenite::accept_async(stream).await.unwrap();
                let payload = ws.next().await.unwrap().unwrap().into_text().unwrap();
                let event_id = serde_json::from_str::<Value>(&payload).unwrap()[1]["id"]
                    .as_str()
                    .unwrap()
                    .to_owned();
                ws.send(Message::Text(
                    json!(["OK", event_id, true, "saved"]).to_string(),
                ))
                .await
                .unwrap();
            }
        });
        let pool = RelayPool::new(vec![address]);
        let ghost = GhostId::spawn_quick(3600).unwrap();
        let bytes = b"three-shard-roundtrip";
        let shards = fragment(
            bytes,
            "Qmthree",
            &QelConfig {
                threshold: 3,
                total: 5,
                ttl_secs: 3600,
            },
        )
        .unwrap();

        let acknowledgements =
            publish_shards(&pool, &ghost, &shards, &"0".repeat(64), bytes.len(), None)
                .await
                .unwrap();

        assert_eq!(acknowledgements, 4);
        server.await.unwrap();
        assert_eq!(mycelium_qel::reconstruct(&shards[..3]).unwrap(), bytes);
    }

    #[tokio::test]
    async fn oversized_later_shard_prevents_announcement_send() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = format!("ws://{}", listener.local_addr().unwrap());
        let pool = RelayPool::new(vec![address]);
        let ghost = GhostId::spawn_quick(3600).unwrap();
        let mut shards = fragment(
            b"small",
            "Qmoversized",
            &QelConfig {
                threshold: 2,
                total: 3,
                ttl_secs: 3600,
            },
        )
        .unwrap();
        shards[1].payload = vec![0xff; crate::relay_pool::MAX_NOSTR_EVENT_BYTES];

        let error = publish_shards(&pool, &ghost, &shards, &"0".repeat(64), 5, None)
            .await
            .unwrap_err();

        assert!(matches!(error, NostrError::EventTooLarge { .. }));
        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(100), listener.accept())
                .await
                .is_err()
        );
    }
}
