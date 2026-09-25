//! # mycelium — CLI do substrato vivo

use axum::routing::get;
use axum::{Json, Router};
use clap::{Parser, Subcommand};
use mycelium_core::Resources;
use mycelium_hyphae::{SeedBook, DEFAULT_BOOTSTRAP_URL, DEFAULT_DNS_SEED_NAME};
use mycelium_node::{call, run_daemon, DaemonOptions, NodeStore, Request, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;
use std::path::{Component, Path, PathBuf};
use std::str::FromStr;

#[derive(Parser)]
#[command(
    name = "mycelium",
    about = "Mycelium Network — o substrato vivo do The Lattice",
    version
)]
struct Cli {
    #[arg(long, global = true, env = "MYCELIUM_HOME")]
    home: Option<PathBuf>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum Commands {
    Sprout {
        #[arg(long, default_value = "1cpu,1gb,10gb")]
        contribute: String,
    },
    Daemon {
        #[arg(long, default_value = "1cpu,1gb,10gb")]
        contribute: String,
        /// Seed/bootstrap multiaddr (repetível). Aceita `/dnsaddr/...`.
        #[arg(long = "bootstrap")]
        bootstrap: Vec<String>,
        /// Arquivo local de seeds (uma multiaddr por linha).
        #[arg(long = "seed-file")]
        seed_file: Option<PathBuf>,
        /// Baixa o catálogo público de seeds (além da LAN).
        #[arg(long = "public-bootstrap")]
        public_bootstrap: bool,
        /// URL do catálogo (default: github mycelium-network/seeds).
        #[arg(long = "bootstrap-url")]
        bootstrap_url: Option<String>,
        /// Multiaddr de escuta (repetível). Ex.: `/ip4/0.0.0.0/tcp/4001`
        #[arg(long = "listen")]
        listen: Vec<String>,
        /// Porta do Event Horizon HTTP (Singularity).
        #[arg(long, default_value_t = 7474)]
        horizon_port: u16,
        /// Desliga mDNS — discovery só via seed book / --bootstrap.
        #[arg(long = "no-mdns")]
        no_mdns: bool,
        /// IP público anunciado (quando listen é 0.0.0.0). Env: MYCELIUM_ANNOUNCE_IP.
        #[arg(long = "announce-ip", env = "MYCELIUM_ANNOUNCE_IP")]
        announce_ip: Option<String>,
        /// IPv6 público anunciado (quando listen é `::`). Env: MYCELIUM_ANNOUNCE_IP6.
        #[arg(long = "announce-ip6", env = "MYCELIUM_ANNOUNCE_IP6")]
        announce_ip6: Option<String>,
        /// Opera como circuit relay v2 (seed público). Gera control.token se sem env.
        #[arg(long = "relay")]
        relay: bool,
        /// Volunteer Sporocarp: relay + publish DNS TXT + crédito ATP.
        #[arg(long = "sporocarp")]
        sporocarp: bool,
        /// Override da membrana (floresta|raiz|folha|esporocarp).
        #[arg(long = "membrane", value_parser = parse_membrane)]
        membrane: Option<mycelium_core::Membrane>,
        /// Declara inbound TCP/QUIC alcançável (auto-esporocarp se IPv6/announce).
        /// Env: MYCELIUM_REACHABLE=1
        #[arg(long = "assume-reachable", env = "MYCELIUM_REACHABLE")]
        assume_reachable: bool,
        /// Escuta webrtc-direct (requer `cargo build --features webrtc`).
        #[arg(long = "webrtc")]
        webrtc: bool,
        /// Porta UDP webrtc-direct.
        #[arg(long = "webrtc-port", default_value_t = 4002)]
        webrtc_port: u16,
        /// Transporte libp2p sobre Nostr (força ON). Sem flag: auto em folha/floresta.
        #[arg(long = "nostr-transport", env = "MYCELIUM_NOSTR_TRANSPORT")]
        nostr_transport: bool,
        /// Desliga Nostr transport (mesmo em folha/floresta).
        #[arg(long = "no-nostr-transport", conflicts_with = "nostr_transport")]
        no_nostr_transport: bool,
        /// Relay Nostr WSS para o transporte (default nos.lol).
        #[arg(long = "nostr-relay", env = "MYCELIUM_NOSTR_RELAY")]
        nostr_relay: Option<String>,
        /// Expõe endpoint Ethereum JSON-RPC local. Deve ser loopback (ex.: 127.0.0.1:8545).
        #[arg(long = "rpc-gateway")]
        rpc_gateway: Option<std::net::SocketAddr>,
        /// Upstream HTTP de um Base node local quando este nó atua como provider.
        #[arg(long = "rpc-provider")]
        rpc_provider: Option<String>,
        /// NodeId do provider usado pelo gateway (P1/P2 explícito; discovery automático vem no P3).
        #[arg(long = "rpc-provider-node")]
        rpc_provider_node: Option<String>,
        /// Chave pública ML-KEM-1024 hex do provider.
        #[arg(long = "rpc-provider-kem")]
        rpc_provider_kem: Option<String>,
        /// EVM chain ID servido/aceito pelo RPC.
        #[arg(long = "rpc-chain-id", default_value_t = 8453)]
        rpc_chain_id: u64,
        /// Habilita envio de transações. Desligado por padrão.
        #[arg(long = "rpc-allow-write")]
        rpc_allow_write: bool,
        /// TTL máximo de uma chamada RPC LIVE em milissegundos.
        #[arg(long = "rpc-ttl-ms", default_value_t = 3000)]
        rpc_ttl_ms: u64,
        /// **Licença VOID-00**: only accept peers com estes PeerIds (virgula,
        /// repetível). Ativa o gate de admissão licenciada. Req. feature `license`.
        #[arg(long = "licensed-peers", value_delimiter = ',')]
        licensed_peers: Vec<String>,
        /// Depreciado: ignorado (Política de Membrana — sem UPnP).
        #[arg(long = "upnp")]
        upnp: bool,
        /// Ativa o serviço VEIL Ω (SOCKS5 proxy e privacidade pós-quântica).
        #[arg(long = "veil")]
        veil: bool,
        /// Endereço de escuta do SOCKS5 (default: 127.0.0.1:1080).
        #[arg(long = "veil-socks5")]
        veil_socks5: Option<std::net::SocketAddr>,
        /// Modo de operação VEIL: veil (3 saltos), geo (1 salto), mix (mixnet).
        #[arg(long = "veil-mode")]
        veil_mode: Option<String>,
        /// Papel do nó no VEIL Ω: client, relay, exit, all.
        #[arg(long = "veil-role")]
        veil_role: Option<String>,
        /// Endereço de escuta para roteador de salto VEIL (relay ou exit).
        #[arg(long = "veil-listen")]
        veil_listen: Option<std::net::SocketAddr>,
        /// Descritor de nó Guard (caminho para arquivo JSON ou string JSON). Repetível.
        #[arg(long = "veil-guard")]
        veil_guards: Vec<String>,
        /// Descritor de nó Middle (caminho para arquivo JSON ou string JSON). Repetível.
        #[arg(long = "veil-middle")]
        veil_middles: Vec<String>,
        /// Descritor de nó Exit (caminho para arquivo JSON ou string JSON). Repetível.
        #[arg(long = "veil-exit")]
        veil_exits: Vec<String>,
        /// Pinning de identidade de produção: "<nome>:<hex_identity_pubkey>" por salto (ex.: guard:<hex>).
        /// Ativa autenticação estrita anti-substituição no modo client.
        #[arg(long = "veil-trust")]
        veil_trust: Vec<String>,
        /// Endereço público anunciado no descritor assinado (ex.: 203.0.113.9:9050).
        /// Separado do --veil-listen; nunca use 0.0.0.0.
        #[arg(long = "veil-advertise")]
        veil_advertise: Option<String>,
        /// Caminho da identidade persistente do nó (GhostId + ML-KEM-1024).
        /// Padrão: {home}/veil-identity.json (permissões 0600).
        #[arg(long = "veil-identity")]
        veil_identity: Option<PathBuf>,
        /// Rota a identidade Veil explicitamente (nunca implícita em reinício).
        #[arg(long = "veil-rotate-identity")]
        veil_rotate_identity: bool,
        /// IP de origem explícito do egresso do Exit (multi-homing). Sob NAT o destino
        /// observa o IP da tradução, não este bind.
        #[arg(long = "veil-egress-bind")]
        veil_egress_bind: Option<std::net::IpAddr>,
        /// Pontes de entrada VEIL (repetível, ex.: 127.0.0.1:9001). Quando presente,
        /// o cliente usa somente bridges — NUNCA insere entrada direta ao Guard.
        #[arg(long = "veil-bridge")]
        veil_bridges: Vec<String>,
        /// Endereço de escuta da bridge (papel bridge).
        #[arg(long = "veil-bridge-listen")]
        veil_bridge_listen: Option<String>,
        /// Endereço do Guard para o qual a bridge repassa o fluxo cru (papel bridge).
        #[arg(long = "veil-bridge-target")]
        veil_bridge_target: Option<String>,
    },
    Status,
    Sow {
        #[arg(long, default_value = "init")]
        message: String,
        #[arg(long, default_value = "main.rs")]
        path: String,
        #[arg(long, default_value = "fn main() {}")]
        content: String,
        /// Fragmenta com QEL (formato k,n — default 3,7). Requer --features nostr.
        #[arg(long, value_name = "K,N")]
        qel: Option<String>,
        /// Publica anúncio NIP-94 + shards via relays Nostr (wss:// outbound).
        #[arg(long)]
        nostr: bool,
        /// Usa GhostID efémero secp256k1 para assinar eventos Nostr.
        #[arg(long)]
        ghost: bool,
        /// Pubkey Nostr hex do destinatário (NIP-44); sem isto shards vão em plaintext assinado.
        #[arg(long = "to")]
        recipient: Option<String>,
        /// Hybrid Theory: QEL + Nostr + blockstore local (ipfs-blocks/).
        #[arg(long)]
        hybrid: bool,
    },
    /// Publica pela mailbox Nostr um plot que já existe no SporeBank.
    PublishExisting {
        #[arg(long)]
        plot: String,
        #[arg(long)]
        nostr: bool,
        #[arg(long, value_name = "K,N", default_value = "3,7")]
        qel: String,
        #[arg(long, default_value_t = 4)]
        max_attempts: u32,
        #[arg(long, default_value_t = 30)]
        timeout: u64,
        #[arg(long, default_value_t = 500, hide = true)]
        backoff_ms: u64,
    },
    Signal {
        #[arg(long)]
        plot: String,
        #[arg(long, default_value_t = 1)]
        quorum: usize,
        #[arg(long, default_value = "webapp")]
        ion: String,
        #[arg(long, default_value = "ci")]
        name: String,
    },
    Resonate {
        #[arg(long)]
        signal: String,
    },
    Recall {
        #[arg(long)]
        plot: String,
        /// Reconstrói via shards QEL (Nostr).
        #[arg(long)]
        qel: bool,
        /// Busca shards em relays Nostr.
        #[arg(long)]
        nostr: bool,
        /// Threshold QEL (default 3).
        #[arg(long, default_value_t = 3)]
        qel_threshold: u8,
        /// Hybrid: local → Nostr → blockstore ipfs local.
        #[arg(long)]
        hybrid: bool,
    },
    Bootstrap {
        #[arg(long)]
        addr: String,
    },
    /// Gerencia o seed book local (bootstrap público).
    Seeds {
        #[command(subcommand)]
        action: SeedsCmd,
    },
    /// Escreve estado no Isotope (propaga por hifas).
    IsotopePut {
        #[arg(long)]
        key: String,
        #[arg(long)]
        value: String,
        #[arg(long)]
        clock: Option<u64>,
    },
    /// Lê estado do Isotope (local ou Decay pelas hifas).
    IsotopeGet {
        #[arg(long)]
        key: String,
    },
    /// One-shot: sow → signal → espera ion no Horizon (fluxo do manifesto).
    Deploy {
        #[arg(long)]
        plot: Option<String>,
        #[arg(long, default_value = "init")]
        message: String,
        #[arg(long, default_value = "build.sh")]
        path: String,
        #[arg(
            long,
            default_value = "#!/bin/sh\nmkdir -p dist\necho ok > dist/index.html\n"
        )]
        content: String,
        #[arg(long, default_value = "webapp")]
        ion: String,
        #[arg(long, default_value = "ci")]
        name: String,
        #[arg(long, default_value_t = 1)]
        quorum: usize,
        /// Segundos máximos à espera do ion.
        #[arg(long, default_value_t = 30)]
        timeout: u64,
    },
    #[command(alias = "stop")]
    Shutdown,
    /// Mostra balance local + de peers.
    Balance,
    /// Migra um Ion para outro nó.
    IonMigrate {
        #[arg(long)]
        ion: String,
        #[arg(long)]
        target: String,
    },
    /// Mostra zonas de crescimento conhecidas.
    Zones,
    /// Publica código-fonte diretamente na rede (sem git, sem GitHub).
    SeedCode {
        /// Caminho do diretório.
        #[arg(long)]
        path: String,
        /// Nome do projeto.
        #[arg(long)]
        name: String,
        /// Descrição curta.
        #[arg(long)]
        description: String,
        /// Ion para sinalizar (default: "code").
        #[arg(long, default_value = "code")]
        ion: String,
        /// Visibilidade: public, private, reserved, archived, community.
        #[arg(long, default_value = "public")]
        visibility: String,
    },
    /// Anuncia um repositório Git via gossipsub (URL pública, sem dados sensíveis).
    SeedRepo {
        /// Nome do repositório (ex: "mycelium-network").
        #[arg(long)]
        name: String,
        /// URL pública de clone (ex: "https://github.com/bmcc-DEV/mycelium-network.git").
        #[arg(long)]
        url: String,
        /// Hash do commit atual (ex: "ad924b6").
        #[arg(long)]
        commit: String,
        /// Descrição curta do repositório.
        #[arg(long)]
        description: String,
    },
    /// Baixa código-fonte da rede via ContentId (sem git, sem GitHub).
    RecallCode {
        /// ContentId do plot (Qm...).
        #[arg(long)]
        plot: String,
        /// Diretório de destino (default: ./<nome-do-plot>).
        #[arg(long)]
        output: Option<String>,
    },
    /// Lista repositórios anunciados via gossipsub por peers da rede.
    Repos,
    /// Verifica uma licença VOID-00 (ML-DSA-87 + device binding).
    LicenseVerify {
        /// Chave pública do vendor (hex, 2592 bytes).
        #[arg(long)]
        vendor_key: String,
        /// Entropia do dispositivo (hex).
        #[arg(long)]
        device_entropy: String,
        /// SKU do produto.
        #[arg(long)]
        sku: String,
        /// Payload canónico da licença (hex, 121 bytes).
        #[arg(long)]
        payload: String,
        /// Assinatura ML-DSA-87 (hex, 4627 bytes).
        #[arg(long)]
        signature: String,
        /// Timestamp Unix em segundos (default: agora).
        #[arg(long)]
        now: Option<u64>,
        /// Auto-release: se a licença passar, inscreve este PeerId na allowlist
        /// de admissão licenciada (gate passa a aceitá-lo).
        #[arg(long = "peer-id")]
        peer_id: Option<String>,
    },
    /// Inscreve um PeerId na allowlist de admissão licenciada (runtime).
    RegisterPeer {
        /// PeerId do nó a autorizar.
        #[arg(long)]
        peer_id: String,
    },
    /// Valida um invoice BOLT11 (Lightning) e mostra resumo.
    Bolt11 {
        /// Invoice BOLT11 (string completa `lnbc...`).
        invoice: String,
    },
    /// Entropy: Shamir Secret Sharing com meia-vida.
    Entropy {
        #[command(subcommand)]
        action: EntropyCmd,
    },
    /// CandidateRelay (kind 39401/39406): descoberta + backchannel CGNAT↔CGNAT.
    Candidate {
        #[command(subcommand)]
        cmd: Option<CandidateCmd>,
        /// Repetir com jitter 30–300s (só em discover sem subcomando).
        #[arg(long)]
        r#loop: bool,
        /// Uma ronda e sai (default se sem --loop).
        #[arg(long)]
        once: bool,
        /// Relays wss:// (repetível). Default = pool público.
        #[arg(long = "relay")]
        relays: Vec<String>,
    },
    #[command(hide = true)]
    ChamberServe {
        #[arg(long)]
        port: u16,
        #[arg(long)]
        ion: String,
        #[arg(long)]
        root: PathBuf,
    },
    /// App Store / Steam P2P de jogos e software antigo/legado
    Store {
        #[command(subcommand)]
        action: StoreCmd,
    },
    /// Distribuição de código soberana via P2P (sem GitHub)
    Repo {
        #[command(subcommand)]
        action: RepoCmd,
    },
    /// Infraestrutura pós-quântica de privacidade VEIL Ω (SOCKS5, Onion Routing, Anti-SSRF).
    Veil {
        #[command(subcommand)]
        action: VeilCmd,
    },
}

