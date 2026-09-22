//! # mycelium-node
//!
//! O organismo do nó: daemon persistente que une hifas, Spore Bank,
//! TheField, Inertia, Vacuum e Plasma — com estado em disco e plano de
//! controle via Unix socket.

mod assets;
mod control;
mod organism;
mod protocol;
mod seeds_ion;
mod src_ion;
mod store;

pub use control::{call, serve, Request, Response, StatusReport};
pub use organism::{Organism, OrganismConfig, OrganismError};
pub use protocol::Envelope;
pub use store::{NodeStore, OrganismState};

use std::path::PathBuf;
use tokio::sync::mpsc;

/// Opções para despertar o daemon.
#[derive(Debug, Clone)]
pub struct DaemonOptions {
    pub contribute: Option<mycelium_core::Resources>,
    pub bootstrap: Vec<String>,
    pub horizon_port: u16,
    pub listen: Vec<String>,
    pub seed_file: Option<PathBuf>,
    pub public_bootstrap: bool,
    pub bootstrap_url: Option<String>,
    /// Se true, desliga mDNS (só seeds/bootstrap).
    pub no_mdns: bool,
    /// IP público anunciado quando listen é 0.0.0.0.
    pub announce_ip: Option<String>,
    /// IPv6 público anunciado quando listen é `::`.
    pub announce_ip6: Option<String>,
    /// Opera como circuit relay server (seeds públicos).
    pub enable_relay: bool,
    /// Volunteer Sporocarp: relay + publish DNS + crédito ATP.
    pub sporocarp: bool,
    /// Override de membrana (`--membrane`).
    pub membrane: Option<mycelium_core::Membrane>,
    /// Inbound verificado (`--assume-reachable` / `MYCELIUM_REACHABLE`).
    pub assume_reachable: bool,
    pub enable_webrtc: bool,
    pub webrtc_port: u16,
    /// `None` = auto (folha/floresta); `Some` = forçar on/off.
    pub nostr_transport: Option<bool>,
    pub nostr_relay: Option<String>,
    /// Allowlist de peers licenciados (VOID-00); ativa o gate de admissão
    /// licenciada. Req. feature `license`.
    #[cfg(feature = "license")]
    pub licensed_peers: Option<std::collections::HashSet<String>>,
    /// Ativa o serviço VEIL Ω (SOCKS5 proxy e circuitos de privacidade).
    pub veil_enabled: bool,
    /// Endereço de bind do SOCKS5 (padrão: 127.0.0.1:1080).
    pub veil_socks5_addr: Option<std::net::SocketAddr>,
    /// Modo de operação do Veil ("geo", "veil", "mix").
    pub veil_mode: Option<String>,
    /// Papel do nó no VEIL Ω ("client", "relay", "exit", "all").
    pub veil_role: Option<String>,
    /// Endereço de escuta do roteador de salto VEIL Ω (para nós relay ou exit).
    pub veil_listen: Option<std::net::SocketAddr>,
    /// Descritores de nós Guard autorizados/conhecidos (JSON ou caminho para arquivo JSON).
    pub veil_guards: Vec<String>,
    /// Descritores de nós Middle autorizados/conhecidos.
    pub veil_middles: Vec<String>,
    /// Descritores de nós Exit autorizados/conhecidos.
    pub veil_exits: Vec<String>,
    /// Pinning de identidade para modo produção: `"<papel>:<hex_identity_pubkey>"`.
    pub veil_trust: Vec<String>,
}

impl Default for DaemonOptions {
    fn default() -> Self {
        Self {
            contribute: None,
            bootstrap: Vec::new(),
            horizon_port: 0,
            listen: Vec::new(),
            seed_file: None,
            public_bootstrap: false,
            bootstrap_url: None,
            no_mdns: false,
            announce_ip: None,
            announce_ip6: None,
            enable_relay: false,
            sporocarp: false,
            membrane: None,
            assume_reachable: false,
            enable_webrtc: false,
            webrtc_port: 4002,
            nostr_transport: None,
            nostr_relay: None,
            #[cfg(feature = "license")]
            licensed_peers: None,
            veil_enabled: false,
            veil_socks5_addr: None,
            veil_mode: None,
            veil_role: None,
            veil_listen: None,
            veil_guards: Vec::new(),
            veil_middles: Vec::new(),
            veil_exits: Vec::new(),
            veil_trust: Vec::new(),
        }
    }
}

/// Desperta o daemon: socket de controle + loop do organismo.
pub async fn run_daemon(home: PathBuf, opts: DaemonOptions) -> Result<(), OrganismError> {
    let sporocarp = opts.sporocarp;
    let enable_relay = opts.enable_relay || sporocarp;

    let organism = Organism::awaken(OrganismConfig {
        home: home.clone(),
        contribute: opts.contribute,
        bootstrap: opts.bootstrap,
        horizon_port: opts.horizon_port,
        listen: opts.listen,
        seed_file: opts.seed_file,
        public_bootstrap: opts.public_bootstrap,
        bootstrap_url: opts.bootstrap_url,
        enable_mdns: !opts.no_mdns,
        announce_ip: opts.announce_ip,
        announce_ip6: opts.announce_ip6,
        enable_relay,
        sporocarp,
        membrane: opts.membrane,
        assume_reachable: opts.assume_reachable,
        enable_webrtc: opts.enable_webrtc,
        webrtc_port: opts.webrtc_port,
        nostr_transport: opts.nostr_transport,
        nostr_relay: opts.nostr_relay,
        #[cfg(feature = "license")]
        licensed_peers: opts.licensed_peers,
        veil_enabled: opts.veil_enabled,
        veil_socks5_addr: opts.veil_socks5_addr,
        veil_mode: opts.veil_mode,
        veil_role: opts.veil_role,
        veil_listen: opts.veil_listen,
        veil_guards: opts.veil_guards,
        veil_middles: opts.veil_middles,
        veil_exits: opts.veil_exits,
        veil_trust: opts.veil_trust,
    })?;
    let sock = organism.home().join("mycelium.sock");
    let mut token = std::env::var("MYCELIUM_CONTROL_TOKEN")
        .ok()
        .filter(|t| !t.is_empty());
    // Seed/relay/sporocarp 24/7: exige token (ou gera um persistente em `{home}/control.token`).
    if enable_relay && token.is_none() {
        let path = home.join("control.token");
        token = Some(match std::fs::read_to_string(&path) {
            Ok(t) if !t.trim().is_empty() => t.trim().to_string(),
            _ => {
                let material = format!(
                    "mycelium-control|{}|{}",
                    home.display(),
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_nanos())
                        .unwrap_or(0)
                );
                let t = mycelium_core::ContentId::of(material.as_bytes()).to_string();
                let _ = std::fs::write(&path, &t);
                tracing::warn!(
                    token_file = %path.display(),
                    "MYCELIUM_CONTROL_TOKEN ausente — gerado em control.token"
                );
                t
            }
        });
    }
    let (tx, rx) = mpsc::channel(32);

    let serve_sock = sock.clone();
    tokio::spawn(async move {
        if let Err(e) = serve(&serve_sock, tx, token).await {
            tracing::error!("control socket: {e}");
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    organism.run(rx).await
}
