//! Plano de controle local: Unix socket + JSON linha-a-linha.
//!
//! Se `MYCELIUM_CONTROL_TOKEN` estiver definido no daemon, cada pedido
//! deve incluir `"auth": "<token>"` no JSON.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream, UnixListener, UnixStream};
use tokio::sync::{mpsc, oneshot};

/// Porta TCP de controlo (fallback Android / sem Unix socket).
fn tcp_port_path(sock_path: &Path) -> PathBuf {
    sock_path.with_extension("tcp")
}

/// Pedidos da CLI ao daemon.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "snake_case")]
pub enum Request {
    Status,
    Sow {
        message: String,
        path: String,
        content: String,
        /// QEL k,n (ex. "3,7"). Requer feature `nostr`.
        #[serde(default)]
        qel: Option<String>,
        #[serde(default)]
        nostr: bool,
        #[serde(default)]
        ghost: bool,
        #[serde(default)]
        recipient: Option<String>,
    },
    /// Importa um spore print pelo escritor único do daemon.
    ImportSpore {
        spore_print_base64: String,
        expected_plot: String,
    },
    Signal {
        plot: String,
        quorum: usize,
        ion: String,
        name: String,
    },
    Resonate {
        signal: String,
    },
    Recall {
        plot: String,
        #[serde(default)]
        qel: bool,
        #[serde(default)]
        nostr: bool,
        #[serde(default)]
        qel_threshold: Option<u8>,
    },
    Bootstrap {
        addr: String,
    },
    /// Escreve um átomo no Isotope e propaga via hifas.
    IsotopePut {
        key: String,
        value: String,
        #[serde(default)]
        clock: Option<u64>,
    },
    /// Lê um átomo do Nucleus Isotope local.
    IsotopeGet {
        key: String,
    },
    /// Fragmenta um segredo em N Shades (Shamir SSS).
    EntropyShatter {
        secret: String,
        threshold: u8,
        total: u8,
    },
    /// Reconstrói o segredo a partir de Shades recolhidas.
    EntropyReconstruct {
        threshold: u8,
    },
    /// Mostra as Shades em custódia.
    EntropyStatus,
    /// Mostra balance local + de peers.
    Balance,
    /// Dispara migração de Ion para outro nó.
    IonMigrate {
        ion: String,
        target: String,
    },
    /// Mostra zonas de crescimento.
    Zones,
    /// Lista todos os spores do catálogo da Mycelium Store.
    StoreList,
    /// Detecta capacidades de emulação do host (QEMU, MAME, RetroArch, bwrap).
    StoreCaps,
    /// Lança um spore por ID via control socket.
    StoreLaunch {
        id: String,
        engine: Option<String>,
        sandbox: bool,
    },
    /// Publica um novo spore no SporeBank (deposit + index).
    StorePublish {
        id: String,
        title: String,
        platform: String,
    },
    /// Publica uma árvore de código (repo) como Plot multi-leaf no SporeBank.
    RepoPublish {
        #[serde(default)]
        repository: Option<String>,
        #[serde(default)]
        branch: Option<String>,
        /// Ponta que o cliente espera substituir. Quando informada, a
        /// publicação falha se a referência já tiver avançado.
        #[serde(default)]
        expected_previous_cid: Option<String>,
        message: String,
        leaves: Vec<giggs::Leaf>,
    },
    /// Reconstrói uma árvore de código a partir de um ContentId.
    RepoClone {
        cid: String,
    },
    /// Executa Build e Test sobre um snapshot exato, sem promover ou fazer deploy.
    InertiaRun {
        cid: String,
    },
    /// Recupera uma atestação persistida pelo seu ContentId.
    InertiaAttestation {
        cid: String,
    },
    /// Transfere nutrientes assinados (Micelial Value Layer).
    Transfer {
        /// GhostID pubkey x-only hex (64 chars) do recebedor.
        to: String,
        amount: u64,
        /// atp | enzymes | mycelia | spores | resilience
        nutrient: String,
        /// consumption | seeding | compute | relay | equity | royalty | revenue
        kind: String,
        memo: String,
        asset: Option<String>,
    },
    /// Saldos, histórico e transferências recentes do ledger local.
    LedgerInfo,
    /// Regista um ativo físico / empresa com cotas (RWA, Fase 3/4).
    AssetRegister {
        id: String,
        name: String,
        kind: String,
        description: String,
        location: Option<String>,
        shares_total: u64,
        price_per_share: u64,
    },
    /// Lista ativos registados.
    AssetList,
    /// Mostra cotas de um ativo.
    AssetShares {
        id: String,
    },
    /// Transfere cotas de um ativo para outro holder.
    AssetTransfer {
        asset: String,
        shares: u64,
        to: String,
    },
    /// Regista uma empresa/cooperativa com cotas (Fase 4).
    CompanyRegister {
        name: String,
        shares_total: u64,
    },
    /// Distribui dividendo (Revenue) proporcional às cotas.
    CompanyPayout {
        name: String,
        total: u64,
    },
    /// Anuncia um repositório via gossipsub (URL pública, sem dados sensíveis).
    SeedRepo {
        name: String,
        url: String,
        commit: String,
        description: String,
    },
    /// Publica código-fonte direto na rede (sem git, sem GitHub).
    SeedCode {
        name: String,
        description: String,
        ion: String,
        visibility: String,
        /// Arquivos: (caminho, conteúdo em base64).
        files: Vec<(String, String)>,
    },
    /// Baixa código-fonte da rede via ContentId.
    RecallCode {
        plot: String,
        /// Diretório absoluto de destino (default: nome derivado da mensagem do plot).
        #[serde(default)]
        output_dir: Option<String>,
    },
    /// Materializa e ativa ativamente um serviço comunitário a partir de um Plot em Chamber viva.
    MaterializeService {
        ion: String,
        #[serde(default)]
        plot: Option<String>,
    },
    /// Lista repositórios anunciados via gossipsub por peers da rede.
    Repos,
    /// Verifica uma licença VOID-00 (ML-DSA-87 + device binding).
    #[cfg(feature = "license")]
    VerifyLicense {
        /// Chave pública do vendor (2592 bytes, hex).
        vendor_public_key: String,
        /// Entropia do dispositivo (hex).
        device_entropy: String,
        /// SKU do produto (ex: "SKU-A-ENTIDADE-PRO").
        sku: String,
        /// Payload canónico da licença (hex, 121 bytes).
        license_payload: String,
        /// Assinatura ML-DSA-87 (hex, 4627 bytes).
        signature: String,
        /// Timestamp Unix em segundos.
        unix_now_secs: u64,
        /// **Auto-release**: se presente, e a verificação passar, este PeerId é
        /// inscrito na allowlist de admissão licenciada (gate passa a aceitá-lo).
        peer_id: Option<String>,
    },
    /// Inscreve um PeerId na allowlist de admissão licenciada (runtime).
    /// Requer feature `license`.
    #[cfg(feature = "license")]
    RegisterLicensedPeer {
        /// PeerId do nó a autorizar.
        peer_id: String,
    },
    /// Valida um invoice BOLT11 (Lightning) e devolve resumo. Requer feature `bolt11`.
    #[cfg(feature = "bolt11")]
    Bolt11Validate {
        /// Invoice BOLT11 (string completa `lnbc...`).
        bolt11: String,
    },
    /// Inicia o serviço VEIL Ω (SOCKS5 + circuitos de privacidade).
    VeilStart {
        #[serde(default)]
        mode: Option<String>,
        #[serde(default)]
        socks5_port: Option<u16>,
        #[serde(default)]
        role: Option<String>,
        #[serde(default)]
        listen: Option<String>,
        /// Pinning de identidade `"<nome>:<hex_identity>"` por salto (modo produção).
        #[serde(default)]
        trust: Vec<String>,
        /// Endereço público anunciado no descritor (ex.: `203.0.113.9:9050`). Separado do listen.
        #[serde(default)]
        advertise: Option<String>,
        /// Caminho da identidade persistente do nó (GhostId + ML-KEM). Default: `{home}/veil-identity.json`.
        #[serde(default)]
        identity: Option<String>,
        /// Rota a identidade Veil explicitamente (nunca implícita em reinício).
        #[serde(default)]
        rotate_identity: bool,
        /// IP de origem explícito do egresso do Exit (multi-homing). Sob NAT o destino
        /// observa o IP da tradução, não este bind.
        #[serde(default)]
        egress_bind: Option<String>,
        /// Pontes de entrada VEIL (repetível, ex.: `127.0.0.1:9001`). Quando presente,
        /// o cliente usa somente bridges — NUNCA insere entrada direta ao Guard.
        #[serde(default)]
        bridges: Vec<String>,
        /// Endereço de escuta da bridge (papel `bridge`).
        #[serde(default)]
        bridge_listen: Option<String>,
        /// Endereço do Guard para o qual a bridge repassa o fluxo cru (papel `bridge`).
        #[serde(default)]
        bridge_target: Option<String>,
    },
    /// Encerra o serviço VEIL Ω.
    VeilStop,
    /// Consulta o estado do serviço VEIL Ω.
    VeilStatus,
    /// Consulta o descritor criptográfico assinado deste nó.
    VeilDescriptor,
    Shutdown,
}