#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
enum VeilCmd {
    /// Consulta o estado da sessão e do proxy VEIL Ω.
    Status,
    /// Inicia o serviço VEIL Ω e SOCKS5 proxy no nó em execução.
    Start {
        /// Modo de operação: veil (3 saltos), geo (1 salto), mix (mixnet).
        #[arg(long, default_value = "veil")]
        mode: String,
        /// Porta local SOCKS5 (default: 1080).
        #[arg(long, default_value_t = 1080)]
        port: u16,
        /// Papel do nó: client, relay, exit, bridge, all.
        #[arg(long)]
        role: Option<String>,
        /// Endereço de escuta para relay/exit/bridge.
        #[arg(long)]
        listen: Option<String>,
        /// Pinning de identidade de produção: "<nome>:<hex_identity_pubkey>" por salto.
        #[arg(long, value_name = "NOME:HEX")]
        trust: Vec<String>,
        /// Endereço público anunciado no descritor (ex.: 203.0.113.9:9050). Separado do listen.
        #[arg(long, value_name = "HOST:PORTA")]
        advertise: Option<String>,
        /// Caminho da identidade persistente do nó (GhostId + ML-KEM-1024).
        #[arg(long)]
        identity: Option<PathBuf>,
        /// Rota a identidade Veil explicitamente (nunca implícita em reinício).
        #[arg(long)]
        rotate_identity: bool,
        /// IP de origem explícito do egresso do Exit (multi-homing).
        #[arg(long)]
        egress_bind: Option<std::net::IpAddr>,
        /// Pontes de entrada VEIL (repetível, ex.: 127.0.0.1:9001).
        #[arg(long = "bridge")]
        bridges: Vec<String>,
        /// Endereço de escuta da bridge (papel bridge).
        #[arg(long = "bridge-listen")]
        bridge_listen: Option<String>,
        /// Endereço do Guard para o qual a bridge repassa o fluxo cru (papel bridge).
        #[arg(long = "bridge-target")]
        bridge_target: Option<String>,
    },
    /// Encerra o serviço VEIL Ω e desliga o SOCKS5 proxy.
    Stop,
    /// Exibe o descritor criptográfico assinado deste nó (para compartilhar com clientes).
    Descriptor,
}

#[derive(Subcommand)]
enum StoreCmd {
    /// Lista jogos e softwares legados cadastrados no catálogo P2P
    List,
    /// Mostra as capacidades de emulação do sistema host (QEMU, MAME, RetroArch, bwrap)
    Caps,
    /// Executa um jogo ou software legado por ID
    Launch {
        #[arg(long)]
        id: String,
        /// Força o motor de execução (native, retroarch, mame, qemu, wasm, cloud)
        #[arg(long)]
        engine: Option<String>,
        /// Sandboxing estrito com bubblewrap
        #[arg(long, default_value_t = false)]
        sandbox: bool,
    },
    /// Publica uma nova ROM / software legado no SporeBank
    Publish {
        #[arg(long)]
        id: String,
        #[arg(long)]
        title: String,
        #[arg(long)]
        platform: String,
        #[arg(long)]
        binary: PathBuf,
        /// Licença de distribuição (shareware, freeware, open_source, public_domain, proprietary).
        /// Default: proprietary (só local / BYOR — não distribuído na rede)
        #[arg(long, default_value = "proprietary")]
        license: String,
    },
}

#[derive(Subcommand)]
enum RepoCmd {
    /// Publica uma árvore de código como Plot multi-leaf no SporeBank (DHT + gossip)
    Publish {
        /// Diretório raiz do repositório a publicar.
        #[arg(short, long)]
        dir: PathBuf,
        /// Nome persistente do repositório no Giggs.
        #[arg(long)]
        repository: Option<String>,
        /// Branch atualizada por compare-and-swap.
        #[arg(long, default_value = "main")]
        branch: String,
        /// Publica somente se a branch ainda apontar para este ContentId.
        #[arg(long)]
        expected_previous_cid: Option<String>,
        /// Mensagem/descrição do commit (ex.: "v0.1.0 — store P2P").
        #[arg(short, long, default_value = "mycelium-launcher-store")]
        message: String,
    },
    /// Reconstrói uma árvore de código a partir de um ContentId
    Clone {
        /// ContentId (Qm…) do repo publicado.
        #[arg(long)]
        cid: String,
        /// Diretório de destino da árvore reconstruída.
        #[arg(short, long)]
        dest: PathBuf,
    },
    /// Executa Build e Test sobre um ContentId, sem deploy.
    Validate {
        #[arg(long)]
        cid: String,
    },
    /// Recupera e verifica uma atestação persistida.
    Attestation {
        #[arg(long)]
        cid: String,
    },
    /// Lista os repos disponíveis no SporeBank local
    List,
}

#[derive(Subcommand)]
enum CandidateCmd {
    /// Escuta mensagens backchannel (NIP-44, kind 39406) e re-anuncia presença.
    Listen {
        #[arg(long)]
        r#loop: bool,
    },
    /// Envia texto cifrado a um ghost peer (`--to` = pubkey hex 64 chars).
    Send {
        #[arg(long)]
        to: String,
        #[arg(short = 'm', long)]
        message: String,
    },
    /// Mostra o GhostID da sessão local (para o outro lado usar em `--to`).
    Whoami,
    /// Apaga `candidate.session` (novo GhostID na próxima vez).
    Reset,
}

#[derive(Subcommand)]
enum EntropyCmd {
    /// Fragmenta um segredo em N Shades.
    Shatter {
        #[arg(short, long)]
        secret: String,
        #[arg(short = 'k', long, default_value_t = 3)]
        threshold: u8,
        #[arg(short = 'n', long, default_value_t = 5)]
        total: u8,
    },
    /// Reconstrói o segredo a partir das Shades em custódia.
    Reconstruct {
        #[arg(short = 'k', long, default_value_t = 3)]
        threshold: u8,
    },
    /// Mostra as Shades armazenadas.
    Status,
}

#[derive(Subcommand)]
enum SeedsCmd {
    /// Lista seeds em `{home}/seeds.txt`.
    List,
    /// Adiciona uma multiaddr ao seed book.
    Add { addr: String },
    /// Baixa o catálogo público e mescla no seed book.
    Fetch {
        #[arg(long)]
        url: Option<String>,
        /// Nome DNS TXT do Spore Bank. Sem valor → default `_mycelium.seeds.duckdns.org`.
        #[arg(long, num_args = 0..=1, default_missing_value = DEFAULT_DNS_SEED_NAME)]
        dns: Option<String>,
    },
    /// Catálogo estruturado de seeds públicas e privadas (`{home}/seeds/catalog.json`).
    Catalog {
        #[command(subcommand)]
        action: SeedCatalogCmd,
    },
}

#[derive(Subcommand)]
enum SeedCatalogCmd {
    /// Lista seeds do catálogo.
    List {
        /// Filtro de visibilidade: public | private | all.
        #[arg(long, default_value = "all")]
        visibility: String,
    },
    /// Adiciona um seed ao catálogo.
    Add {
        #[arg(long)]
        id: Option<String>,
        #[arg(long)]
        name: String,
        #[arg(long)]
        multiaddr: String,
        /// public | private
        #[arg(long, default_value = "public")]
        visibility: String,
        #[arg(long)]
        membrane: Option<String>,
        #[arg(long)]
        region: Option<String>,
        #[arg(long)]
        operator: Option<String>,
        /// Opera como circuit relay v2.
        #[arg(long, default_value_t = false)]
        relay: bool,
        /// Inbound verificado.
        #[arg(long, default_value_t = false)]
        verified: bool,
    },
    /// Remove um seed do catálogo por id.
    Remove {
        #[arg(long)]
        id: String,
    },
    /// Exporta as seeds públicas no formato `seeds/mainnet.txt`.
    Export {
        #[arg(long)]
        out: Option<PathBuf>,
    },
}

