use axum::body::{Body, Bytes};
use axum::extract::{DefaultBodyLimit, State};
use axum::http::{header, Response, StatusCode};
use axum::routing::post;
use axum::Router;
use mycelium_rpc::{json_rpc_error, RpcKemIdentity, DEFAULT_MAX_RPC_BODY_BYTES};
use std::net::SocketAddr;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{mpsc, oneshot};

pub struct RpcGatewayMsg {
    pub raw: Vec<u8>,
    pub reply: oneshot::Sender<Result<Vec<u8>, String>>,
}

#[derive(Clone)]
struct GatewayState {
    tx: mpsc::Sender<RpcGatewayMsg>,
    timeout_ms: u64,
}

pub struct RpcGatewayHandle {
    pub bind: SocketAddr,
    task: tokio::task::JoinHandle<()>,
}

impl Drop for RpcGatewayHandle {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn response(status: StatusCode, body: Vec<u8>) -> Response<Body> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body))
        .expect("response válida")
}

async fn rpc_post(State(state): State<GatewayState>, body: Bytes) -> Response<Body> {
    let raw = body.to_vec();
    let (reply_tx, reply_rx) = oneshot::channel();
    if state
        .tx
        .send(RpcGatewayMsg {
            raw: raw.clone(),
            reply: reply_tx,
        })
        .await
        .is_err()
    {
        return response(
            StatusCode::SERVICE_UNAVAILABLE,
            json_rpc_error(&raw, -32000, "Mycelium RPC daemon indisponível"),
        );
    }

    match tokio::time::timeout(Duration::from_millis(state.timeout_ms + 500), reply_rx).await {
        Ok(Ok(Ok(body))) => response(StatusCode::OK, body),
        Ok(Ok(Err(message))) => response(
            StatusCode::SERVICE_UNAVAILABLE,
            json_rpc_error(&raw, -32001, message),
        ),
        Ok(Err(_)) => response(
            StatusCode::SERVICE_UNAVAILABLE,
            json_rpc_error(&raw, -32002, "canal RPC encerrado"),
        ),
        Err(_) => response(
            StatusCode::GATEWAY_TIMEOUT,
            json_rpc_error(&raw, -32003, "timeout do Mycelium RPC"),
        ),
    }
}

pub async fn serve_rpc_gateway(
    bind: SocketAddr,
    tx: mpsc::Sender<RpcGatewayMsg>,
    timeout_ms: u64,
) -> Result<RpcGatewayHandle, String> {
    if !bind.ip().is_loopback() {
        return Err(format!(
            "rpc-gateway deve escutar apenas em loopback; recebido {bind}"
        ));
    }
    let listener = tokio::net::TcpListener::bind(bind)
        .await
        .map_err(|e| format!("rpc-gateway bind {bind}: {e}"))?;
    let local = listener
        .local_addr()
        .map_err(|e| format!("rpc-gateway local_addr: {e}"))?;
    let state = GatewayState { tx, timeout_ms };
    let app = Router::new()
        .route("/", post(rpc_post))
        .layer(DefaultBodyLimit::max(DEFAULT_MAX_RPC_BODY_BYTES))
        .with_state(state);
    let task = tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            tracing::error!(error = %e, "rpc-gateway encerrado com erro");
        }
    });
    Ok(RpcGatewayHandle { bind: local, task })
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}

pub fn load_or_create_rpc_identity(path: &Path) -> Result<RpcKemIdentity, String> {
    if let Ok(private) = std::fs::read(path) {
        return RpcKemIdentity::from_private(&private)
            .map_err(|e| format!("rpc-kem.key inválida: {e}"));
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("criar diretório RPC {}: {e}", parent.display()))?;
    }
    let identity = RpcKemIdentity::generate();

    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .mode(0o600)
            .open(path)
            .map_err(|e| format!("criar {}: {e}", path.display()))?;
        file.write_all(identity.private_bytes())
            .map_err(|e| format!("gravar {}: {e}", path.display()))?;
    }
    #[cfg(not(unix))]
    {
        std::fs::write(path, identity.private_bytes())
            .map_err(|e| format!("gravar {}: {e}", path.display()))?;
    }

    Ok(identity)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_persists_and_restores_public_key() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("rpc-kem.key");
        let first = load_or_create_rpc_identity(&path).unwrap();
        let pk = first.public_key().to_vec();
        drop(first);
        let second = load_or_create_rpc_identity(&path).unwrap();
        assert_eq!(pk, second.public_key());
    }
}
