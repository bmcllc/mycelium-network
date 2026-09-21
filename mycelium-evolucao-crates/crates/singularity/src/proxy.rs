//! Event Horizon HTTP — reverse proxy por gravidade + rate-limit básico.

use crate::{HorizonTable, SingularityError};
use axum::body::Body;
use axum::extract::{ConnectInfo, Path, Request, State};
use axum::http::{header, StatusCode, Uri};
use axum::middleware::{from_fn, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, post};
use axum::Router;
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tokio::sync::oneshot;

/// Handle para encerrar o horizon.
pub struct HorizonHandle {
    pub bind: SocketAddr,
    shutdown: Option<oneshot::Sender<()>>,
}

impl HorizonHandle {
    pub fn shutdown(mut self) {
        if let Some(tx) = self.shutdown.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for HorizonHandle {
    fn drop(&mut self) {
        if let Some(tx) = self.shutdown.take() {
            let _ = tx.send(());
        }
    }
}

/// Janela e teto do rate-limit por IP (requests).
/// Configuráveis via `MYCELIUM_RATE_MAX` e `MYCELIUM_RATE_WINDOW_SECS`
/// (ex.: benchmarks/testes com carga sintética local).
const RATE_WINDOW: Duration = Duration::from_secs(60);
const RATE_MAX: u32 = 120;

struct RateConfig {
    max: u32,
    window: Duration,
}

fn rate_table() -> &'static Mutex<HashMap<IpAddr, (Instant, u32)>> {
    static TABLE: OnceLock<Mutex<HashMap<IpAddr, (Instant, u32)>>> = OnceLock::new();
    TABLE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn rate_config() -> &'static RateConfig {
    static CONFIG: OnceLock<RateConfig> = OnceLock::new();
    CONFIG.get_or_init(|| {
        let max = std::env::var("MYCELIUM_RATE_MAX")
            .ok()
            .and_then(|v| v.trim().parse::<u32>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(RATE_MAX);
        let window_secs = std::env::var("MYCELIUM_RATE_WINDOW_SECS")
            .ok()
            .and_then(|v| v.trim().parse::<u64>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(RATE_WINDOW.as_secs());
        RateConfig {
            max,
            window: Duration::from_secs(window_secs),
        }
    })
}

fn allow_ip(ip: IpAddr) -> bool {
    let config = rate_config();
    let mut guard = match rate_table().lock() {
        Ok(g) => g,
        Err(_) => return true,
    };
    let now = Instant::now();
    let entry = guard.entry(ip).or_insert((now, 0));
    if now.duration_since(entry.0) > config.window {
        *entry = (now, 1);
        return true;
    }
    if entry.1 >= config.max {
        return false;
    }
    entry.1 += 1;
    true
}

async fn rate_gate(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Response {
    if !allow_ip(addr.ip()) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            "rate limit: tente de novo em até 60s",
        )
            .into_response();
    }
    next.run(req).await
}

async fn security_headers_gate(
    req: Request,
    next: Next,
) -> Response {
    let mut resp = next.run(req).await;
    let headers = resp.headers_mut();
    headers.insert("x-content-type-options", header::HeaderValue::from_static("nosniff"));
    headers.insert("x-frame-options", header::HeaderValue::from_static("SAMEORIGIN"));
    headers.insert("referrer-policy", header::HeaderValue::from_static("strict-origin-when-cross-origin"));
    resp
}

async fn admin_gate(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Response {
    let path = req.uri().path();
    if path == "/seedwebhook" && !addr.ip().is_loopback() {
        let secret = std::env::var("MYCELIUM_WEBHOOK_SECRET").unwrap_or_default();
        let auth_hdr = req
            .headers()
            .get("x-webhook-secret")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");
        if secret.is_empty() || auth_hdr != secret {
            return (
                StatusCode::FORBIDDEN,
                [(header::CONTENT_TYPE, "text/plain")],
                "webhook restrito a loopback ou requer header X-Webhook-Secret",
            )
                .into_response();
        }
    }
    next.run(req).await
}

/// Sobe o Event Horizon em `bind` (ex.: `127.0.0.1:7474`).
pub async fn serve_horizon(
    bind: SocketAddr,
    table: HorizonTable,
) -> Result<HorizonHandle, String> {
    let listener = tokio::net::TcpListener::bind(bind)
        .await
        .map_err(|e| e.to_string())?;
    let local = listener.local_addr().map_err(|e| e.to_string())?;

    let app = Router::new()
        .route("/", any(root))
        .route("/console", any(console))
        .route("/catalog", any(catalog))
        .route("/health", any(health))
        .route("/metrics", any(metrics))
        .route("/plots/{id}", any(serve_plot))
        .route("/layers/{id}", any(serve_layer))
        .route("/seedwebhook", post(seedwebhook))
        .fallback(any(proxy))
        .layer(from_fn(admin_gate))
        .layer(from_fn(rate_gate))
        .layer(from_fn(security_headers_gate))
        .layer(axum::extract::DefaultBodyLimit::max(10 * 1024 * 1024))
        .with_state(table);

    let (tx, rx) = oneshot::channel::<()>();
    tokio::spawn(async move {
        let server = axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .with_graceful_shutdown(async {
            let _ = rx.await;
        });
        if let Err(e) = server.await {
            tracing::error!("event horizon: {e}");
        }
    });

    tracing::info!(%local, "event horizon aberto");
    Ok(HorizonHandle {
        bind: local,
        shutdown: Some(tx),
    })
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

/// Recebedor webhook do AlertManager (`POST /seedwebhook`).
///
/// O AlertManager envia payloads no formato `WebhookHandler`
/// (`{ receiver, status, alerts:[{status,labels:{instance,...},...}] }`).
/// Cada payload é anexado (append) como JSONL em `{home}/seeds.health.jsonl`,
/// de onde o `SeedBook` do organismo consome (`load_health_feed`) para marcar
/// seeds saudáveis como `firing` e limpar quando `resolved`. O receptor HTTP
/// grava bytes brutos — o parse de alertas é da responsabilidade do SeedBook
/// (em `mycelium-hyphae`), mantendo singularity sem acoplamento ao state do
/// seed book.
async fn seedwebhook(
    State(table): State<HorizonTable>,
    body: axum::body::Bytes,
) -> impl IntoResponse {
    let home = match table.read().unwrap().get_home() {
        Some(h) => h.to_path_buf(),
        None => return (StatusCode::SERVICE_UNAVAILABLE, "home não configurado"),
    };
    let path = home.join("seeds.health.jsonl");
    let line = std::str::from_utf8(&body).unwrap_or("");
    if let Err(e) = std::fs::create_dir_all(&home) {
        tracing::warn!(error = %e, "webhook: mkdir home");
        return (StatusCode::INTERNAL_SERVER_ERROR, "home create failed");
    }
    use std::io::Write as _;
    let mut f = match std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        Ok(f) => f,
        Err(e) => {
            tracing::warn!(error = %e, "webhook: abrir feed");
            return (StatusCode::INTERNAL_SERVER_ERROR, "feed open failed");
        }
    };
    if let Err(e) = writeln!(f, "{}", line.trim()) {
        tracing::warn!(error = %e, "webhook: gravar feed");
        return (StatusCode::INTERNAL_SERVER_ERROR, "feed write failed");
    }
    tracing::debug!(bytes = body.len(), "AlertManager webhook aceito");
    (StatusCode::OK, "ok")
}


async fn serve_plot(
    State(table): State<HorizonTable>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let home = match table.read().unwrap().get_home() {
        Some(h) => h.to_path_buf(),
        None => return (StatusCode::NOT_FOUND, "home não configurado").into_response(),
    };
    if id.len() != 66 || !id.starts_with("Qm") {
        return (StatusCode::BAD_REQUEST, "ContentId inválido (Qm + 64 hex)").into_response();
    }
    let cid = match id.parse::<mycelium_core::ContentId>() {
        Ok(c) => c,
        Err(_) => return (StatusCode::BAD_REQUEST, "ContentId inválido").into_response(),
    };
    match mycelium_sporebank::SporeBank::open(&home) {
        Ok(bank) => match bank.recall(&cid) {
            Some(plot) => {
                // NodeId é PÚBLICO, não um token de autenticação. Até haver
                // assinatura de desafio/capabilities e payload criptografado,
                // somente Plots explicitamente públicos são servidos em HTTP.
                if !plot.is_public() {
                    return StatusCode::NOT_FOUND.into_response();
                }
                let json = serde_json::to_string(&plot).unwrap_or_default();
                (StatusCode::OK, [(header::CONTENT_TYPE, "application/json")], json).into_response()
            }
            None => (StatusCode::NOT_FOUND, "plot ausente").into_response(),
        },
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("spore bank: {e}")).into_response(),
    }
}

async fn serve_layer(
    Path(_id): Path<String>,
) -> impl IntoResponse {
    // Uma layer não possui política de visibilidade/capability no formato
    // atual; expô-la por ContentId permitiria contornar /plots. O transporte
    // de layers públicas pelo DHT permanece; HTTP só voltará com ACL explícita.
    StatusCode::NOT_FOUND
}

async fn metrics(State(table): State<HorizonTable>) -> impl IntoResponse {
    let snapshot = table.read().unwrap().metrics_snapshot().to_string();
    (
        StatusCode::OK,
        [(
            header::CONTENT_TYPE,
            "text/plain; charset=utf-8; version=0.0.4",
        )],
        snapshot,
    )
}

async fn root(State(table): State<HorizonTable>) -> impl IntoResponse {
    let (ions, hosts) = {
        let t = table.read().unwrap();
        (
            t.ion_upstreams(),
            t.hosts().cloned().collect::<Vec<_>>(),
        )
    };
    let body = serde_json::json!({
        "service": "mycelium-singularity",
        "role": "event-horizon",
        "hosts": hosts,
        "ions": ions.iter().map(|(n, u)| serde_json::json!({"ion": n, "upstream": u})).collect::<Vec<_>>(),
        "hint": "GET /{ion}/  — rizomorfo proxya até a Chamber",
        "console": "/console",
    });
    (StatusCode::OK, [(header::CONTENT_TYPE, "application/json")], body.to_string())
}

/// UI mínima do Event Horizon — lista ions e links.
async fn console(State(table): State<HorizonTable>) -> impl IntoResponse {
    table.read().unwrap().bump_console_hit();
    let ions = {
        let t = table.read().unwrap();
        t.ion_upstreams()
    };
    let mut items = String::new();
    if ions.is_empty() {
        items.push_str("<li><em>nenhum ion em órbita</em></li>");
    } else {
        for (name, upstream) in &ions {
            items.push_str(&format!(
                "<li><a href=\"/{name}/\">{name}</a> \
                 <span style=\"opacity:.6\">→ {upstream}</span> \
                 · <a href=\"/{name}/index.html\">html</a></li>"
            ));
        }
    }
    let html = format!(
        r#"<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Mycelium — Event Horizon</title>
<style>
  :root {{ --bg:#0d1f17; --fg:#d7f5e3; --accent:#3d8f6a; --muted:#7aa892; }}
  body {{ margin:0; min-height:100vh; font-family:"IBM Plex Sans",Segoe UI,sans-serif;
         background:radial-gradient(1200px 600px at 10% -10%,#1a3d2e,var(--bg));
         color:var(--fg); padding:2.5rem clamp(1rem,4vw,3rem); }}
  h1 {{ font-family:"IBM Plex Serif",Georgia,serif; font-weight:500; letter-spacing:-.02em;
       font-size:clamp(1.8rem,4vw,2.6rem); margin:0 0 .4rem; }}
  p {{ color:var(--muted); max-width:36rem; line-height:1.5; }}
  ul {{ list-style:none; padding:0; margin:2rem 0; }}
  li {{ padding:.85rem 0; border-bottom:1px solid rgba(125,180,150,.2); }}
  a {{ color:var(--accent); text-decoration:none; font-weight:600; }}
  a:hover {{ text-decoration:underline; }}
  .meta {{ font-size:.85rem; color:var(--muted); margin-top:2rem; }}
</style>
</head>
<body>
  <h1>Event Horizon</h1>
  <p>Console do Singularity — ions em órbita neste nó. Cada link passa pelo rizomorfo até a Vacuum Chamber.</p>
  <ul>{items}</ul>
  <p class="meta"><a href="/catalog">catálogo JSON</a> · <a href="/">JSON</a> · <a href="/health">health</a></p>
</body>
</html>"#
    );
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        html,
    )
}

async fn catalog(State(table): State<HorizonTable>) -> impl IntoResponse {
    let json = table.read().unwrap().catalog_json();
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        json,
    )
}

async fn proxy(State(table): State<HorizonTable>, req: Request) -> Response {
    let path = req.uri().path().to_string();
    let ion = path
        .trim_start_matches('/')
        .split('/')
        .next()
        .unwrap_or("")
        .to_string();

    if ion.is_empty() {
        return StatusCode::NOT_FOUND.into_response();
    }

    let mut candidates = {
        let t = table.read().unwrap();
        match t.route_ion_candidates(&ion) {
            Ok(orbits) => orbits,
            Err(SingularityError::NoOrbit(_)) => {
                return (StatusCode::NOT_FOUND, format!("nenhum ion `{ion}` no horizonte"))
                    .into_response();
            }
            Err(e) => {
                return (StatusCode::BAD_GATEWAY, e.to_string()).into_response();
            }
        }
    };
    // Carga observada: alimenta o Plasma sense → auto-scaling de réplicas.
    table.write().unwrap().note_request(&ion);

    // Reescreve /{ion}/foo → /foo no upstream.
    let rest = {
        let stripped = path
            .strip_prefix(&format!("/{ion}"))
            .unwrap_or(&path);
        if stripped.is_empty() {
            "/".to_string()
        } else {
            stripped.to_string()
        }
    };
    let query = req
        .uri()
        .query()
        .map(|q| format!("?{q}"))
        .unwrap_or_default();
    let client = reqwest::Client::new();
    let method = reqwest::Method::from_bytes(req.method().as_str().as_bytes())
        .unwrap_or(reqwest::Method::GET);

    let (parts, body) = req.into_parts();
    let body_bytes = match axum::body::to_bytes(body, 2 * 1024 * 1024).await {
        Ok(b) => b,
        Err(e) => {
            return (StatusCode::BAD_REQUEST, format!("body: {e}")).into_response();
        }
    };

    // Retentativa apenas para leituras sem corpo. Reenviar uma escrita após
    // timeout pode duplicar transações se o primeiro upstream a processou.
    let can_retry = body_bytes.is_empty()
        && (parts.method == axum::http::Method::GET || parts.method == axum::http::Method::HEAD);
    candidates.truncate(if can_retry { 3 } else { 1 });
    let candidate_count = candidates.len();

    for (attempt, orbit) in candidates.into_iter().enumerate() {
        let target = format!("{}{}{}", orbit.upstream, rest, query);
        let mut builder = client.request(method.clone(), &target).timeout(Duration::from_secs(5));
        for (name, value) in parts.headers.iter() {
            if name == header::HOST || name == header::CONNECTION {
                continue;
            }
            if let Ok(v) = value.to_str() {
                builder = builder.header(name.as_str(), v);
            }
        }
        match builder.body(body_bytes.clone()).send().await {
            Ok(upstream_resp) => {
                let status = StatusCode::from_u16(upstream_resp.status().as_u16())
                    .unwrap_or(StatusCode::BAD_GATEWAY);
                if can_retry
                    && attempt + 1 < candidate_count
                    && (status == StatusCode::BAD_GATEWAY
                        || status == StatusCode::SERVICE_UNAVAILABLE
                        || status == StatusCode::GATEWAY_TIMEOUT)
                {
                    tracing::warn!(%ion, node = %orbit.node, %status, "upstream indisponível; tentando réplica");
                    continue;
                }
                let mut response = Response::builder().status(status);
                for (name, value) in upstream_resp.headers().iter() {
                    if name == header::TRANSFER_ENCODING || name == header::CONNECTION {
                        continue;
                    }
                    response = response.header(name.as_str(), value.as_bytes());
                }
                let bytes = upstream_resp.bytes().await.unwrap_or_default();
                return response
                    .body(Body::from(bytes))
                    .unwrap_or_else(|_| StatusCode::BAD_GATEWAY.into_response());
            }
            Err(e) => {
                tracing::warn!(%ion, node = %orbit.node, error = %e, "upstream falhou");
                if !can_retry || attempt + 1 == candidate_count {
                    return (StatusCode::BAD_GATEWAY, format!("rizomorfo falhou: {e}"))
                        .into_response();
                }
            }
        }
    }
    StatusCode::BAD_GATEWAY.into_response()
}

#[allow(dead_code)]
fn _uri_ok(u: &str) -> bool {
    u.parse::<Uri>().is_ok()
}