fn main() {
    let cli = Cli::parse();

    let filter = if matches!(cli.command, Commands::ChamberServe { .. }) {
        "warn"
    } else {
        "info"
    };
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(filter)),
        )
        .with_target(false)
        .compact()
        .init();

    let home = resolve_home(cli.home);
    let rt = tokio::runtime::Runtime::new().expect("tokio");

    let result = match cli.command {
        Commands::Sprout { contribute } => rt.block_on(sprout(&home, &contribute)),
        Commands::Daemon {
            contribute,
            bootstrap,
            seed_file,
            public_bootstrap,
            bootstrap_url,
            listen,
            horizon_port,
            no_mdns,
            announce_ip,
            announce_ip6,
            relay,
            sporocarp,
            membrane,
            assume_reachable,
            webrtc,
            webrtc_port,
            nostr_transport,
            no_nostr_transport,
            nostr_relay,
            rpc_gateway,
            rpc_provider,
            rpc_provider_node,
            rpc_provider_kem,
            rpc_chain_id,
            rpc_allow_write,
            rpc_ttl_ms,
            licensed_peers,
            upnp,
            veil,
            veil_socks5,
            veil_mode,
            veil_role,
            veil_listen,
            veil_guards,
            veil_middles,
            veil_exits,
            veil_trust,
            veil_advertise,
            veil_identity,
            veil_rotate_identity,
            veil_egress_bind,
            veil_bridges,
            veil_bridge_listen,
            veil_bridge_target,
        } => {
            #[cfg(not(feature = "license"))]
            let _ = licensed_peers;
            rt.block_on(daemon(
            &home,
            &contribute,
            DaemonOptions {
                contribute: None, // preenchido abaixo
                bootstrap,
                horizon_port,
                listen,
                seed_file,
                public_bootstrap,
                bootstrap_url,
                no_mdns,
                announce_ip,
                announce_ip6,
                enable_relay: relay || sporocarp,
                sporocarp,
                membrane,
                assume_reachable,
                enable_webrtc: webrtc,
                webrtc_port,
                nostr_transport: if no_nostr_transport {
                    Some(false)
                } else if nostr_transport {
                    Some(true)
                } else {
                    None
                },
                nostr_relay,
                rpc_gateway_addr: rpc_gateway,
                rpc_provider_upstream: rpc_provider,
                rpc_target_node: rpc_provider_node,
                rpc_target_kem: rpc_provider_kem,
                rpc_chain_id,
                rpc_allow_write,
                rpc_ttl_ms,
                #[cfg(feature = "license")]
                licensed_peers: if licensed_peers.is_empty() {
                    None
                } else {
                    Some(licensed_peers.into_iter().collect())
                },
                veil_enabled: veil,
                veil_socks5_addr: veil_socks5,
                veil_mode,
                veil_role,
                veil_listen,
                veil_guards,
                veil_middles,
                veil_exits,
                veil_trust,
                veil_advertise,
                veil_identity,
                veil_rotate_identity,
                veil_egress_bind,
                veil_bridges,
                veil_bridge_listen,
                veil_bridge_target,
            },
            upnp,
            ))
        }
        Commands::Status => rt.block_on(status(&home)),
        Commands::Sow {
            message,
            path,
            content,
            qel,
            nostr,
            ghost,
            recipient,
            hybrid,
        } => rt.block_on(sow_cmd(
            &home, message, path, content, qel, nostr, ghost, recipient, hybrid,
        )),
        Commands::PublishExisting {
            plot,
            nostr,
            qel,
            max_attempts,
            timeout,
            backoff_ms,
        } => rt.block_on(publish_existing_cmd(
            &home,
            plot,
            nostr,
            qel,
            max_attempts,
            timeout,
            backoff_ms,
        )),
        Commands::Signal {
            plot,
            quorum,
            ion,
            name,
        } => rt.block_on(rpc(
            &home,
            Request::Signal {
                plot,
                quorum,
                ion,
                name,
            },
        )),
        Commands::Resonate { signal } => {
            rt.block_on(rpc(&home, Request::Resonate { signal }))
        }
        Commands::Recall {
            plot,
            qel,
            nostr,
            qel_threshold,
            hybrid,
        } => rt.block_on(recall_cmd(&home, plot, qel, nostr, qel_threshold, hybrid)),
        Commands::Bootstrap { addr } => {
            rt.block_on(rpc(&home, Request::Bootstrap { addr }))
        }
        Commands::Seeds { action } => seeds_cmd(&home, action),
        Commands::IsotopePut { key, value, clock } => rt.block_on(rpc(
            &home,
            Request::IsotopePut { key, value, clock },
        )),
        Commands::IsotopeGet { key } => rt.block_on(isotope_get_poll(&home, key)),
        Commands::Deploy {
            plot,
            message,
            path,
            content,
            ion,
            name,
            quorum,
            timeout,
        } => rt.block_on(deploy(
            &home,
            DeployOpts {
                plot,
                message,
                path,
                content,
                ion,
                name,
                quorum,
                timeout,
            },
        )),
        Commands::Shutdown => rt.block_on(rpc(&home, Request::Shutdown)),
        Commands::Balance => rt.block_on(rpc(&home, Request::Balance)),
        Commands::IonMigrate { ion, target } => rt.block_on(rpc(&home, Request::IonMigrate { ion, target })),
        Commands::Zones => rt.block_on(rpc(&home, Request::Zones)),
        Commands::SeedRepo { name, url, commit, description } => {
            rt.block_on(rpc(&home, Request::SeedRepo { name, url, commit, description }))
        }
        Commands::SeedCode { path, name, description, ion, visibility } => {
            rt.block_on(seed_code_cmd(&home, path, name, description, ion, visibility))
        }
        Commands::RecallCode { plot, output } => {
            rt.block_on(recall_code_cmd(&home, plot, output))
        }
        Commands::Repos => rt.block_on(rpc(&home, Request::Repos)),
        Commands::LicenseVerify { vendor_key, device_entropy, sku, payload, signature, now, peer_id } => {
            #[cfg(feature = "license")]
            {
                let unix_now = now.unwrap_or_else(|| std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0));
                let req = Request::VerifyLicense {
                    vendor_public_key: vendor_key,
                    device_entropy,
                    sku,
                    license_payload: payload,
                    signature,
                    unix_now_secs: unix_now,
                    peer_id,
                };
                rt.block_on(rpc(&home, req))
            }
            #[cfg(not(feature = "license"))]
            {
                let _ = (vendor_key, device_entropy, sku, payload, signature, now, peer_id);
                eprintln!("licença exige feature `license`. Compile com --features license.");
                std::process::exit(1);
            }
        }
        Commands::RegisterPeer { peer_id } => {
            #[cfg(feature = "license")]
            {
                rt.block_on(rpc(&home, Request::RegisterLicensedPeer { peer_id }))
            }
            #[cfg(not(feature = "license"))]
            {
                let _ = peer_id;
                eprintln!("admissão licenciada exige feature `license`. Compile com --features license.");
                std::process::exit(1);
            }
        }
        Commands::Bolt11 { invoice } => {
            #[cfg(feature = "bolt11")]
            {
                rt.block_on(rpc(&home, Request::Bolt11Validate { bolt11: invoice }))
            }
            #[cfg(not(feature = "bolt11"))]
            {
                let _ = invoice;
                eprintln!("BOLT11 exige feature `bolt11`. Compile com --features bolt11.");
                std::process::exit(1);
            }
        }
        Commands::Entropy { action } => rt.block_on(entropy_cmd(&home, action)),
        Commands::Candidate {
            cmd,
            r#loop,
            once: _,
            relays,
        } => rt.block_on(candidate_cmd(&home, cmd, r#loop, relays)),
        Commands::ChamberServe { port, ion, root } => {
            rt.block_on(chamber_serve(port, ion, root))
        }
        Commands::Store { action } => store_cmd(&home, action),
        Commands::Repo { action } => rt.block_on(repo_cmd(&home, action)),
        Commands::Veil { action } => rt.block_on(veil_cmd(&home, action)),
    };

    if let Err(e) = result {
        eprintln!("[🍄] {e}");
        std::process::exit(1);
    }
}

fn resolve_home(override_home: Option<PathBuf>) -> PathBuf {
    if let Some(p) = override_home {
        return p;
    }
    directories::ProjectDirs::from("network", "Mycelium", "mycelium")
        .map(|d| d.data_local_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from(".mycelium"))
}

fn parse_membrane(s: &str) -> Result<mycelium_core::Membrane, String> {
    s.parse()
}

fn seeds_cmd(home: &PathBuf, action: SeedsCmd) -> Result<(), String> {
    let path = home.join("seeds.txt");
    match action {
        SeedsCmd::List => {
            let mut book = SeedBook::new();
            book.load_file(&path).map_err(|e| e.to_string())?;
            if book.is_empty() {
                println!("[🍄] seed book vazio ({})", path.display());
                println!("[🍄] dica: mycelium seeds fetch  ou  --public-bootstrap");
            } else {
                println!("[🍄] {} seeds em {}", book.len(), path.display());
                for s in book.as_strings() {
                    println!("  {s}");
                }
            }
            Ok(())
        }
        SeedsCmd::Add { addr } => {
            let mut book = SeedBook::new();
            book.load_file(&path).map_err(|e| e.to_string())?;
            book.add(&addr).map_err(|e| e.to_string())?;
            book.save_file(&path).map_err(|e| e.to_string())?;
            println!("[🍄] seed adicionada: {addr}");
            Ok(())
        }
        SeedsCmd::Fetch { url, dns } => {
            let mut book = SeedBook::new();
            book.load_file(&path).map_err(|e| e.to_string())?;
            let mut added = 0usize;
            if let Some(name) = dns {
                let name = if name.is_empty() {
                    DEFAULT_DNS_SEED_NAME.to_string()
                } else {
                    name
                };
                let n = book.fetch_dns_txt(&name).map_err(|e| e.to_string())?;
                added += n;
                println!("[🍄] +{n} seeds DNS TXT `{name}`");
            } else if url.is_none() {
                // Sem flags: HTTP legado (comportamento anterior).
                let u = DEFAULT_BOOTSTRAP_URL.to_string();
                let n = book.fetch_url(&u).map_err(|e| e.to_string())?;
                added += n;
                println!("[🍄] +{n} seeds de {u}");
            }
            if let Some(u) = url {
                let n = book.fetch_url(&u).map_err(|e| e.to_string())?;
                added += n;
                println!("[🍄] +{n} seeds de {u}");
            }
            book.save_file(&path).map_err(|e| e.to_string())?;
            println!("[🍄] total +{added} → {}", path.display());
            for s in book.as_strings() {
                println!("  {s}");
            }
            Ok(())
        }
        SeedsCmd::Catalog { action } => seed_catalog_cmd(home, action),
    }
}

fn seed_catalog_cmd(home: &PathBuf, action: SeedCatalogCmd) -> Result<(), String> {
    use mycelium_hyphae::{SeedCatalog, SeedEntry, SeedVisibility};
    match action {
        SeedCatalogCmd::List { visibility } => {
            let catalog = SeedCatalog::open(home)?;
            let filter = match visibility.as_str() {
                "all" => None,
                "public" => Some(SeedVisibility::Public),
                "private" => Some(SeedVisibility::Private),
                other => {
                    return Err(format!(
                        "visibilidade desconhecida: '{other}' (use public|private|all)"
                    ))
                }
            };
            let entries = catalog.list(filter);
            println!("\n[🍄] Catálogo de seeds ({}) — {}", entries.len(), SeedCatalog::catalog_path(home).display());
            for s in entries {
                let verified = if s.verified { "✓" } else { "✗" };
                println!("  • [{}] {} ({})", s.visibility.as_str(), s.id, s.name);
                println!("      multiaddr : {}", s.multiaddr);
                println!(
                    "      meta      : membrana={} região={} operador={} relay={} inbound={}",
                    s.membrane.as_deref().unwrap_or("-"),
                    s.region.as_deref().unwrap_or("-"),
                    s.operator.as_deref().unwrap_or("-"),
                    s.relay,
                    verified
                );
            }
            Ok(())
        }
        SeedCatalogCmd::Add {
            id,
            name,
            multiaddr,
            visibility,
            membrane,
            region,
            operator,
            relay,
            verified,
        } => {
            let visibility = match visibility.as_str() {
                "public" => SeedVisibility::Public,
                "private" => SeedVisibility::Private,
                other => return Err(format!("visibilidade inválida: '{other}' (use public|private)")),
            };
            let mut catalog = SeedCatalog::open(home)?;
            catalog.add(SeedEntry {
                id: id.unwrap_or_default(),
                name,
                multiaddr,
                visibility,
                membrane,
                region,
                operator,
                relay,
                verified,
                last_seen: None,
                notes: None,
            })?;
            catalog.save(home)?;
            println!("[🍄] Seed adicionada ao catálogo.");
            Ok(())
        }
        SeedCatalogCmd::Remove { id } => {
            let mut catalog = SeedCatalog::open(home)?;
            if catalog.remove(&id) {
                catalog.save(home)?;
                println!("[🍄] Seed '{id}' removida.");
            } else {
                println!("[🍄] Seed '{id}' não encontrada.");
            }
            Ok(())
        }
        SeedCatalogCmd::Export { out } => {
            let catalog = SeedCatalog::open(home)?;
            let lines = catalog.to_mainnet_lines();
            let n_seeds = lines.iter().filter(|l| !l.starts_with('#')).count();
            let dest = out.unwrap_or_else(|| home.join("seeds").join("mainnet.txt"));
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut body = String::from("# Mycelium Network — seeds públicas verificadas (do catálogo)\n# Só entradas com inbound verificado entram aqui.\n");
            for l in &lines {
                body.push_str(l);
                body.push('\n');
            }
            std::fs::write(&dest, body).map_err(|e| format!("gravar {}: {e}", dest.display()))?;
            println!("[🍄] Exportadas {} seeds públicas verificadas → {}", n_seeds, dest.display());
            Ok(())
        }
    }
}

async fn sprout(home: &PathBuf, contribute: &str) -> Result<(), String> {
    println!("[🍄] Semente germinando...");
    let store = NodeStore::open(home).map_err(|e| e.to_string())?;
    let gland = store.load_or_create_gland().map_err(|e| e.to_string())?;
    let resources = Resources::from_str(contribute).map_err(|e| e.to_string())?;
    store
        .save_resources(&resources)
        .map_err(|e| e.to_string())?;
    let mut ledger = store.load_ledger();
    if ledger.history().is_empty() {
        ledger.pledge(&resources);
        store.save_ledger(&ledger).map_err(|e| e.to_string())?;
    }
    println!(
        "[🍄] Identidade persistida: {} (NodeId {})",
        gland.node_id().short(),
        gland.node_id()
    );
    println!("[🍄] Home: {}", home.display());
    println!("[🍄] Pronto. Suba o organismo com: mycelium daemon");
    Ok(())
}

async fn daemon(
    home: &PathBuf,
    contribute: &str,
    mut opts: DaemonOptions,
    upnp_flag: bool,
) -> Result<(), String> {
    let resources = Resources::from_str(contribute).map_err(|e| e.to_string())?;
    opts.contribute = Some(resources);
    println!("[🍄] Despertando organismo em {}…", home.display());
    println!("[🍄] Event Horizon em http://127.0.0.1:{}/", opts.horizon_port);
    if upnp_flag {
        println!("[🍄] --upnp ignorado — Política de Membrana (sem STUN/UPnP)");
    }
    if opts.public_bootstrap {
        println!(
            "[🍄] Bootstrap público: {}",
            opts.bootstrap_url
                .as_deref()
                .unwrap_or(DEFAULT_BOOTSTRAP_URL)
        );
    }
    if opts.no_mdns {
        println!("[🍄] mDNS desligado — só seed book / bootstrap");
    }
    if let Some(ip) = &opts.announce_ip {
        println!("[🍄] Announce IP (raiz IPv4 declarada): {ip}");
    }
    if let Some(ip6) = &opts.announce_ip6 {
        println!("[🍄] Announce IPv6: {ip6}");
    }
    if let Some(m) = opts.membrane {
        println!("[🍄] Membrana forçada: {m}");
    }
    if opts.sporocarp {
        println!("[🍄] Sporocarp (relay + DNS) ligado — membrana esporocarp");
    } else if opts.enable_relay {
        println!("[🍄] Relay server (circuit v2) ligado");
    }
    if !opts.listen.is_empty() {
        println!("[🍄] Listen: {:?}", opts.listen);
    } else {
        println!("[🍄] Listen: auto conforme membrana (folha=loopback IPv4)");
    }
    if std::env::var("MYCELIUM_CONTROL_TOKEN").ok().filter(|t| !t.is_empty()).is_some() {
        println!("[🍄] Control socket com auth (MYCELIUM_CONTROL_TOKEN)");
    }
    println!(
        "[🍄] Ctrl-C ou `mycelium --home {} shutdown` para hibernar",
        home.display()
    );

    let home_for_signal = home.clone();
    tokio::spawn(async move {
        let _ = tokio::signal::ctrl_c().await;
        let sock = home_for_signal.join("mycelium.sock");
        let _ = call(&sock, Request::Shutdown).await;
    });

    run_daemon(home.clone(), opts)
        .await
        .map_err(|e| e.to_string())
}