/// Respostas do daemon.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum Response {
    Ok { message: String },
    Status(Box<StatusReport>),
    Err { message: String },
    StoreList { spores: Vec<mycelium_store::SoftwareSpore> },
    StoreCaps { caps: mycelium_store::SystemCapabilities },
    StoreLaunched {
        spore_id: String,
        engine: String,
        message: String,
    },
    RepoPublished {
        cid: String,
        leaves: usize,
        bytes: usize,
    },
    RepoCloneResult {
        message: String,
        leaves: Vec<giggs::Leaf>,
    },
    InertiaRunResult {
        input_cid: String,
        build_attestation_cid: String,
        test_attestation_cid: Option<String>,
        artifact_cid: Option<String>,
        success: bool,
    },
    InertiaAttestationResult {
        cid: String,
        attestation: inertia::SignedAttestation,
    },
    TransferResult {
        tx_id: String,
        kind: String,
        nutrient: String,
        amount: u64,
        to: String,
    },
    LedgerReport {
        pubkey: String,
        balances: std::collections::HashMap<mycelium_core::Nutrient, u64>,
        history: Vec<mycelium_nutrients::Exchange>,
        transfers: Vec<mycelium_nutrients::SignedTransfer>,
    },
    AssetListResult {
        assets: Vec<crate::assets::AssetRecord>,
    },
    AssetSharesResult {
        asset: String,
        holdings: Vec<crate::assets::ShareHolding>,
    },
    /// Relatório de estado do serviço VEIL Ω.
    VeilStatusResult {
        active: bool,
        role: Option<String>,
        mode: Option<String>,
        socks5_addr: Option<String>,
        listen_addr: Option<String>,
        descriptor: Option<String>,
        session_id: Option<String>,
        bytes_routed: u64,
        mac_address: Option<String>,
        kill_switch: String,
        active_layers: usize,
        /// Entrada de transporte que autenticou com o Guard (id da bridge selecionada).
        #[serde(default)]
        entrada_ativa: Option<String>,
        /// Entradas registradas no pool (somente bridges no modo somente-bridges).
        #[serde(default)]
        entradas: Vec<String>,
        /// Quantas entradas falharam antes do sucesso (failover) na inicialização do circuito.
        #[serde(default)]
        tentativas_failover: usize,
        /// Motivos de falha por entrada/estágio da última inicialização do circuito.
        #[serde(default)]
        motivos_falha: Vec<String>,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StatusReport {
    pub node_id: String,
    pub peer_id: String,
    pub listen_addrs: Vec<String>,
    pub neighbors: usize,
    pub plots: usize,
    pub signals: usize,
    pub ions: Vec<String>,
    pub atp: u64,
    pub enzymes: u64,
    pub mycelia: u64,
    pub spores: u64,
    pub resilience: u64,
    pub anastomoses: u64,
    pub atrophies: u64,
    pub messages_in: u64,
    pub messages_out: u64,
    pub home: String,
    /// URL do Event Horizon HTTP (Singularity).
    #[serde(default)]
    pub event_horizon: String,
    /// Endpoints vivos das Chambers (Vacuum).
    #[serde(default)]
    pub ion_endpoints: Vec<String>,
    /// Átomos no Nucleus Isotope local.
    #[serde(default)]
    pub isotope_atoms: usize,
    /// Índice do shard Isotope deste nó.
    #[serde(default)]
    pub isotope_shard: u32,
    /// Tamanho do anel Isotope.
    #[serde(default)]
    pub isotope_ring: u32,
    /// Membrana fisiológica: floresta | raiz | folha | esporocarp.
    #[serde(default)]
    pub membrane: String,
    /// Volunteer Sporocarp (relay comunitário).
    #[serde(default)]
    pub sporocarp: bool,
    /// Nome DNS TXT do Spore Bank em uso (se configurado).
    #[serde(default)]
    pub dns_seed: Option<String>,
    /// Inbound WAN declarado alcançável (`MYCELIUM_REACHABLE` / `--assume-reachable`).
    #[serde(default)]
    pub wan_reachable: bool,
    /// Este nó opera como circuit relay (esporocarp).
    #[serde(default)]
    pub is_relay: bool,
    /// PeerId do relay activo (folha em circuito), se houver.
    #[serde(default)]
    pub active_relay: Option<String>,
    /// Saúde do catálogo de relays mesh: healthy|degraded|none|self.
    #[serde(default)]
    pub relay_health: String,
    /// Fase Physarum (exploratory|transport|dormant).
    #[serde(default)]
    pub physarum_phase: String,
    /// Endpoint JSON-RPC local do gateway, se ativo.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rpc_gateway: Option<String>,
    /// Este nó possui um upstream Base local e atua como provider.
    #[serde(default)]
    pub rpc_provider: bool,
    /// Chave pública ML-KEM-1024 do provider (hex), necessária no P1/P2 explícito.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rpc_provider_kem: Option<String>,
    /// Chain ID configurado para o RPC.
    #[serde(default)]
    pub rpc_chain_id: u64,
    /// Endereço SOCKS5 Veil ativo, se habilitado.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub veil_socks5: Option<String>,
}

/// Mensagem interna: pedido + canal de resposta.
pub struct ControlMsg {
    pub request: Request,
    pub reply: oneshot::Sender<Response>,
}

/// Serve o plano de controlo (Unix socket, ou TCP 127.0.0.1 se Unix for bloqueado — Android shell).
pub async fn serve(
    sock_path: impl AsRef<Path>,
    tx: mpsc::Sender<ControlMsg>,
    required_token: Option<String>,
) -> Result<(), String> {
    let path = sock_path.as_ref();
    let _ = std::fs::remove_file(path);
    let _ = std::fs::remove_file(tcp_port_path(path));
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    match UnixListener::bind(path) {
        Ok(listener) => {
            if required_token.is_some() {
                tracing::info!(path = %path.display(), "control socket listening (auth obrigatória)");
            } else {
                tracing::info!(path = %path.display(), "control socket listening");
            }
            loop {
                let (stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
                let tx = tx.clone();
                let token = required_token.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_client_unix(stream, tx, token).await {
                        tracing::warn!("control client error: {e}");
                    }
                });
            }
        }
        Err(e) => {
            tracing::warn!(
                path = %path.display(),
                err = %e,
                "Unix control socket indisponível — fallback TCP 127.0.0.1"
            );
            let listener = TcpListener::bind("127.0.0.1:0")
                .await
                .map_err(|e| e.to_string())?;
            let port = listener.local_addr().map_err(|e| e.to_string())?.port();
            let port_file = tcp_port_path(path);
            std::fs::write(&port_file, format!("{port}\n")).map_err(|e| e.to_string())?;
            if required_token.is_some() {
                tracing::info!(%port, "control TCP listening (auth obrigatória)");
            } else {
                tracing::info!(%port, "control TCP listening");
            }
            loop {
                let (stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
                let tx = tx.clone();
                let token = required_token.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_client_tcp(stream, tx, token).await {
                        tracing::warn!("control client error: {e}");
                    }
                });
            }
        }
    }
}

