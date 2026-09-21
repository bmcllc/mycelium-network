//! Pool de relays Nostr via WebSocket (tokio-tungstenite).

use crate::nip94::NostrEvent;
use crate::NostrError;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

/// Relays públicos estáveis (mailbox outbound).
/// `relay.nostr.band` omitido — timeouts frequentes (~6s/EVENT) sem ganho.
pub const PUBLIC_RELAYS: &[&str] = &[
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://relay.primal.net",
];

/// Limite conservador por EVENT. Relays públicos variam; acima disto o
/// transporte Nostr/QEL não promete suporte a VOBs grandes.
pub const MAX_NOSTR_EVENT_BYTES: usize = 60 * 1024;

/// Pool de relays.
pub struct RelayPool {
    relays: Vec<String>,
    timeout: Duration,
    min_relays: usize,
}

impl Default for RelayPool {
    fn default() -> Self {
        Self::default_public()
    }
}

impl RelayPool {
    pub fn new(relays: Vec<String>) -> Self {
        Self {
            relays,
            timeout: Duration::from_secs(4),
            min_relays: 1,
        }
    }

    pub fn default_public() -> Self {
        Self::new(PUBLIC_RELAYS.iter().map(|s| (*s).to_string()).collect())
            .with_timeout(Duration::from_secs(6))
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_min_relays(mut self, min: usize) -> Self {
        self.min_relays = min.max(1);
        self
    }

    pub fn relays(&self) -> &[String] {
        &self.relays
    }

    /// Publica em paralelo em todos os relays; exige `min_relays` sucessos.
    pub async fn publish(&self, event: &NostrEvent) -> Result<usize, NostrError> {
        let payload = Arc::new(Self::serialized_event(event)?);
        let event_id = Arc::new(event.id.clone());
        let timeout_dur = self.timeout;
        let min = self.min_relays;

        let mut handles = Vec::new();
        for url in &self.relays {
            let url = url.clone();
            let payload = Arc::clone(&payload);
            let event_id = Arc::clone(&event_id);
            handles.push(tokio::spawn(async move {
                let result = Self::send_event_static(&url, &payload, &event_id, timeout_dur).await;
                if let Err(error) = &result {
                    tracing::warn!(relay = %url, %error, "relay falhou");
                } else {
                    tracing::info!(relay = %url, "EVENT publicado");
                }
                (url, result)
            }));
        }

        let mut ok = 0usize;
        let mut failures = Vec::new();
        for h in handles {
            match h.await {
                Ok((_url, Ok(()))) => ok += 1,
                Ok((url, Err(error))) => failures.push(format!("{url}: {error}")),
                Err(error) => failures.push(format!("task relay: {error}")),
            }
        }

        if ok < min {
            Err(NostrError::Msg(format!(
                "ACKs positivos insuficientes ({ok}/{min}): {}",
                failures.join("; ")
            )))
        } else {
            Ok(ok)
        }
    }

    /// Serializa exatamente o frame WebSocket e valida o limite antes de I/O.
    pub fn serialized_event(event: &NostrEvent) -> Result<String, NostrError> {
        let payload = json!(["EVENT", event]).to_string();
        if payload.len() > MAX_NOSTR_EVENT_BYTES {
            return Err(NostrError::EventTooLarge {
                event_id: event.id.clone(),
                bytes: payload.len(),
                limit: MAX_NOSTR_EVENT_BYTES,
            });
        }
        Ok(payload)
    }

    async fn send_event_static(
        url: &str,
        payload: &str,
        event_id: &str,
        overall: Duration,
    ) -> Result<(), NostrError> {
        let fut = async {
            let (mut ws, _) = connect_async(url)
                .await
                .map_err(|e| NostrError::WebSocket(e.to_string()))?;
            ws.send(Message::Text(payload.to_string()))
                .await
                .map_err(|e| NostrError::WebSocket(e.to_string()))?;

            // Um relay só conta após `OK <event-id> true`; NOTICE não é ACK.
            timeout(Duration::from_millis(800), async {
                while let Some(msg) = ws.next().await {
                    let msg = msg.map_err(|e| NostrError::WebSocket(e.to_string()))?;
                    if let Message::Text(t) = msg {
                        match parse_relay_ack(&t, event_id)? {
                            Some(true) => return Ok(()),
                            Some(false) => return Err(NostrError::Msg(format!("relay rejeitou EVENT: {t}"))),
                            None => {}
                        }
                    }
                }
                Err(NostrError::Msg("relay fechou sem ACK".into()))
            })
            .await
            .map_err(|_| NostrError::Timeout)??;

            let _ = ws.close(None).await;
            Ok(())
        };
        timeout(overall, fut)
            .await
            .map_err(|_| NostrError::Timeout)?
    }

    /// Subscreve em paralelo nos relays.
    pub async fn subscribe(&self, filter: Value) -> Result<Vec<NostrEvent>, NostrError> {
        let mut handles = Vec::new();
        for url in &self.relays {
            let url = url.clone();
            let filter = filter.clone();
            let t = self.timeout;
            handles.push(tokio::spawn(async move {
                Self::subscribe_one_static(&url, filter, t).await
            }));
        }
        let mut collected = Vec::new();
        for h in handles {
            if let Ok(Ok(mut evs)) = h.await {
                collected.append(&mut evs);
            }
        }
        Ok(collected)
    }

    async fn subscribe_one_static(
        url: &str,
        filter: Value,
        overall: Duration,
    ) -> Result<Vec<NostrEvent>, NostrError> {
        let sub_id = format!("mycelium-{}", &hex::encode(rand_id())[..8]);
        let req = json!(["REQ", sub_id, filter]);
        let fut = async {
            let (mut ws, _) = connect_async(url)
                .await
                .map_err(|e| NostrError::WebSocket(e.to_string()))?;
            ws.send(Message::Text(req.to_string()))
                .await
                .map_err(|e| NostrError::WebSocket(e.to_string()))?;

            let mut events = Vec::new();
            let collect_deadline = Duration::from_secs(5);
            let _ = timeout(collect_deadline, async {
                while let Some(msg) = ws.next().await {
                    let msg = msg.map_err(|e| NostrError::WebSocket(e.to_string()))?;
                    if let Message::Text(t) = msg {
                        if let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(&t) {
                            if arr.first().and_then(|v| v.as_str()) == Some("EVENT")
                                && arr.len() >= 3
                            {
                                if let Ok(ev) = serde_json::from_value::<NostrEvent>(arr[2].clone())
                                {
                                    events.push(ev);
                                }
                            }
                            if arr.first().and_then(|v| v.as_str()) == Some("EOSE") {
                                break;
                            }
                        }
                    }
                }
                Ok::<(), NostrError>(())
            })
            .await;

            let close = json!(["CLOSE", sub_id]);
            let _ = ws.send(Message::Text(close.to_string())).await;
            let _ = ws.close(None).await;
            Ok(events)
        };
        timeout(overall, fut)
            .await
            .map_err(|_| NostrError::Timeout)?
    }
}

fn parse_relay_ack(text: &str, expected_event_id: &str) -> Result<Option<bool>, NostrError> {
    let value: Value = match serde_json::from_str(text) {
        Ok(value) => value,
        Err(_) => return Ok(None),
    };
    let Some(parts) = value.as_array() else { return Ok(None) };
    if parts.first().and_then(Value::as_str) != Some("OK") {
        return Ok(None);
    }
    if parts.get(1).and_then(Value::as_str) != Some(expected_event_id) {
        return Ok(None);
    }
    Ok(parts.get(2).and_then(Value::as_bool))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::TcpListener;

    fn event_with_content(content: String) -> NostrEvent {
        NostrEvent { id: "a".repeat(64), pubkey: "b".repeat(64), created_at: 1,
            kind: 1, tags: vec![], content, sig: "c".repeat(128) }
    }

    async fn relay(reply_ok: bool) -> (String, tokio::task::JoinHandle<usize>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = format!("ws://{}", listener.local_addr().unwrap());
        let handle = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            let mut ws = tokio_tungstenite::accept_async(stream).await.unwrap();
            let received = ws.next().await.unwrap().unwrap();
            let payload = received.into_text().unwrap();
            let event_id = serde_json::from_str::<Value>(&payload).unwrap()[1]["id"].as_str().unwrap().to_owned();
            ws.send(Message::Text(json!(["OK", event_id, reply_ok, if reply_ok { "saved" } else { "blocked" }]).to_string())).await.unwrap();
            1
        });
        (address, handle)
    }

    #[test]
    fn only_positive_ok_is_a_relay_ack() {
        assert_eq!(parse_relay_ack(r#"["OK","id",true,""]"#, "id").unwrap(), Some(true));
        assert_eq!(parse_relay_ack(r#"["OK","id",false,"blocked"]"#, "id").unwrap(), Some(false));
        assert_eq!(parse_relay_ack(r#"["OK","other",true,""]"#, "id").unwrap(), None);
        assert_eq!(parse_relay_ack(r#"["NOTICE","slow down"]"#, "id").unwrap(), None);
    }

    #[tokio::test]
    async fn relay_only_counts_positive_ack() {
        let (url, server) = relay(true).await;
        assert_eq!(RelayPool::new(vec![url]).publish(&event_with_content("ok".into())).await.unwrap(), 1);
        assert_eq!(server.await.unwrap(), 1);

        let (url, server) = relay(false).await;
        let error = RelayPool::new(vec![url]).publish(&event_with_content("no".into())).await.unwrap_err().to_string();
        assert!(error.contains("blocked"), "{error}");
        assert_eq!(server.await.unwrap(), 1);
    }

    #[tokio::test]
    async fn oversized_event_opens_no_connection() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = format!("ws://{}", listener.local_addr().unwrap());
        let error = RelayPool::new(vec![address]).publish(&event_with_content("x".repeat(MAX_NOSTR_EVENT_BYTES))).await.unwrap_err();
        assert!(matches!(error, NostrError::EventTooLarge { .. }));
        assert!(tokio::time::timeout(Duration::from_millis(100), listener.accept()).await.is_err());
    }
}

fn rand_id() -> [u8; 8] {
    use rand::RngCore;
    let mut b = [0u8; 8];
    rand::rngs::OsRng.fill_bytes(&mut b);
    b
}