async fn status(home: &PathBuf) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    // Android/shell: Unix socket pode falhar; `call` cai para `mycelium.tcp`.
    if sock.exists() || sock.with_extension("tcp").exists() {
        return print_response(call(&sock, Request::Status).await?);
    }
    let store = NodeStore::open(home).map_err(|e| e.to_string())?;
    let gland = store.load_or_create_gland().map_err(|e| e.to_string())?;
    let ledger = store.load_ledger();
    let state = store.load_state();
    let addrs = store.load_listen_addrs();
    let ion_names: Vec<_> = state.ions.iter().map(|i| i.name.clone()).collect();
    println!("[🍄] Estado offline (daemon não está rodando)");
    println!("    home     : {}", home.display());
    println!("    NodeId   : {}", gland.node_id());
    println!("    listen   : {addrs:?}");
    println!("    ions     : {ion_names:?}");
    println!("    signals  : {}", state.field.len());
    println!(
        "    ATP={} Enzymes={} Mycelia={} Spores={} Resilience={}",
        ledger.balance(mycelium_core::Nutrient::Atp),
        ledger.balance(mycelium_core::Nutrient::Enzymes),
        ledger.balance(mycelium_core::Nutrient::Mycelia),
        ledger.balance(mycelium_core::Nutrient::Spores),
        ledger.balance(mycelium_core::Nutrient::Resilience),
    );
    Ok(())
}