fn parse_request_line(line: &str, required: Option<&str>) -> Result<Request, String> {
    let mut value: serde_json::Value =
        serde_json::from_str(line).map_err(|e| format!("pedido inválido: {e}"))?;
    if let Some(exp) = required {
        let got = value
            .get("auth")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if got != exp {
            return Err("auth inválida ou ausente (defina MYCELIUM_CONTROL_TOKEN)".into());
        }
    }
    if let Some(obj) = value.as_object_mut() {
        obj.remove("auth");
    }
    serde_json::from_value(value).map_err(|e| format!("pedido inválido: {e}"))
}

async fn write_response<W: AsyncWriteExt + Unpin>(
    writer: &mut W,
    resp: &Response,
) -> Result<(), String> {
    let mut line = serde_json::to_string(resp).map_err(|e| e.to_string())?;
    line.push('\n');
    writer
        .write_all(line.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn handle_client_unix(
    stream: UnixStream,
    tx: mpsc::Sender<ControlMsg>,
    required_token: Option<String>,
) -> Result<(), String> {
    let (reader, mut writer) = stream.into_split();
    handle_client_lines(reader, &mut writer, tx, required_token).await
}

async fn handle_client_tcp(
    stream: TcpStream,
    tx: mpsc::Sender<ControlMsg>,
    required_token: Option<String>,
) -> Result<(), String> {
    let (reader, mut writer) = stream.into_split();
    handle_client_lines(reader, &mut writer, tx, required_token).await
}

async fn handle_client_lines<R, W>(
    reader: R,
    writer: &mut W,
    tx: mpsc::Sender<ControlMsg>,
    required_token: Option<String>,
) -> Result<(), String>
where
    R: tokio::io::AsyncRead + Unpin,
    W: AsyncWriteExt + Unpin,
{
    let mut lines = BufReader::new(reader).lines();
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if line.trim().is_empty() {
            continue;
        }
        let request = match parse_request_line(&line, required_token.as_deref()) {
            Ok(r) => r,
            Err(message) => {
                write_response(writer, &Response::Err { message }).await?;
                continue;
            }
        };
        let (reply_tx, reply_rx) = oneshot::channel();
        if tx
            .send(ControlMsg {
                request,
                reply: reply_tx,
            })
            .await
            .is_err()
        {
            let resp = Response::Err {
                message: "daemon encerrado".into(),
            };
            write_response(writer, &resp).await?;
            break;
        }
        let resp = reply_rx.await.unwrap_or(Response::Err {
            message: "sem resposta do organismo".into(),
        });
        write_response(writer, &resp).await?;
    }
    Ok(())
}

/// Resolve o token de controlo: env `MYCELIUM_CONTROL_TOKEN`, senão `{home}/control.token`.
fn resolve_control_token(sock_path: &Path) -> Option<String> {
    if let Ok(token) = std::env::var("MYCELIUM_CONTROL_TOKEN") {
        let t = token.trim();
        if !t.is_empty() {
            return Some(t.to_string());
        }
    }
    let token_file = sock_path
        .parent()
        .unwrap_or(sock_path)
        .join("control.token");
    std::fs::read_to_string(&token_file)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Cliente: envia um pedido ao daemon e devolve a resposta.
pub async fn call(sock_path: impl AsRef<Path>, request: Request) -> Result<Response, String> {
    let path = sock_path.as_ref();
    let mut value = serde_json::to_value(&request).map_err(|e| e.to_string())?;
    if let Some(token) = resolve_control_token(path) {
        if let Some(obj) = value.as_object_mut() {
            obj.insert("auth".into(), serde_json::Value::String(token));
        }
    }
    let mut line = serde_json::to_string(&value).map_err(|e| e.to_string())?;
    line.push('\n');

    if let Ok(stream) = UnixStream::connect(path).await {
        return exchange_line(stream, &line).await;
    }

    let port_file = tcp_port_path(path);
    let port: u16 = std::fs::read_to_string(&port_file)
        .map_err(|e| {
            format!(
                "daemon não está rodando ({} / {}): {e}",
                path.display(),
                port_file.display()
            )
        })?
        .trim()
        .parse()
        .map_err(|e| format!("porta de controlo inválida: {e}"))?;
    let stream = TcpStream::connect(("127.0.0.1", port))
        .await
        .map_err(|e| format!("daemon não está rodando (127.0.0.1:{port}): {e}"))?;
    exchange_line(stream, &line).await
}

async fn exchange_line<S>(stream: S, line: &str) -> Result<Response, String>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    let (reader, mut writer) = tokio::io::split(stream);
    writer
        .write_all(line.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    let mut lines = BufReader::new(reader).lines();
    let resp_line = lines
        .next_line()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "daemon fechou a conexão sem responder".to_string())?;
    serde_json::from_str(&resp_line).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_required_rejects_missing() {
        let err = parse_request_line(r#"{"cmd":"status"}"#, Some("secret")).unwrap_err();
        assert!(err.contains("auth"));
    }

    #[test]
    fn auth_ok_strips_field() {
        let req = parse_request_line(r#"{"auth":"secret","cmd":"status"}"#, Some("secret")).unwrap();
        assert!(matches!(req, Request::Status));
    }

    #[test]
    fn repo_publish_accepts_optional_expected_previous_cid() {
        let without_expected = parse_request_line(
            r#"{"cmd":"repo_publish","message":"initial","leaves":[]}"#,
            None,
        )
        .unwrap();
        assert!(matches!(
            without_expected,
            Request::RepoPublish {
                expected_previous_cid: None,
                ..
            }
        ));

        let with_expected = parse_request_line(
            r#"{"cmd":"repo_publish","message":"next","leaves":[],"expected_previous_cid":"Qm0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}"#,
            None,
        )
        .unwrap();
        assert!(matches!(
            with_expected,
            Request::RepoPublish {
                expected_previous_cid: Some(cid),
                ..
            } if cid.starts_with("Qm0123")
        ));
    }

    #[test]
    fn inertia_requests_are_deserializable() {
        let run = parse_request_line(
            r#"{"cmd":"inertia_run","cid":"Qm0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}"#,
            None,
        )
        .unwrap();
        assert!(matches!(run, Request::InertiaRun { .. }));

        let query = parse_request_line(
            r#"{"cmd":"inertia_attestation","cid":"Qmabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"}"#,
            None,
        )
        .unwrap();
        assert!(matches!(query, Request::InertiaAttestation { .. }));
    }
}