async fn candidate_cmd(
    home: &PathBuf,
    cmd: Option<CandidateCmd>,
    do_loop: bool,
    relays: Vec<String>,
) -> Result<(), String> {
    #[cfg(not(feature = "nostr"))]
    {
        let _ = (home, cmd, do_loop, relays);
        return Err(
            "`mycelium candidate` requer `cargo build -p mycelium-cli --features nostr`".into(),
        );
    }
    #[cfg(feature = "nostr")]
    {
        use mycelium_nostr::{
            candidate_sleep_secs, run_candidate_round, run_listen_round, send_backchannel,
            CandidateSession, RelayPool,
        };
        use std::collections::HashSet;

        let pool = if relays.is_empty() {
            RelayPool::default_public()
        } else {
            RelayPool::new(relays)
        };

        match cmd {
            None => {
                loop {
                    match run_candidate_round(&pool).await {
                        Ok(r) => {
                            println!(
                                "[🍄] candidate: published={} discovered={} peers={} ghost={}…",
                                r.published,
                                r.discovered,
                                r.peer_count,
                                &r.self_ghost[..r.self_ghost.len().min(12)]
                            );
                            for p in &r.peers {
                                println!("  peer {}", p);
                            }
                            if r.peer_count == 0 {
                                println!(
                                    "[🍄] candidate: ainda 0 peers (ponto fixo). Outra folha no mesmo relay?"
                                );
                            } else {
                                println!(
                                    "[🍄] candidate: peers vistos — use `listen`/`send` para backchannel"
                                );
                            }
                        }
                        Err(e) => eprintln!("[🍄] candidate round falhou: {e}"),
                    }
                    if !do_loop {
                        break;
                    }
                    let sleep = candidate_sleep_secs();
                    println!("[🍄] candidate: próxima ronda em {sleep}s (jitter)");
                    tokio::time::sleep(std::time::Duration::from_secs(sleep)).await;
                }
                Ok(())
            }
            Some(CandidateCmd::Whoami) => {
                let (sess, _) = CandidateSession::load_or_create(home).map_err(|e| e.to_string())?;
                println!("[🍄] candidate ghost: {}", sess.pk_hex);
                println!("    sessão: {}", CandidateSession::path(home).display());
                println!("    TTL restante ~{}s (desde criação)", {
                    let age = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                        .saturating_sub(sess.created_at);
                    sess.ttl_secs.saturating_sub(age)
                });
                Ok(())
            }
            Some(CandidateCmd::Reset) => {
                CandidateSession::clear(home).map_err(|e| e.to_string())?;
                println!("[🍄] candidate.session apagada");
                Ok(())
            }
            Some(CandidateCmd::Send { to, message }) => {
                let to = to.trim().to_lowercase();
                let (_, ghost) =
                    CandidateSession::load_or_create(home).map_err(|e| e.to_string())?;
                println!(
                    "[🍄] candidate send: from={}… → to={}…",
                    &ghost.nostr_pubkey_hex()[..12],
                    &to[..to.len().min(12)]
                );
                let id = send_backchannel(&pool, &ghost, &to, &message)
                    .await
                    .map_err(|e| e.to_string())?;
                println!("[🍄] enviado event {id}");
                println!(
                    "[🍄] o destinatário precisa de `mycelium candidate listen` com esse ghost"
                );
                Ok(())
            }
            Some(CandidateCmd::Listen { r#loop: listen_loop }) => {
                let (sess, ghost) =
                    CandidateSession::load_or_create(home).map_err(|e| e.to_string())?;
                println!("[🍄] candidate listen ghost: {}", sess.pk_hex);
                println!("[🍄] o outro lado: mycelium candidate send --to {} -m \"…\"", sess.pk_hex);
                let mut seen = HashSet::new();
                loop {
                    match run_listen_round(&pool, &ghost).await {
                        Ok((published, msgs)) => {
                            println!(
                                "[🍄] listen: announced={published} inbox={}",
                                msgs.len()
                            );
                            for m in msgs {
                                if seen.insert(m.event_id.clone()) {
                                    println!(
                                        "[🍄] ← {}… : {}",
                                        &m.from[..m.from.len().min(12)],
                                        m.text
                                    );
                                }
                            }
                        }
                        Err(e) => eprintln!("[🍄] listen round falhou: {e}"),
                    }
                    if !listen_loop {
                        break;
                    }
                    let sleep = 15u64;
                    tokio::time::sleep(std::time::Duration::from_secs(sleep)).await;
                }
                Ok(())
            }
        }
    }
}

async fn entropy_cmd(home: &PathBuf, action: EntropyCmd) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    match action {
        EntropyCmd::Shatter {
            secret,
            threshold,
            total,
        } => {
            let resp = call(
                &sock,
                Request::EntropyShatter {
                    secret,
                    threshold,
                    total,
                },
            )
            .await?;
            print_response(resp)
        }
        EntropyCmd::Reconstruct { threshold } => {
            // Poll com retry pra dar tempo das shades chegarem via gossip
            let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(5);
            let mut last = String::new();
            while tokio::time::Instant::now() < deadline {
                match call(&sock, Request::EntropyReconstruct { threshold }).await? {
                    Response::Ok { message } => {
                        println!("[🍄] {message}");
                        return Ok(());
                    }
                    Response::Err { message } => {
                        last = message;
                        if last.contains("não") && last.contains("custódia")  {
                            // erro definitivo, não de timeout
                            return Err(last);
                        }
                    }
                    Response::Status(_) => return Err("resposta inesperada".into()),
                    _ => return Err("resposta inesperada".into()),
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
            Err(format!("entropy reconstruct timeout: {last}"))
        }
        EntropyCmd::Status => {
            let resp = call(&sock, Request::EntropyStatus).await?;
            print_response(resp)
        }
    }
}

async fn sow_cmd(
    home: &PathBuf,
    message: String,
    path: String,
    content: String,
    qel: Option<String>,
    nostr: bool,
    ghost: bool,
    recipient: Option<String>,
    hybrid: bool,
) -> Result<(), String> {
    #[cfg(not(feature = "nostr"))]
    {
        if qel.is_some() || nostr || ghost || recipient.is_some() || hybrid {
            return Err(
                "sow --qel/--nostr/--ghost/--hybrid requer `cargo build -p mycelium-cli --features nostr`"
                    .into(),
            );
        }
    }
    let want_nostr = nostr || qel.is_some() || ghost || hybrid;
    let qel = if want_nostr && qel.is_none() {
        Some("3,7".into())
    } else {
        qel
    };
    let sock = home.join("mycelium.sock");
    let resp = call(
        &sock,
        Request::Sow {
            message,
            path,
            content,
            qel: qel.clone(),
            nostr: nostr || hybrid,
            ghost: ghost || nostr || hybrid,
            recipient: recipient.clone(),
        },
    )
    .await?;

    #[cfg(feature = "nostr")]
    if want_nostr {
        if let Response::Ok { message: ref msg } = resp {
            if let Some(id_str) = msg.strip_prefix("plot semeado: ") {
                let id_str = id_str.split(';').next().unwrap_or(id_str).trim();
                match publish_plot_nostr(
                    home,
                    id_str,
                    qel.as_deref(),
                    recipient.as_deref(),
                    hybrid,
                )
                .await
                {
                    Ok(result) => {
                        println!("[🍄] {msg}{}", result.summary);
                        return Ok(());
                    }
                    Err(e) => {
                        println!("[🍄] {msg}");
                        return Err(format!("plot local ok; nostr/qel falhou: {e}"));
                    }
                }
            }
        }
    }

    print_response(resp)
}

#[cfg(feature = "nostr")]
#[derive(Debug)]
struct NostrPublishResult {
    summary: String,
    relay_acks: usize,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
enum DistributionPhase {
    Local,
    Distributing,
    Distributed,
    DistributionFailed,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct DistributionRecord {
    version: u8,
    plot: String,
    state: DistributionPhase,
    qel: String,
    attempts: u32,
    max_attempts: u32,
    relay_acks: usize,
    /// Relay ACK confirma aceitação de evento, não armazenamento por uma réplica.
    replicas_stored: usize,
    last_error: Option<String>,
    updated_at_unix: u64,
}

fn distribution_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn distribution_path(home: &std::path::Path, plot: &str) -> PathBuf {
    home.join("distributions").join(format!("{plot}.json"))
}

fn write_distribution(home: &std::path::Path, record: &DistributionRecord) -> Result<(), String> {
    use std::io::Write;
    let dir = home.join("distributions");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = distribution_path(home, &record.plot);
    let tmp = dir.join(format!(".{}.{}.tmp", record.plot, std::process::id()));
    let bytes = serde_json::to_vec_pretty(record).map_err(|e| e.to_string())?;
    let result = (|| -> Result<(), std::io::Error> {
        let mut file = std::fs::File::create(&tmp)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        std::fs::rename(&tmp, &path)?;
        std::fs::File::open(&dir)?.sync_all()?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(tmp);
    }
    result.map_err(|e| e.to_string())
}

fn retry_backoff_ms(initial_ms: u64, attempt: u32) -> u64 {
    initial_ms.saturating_mul(1u64 << attempt.saturating_sub(1).min(16))
}

fn should_retry_distribution(error: &str, attempt: u32, max_attempts: u32) -> bool {
    attempt < max_attempts && !error.starts_with("deterministic: ")
}

fn acquire_distribution_lock(path: PathBuf) -> Result<Option<DistributionLock>, String> {
    use std::io::Write;
    let open = || std::fs::OpenOptions::new().write(true).create_new(true).open(&path);
    match open() {
        Ok(mut file) => {
            writeln!(file, "{}", std::process::id()).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
            Ok(Some(DistributionLock { file: Some(file), path }))
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
            let owner = std::fs::read_to_string(&path)
                .ok()
                .and_then(|value| value.trim().parse::<u32>().ok());
            let owner_alive = owner
                .map(|pid| std::path::Path::new("/proc").join(pid.to_string()).exists())
                .unwrap_or(false);
            if owner_alive {
                return Ok(None);
            }
            // O processo anterior caiu: remove somente o lock órfão e retoma
            // a partir do journal persistente, sem tocar no plot ou identidade.
            std::fs::remove_file(&path).map_err(|remove| remove.to_string())?;
            let mut file = open().map_err(|retry| retry.to_string())?;
            writeln!(file, "{}", std::process::id()).map_err(|write| write.to_string())?;
            file.sync_all().map_err(|sync| sync.to_string())?;
            Ok(Some(DistributionLock { file: Some(file), path }))
        }
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(feature = "nostr")]
async fn publish_existing_cmd(
    home: &PathBuf,
    plot: String,
    nostr: bool,
    qel: String,
    max_attempts: u32,
    timeout_secs: u64,
    backoff_ms: u64,
) -> Result<(), String> {
    use mycelium_core::ContentId;
    use mycelium_sporebank::SporeBank;
    if !nostr {
        return Err("publish-existing requer --nostr".into());
    }
    if max_attempts == 0 {
        return Err("--max-attempts deve ser maior que zero".into());
    }
    parse_qel_kn(Some(&qel))?;
    let id = ContentId::from_str(&plot).map_err(|e| e.to_string())?;
    let canonical = id.to_string();
    // O nome do journal faz parte do contrato com o chamador. ContentId::to_string()
    // pode acrescentar um prefixo (por exemplo, `Qm`) e criar um segundo registro
    // que o consumidor do CID original nunca lê.
    let journal_plot = plot.clone();
    // Leitura explícita do spore print: não há novo sow nem mutação do plot.
    SporeBank::open(home)
        .and_then(|bank| bank.spore_print(&id))
        .map_err(|e| format!("plot existente indisponível: {e}"))?;

    let path = distribution_path(home, &journal_plot);
    if let Ok(bytes) = std::fs::read(&path) {
        if let Ok(existing) = serde_json::from_slice::<DistributionRecord>(&bytes) {
            if existing.state == DistributionPhase::Distributed && existing.qel == qel {
                println!("[🍄] plot {canonical} já distribuído (idempotente)");
                return Ok(());
            }
        }
    }

    std::fs::create_dir_all(home.join("distributions")).map_err(|e| e.to_string())?;
    let lock_path = home
        .join("distributions")
        .join(format!("{journal_plot}.lock"));
    let _lock = match acquire_distribution_lock(lock_path)? {
        Some(lock) => lock,
        None => {
            println!("[🍄] plot {canonical} já está em distribuição (idempotente)");
            return Ok(());
        }
    };

    let mut record = DistributionRecord {
        version: 1,
        plot: journal_plot,
        state: DistributionPhase::Local,
        qel: qel.clone(),
        attempts: 0,
        max_attempts,
        relay_acks: 0,
        replicas_stored: 0,
        last_error: None,
        updated_at_unix: distribution_now(),
    };
    write_distribution(home, &record)?;
    for attempt in 1..=max_attempts {
        record.state = DistributionPhase::Distributing;
        record.attempts = attempt;
        record.updated_at_unix = distribution_now();
        write_distribution(home, &record)?;
        let outcome = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs.max(1)),
            publish_plot_nostr(home, &canonical, Some(&qel), None, false),
        )
        .await;
        match outcome {
            Ok(Ok(result)) => {
                record.state = DistributionPhase::Distributed;
                record.relay_acks = result.relay_acks;
                record.last_error = None;
                record.updated_at_unix = distribution_now();
                write_distribution(home, &record)?;
                println!("[🍄] plot {canonical}{}; replicas_stored=0", result.summary);
                return Ok(());
            }
            Ok(Err(error)) => record.last_error = Some(error),
            Err(_) => record.last_error = Some(format!("timeout após {}s", timeout_secs.max(1))),
        }
        record.state = DistributionPhase::DistributionFailed;
        record.updated_at_unix = distribution_now();
        write_distribution(home, &record)?;
        if !record.last_error.as_deref().is_some_and(|error| should_retry_distribution(error, attempt, max_attempts)) {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(retry_backoff_ms(backoff_ms, attempt))).await;
    }
    Err(format!(
        "distribuição Nostr falhou após {} tentativa(s): {}",
        record.attempts,
        record.last_error.unwrap_or_else(|| "erro desconhecido".into())
    ))
}

#[cfg(not(feature = "nostr"))]
async fn publish_existing_cmd(
    _home: &PathBuf, _plot: String, _nostr: bool, _qel: String,
    _max_attempts: u32, _timeout_secs: u64, _backoff_ms: u64,
) -> Result<(), String> {
    Err("publish-existing requer build com feature nostr".into())
}

struct DistributionLock {
    file: Option<std::fs::File>,
    path: PathBuf,
}

impl Drop for DistributionLock {
    fn drop(&mut self) {
        self.file.take();
        let _ = std::fs::remove_file(&self.path);
    }
}

#[cfg(test)]
mod distribution_tests {
    use super::*;

    fn temporary_home(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "mycelium-{label}-{}-{}",
            std::process::id(),
            distribution_now()
        ))
    }

    #[test]
    fn distribution_journal_survives_reopen() {
        let home = temporary_home("distribution-journal");
        let record = DistributionRecord {
            version: 1,
            plot: "a".repeat(64),
            state: DistributionPhase::DistributionFailed,
            qel: "3,7".into(),
            attempts: 4,
            max_attempts: 4,
            relay_acks: 0,
            replicas_stored: 0,
            last_error: Some("relay indisponível".into()),
            updated_at_unix: distribution_now(),
        };
        write_distribution(&home, &record).unwrap();
        let reopened: DistributionRecord = serde_json::from_slice(
            &std::fs::read(distribution_path(&home, &record.plot)).unwrap(),
        )
        .unwrap();
        assert_eq!(reopened.state, DistributionPhase::DistributionFailed);
        assert_eq!(reopened.attempts, 4);
        assert_eq!(reopened.replicas_stored, 0);
        std::fs::remove_dir_all(home).unwrap();
    }

    #[test]
    fn distribution_path_preserves_the_callers_plot_identifier() {
        let home = temporary_home("distribution-path");
        let original = "1ed9d092dd06298b8a8bb4ed02feac6116482114e435331853e0e5e0bb58d90d";
        assert_eq!(
            distribution_path(&home, original),
            home.join("distributions").join(format!("{original}.json"))
        );
    }

    #[test]
    fn retry_backoff_is_exponential_and_saturating() {
        assert_eq!(retry_backoff_ms(500, 1), 500);
        assert_eq!(retry_backoff_ms(500, 2), 1_000);
        assert_eq!(retry_backoff_ms(500, 3), 2_000);
        assert_eq!(retry_backoff_ms(u64::MAX, 17), u64::MAX);
    }

    #[test]
    fn deterministic_oversize_is_not_retried_even_with_four_attempts() {
        assert!(!should_retry_distribution(
            "deterministic: evento Nostr excede limite",
            1,
            4
        ));
        assert!(should_retry_distribution("relay timeout", 1, 4));
    }

    #[test]
    fn orphaned_distribution_lock_is_recovered() {
        let home = temporary_home("distribution-lock");
        std::fs::create_dir_all(&home).unwrap();
        let path = home.join("plot.lock");
        std::fs::write(&path, "4294967295\n").unwrap();
        let lock = acquire_distribution_lock(path.clone()).unwrap().unwrap();
        assert!(path.exists());
        drop(lock);
        assert!(!path.exists());
        std::fs::remove_dir_all(home).unwrap();
    }

    #[cfg(feature = "nostr")]
    #[test]
    fn reconstructed_content_id_mismatch_is_rejected() {
        let expected = mycelium_core::ContentId::of(b"expected plot");
        let error = verify_reconstructed_content_id(&expected, b"different plot").unwrap_err();
        assert!(error.contains("não confere"), "{error}");
    }
}

#[cfg(feature = "nostr")]
async fn publish_plot_nostr(
    home: &PathBuf,
    id_str: &str,
    qel_spec: Option<&str>,
    recipient: Option<&str>,
    hybrid: bool,
) -> Result<NostrPublishResult, String> {
    use mycelium_core::ContentId;
    use mycelium_sporebank::SporeBank;
    use std::str::FromStr;

    let id = ContentId::from_str(id_str).map_err(|e| e.to_string())?;
    let bank = SporeBank::open(home).map_err(|e| e.to_string())?;
    let bytes = bank.spore_print(&id).map_err(|e| e.to_string())?;

    let (threshold, total) = parse_qel_kn(qel_spec)?;
    let cfg = mycelium_qel::QelConfig {
        threshold,
        total,
        ttl_secs: 86_400,
    };
    let ghost = mycelium_ghostid::GhostId::spawn_quick(cfg.ttl_secs).map_err(|e| e.to_string())?;
    let mut shards = if hybrid {
        mycelium_qel::fragment_hybrid(&bytes, &id.to_string(), &cfg).map_err(|e| format!("deterministic: {e}"))?
    } else {
        mycelium_qel::fragment(&bytes, &id.to_string(), &cfg).map_err(|e| format!("deterministic: {e}"))?
    };

    let mut landscape_note = String::new();
    if hybrid {
        let ctx = mycelium_distancebridge::TransportContext {
            has_internet: true,
            ipfs_peers: 1,
            relay_available: false,
            ..Default::default()
        };
        let ranked = mycelium_distancebridge::select_transports(&ctx, 3);
        landscape_note = ranked
            .iter()
            .map(|(t, p)| format!("{t:?}:{p:.2}"))
            .collect::<Vec<_>>()
            .join(",");
        let hints =
            mycelium_distancebridge::hybrid_hints_from_landscape(&ctx, threshold, total);
        for (shard, hint) in shards.iter_mut().zip(hints) {
            shard.transport = hint;
        }
    }

    let blake3_hex = hex::encode(blake3::hash(&bytes).as_bytes());
    let pool = mycelium_nostr::RelayPool::default_public().with_min_relays(1);
    // Publicar shards de mailbox (Nostr / RelayMesh / Sms); store fica no blockstore.
    let to_publish: Vec<_> = if hybrid {
        shards
            .iter()
            .filter(|s| {
                matches!(
                    s.transport,
                    mycelium_qel::TransportHint::Nostr
                        | mycelium_qel::TransportHint::RelayMesh
                        | mycelium_qel::TransportHint::Sms
                )
            })
            .cloned()
            .collect()
    } else {
        shards.iter().take(threshold as usize).cloned().collect()
    };
    let published = mycelium_nostr::publish_shards(
        &pool,
        &ghost,
        &to_publish,
        &blake3_hex,
        bytes.len(),
        recipient,
    )
    .await
    .map_err(|e| if e.is_deterministic() { format!("deterministic: {e}") } else { e.to_string() })?;

    let mut extra = format!(
        "; qel={threshold},{total} nostr_publishes={published} ghost={}",
        ghost.nostr_pubkey_hex()
    );

    if hybrid {
        let store = mycelium_ipfs::BlockStore::open(home).map_err(|e| e.to_string())?;
        store.put_named(&id, &bytes).map_err(|e| e.to_string())?;
        let mut ipfs_shards = 0usize;
        for shard in shards.iter().filter(|s| {
            matches!(
                s.transport,
                mycelium_qel::TransportHint::Ipfs
                    | mycelium_qel::TransportHint::Dtn
                    | mycelium_qel::TransportHint::Visual
            )
        }) {
            let wire = serde_json::to_vec(shard).map_err(|e| e.to_string())?;
            let shard_key = format!("{}:shard:{}", id, shard.index);
            let shard_id = ContentId::of(shard_key.as_bytes());
            store
                .put_named(&shard_id, &wire)
                .map_err(|e| e.to_string())?;
            ipfs_shards += 1;
        }
        extra.push_str(&format!(
            " hybrid=1 ipfs_plot=1 ipfs_shards={ipfs_shards} landscape=[{landscape_note}]"
        ));
    }

    Ok(NostrPublishResult { summary: extra, relay_acks: published })
}

#[cfg(feature = "nostr")]
fn parse_qel_kn(spec: Option<&str>) -> Result<(u8, u8), String> {
    let s = spec.unwrap_or("3,7");
    let (k, n) = s
        .split_once(',')
        .ok_or_else(|| format!("qel inválido '{s}' — use k,n (ex. 3,7)"))?;
    Ok((
        k.trim()
            .parse()
            .map_err(|_| "qel threshold inválido".to_string())?,
        n.trim()
            .parse()
            .map_err(|_| "qel total inválido".to_string())?,
    ))
}

async fn recall_cmd(
    home: &PathBuf,
    plot: String,
    qel: bool,
    nostr: bool,
    qel_threshold: u8,
    hybrid: bool,
) -> Result<(), String> {
    #[cfg(not(feature = "nostr"))]
    {
        if qel || nostr || hybrid {
            return Err(
                "recall --qel/--nostr/--hybrid requer `cargo build -p mycelium-cli --features nostr`"
                    .into(),
            );
        }
    }

    #[cfg(feature = "nostr")]
    if qel || nostr || hybrid {
        // 1) SporeBank local
        if let Ok(bank) = mycelium_sporebank::SporeBank::open(home) {
            if let Ok(id) = plot.parse::<mycelium_core::ContentId>() {
                if let Some(p) = bank.recall(&id) {
                    println!(
                        "[🍄] plot {} — \"{}\" ({} leaves) [local]",
                        id.short(),
                        p.message,
                        p.leaves.len()
                    );
                    return Ok(());
                }
            }
        }

        // 2) Nostr QEL
        match recall_plot_nostr(home, &plot, qel_threshold).await {
            Ok(msg) => {
                println!("[🍄] {msg}");
                return Ok(());
            }
            Err(nostr_err) => {
                // 3) Hybrid: blockstore ipfs local
                if hybrid {
                    match recall_plot_ipfs(home, &plot).await {
                        Ok(msg) => {
                            println!("[🍄] {msg}");
                            return Ok(());
                        }
                        Err(ipfs_err) => {
                            let sock = home.join("mycelium.sock");
                            if sock.exists() || sock.with_extension("tcp").exists() {
                                let resp = call(
                                    &sock,
                                    Request::Recall {
                                        plot: plot.clone(),
                                        qel,
                                        nostr,
                                        qel_threshold: Some(qel_threshold),
                                    },
                                )
                                .await?;
                                print_response(resp)?;
                            }
                            return Err(format!(
                                "hybrid: nostr={nostr_err}; ipfs={ipfs_err}"
                            ));
                        }
                    }
                }

                let sock = home.join("mycelium.sock");
                if sock.exists() || sock.with_extension("tcp").exists() {
                    let resp = call(
                        &sock,
                        Request::Recall {
                            plot: plot.clone(),
                            qel,
                            nostr,
                            qel_threshold: Some(qel_threshold),
                        },
                    )
                    .await?;
                    print_response(resp)?;
                }
                return Err(format!("nostr/qel: {nostr_err}"));
            }
        }
    }

    let sock = home.join("mycelium.sock");
    print_response(
        call(
            &sock,
            Request::Recall {
                plot,
                qel,
                nostr,
                qel_threshold: None,
            },
        )
        .await?,
    )
}

#[cfg(feature = "nostr")]
async fn recall_plot_ipfs(home: &PathBuf, plot: &str) -> Result<String, String> {
    use mycelium_core::ContentId;
    use std::str::FromStr;

    let id = ContentId::from_str(plot).map_err(|e| e.to_string())?;
    let store = mycelium_ipfs::BlockStore::open(home).map_err(|e| e.to_string())?;
    let bytes = store.get(&id).map_err(|e| e.to_string())?;
    import_spore_via_daemon(home, &id, &bytes).await?;
    Ok(format!("plot {} reconstruído via ipfs-blocks", id.short()))
}

#[cfg(feature = "nostr")]
async fn recall_plot_nostr(home: &PathBuf, plot: &str, threshold: u8) -> Result<String, String> {
    use mycelium_core::ContentId;
    use std::str::FromStr;

    let id = ContentId::from_str(plot).map_err(|e| e.to_string())?;
    let pool = mycelium_nostr::RelayPool::default_public().with_min_relays(1);
    let shards = mycelium_nostr::fetch_shards(&pool, &id.to_string(), threshold, None)
        .await
        .map_err(|e| e.to_string())?;
    if shards.len() < threshold as usize {
        return Err(format!(
            "só {} shards Nostr (preciso {threshold})",
            shards.len()
        ));
    }
    let bytes = mycelium_qel::reconstruct(&shards).map_err(|e| e.to_string())?;
    verify_reconstructed_content_id(&id, &bytes)?;
    import_spore_via_daemon(home, &id, &bytes).await?;
    Ok(format!("plot {} reconstruído via Nostr/QEL", id.short()))
}

#[cfg(feature = "nostr")]
fn verify_reconstructed_content_id(
    expected: &mycelium_core::ContentId,
    bytes: &[u8],
) -> Result<(), String> {
    if mycelium_core::ContentId::of(bytes) != *expected {
        return Err("ContentId reconstruído não confere com o plot solicitado".into());
    }
    Ok(())
}

#[cfg(feature = "nostr")]
async fn import_spore_via_daemon(
    home: &PathBuf,
    expected: &mycelium_core::ContentId,
    bytes: &[u8],
) -> Result<(), String> {
    use base64::Engine;
    let response = call(
        &home.join("mycelium.sock"),
        Request::ImportSpore {
            spore_print_base64: base64::engine::general_purpose::STANDARD.encode(bytes),
            expected_plot: expected.to_string(),
        },
    )
    .await?;
    match response {
        Response::Ok { .. } => Ok(()),
        Response::Err { message } => Err(message),
        _ => Err("resposta inesperada ao importar spore print".into()),
    }
}

/// Coleta arquivos recursivamente, ignorando metadados e artefatos de build
/// (`.git`, `target`, `node_modules`, entradas ocultas).
fn collect_code_files(
    dir: &std::path::Path,
    root: &std::path::Path,
    files: &mut Vec<(String, String)>,
    total_bytes: &mut usize,
) -> Result<(), String> {
    use base64::Engine;
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if file_path.is_dir() {
            if name == ".git" || name == "target" || name == "node_modules" || (name.starts_with('.') && name.len() > 1) {
                continue;
            }
            collect_code_files(&file_path, root, files, total_bytes)?;
        } else if file_path.is_file() {
            let relative = file_path.strip_prefix(root).unwrap_or(&file_path);
            let content = std::fs::read(&file_path).map_err(|e| e.to_string())?;
            *total_bytes += content.len();
            let b64 = base64::engine::general_purpose::STANDARD.encode(&content);
            files.push((relative.to_string_lossy().to_string(), b64));
        }
    }
    Ok(())
}

/// Lê recursivamente um diretório e envia os arquivos ao daemon via SeedCode.
async fn seed_code_cmd(
    home: &PathBuf,
    path: String,
    name: String,
    description: String,
    ion: String,
    visibility: String,
) -> Result<(), String> {
    let dir = std::path::PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("'{path}' não é um diretório"));
    }
    let mut files: Vec<(String, String)> = Vec::new();
    let mut total_bytes = 0usize;
    collect_code_files(&dir, &dir, &mut files, &mut total_bytes)?;
    if files.is_empty() {
        return Err(format!("'{path}' não contém arquivos (ou todos foram ignorados)"));
    }
    println!("[🍄] seed-code: {} arquivos ({} bytes) de '{}' [{}]", files.len(), total_bytes, path, visibility);
    rpc(home, Request::SeedCode { name, description, ion, visibility, files }).await
}

/// Baixa código-fonte da rede. `--output` resolve relativo ao CWD do CLI;
/// sem `--output`, descobre o nome do plot via `recall` e extrai em ./<nome>.
async fn recall_code_cmd(home: &PathBuf, plot: String, output: Option<String>) -> Result<(), String> {
    let dest: Option<std::path::PathBuf> = match output {
        Some(o) => {
            let p = std::path::PathBuf::from(&o);
            Some(if p.is_absolute() {
                p
            } else {
                std::env::current_dir().unwrap_or_default().join(p)
            })
        }
        None => {
            // O nome do plot vive no daemon; a extração deve cair no CWD do CLI.
            let sock = home.join("mycelium.sock");
            let resp = call(
                &sock,
                Request::Recall {
                    plot: plot.clone(),
                    qel: false,
                    nostr: false,
                    qel_threshold: None,
                },
            )
            .await?;
            let msg = match resp {
                mycelium_node::Response::Ok { message } => message,
                mycelium_node::Response::Err { message } => return Err(message),
                _ => return Err("resposta inesperada do daemon".into()),
            };
            // message: "plot Qm… — \"[vis] nome: desc\" (N leaves)"
            let name = msg
                .split('"')
                .nth(1)
                .map(|s| s.trim().split(':').next().unwrap_or("code").trim().to_string())
                .map(|n| {
                    // remove o prefixo de visibilidade "[vis] nome"
                    if n.starts_with('[') {
                        n.split(']').last().unwrap_or("code").trim().to_string()
                    } else {
                        n
                    }
                })
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "code".to_string());
            Some(std::env::current_dir().unwrap_or_default().join(name))
        }
    };
    rpc(
        home,
        Request::RecallCode {
            plot,
            output_dir: dest.map(|p| p.display().to_string()),
        },
    )
    .await
}

async fn rpc(home: &PathBuf, request: Request) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    print_response(call(&sock, request).await?)
}

/// Poll IsotopeGet até ~3s (Decay pelas hifas).
async fn isotope_get_poll(home: &PathBuf, key: String) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(3);
    let mut last_err = String::from("timeout");
    while tokio::time::Instant::now() < deadline {
        match call(&sock, Request::IsotopeGet { key: key.clone() }).await? {
            Response::Ok { message } => {
                println!("[🍄] {message}");
                return Ok(());
            }
            Response::Err { message } => {
                last_err = message;
                if !last_err.contains("decay em curso") {
                    return Err(last_err);
                }
            }
            Response::Status(_) => return Err("resposta inesperada".into()),
            _ => return Err("resposta inesperada".into()),
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    }
    Err(format!("isotope-get timeout: {last_err}"))
}

/// sow (opcional) → signal → espera ion → imprime URL do Event Horizon.
struct DeployOpts {
    plot: Option<String>,
    message: String,
    path: String,
    content: String,
    ion: String,
    name: String,
    quorum: usize,
    timeout: u64,
}

async fn deploy(home: &PathBuf, opts: DeployOpts) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    let plot_id = if let Some(p) = opts.plot {
        p
    } else {
        println!("[🍄] Semeando plot…");
        match call(
            &sock,
            Request::Sow {
                message: opts.message,
                path: opts.path,
                content: opts.content,
                qel: None,
                nostr: false,
                ghost: false,
                recipient: None,
            },
        )
        .await?
        {
            Response::Ok { message } => message
                .strip_prefix("plot semeado: ")
                .unwrap_or(&message)
                .to_string(),
            Response::Err { message } => return Err(message),
            Response::Status(_) => return Err("resposta inesperada no sow".into()),
            _ => return Err("resposta inesperada no sow".into()),
        }
    };
    println!("[🍄] Plot {plot_id}");
    println!("[🍄] Signal → ion `{}`…", opts.ion);
    match call(
        &sock,
        Request::Signal {
            plot: plot_id,
            quorum: opts.quorum,
            ion: opts.ion.clone(),
            name: opts.name,
        },
    )
    .await?
    {
        Response::Ok { message } => println!("[🍄] {message}"),
        Response::Err { message } => return Err(message),
        Response::Status(_) => return Err("resposta inesperada no signal".into()),
        _ => return Err("resposta inesperada no signal".into()),
    }

    let deadline =
        tokio::time::Instant::now() + tokio::time::Duration::from_secs(opts.timeout);
    while tokio::time::Instant::now() < deadline {
        if let Response::Status(s) = call(&sock, Request::Status).await? {
            if s.ions.iter().any(|n| n == &opts.ion) {
                let base = if s.event_horizon.ends_with('/') {
                    s.event_horizon.clone()
                } else {
                    format!("{}/", s.event_horizon)
                };
                let url = format!("{base}{}/", opts.ion);
                println!("[🍄] Vacuum Chamber pronta");
                println!("[🍄] Singularity Event Horizon: {url}");
                println!("[🍄] curl -s {url}");
                return Ok(());
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
    }
    Err(format!(
        "deploy timeout: ion `{}` não apareceu em {}s",
        opts.ion, opts.timeout
    ))
}

fn print_response(resp: Response) -> Result<(), String> {
    match resp {
        Response::Ok { message } => {
            println!("[🍄] {message}");
            Ok(())
        }
        Response::Status(s) => {
            println!("[🍄] Organismo vivo");
            println!("    home       : {}", s.home);
            println!("    NodeId     : {}", s.node_id);
            println!("    PeerId     : {}", s.peer_id);
            println!("    listen     : {:?}", s.listen_addrs);
            println!("    vizinhos   : {}", s.neighbors);
            println!("    plots      : {}", s.plots);
            println!("    signals    : {}", s.signals);
            println!("    ions       : {:?}", s.ions);
            println!(
                "    isotope    : shard={}/{} atoms={}",
                s.isotope_shard, s.isotope_ring, s.isotope_atoms
            );
            if !s.event_horizon.is_empty() {
                println!("    horizon    : {}", s.event_horizon);
            }
            for ep in &s.ion_endpoints {
                println!("    chamber    : {ep}");
            }
            for ion in &s.ions {
                println!(
                    "    curl       : curl -s {}{ion}/",
                    if s.event_horizon.ends_with('/') {
                        s.event_horizon.clone()
                    } else {
                        format!("{}/", s.event_horizon)
                    }
                );
            }
            println!(
                "    nutrientes : ATP={} Enzymes={} Mycelia={} Spores={} Resilience={}",
                s.atp, s.enzymes, s.mycelia, s.spores, s.resilience
            );
            println!(
                "    hifas      : anastomoses={} atrophies={} msg_in={} msg_out={}",
                s.anastomoses, s.atrophies, s.messages_in, s.messages_out
            );
            if !s.membrane.is_empty() {
                println!("    membrana   : {}", s.membrane);
            }
            if s.sporocarp {
                println!("    sporocarp  : sim");
            }
            println!(
                "    wan_reach  : {}",
                if s.wan_reachable { "sim" } else { "nao" }
            );
            if s.is_relay {
                println!("    is_relay   : sim");
            }
            if let Some(r) = &s.active_relay {
                println!("    active_relay: {r}");
            }
            if !s.relay_health.is_empty() {
                println!("    relay_mesh : {}", s.relay_health);
            }
            if !s.physarum_phase.is_empty() {
                println!("    physarum   : {}", s.physarum_phase);
            }
            if let Some(dns) = &s.dns_seed {
                println!("    dns_seed   : {dns}");
            }
            if let Some(gateway) = &s.rpc_gateway {
                println!("    rpc_gateway : {gateway}");
            }
            if s.rpc_provider {
                println!("    rpc_provider: sim (chain {})", s.rpc_chain_id);
                if let Some(kem) = &s.rpc_provider_kem {
                    println!("    rpc_kem_pub : {kem}");
                }
            }
            if let Some(socks) = &s.veil_socks5 {
                println!("    veil_socks5: {socks}");
            }
            Ok(())
        }
        Response::VeilStatusResult {
            active,
            role,
            mode,
            socks5_addr,
            listen_addr,
            descriptor,
            session_id,
            bytes_routed,
            mac_address,
            kill_switch,
            active_layers,
            entrada_ativa,
            entradas,
            tentativas_failover,
            motivos_falha,
        } => {
            println!("[🛡️] Mycelium VEIL Ω");
            println!("    estado     : {}", if active { "ativo 🟢" } else { "inativo ⚪" });
            if let Some(r) = role {
                println!("    papel      : {r}");
            }
            if let Some(m) = mode {
                println!("    modo       : {m}");
            }
            if let Some(s) = socks5_addr {
                println!("    socks5     : {s}");
            }
            if let Some(l) = listen_addr {
                println!("    escuta     : {l}");
            }
            if let Some(id) = session_id {
                println!("    sessão_id  : {id}");
            }
            if let Some(mac) = mac_address {
                println!("    mac_efêmero: {mac}");
            }
            println!("    kill_switch: {kill_switch}");
            println!("    camadas    : {active_layers}/7 ativas");
            println!("    tráfego    : {bytes_routed} bytes");
            if let Some(ea) = entrada_ativa {
                println!("    ponte ativa: {ea}");
            }
            if !entradas.is_empty() {
                println!("    pontes     : {}", entradas.join(", "));
            }
            if tentativas_failover > 0 {
                println!("    failovers  : {tentativas_failover}");
            }
            if !motivos_falha.is_empty() {
                println!("    falhas     : {}", motivos_falha.join("; "));
            }
            if let Some(d) = descriptor {
                println!("    descritor  : (use 'mycelium veil descriptor' para ver completo)");
                let _ = d; // silencia unused
            }
            Ok(())
        }
        Response::StoreCaps { caps } => {
            println!("\n⚡ === MYCELIUM STORE — Capacidades de Emulação Host === ⚡\n");
            println!(" ⚙️ QEMU Emulators:");
            for (arch, has) in &caps.has_qemu {
                println!("    • qemu-system-{:<8}: {}", arch, if *has { "✅ Instalado" } else { "❌ Ausente" });
            }
            println!(" ⚙️ RetroArch (Libretro): {}", if caps.has_retroarch { "✅ Instalado" } else { "❌ Ausente" });
            println!("    Cores encontrados: {:?}", caps.available_libretro_cores);
            println!(" ⚙️ MAME Arcade: {}", if caps.has_mame { "✅ Instalado" } else { "❌ Ausente" });
            println!(" ⚙️ Bubblewrap Sandbox (bwrap): {}\n", if caps.has_bwrap_sandbox { "✅ Disponível" } else { "❌ Não encontrado" });
            Ok(())
        }
        Response::StoreList { spores } => {
            if spores.is_empty() {
                println!("[🍄] Nenhum spore cadastrado no catálogo.");
            } else {
                println!("\n🎮 === MYCELIUM APP STORE — Catálogo P2P Retro ({}) === 🎮\n", spores.len());
                for spore in spores {
                    println!("🔹 ID: {}", spore.id);
                    println!("   Título: {}", spore.title);
                    println!("   Plataforma: {}", spore.platform.display_name());
                    println!("   Ano: {}", spore.release_year);
                    println!("   Licença: {}", spore.license.display_name());
                    println!("   Recomendado: {:?}", spore.execution_matrix.recommended);
                    println!("   Categorias/Tags: {:?}", spore.tags);
                    println!("   ContentId: {}", hex::encode(spore.content_id.0));
                    println!("------------------------------------------------------------");
                }
            }
            Ok(())
        }
        Response::StoreLaunched { spore_id, engine, message } => {
            println!("[🍄 Store] Spore '{spore_id}' iniciado via {engine}: {message}");
            Ok(())
        }
        Response::RepoPublished { cid, leaves, bytes } => {
            println!("[🍄 Repo] ✅ Publicado com sucesso!");
            println!("    ContentId : {cid}");
            println!("    Arquivos  : {leaves}");
            println!("    Tamanho   : {bytes} bytes");
            Ok(())
        }
        Response::RepoCloneResult { message, leaves } => {
            println!("[🍄 Repo] {message} ({} arquivos)", leaves.len());
            Ok(())
        }
        Response::InertiaRunResult {
            input_cid,
            build_attestation_cid,
            test_attestation_cid,
            artifact_cid,
            success,
        } => {
            println!("[🍄 Inertia] CID de entrada       : {input_cid}");
            println!("[🍄 Inertia] Atestação de build  : {build_attestation_cid}");
            if let Some(cid) = test_attestation_cid {
                println!("[🍄 Inertia] Atestação de teste  : {cid}");
            }
            if let Some(cid) = artifact_cid {
                println!("[🍄 Inertia] Artefato             : {cid}");
            }
            if success {
                println!("[🍄 Inertia] ✅ Build e testes aprovados");
            } else {
                println!("[🍄 Inertia] ❌ Falha no build ou testes");
            }
            Ok(())
        }
        Response::InertiaAttestationResult { cid, attestation } => {
            println!("[🍄 Inertia] Atestação {cid}:");
            println!("    Executor: {}", attestation.payload.executor);
            println!("    Signer  : {}", attestation.signer);
            println!("    Sucesso : {}", attestation.payload.success);
            println!("    Log CID : {}", attestation.payload.log_digest);
            Ok(())
        }
        Response::TransferResult { tx_id, kind, nutrient, amount, to } => {
            println!("[🍄] Transferência confirmada: {tx_id}");
            println!("    Nutriente : {nutrient} ({kind})");
            println!("    Quantidade: {amount}");
            println!("    Destino   : {to}");
            Ok(())
        }
        Response::LedgerReport { pubkey, balances, history, transfers } => {
            println!("[🍄] Ledger Local");
            println!("    Chave pública: {pubkey}");
            println!("    Saldos       :");
            for (k, v) in balances {
                println!("      {:?}: {}", k, v);
            }
            println!("    Histórico de trocas        : {} entradas", history.len());
            println!("    Transferências registradas : {} transferências", transfers.len());
            Ok(())
        }
        Response::AssetListResult { assets } => {
            if assets.is_empty() {
                println!("[🍄] Nenhum ativo cadastrado.");
            } else {
                println!("[🍄] Ativos registrados ({}):", assets.len());
                for a in assets {
                    println!("    • [{}] {} ({} cotas a {} ATP)", a.id, a.name, a.shares_total, a.price_per_share);
                }
            }
            Ok(())
        }
        Response::AssetSharesResult { asset, holdings } => {
            println!("[🍄] Cotas do ativo {asset}:");
            for h in holdings {
                println!("    • Holder {}: {} cotas", hex::encode(h.holder), h.shares);
            }
            Ok(())
        }
        Response::Err { message } => Err(message),
    }
}

async fn chamber_headers_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let mut resp = next.run(req).await;
    let pid = std::process::id().to_string();
    if let Ok(val) = axum::http::HeaderValue::from_str(&pid) {
        resp.headers_mut().insert("x-chamber-pid", val);
    }
    if let Ok(val) = axum::http::HeaderValue::from_str("dynamic-process") {
        resp.headers_mut().insert("x-chamber-mode", val);
    }
    resp
}

async fn chamber_serve(port: u16, ion: String, root: PathBuf) -> Result<(), String> {
    let message = std::fs::read_to_string(root.join("message.txt"))
        .or_else(|_| std::fs::read_to_string(root.join("rootfs/MESSAGE")))
        .unwrap_or_else(|_| ion.clone());
    let ion_name = ion.clone();
    let msg = message.clone();
    let built_html = std::fs::read_to_string(root.join("rootfs/index.html")).ok();

    let app = Router::new()
        .route(
            "/",
            get({
                let ion = ion_name.clone();
                let msg = msg.clone();
                move || {
                    let ion = ion.clone();
                    let msg = msg.clone();
                    async move {
                        Json(json!({
                            "ion": ion,
                            "message": msg,
                            "substrate": "mycelium",
                            "runtime": "vacuum-chamber",
                        }))
                    }
                }
            }),
        )
        .route("/health", get(|| async { Json(json!({"ok": true})) }))
        .route(
            "/status",
            get({
                let ion = ion_name.clone();
                move || {
                    let ion = ion.clone();
                    let pid = std::process::id();
                    async move {
                        Json(json!({
                            "chamber_pid": pid,
                            "status": "active",
                            "ion": ion,
                        }))
                    }
                }
            }),
        )
        .route(
            "/index.html",
            get({
                let ion = ion_name;
                let msg = message;
                let built = built_html;
                move || {
                    let ion = ion.clone();
                    let msg = msg.clone();
                    let built = built.clone();
                    async move {
                        let body = built.unwrap_or_else(|| {
                            format!(
                                "<!doctype html><html><body style=\"font-family:system-ui;background:#0b1a14;color:#c8e6c9;padding:2rem\">\
                                <h1>🍄 {ion}</h1>\
                                <p>Servido por uma <b>Vacuum Chamber</b> (processo filho).</p>\
                                <pre>{msg}</pre>\
                                </body></html>"
                            )
                        });
                        (
                            [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
                            body,
                        )
                    }
                }
            }),
        )
        .layer(axum::middleware::from_fn(chamber_headers_middleware));

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| e.to_string())?;
    axum::serve(listener, app)
        .await
        .map_err(|e| e.to_string())
}

fn store_cmd(home: &PathBuf, action: StoreCmd) -> Result<(), String> {
    let rt = tokio::runtime::Runtime::new().expect("tokio");
    rt.block_on(store_cmd_async(home, action))
}

async fn store_cmd_async(home: &PathBuf, action: StoreCmd) -> Result<(), String> {
    use mycelium_store::{
        catalog::StoreCatalog,
        runner::EmulatorRunner,
        spore::{ExecutionEngineType, SoftwareSpore, SporeLicense, TargetPlatform},
    };

    let sock = home.join("mycelium.sock");
    let daemon_running = sock.exists() || sock.with_extension("tcp").exists();

    match action {
        StoreCmd::List => {
            if daemon_running {
                return print_response(call(&sock, Request::StoreList).await?);
            }
            let catalog = StoreCatalog::open(home).map_err(|e| e.to_string())?;
            let spores = catalog.list_public_spores();
            println!("\n🎮 === MYCELIUM APP STORE — Catálogo P2P Retro === 🎮\n");
            for spore in spores {
                println!("🔹 ID: {}", spore.id);
                println!("   Título: {}", spore.title);
                println!("   Plataforma: {}", spore.platform.display_name());
                println!("   Ano: {}", spore.release_year);
                println!("   Licença: {}", spore.license.display_name());
                println!("   Recomendado: {:?}", spore.execution_matrix.recommended);
                println!("   Categorias/Tags: {:?}", spore.tags);
                println!("   ContentId: {}", hex::encode(spore.content_id.0));
                println!("------------------------------------------------------------");
            }
            Ok(())
        }
        StoreCmd::Caps => {
            if daemon_running {
                return print_response(call(&sock, Request::StoreCaps).await?);
            }
            let caps = EmulatorRunner::detect_capabilities();
            println!("\n⚡ === MYCELIUM STORE — Capacidades de Emulação Host === ⚡\n");
            println!(" ⚙️ QEMU Emulators:");
            for (arch, has) in caps.has_qemu {
                println!("    • qemu-system-{:<8}: {}", arch, if has { "✅ Instalado" } else { "❌ Ausente" });
            }
            println!(" ⚙️ RetroArch (Libretro): {}", if caps.has_retroarch { "✅ Instalado" } else { "❌ Ausente" });
            println!("    Cores encontrados: {:?}", caps.available_libretro_cores);
            println!(" ⚙️ MAME Arcade: {}", if caps.has_mame { "✅ Instalado" } else { "❌ Ausente" });
            println!(" ⚙️ Bubblewrap Sandbox (bwrap): {}\n", if caps.has_bwrap_sandbox { "✅ Disponível" } else { "❌ Não encontrado" });
            Ok(())
        }
        StoreCmd::Launch { id, engine, sandbox } => {
            if daemon_running {
                let req = Request::StoreLaunch { id, engine, sandbox };
                return print_response(call(&sock, req).await?);
            }
            let catalog = StoreCatalog::open(home).map_err(|e| e.to_string())?;
            let spore = catalog.get_spore(&id).ok_or_else(|| format!("Spore '{}' não encontrado", id))?;

            let caps = EmulatorRunner::detect_capabilities();

            let forced_engine = match engine.as_deref() {
                Some("native") => Some(ExecutionEngineType::Native),
                Some("retroarch") => Some(ExecutionEngineType::RetroArchLibretro),
                Some("mame") => Some(ExecutionEngineType::MAME),
                Some("qemu") => Some(ExecutionEngineType::QEMU),
                Some("wasm") => Some(ExecutionEngineType::WebAssembly),
                Some("cloud") => Some(ExecutionEngineType::P2PCloudStream),
                Some(other) => return Err(format!("Motor de execução desconhecido: '{}'", other)),
                None => None,
            };

            let resolved_engine = EmulatorRunner::resolve_best_engine(spore, &caps, forced_engine);
            println!("[🍄 Store] Preparando lançamento de '{}'...", spore.title);
            println!("[🍄 Store] Plataforma Alvo: {}", spore.platform.display_name());
            println!("[🍄 Store] Motor Escolhido: {:?}", resolved_engine);

            let dummy_path = home.join("store").join(&spore.main_binary_file);

            match EmulatorRunner::launch(spore, &dummy_path, resolved_engine, sandbox) {
                Ok(_child) => {
                    println!("[🍄 Store] Processo do emulador lançado com sucesso!");
                    Ok(())
                }
                Err(err) => Err(format!("Erro ao lançar o emulador: {}", err)),
            }
        }
        StoreCmd::Publish { id, title, platform, binary, license } => {
            if !binary.exists() {
                return Err(format!("Arquivo binário '{:?}' não existe", binary));
            }
            let bytes = std::fs::read(&binary).map_err(|e| e.to_string())?;

            let plat = match platform.to_lowercase().as_str() {
                "snes" => TargetPlatform::SNES,
                "nes" => TargetPlatform::NES,
                "megadrive" | "genesis" => TargetPlatform::MegaDrive,
                "msdos" | "dos" => TargetPlatform::MSDOS,
                "win98" | "win95" => TargetPlatform::Windows98,
                "arcade" | "mame" => TargetPlatform::ArcadeMame,
                "mac" | "ppc" => TargetPlatform::PowerPCMac,
                _ => TargetPlatform::NativeSystem,
            };

            let lic = match license.to_lowercase().as_str() {
                "shareware" => SporeLicense::Shareware,
                "freeware" => SporeLicense::Freeware,
                "open_source" | "opensource" | "open" => SporeLicense::OpenSource,
                "public_domain" | "publicdomain" | "pd" | "cc0" => SporeLicense::PublicDomain,
                _ => SporeLicense::Proprietary,
            };

            let mut catalog = StoreCatalog::open(home).map_err(|e| e.to_string())?;

            let main_file = binary.file_name().unwrap().to_string_lossy().to_string();
            let content_id = mycelium_core::ContentId::of(&bytes);

            let spore = SoftwareSpore {
                id: id.clone(),
                title,
                description: "Publicado via Mycelium Store CLI".to_string(),
                developer_or_publisher: "Comunidade Mycelium".to_string(),
                release_year: 2000,
                platform: plat,
                category: "software".to_string(),
                tags: vec!["p2p".to_string(), "spore".to_string()],
                license: lic,
                main_binary_file: main_file,
                content_id,
                execution_matrix: mycelium_store::ExecutionMatrix {
                    recommended: ExecutionEngineType::Native,
                    supports_native: true,
                    libretro_core: None,
                    mame_driver: None,
                    qemu_config: None,
                    supports_wasm: true,
                    supports_p2p_stream: true,
                },
                requirements: mycelium_store::spore::HardwareRequirements::default(),
                extra_args: vec![],
                cover_image_url: None,
            };

            let cid = catalog.publish_spore(spore, &bytes).map_err(|e| e.to_string())?;
            println!("[🍄 Store] Spore '{}' publicado com sucesso! ContentId: {}", id, hex::encode(cid.0));
            Ok(())
        }
    }
}

async fn repo_cmd(home: &PathBuf, action: RepoCmd) -> Result<(), String> {
    match action {
        RepoCmd::Publish { dir, repository, branch, expected_previous_cid, message } => {
            if !dir.is_dir() {
                return Err(format!("diretório não encontrado: {:?}", dir));
            }
            let leaves = pack_tree(&dir)?;
            if leaves.is_empty() {
                return Err("nenhum arquivo para publicar".into());
            }
            let bytes: usize = leaves.iter().map(|l| l.content.len()).sum();
            println!("[🍄 Repo] Empacotando {} arquivos ({} bytes) de {:?}", leaves.len(), bytes, dir);
            println!("[🍄 Repo] Enviando para o daemon (SporeBank + DHT + gossip)...");
            let repository = repository.or_else(|| dir.file_name().map(|v| v.to_string_lossy().into_owned()));
            let resp = call(&home.join("mycelium.sock"), Request::RepoPublish {
                repository,
                branch: Some(branch),
                expected_previous_cid,
                message,
                leaves,
            }).await?;
            match resp {
                Response::RepoPublished { cid, leaves, bytes } => {
                    println!("[🍄 Repo] ✅ Publicado!");
                    println!("    ContentId : {cid}");
                    println!("    Arquivos  : {leaves}");
                    println!("    Tamanho   : {bytes} bytes");
                    println!();
                    println!("  Distribua este ContentId (via Nostr/DHT). Qualquer nó pode:");
                    println!("    mycelium repo clone --cid {cid} --dest ./copia");
                    println!("    curl http://127.0.0.1:7474/src/{cid}/");
                    Ok(())
                }
                Response::Err { message } => Err(message),
                other => Err(format!("resposta inesperada: {:?}", other)),
            }
        }
        RepoCmd::Clone { cid, dest } => {
            let sock = home.join("mycelium.sock");
            let resp = call(&sock, Request::RepoClone { cid: cid.clone() }).await;
            match resp {
                Ok(Response::RepoCloneResult { message, leaves }) => {
                    println!("[🍄 Repo] {message}");
                    write_tree(&dest, &leaves)?;
                    let bytes: usize = leaves.iter().map(|l| l.content.len()).sum();
                    println!("[🍄 Repo] ✅ Árvore reconstruída em {:?} ({} arquivos, {} bytes)", dest, leaves.len(), bytes);
                    Ok(())
                }
                Ok(Response::Err { message }) => Err(message),
                Ok(other) => Err(format!("resposta inesperada: {:?}", other)),
                Err(e) => {
                    println!("[🍄 Repo] daemon offline ({e}) — tentando SporeBank local...");
                    match clone_from_local_bank(home, &cid) {
                        Some(leaves) => {
                            write_tree(&dest, &leaves)?;
                            let bytes: usize = leaves.iter().map(|l| l.content.len()).sum();
                            println!("[🍄 Repo] ✅ Árvore reconstruída do SporeBank local em {:?} ({} arquivos, {} bytes)", dest, leaves.len(), bytes);
                            Ok(())
                        }
                        None => Err(format!(
                            "repo {} não encontrado localmente. Suba o daemon (mycelium daemon) para buscar via DHT.",
                            cid
                        )),
                    }
                }
            }
        }
        RepoCmd::Validate { cid } => {
            let resp = call(
                &home.join("mycelium.sock"),
                Request::InertiaRun { cid: cid.clone() },
            )
            .await?;
            match resp {
                Response::InertiaRunResult {
                    input_cid,
                    build_attestation_cid,
                    test_attestation_cid,
                    artifact_cid,
                    success,
                } => {
                    println!("[🍄 Inertia] CID de entrada       : {input_cid}");
                    println!("[🍄 Inertia] Atestação de build  : {build_attestation_cid}");
                    if let Some(cid) = test_attestation_cid {
                        println!("[🍄 Inertia] Atestação de teste  : {cid}");
                    }
                    if let Some(cid) = artifact_cid {
                        println!("[🍄 Inertia] Artefato             : {cid}");
                    }
                    if success {
                        println!("[🍄 Inertia] ✅ Build e testes aprovados");
                        Ok(())
                    } else {
                        Err("validação Inertia reprovada; as atestações foram preservadas".into())
                    }
                }
                Response::Err { message } => Err(message),
                other => Err(format!("resposta inesperada: {:?}", other)),
            }
        }
        RepoCmd::Attestation { cid } => {
            let resp = call(
                &home.join("mycelium.sock"),
                Request::InertiaAttestation { cid: cid.clone() },
            )
            .await?;
            match resp {
                Response::InertiaAttestationResult { cid, attestation } => {
                    attestation
                        .verify()
                        .map_err(|e| format!("atestação {cid} inválida: {e}"))?;
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&attestation)
                            .map_err(|e| format!("serializar atestação: {e}"))?
                    );
                    Ok(())
                }
                Response::Err { message } => Err(message),
                other => Err(format!("resposta inesperada: {:?}", other)),
            }
        }
        RepoCmd::List => {
            let resp = call(&home.join("mycelium.sock"), Request::Status).await?;
            match resp {
                Response::Status(s) => {
                    println!("\n[🍄 Repo] Plots no SporeBank local: {}\n", s.plots);
                    for id in mycelium_store_list_local(home)? {
                        println!("    • {}", id);
                    }
                    Ok(())
                }
                _ => Err("resposta inesperada no status".into()),
            }
        }
    }
}

async fn veil_cmd(home: &PathBuf, action: VeilCmd) -> Result<(), String> {
    let sock = home.join("mycelium.sock");
    match action {
        VeilCmd::Status => {
            print_response(call(&sock, Request::VeilStatus).await?)
        }
        VeilCmd::Start {
            mode,
            port,
            role,
            listen,
            trust,
            advertise,
            identity,
            rotate_identity,
            egress_bind,
            bridges,
            bridge_listen,
            bridge_target,
        } => {
            print_response(call(&sock, Request::VeilStart {
                mode: Some(mode),
                socks5_port: Some(port),
                role,
                listen,
                trust,
                advertise,
                identity: identity.map(|p| p.display().to_string()),
                rotate_identity,
                egress_bind: egress_bind.map(|ip| ip.to_string()),
                bridges,
                bridge_listen,
                bridge_target,
            }).await?)
        }
        VeilCmd::Stop => {
            print_response(call(&sock, Request::VeilStop).await?)
        }
        VeilCmd::Descriptor => {
            print_response(call(&sock, Request::VeilDescriptor).await?)
        }
    }
}

fn write_tree(dest: &PathBuf, leaves: &[giggs::Leaf]) -> Result<(), String> {
    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let root = std::fs::canonicalize(dest).map_err(|e| format!("resolver destino: {e}"))?;
    let mut paths = std::collections::HashSet::new();
    for leaf in leaves {
        let relative = safe_repo_path(&leaf.path)?;
        if !paths.insert(relative.clone()) {
            return Err(format!("caminho duplicado no Plot: {}", leaf.path));
        }
        let target = root.join(&relative);
        let parent = target
            .parent()
            .ok_or_else(|| format!("caminho sem diretório pai: {}", leaf.path))?;
        create_safe_directories(&root, parent)?;
        if let Ok(metadata) = std::fs::symlink_metadata(&target) {
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err(format!("destino inseguro ou não regular: {}", leaf.path));
            }
        }
        std::fs::write(&target, &leaf.content).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn safe_repo_path(path: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(path);
    if path.is_empty() || candidate.is_absolute() {
        return Err(format!("caminho inseguro no Plot: {path:?}"));
    }
    let mut clean = PathBuf::new();
    for component in candidate.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            _ => return Err(format!("caminho inseguro no Plot: {path:?}")),
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(format!("caminho inseguro no Plot: {path:?}"));
    }
    Ok(clean)
}

fn create_safe_directories(root: &Path, parent: &Path) -> Result<(), String> {
    let relative = parent
        .strip_prefix(root)
        .map_err(|_| "diretório pai escapou do destino".to_string())?;
    let mut current = root.to_path_buf();
    for component in relative.components() {
        current.push(component);
        match std::fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_dir() => {
                return Err(format!("componente inseguro no destino: {:?}", current));
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                std::fs::create_dir(&current)
                    .map_err(|e| format!("criar diretório {:?}: {e}", current))?;
            }
            Err(error) => return Err(format!("inspecionar {:?}: {error}", current)),
        }
        let resolved = std::fs::canonicalize(&current)
            .map_err(|e| format!("resolver {:?}: {e}", current))?;
        if !resolved.starts_with(root) {
            return Err(format!("diretório escapou do destino: {:?}", current));
        }
    }
    Ok(())
}

fn clone_from_local_bank(home: &PathBuf, cid: &str) -> Option<Vec<giggs::Leaf>> {
    let hex_str = cid.strip_prefix("Qm").unwrap_or(cid);
    let plot_file = home.join("sporebank").join("plots").join(format!("{hex_str}.json"));
    let bytes = std::fs::read(&plot_file).ok()?;
    let plot: giggs::Plot = serde_json::from_slice(&bytes).ok()?;
    Some(plot.leaves)
}

fn pack_tree(dir: &PathBuf) -> Result<Vec<giggs::Leaf>, String> {
    fn skip(name: &str) -> bool {
        matches!(
            name,
            ".git" | "target" | "node_modules" | "dist" | "build" | ".cache"
                | "__pycache__" | ".venv" | "coverage" | ".data" | "graphify-out"
        )
    }
    fn sensitive_name(name: &str) -> bool {
        let lower = name.to_ascii_lowercase();
        lower == ".env"
            || lower.starts_with(".env.")
            || matches!(
                lower.as_str(),
                ".npmrc" | ".pypirc" | ".netrc" | "credentials" | "credentials.json"
                    | "id_rsa" | "id_ed25519" | "secrets.yml" | "secrets.yaml"
            )
            || lower.ends_with(".pem")
            || lower.ends_with(".key")
            || lower.ends_with(".p12")
            || lower.ends_with(".pfx")
    }
    fn contains_secret(content: &[u8]) -> bool {
        let text = String::from_utf8_lossy(content);
        let lower = text.to_ascii_lowercase();
        if lower.contains("-----begin private key-----")
            || lower.contains("-----begin rsa private key-----")
            || lower.contains("-----begin openssh private key-----")
            || text.contains("github_pat_")
            || text.contains("ghp_")
            || text.contains("AKIA")
            || text.contains("xoxb-")
        {
            return true;
        }
        text.lines().any(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return false;
            }
            let Some((key, value)) = trimmed.split_once('=').or_else(|| trimmed.split_once(':')) else {
                return false;
            };
            let key = key.trim().to_ascii_lowercase().replace('-', "_");
            let value = value.trim().trim_matches(['\'', '"']);
            let secret_key = ["password", "passwd", "secret", "api_key", "private_key", "access_key"]
                .iter()
                .any(|needle| key.contains(needle))
                || key == "token"
                || key.ends_with("_token");
            let placeholder = value.is_empty()
                || value.starts_with('$')
                || value.starts_with("{{")
                || matches!(value.to_ascii_lowercase().as_str(), "changeme" | "example" | "placeholder" | "redacted");
            secret_key && !placeholder
        })
    }
    fn walk(dir: &PathBuf, prefix: &str, out: &mut Vec<giggs::Leaf>) -> Result<(), String> {
        let entries = std::fs::read_dir(dir).map_err(|e| format!("ler {:?}: {e}", dir))?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if skip(&name) {
                continue;
            }
            let rel = if prefix.is_empty() {
                name.clone()
            } else {
                format!("{prefix}/{name}")
            };
            let path = entry.path();
            let file_type = entry
                .file_type()
                .map_err(|e| format!("inspecionar {:?}: {e}", path))?;
            if file_type.is_symlink() {
                return Err(format!("link simbólico não pode ser publicado: {rel}"));
            }
            if file_type.is_dir() {
                walk(&path, &rel, out)?;
            } else if file_type.is_file() {
                if sensitive_name(&name) {
                    return Err(format!("arquivo sensível não pode ser publicado: {rel}"));
                }
                let content = std::fs::read(&path).map_err(|e| format!("ler {:?}: {e}", path))?;
                if contains_secret(&content) {
                    return Err(format!("possível segredo detectado em: {rel}"));
                }
                out.push(giggs::Leaf { path: rel, content });
            } else {
                return Err(format!("entrada especial não pode ser publicada: {rel}"));
            }
        }
        Ok(())
    }
    let mut out = Vec::new();
    walk(dir, "", &mut out)?;
    Ok(out)
}

#[cfg(test)]
mod repo_security_tests {
    use super::*;

    fn temp_dir(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "mycelium-repo-security-{label}-{}-{}",
            std::process::id(),
            distribution_now()
        ));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn clone_rejects_traversal_and_absolute_paths() {
        let home = temp_dir("traversal");
        for path in ["../escape", "nested/../../escape", "/tmp/escape", "./file"] {
            let leaves = vec![giggs::Leaf { path: path.into(), content: b"x".to_vec() }];
            assert!(write_tree(&home, &leaves).is_err(), "accepted {path}");
        }
        std::fs::remove_dir_all(home).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn clone_rejects_symlinked_destination_components() {
        use std::os::unix::fs::symlink;
        let home = temp_dir("clone-symlink");
        let outside = temp_dir("clone-outside");
        symlink(&outside, home.join("linked")).unwrap();
        let leaves = vec![giggs::Leaf { path: "linked/file".into(), content: b"x".to_vec() }];
        assert!(write_tree(&home, &leaves).is_err());
        assert!(!outside.join("file").exists());
        std::fs::remove_dir_all(home).unwrap();
        std::fs::remove_dir_all(outside).unwrap();
    }

    #[test]
    fn pack_rejects_sensitive_names_and_secret_content() {
        let named = temp_dir("secret-name");
        std::fs::write(named.join(".env"), "SAFE=value").unwrap();
        assert!(pack_tree(&named).is_err());
        std::fs::remove_dir_all(named).unwrap();

        let content = temp_dir("secret-content");
        std::fs::write(content.join("config.txt"), "api_key = real-sensitive-value").unwrap();
        assert!(pack_tree(&content).is_err());
        std::fs::remove_dir_all(content).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn pack_rejects_symlinks_without_following_them() {
        use std::os::unix::fs::symlink;
        let home = temp_dir("pack-symlink");
        let outside = temp_dir("pack-outside");
        std::fs::write(outside.join("secret"), "not scanned through link").unwrap();
        symlink(outside.join("secret"), home.join("linked")).unwrap();
        assert!(pack_tree(&home).is_err());
        std::fs::remove_dir_all(home).unwrap();
        std::fs::remove_dir_all(outside).unwrap();
    }

    #[test]
    fn pack_allows_safe_hidden_metadata() {
        let home = temp_dir("safe-hidden");
        std::fs::write(home.join(".gitignore"), "target\n").unwrap();
        let leaves = pack_tree(&home).unwrap();
        assert_eq!(leaves.len(), 1);
        assert_eq!(leaves[0].path, ".gitignore");
        std::fs::remove_dir_all(home).unwrap();
    }
}

fn mycelium_store_list_local(home: &PathBuf) -> Result<Vec<String>, String> {
    let bank_dir = home.join("sporebank").join("plots");
    let mut ids: Vec<String> = std::fs::read_dir(&bank_dir)
        .map_err(|e| format!("abrir sporebank: {e}"))?
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.strip_suffix(".json").map(|s| s.to_string())
        })
        .collect();
    ids.sort();
    Ok(ids)
}
