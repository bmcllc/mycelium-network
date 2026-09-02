//! Seed book — bootstrap público além da LAN.
//!
//! Fontes (em ordem de merge):
//! 1. Multiaddrs embutidos / passados na CLI
//! 2. Arquivo local (`seeds.txt` no home do nó, ou `--seed-file`)
//! 3. DNS TXT (`MYCELIUM_DNS_SEEDS` / `--dns` / public bootstrap)
//! 4. URL HTTP(S) (`MYCELIUM_BOOTSTRAP_URL` ou `--public-bootstrap`)
//!
//! Formato do arquivo / TXT (uma entrada por linha ou por string TXT):
//! ```text
//! # comentário
//! /ip4/203.0.113.10/tcp/4001/p2p/12D3KooW.../raiz
//! /ip6/2001:db8::1/tcp/4001/p2p/12D3KooW.../floresta
//! /ip6/2001:db8::2/tcp/4001/p2p/12D3KooW.../esporocarp
//! mycelium=/ip6/2001:db8::1/tcp/4001/p2p/12D3KooW...
//! /dnsaddr/bootstrap.mycelium.network
//! ```
//!
//! Sufixos de membrana (`/floresta|/raiz|/folha|/esporocarp`) são opcionais
//! (legado sem flag = ordenação IPv6-first clássica).

use crate::membrane::seed_dial_rank;
use crate::HyphaeError;
use hickory_resolver::config::{ResolverConfig, ResolverOpts};
use hickory_resolver::Resolver;
use libp2p::Multiaddr;
use mycelium_core::Membrane;
use std::collections::BTreeMap;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// URL padrão do catálogo público (sobrescrevível).
pub const DEFAULT_BOOTSTRAP_URL: &str =
    "https://raw.githubusercontent.com/bmcc-DEV/mycelium-network/main/seeds/mainnet.txt";

/// Nome DNS TXT padrão do Spore Bank (DuckDNS / HE / Cloudflare).
pub const DEFAULT_DNS_SEED_NAME: &str = "_mycelium.seeds.duckdns.org";

/// Separates multiaddr from optional membrane suffix.
pub fn split_membrane_suffix(raw: &str) -> (&str, Option<Membrane>) {
    for (suf, m) in [
        ("/esporocarp", Membrane::Esporocarp),
        ("/floresta", Membrane::Floresta),
        ("/raiz", Membrane::Raiz),
        ("/folha", Membrane::Folha),
    ] {
        if let Some(rest) = raw.strip_suffix(suf) {
            return (rest, Some(m));
        }
    }
    (raw, None)
}

/// Anexa flag de membrana a uma multiaddr (Spore Bank publish).
pub fn with_membrane_flag(multiaddr: &str, membrane: Membrane) -> String {
    let (base, _) = split_membrane_suffix(multiaddr.trim());
    format!("{base}{}", membrane.seed_suffix())
}

/// Tempo de vida padrão de uma seed sem confirmação de vida (7 dias).
const SEED_TTL: Duration = Duration::from_secs(7 * 24 * 3600);
/// Intervalo mínimo entre health checks da mesma seed (1 hora).
const SEED_HEALTH_MIN_INTERVAL: Duration = Duration::from_secs(3600);

/// Entrada de seed com metadados de vida.
#[derive(Debug, Clone)]
pub struct SeedEntry {
    pub addr: String,           // multiaddr com flag de membrana opcional
    pub first_seen: u64,        // unix secs
    pub last_seen: u64,         // unix secs (atualizado em health check OK)
    pub source: SeedSource,     // origem da seed
    pub health_failures: u32,   // falhas consecutivas de health check
}

/// Origem da seed para priorização.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeedSource {
    Cli,        // passada na CLI (alta confiança)
    LocalFile,  // seeds.txt no home
    DnsTxt,     // DNS TXT (Spore Bank)
    HttpCatalog,// catálogo HTTP público
    Gossip,     // recebida via gossip de peer (baixa confiança inicial)
}

/// Livro de sementes descentralizado: peers com TTL, health check e merge via gossip.
#[derive(Debug, Clone, Default)]
pub struct SeedBook {
    /// Entradas com metadados de vida.
    seeds: BTreeMap<String, SeedEntry>,
}

impl SeedBook {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn len(&self) -> usize {
        self.seeds.len()
    }

    pub fn is_empty(&self) -> bool {
        self.seeds.is_empty()
    }

    pub fn add(&mut self, addr: impl AsRef<str>) -> Result<(), HyphaeError> {
        self.add_with_source(addr, SeedSource::Cli)
    }

    /// Adiciona seed com fonte explícita (usado por merge de gossip).
    pub fn add_with_source(&mut self, addr: impl AsRef<str>, source: SeedSource) -> Result<(), HyphaeError> {
        let mut s = addr.as_ref().trim().to_string();
        if s.is_empty() || s.starts_with('#') {
            return Ok(());
        }
        if let Some(rest) = s.strip_prefix("mycelium=") {
            s = rest.trim().to_string();
        }
        let (base, flag) = split_membrane_suffix(&s);
        let _: Multiaddr = base
            .parse()
            .map_err(|e| HyphaeError::Addr(format!("{base}: {e}")))?;
        let stored = if let Some(m) = flag {
            with_membrane_flag(base, m)
        } else {
            base.to_string()
        };
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let entry = self.seeds.entry(stored.clone()).or_insert(SeedEntry {
            addr: stored,
            first_seen: now,
            last_seen: now,
            source,
            health_failures: 0,
        });
        entry.last_seen = now;
        // Fonte CLI/LocalFile sobrepõe Gossip; outras mantêm a mais confiável
        if matches!(source, SeedSource::Cli | SeedSource::LocalFile)
            || entry.source == SeedSource::Gossip && !matches!(source, SeedSource::Gossip) {
            entry.source = source;
        }
        Ok(())
    }

    pub fn extend_str<I, S>(&mut self, iter: I) -> Result<(), HyphaeError>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        for s in iter {
            self.add_with_source(s, SeedSource::LocalFile)?;
        }
        Ok(())
    }

    /// Carrega linhas de um arquivo texto (fonte LocalFile).
    pub fn load_file(&mut self, path: impl AsRef<Path>) -> Result<usize, HyphaeError> {
        let path = path.as_ref();
        if !path.exists() {
            return Ok(0);
        }
        let text = std::fs::read_to_string(path)
            .map_err(|e| HyphaeError::Addr(format!("lendo {}: {e}", path.display())))?;
        let before = self.seeds.len();
        self.parse_text_with_source(&text, SeedSource::LocalFile)?;
        Ok(self.seeds.len() - before)
    }

    /// Persiste o livro em disco (apenas addr, sem metadados internos).
    pub fn save_file(&self, path: impl AsRef<Path>) -> Result<(), HyphaeError> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| HyphaeError::Addr(e.to_string()))?;
        }
        let mut body = String::from("# Mycelium seed book\n");
        for entry in self.seeds.values() {
            body.push_str(&entry.addr);
            body.push('\n');
        }
        std::fs::write(path, body).map_err(|e| HyphaeError::Addr(e.to_string()))?;
        Ok(())
    }

    pub fn parse_text(&mut self, text: &str) -> Result<(), HyphaeError> {
        self.parse_text_with_source(text, SeedSource::LocalFile)
    }

    /// Parse com fonte explícita (usado por load_file e merge de gossip).
    pub fn parse_text_with_source(&mut self, text: &str, source: SeedSource) -> Result<(), HyphaeError> {
        for line in text.lines() {
            self.add_with_source(line, source)?;
        }
        Ok(())
    }

    /// Baixa um catálogo HTTP(S) de seeds (fonte HttpCatalog).
    /// Roda em thread OS própria (reqwest blocking não pode nestar no Tokio do daemon).
    pub fn fetch_url(&mut self, url: &str) -> Result<usize, HyphaeError> {
        let url = url.to_string();
        let text = std::thread::spawn(move || -> Result<String, HyphaeError> {
            let client = reqwest::blocking::Client::builder()
                .timeout(std::time::Duration::from_secs(15))
                .user_agent("mycelium-seedbook/0.1")
                .build()
                .map_err(|e| HyphaeError::Addr(e.to_string()))?;
            client
                .get(&url)
                .send()
                .and_then(|r| r.error_for_status()?.text())
                .map_err(|e| HyphaeError::Addr(format!("bootstrap url {url}: {e}")))
        })
        .join()
        .map_err(|_| HyphaeError::Addr("fetch_url thread panicked".into()))??;
        let before = self.seeds.len();
        self.parse_text_with_source(&text, SeedSource::HttpCatalog)?;
        Ok(self.seeds.len() - before)
    }

    /// Resolve registros TXT e importa multiaddrs (fonte DnsTxt).
    /// Funciona para QUALQUER domínio, não só Spore Bank — qualquer nó pode publicar seeds.
    /// Hickory `Resolver::new` sobe um runtime Tokio — não pode correr no runtime do daemon.
    pub fn fetch_dns_txt(&mut self, name: &str) -> Result<usize, HyphaeError> {
        let name = name.to_string();
        let blobs = std::thread::spawn(move || -> Result<Vec<String>, HyphaeError> {
            let resolver = Resolver::new(ResolverConfig::default(), ResolverOpts::default())
                .map_err(|e| HyphaeError::Addr(format!("dns resolver: {e}")))?;
            let response = resolver
                .txt_lookup(name.as_str())
                .map_err(|e| HyphaeError::Addr(format!("dns TXT {name}: {e}")))?;
            let mut out = Vec::new();
            for record in response.iter() {
                let text: String = record
                    .txt_data()
                    .iter()
                    .map(|b| String::from_utf8_lossy(b).into_owned())
                    .collect::<Vec<_>>()
                    .join("");
                out.push(text);
            }
            Ok(out)
        })
        .join()
        .map_err(|_| HyphaeError::Addr("fetch_dns_txt thread panicked".into()))??;

        let before = self.seeds.len();
        for text in blobs {
            for part in text.split(|c: char| c == '\n' || c == ';' || c == ',') {
                let _ = self.add_with_source(part.trim(), SeedSource::DnsTxt);
            }
        }
        Ok(self.seeds.len() - before)
    }

    /// Publica uma multiaddr no DuckDNS TXT (`DUCKDNS_TOKEN` + domain).
    /// Também em thread OS (chamável via spawn_blocking ou sync).
    pub fn publish_duckdns_txt(domain: &str, token: &str, multiaddr: &str) -> Result<(), HyphaeError> {
        let domain = domain.to_string();
        let token = token.to_string();
        let multiaddr = multiaddr.to_string();
        std::thread::spawn(move || -> Result<(), HyphaeError> {
            let client = reqwest::blocking::Client::builder()
                .timeout(std::time::Duration::from_secs(15))
                .user_agent("mycelium-sporocarp/0.1")
                .build()
                .map_err(|e| HyphaeError::Addr(e.to_string()))?;
            let domain = domain
                .trim()
                .trim_end_matches(".duckdns.org")
                .trim_end_matches('.');
            let body = client
                .get("https://www.duckdns.org/update")
                .query(&[
                    ("domains", domain),
                    ("token", token.as_str()),
                    ("txt", multiaddr.as_str()),
                    ("verbose", "true"),
                ])
                .send()
                .and_then(|r| r.error_for_status()?.text())
                .map_err(|e| HyphaeError::Addr(format!("duckdns: {e}")))?;
            if body.to_ascii_lowercase().contains("ok") {
                tracing::info!(%domain, "DuckDNS TXT atualizado (spore bank)");
                Ok(())
            } else {
                Err(HyphaeError::Addr(format!("duckdns resposta: {body}")))
            }
        })
        .join()
        .map_err(|_| HyphaeError::Addr("publish_duckdns_txt thread panicked".into()))?
    }

    /// Multiaddrs para dial, filtrados/ordenados pela membrana local.
    /// Ignora seeds expiradas (TTL).
    pub fn multiaddrs_for(&self, local: Membrane) -> Vec<Multiaddr> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let mut ranked: Vec<(u8, Multiaddr)> = Vec::new();
        for entry in self.seeds.values() {
            if now - entry.last_seen > SEED_TTL.as_secs() {
                continue; // seed expirada
            }
            let (base, remote) = split_membrane_suffix(&entry.addr);
            let Some(rank) = seed_dial_rank(local, remote) else {
                continue;
            };
            if let Ok(addr) = base.parse::<Multiaddr>() {
                ranked.push((rank, addr));
            }
        }
        ranked.sort_by(|a, b| {
            a.0.cmp(&b.0)
                .then_with(|| crate::addr_family_rank(&a.1).cmp(&crate::addr_family_rank(&b.1)))
                .then_with(|| a.1.to_string().cmp(&b.1.to_string()))
        });
        ranked.into_iter().map(|(_, a)| a).collect()
    }

    /// Multiaddrs prontos para dial (legado: IPv6 primeiro, sem filtro de folha).
    pub fn multiaddrs(&self) -> Vec<Multiaddr> {
        self.multiaddrs_for(Membrane::Floresta)
    }

    /// Retorna apenas os endereços brutos (para persistência/debug).
    pub fn as_strings(&self) -> Vec<String> {
        self.seeds.values().map(|e| e.addr.clone()).collect()
    }

    /// Merge descentralizado: recebe seeds de peer via gossip e mescla.
    /// Fontes Gossip têm prioridade menor que CLI/LocalFile/DnsTxt/HttpCatalog.
    /// Retorna número de seeds novas adicionadas.
    pub fn merge_gossip(&mut self, peer_seeds: &[String]) -> Result<usize, HyphaeError> {
        let before = self.seeds.len();
        for s in peer_seeds {
            self.add_with_source(s, SeedSource::Gossip)?;
        }
        Ok(self.seeds.len() - before)
    }

    /// Executa health check em todas as seeds (dial TCP rápido).
    /// Atualiza last_seen em sucesso; incrementa health_failures em falha.
    /// Remove seeds com >3 falhas consecutivas OU TTL expirado.
    /// Deve rodar periodicamente (ex.: a cada 1h no organismo).
    pub fn health_check(&mut self) -> Result<usize, HyphaeError> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let mut checked = 0;
        let mut to_remove = Vec::new();

        for (addr, entry) in &mut self.seeds {
            // Rate limit: não checar a mesma seed mais que 1x/hora
            if now - entry.last_seen < SEED_HEALTH_MIN_INTERVAL.as_secs() {
                continue;
            }
            // Pula seeds expiradas por TTL
            if now - entry.last_seen > SEED_TTL.as_secs() {
                to_remove.push(addr.clone());
                continue;
            }
            checked += 1;
            let (base, _) = split_membrane_suffix(&entry.addr);
            if let Ok(multiaddr) = base.parse::<Multiaddr>() {
                // Tenta dial rápido (5s timeout) - só testa alcançabilidade
                if health_dial(&multiaddr).is_ok() {
                    entry.last_seen = now;
                    entry.health_failures = 0;
                } else {
                    entry.health_failures += 1;
                    if entry.health_failures >= 3 {
                        to_remove.push(addr.clone());
                    }
                }
            }
        }
        for addr in to_remove {
            self.seeds.remove(&addr);
        }
        Ok(checked)
    }

    /// Remove seeds expiradas (TTL) sem fazer health check.
    /// Chamado na inicialização e no tick periódico.
    pub fn prune_expired(&mut self) -> usize {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let before = self.seeds.len();
        self.seeds.retain(|_, e| now - e.last_seen <= SEED_TTL.as_secs());
        before - self.seeds.len()
    }

    /// AlertManager acende um alerta sobre uma seed: registra uma falha
    /// de saúde (alertmanager observou `MyceliumSemVizinhos`/`ExportadorMorto`
    /// por exemplo). Não remove a seed diretamente — acumula falhas até que o
    /// `health_check` ou o `resolved` limpe. Idempotente.
    pub fn record_alert(&mut self, addr: &str) {
        if let Some(entry) = self.seeds.get_mut(addr) {
            entry.health_failures = entry.health_failures.saturating_add(1);
        }
    }

    /// AlertManager resolve um alerta: limpa as falhas acumuladas de uma seed
    /// (o problema desapareceu).
    pub fn clear_alert(&mut self, addr: &str) {
        if let Some(entry) = self.seeds.get_mut(addr) {
            entry.health_failures = 0;
            entry.last_seen = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
        }
    }

/// Normaliza uma seed `instance`/`addr` para a forma `ip:porta`, de modo
/// que o `instance` label do AlertManager (`1.2.3.4:4001`) casse com o
/// multiaddr da seed (`/ip4/1.2.3.4/tcp/4001`).
fn normalize_instance(s: &str) -> String {
    let s = s.trim();
    // Multiaddr: /ip4/1.2.3.4/tcp/4001 → 1.2.3.4:4001
    let cleaned = s.replace("/ip4/", " ").replace("/ip6/", " ").replace("/tcp/", ":").replace("/quic-v1/", ":").trim().to_string();
    // Se ainda tem barra (outro formato), devolve como fallback lowercased.
    let cleaned = cleaned.split_whitespace().next().unwrap_or(cleaned.as_str()).to_string();
    cleaned
}

/// Processa um webhook payload do AlertManager (formato
/// `WebhookHandler`: `{ receiver, status, alerts: [{status,labels,...}] }`).
/// Cada alerta é casado com a seed cujo `addr` normaliza-para `ip:port`
/// compatível com o `instance` label. Retorna o número de alerts aplicados.
/// Fonte: recebido pelo `POST /seedwebhook` no Event Horizon.
    pub fn ingest_alert_payload(&mut self, json: &[u8]) -> Result<usize, HyphaeError> {
        #[derive(serde::Deserialize)]
        struct AlertLabel {
            instance: Option<String>,
        }
        #[derive(serde::Deserialize)]
        struct Alert {
            status: String,
            labels: AlertLabel,
        }
        #[derive(serde::Deserialize)]
        struct WebhookPayload {
            #[allow(dead_code)]
            receiver: String,
            #[allow(dead_code)]
            status: String,
            alerts: Vec<Alert>,
        }
        let parsed: WebhookPayload = serde_json::from_slice(json)
            .map_err(|e| HyphaeError::Addr(format!("alert webhook JSON inválido: {e}")))?;
        let mut applied = 0usize;
        for a in &parsed.alerts {
            if let Some(instance_raw) = &a.labels.instance {
                let inst = Self::normalize_instance(instance_raw);
                // Match: o instance contém o ip:port da seed ou vice-versa.
                let matched = self.seeds.keys().any(|seed_addr| {
                    let s = Self::normalize_instance(seed_addr);
                    inst.contains(&s) || s.contains(&inst)
                });
                if matched {
                    let targets: Vec<String> = self
                        .seeds
                        .keys()
                        .filter(|seed_addr| {
                            let s = Self::normalize_instance(seed_addr);
                            inst.contains(&s) || s.contains(&inst)
                        })
                        .cloned()
                        .collect();
                    for addr in &targets {
                        if a.status == "firing" {
                            self.record_alert(addr);
                        } else {
                            self.clear_alert(addr);
                        }
                    }
                    applied += targets.len();
                }
            }
        }
        Ok(applied)
    }

    /// Persiste um feed de saúde (alerts do AlertManager) como JSONL em
    /// `{home}/seeds.health.jsonl` — lido de volta por `load_health_feed`.
    /// Permite que o organismo/seed book consome alerts externos sem acoplar
    /// o receptor HTTP ao SeedBook em memória.
    pub fn write_health_feed(home: &Path, json_lines: &str) -> Result<(), HyphaeError> {
        let path = home.join("seeds.health.jsonl");
        std::fs::create_dir_all(home).map_err(|e| HyphaeError::Addr(e.to_string()))?;
        std::fs::write(&path, json_lines).map_err(|e| HyphaeError::Addr(e.to_string()))?;
        Ok(())
    }

    /// Carrega e aplica alerts do feed `{home}/seeds.health.jsonl`.
    pub fn load_health_feed(&mut self, home: &Path) -> Result<usize, HyphaeError> {
        let path = home.join("seeds.health.jsonl");
        if !path.exists() {
            return Ok(0);
        }
        let text = std::fs::read_to_string(&path)
            .map_err(|e| HyphaeError::Addr(e.to_string()))?;
        let mut total = 0;
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            total += self.ingest_alert_payload(line.as_bytes())?;
        }
        if total > 0 {
            tracing::info!(applied = total, "alerts do feed de saúde aplicados ao seed book");
        }
        Ok(total)
    }

    /// Serializa seeds para envio via gossip (apenas addr strings).
    pub fn to_gossip_payload(&self) -> Vec<String> {
        self.seeds.values().map(|e| e.addr.clone()).collect()
    }

    /// Monta o livro a partir das fontes padrão do nó.
    /// Agora também faz prune de seeds expiradas e health check inicial.
    pub fn assemble(
        home: &Path,
        cli_seeds: &[String],
        seed_file: Option<&Path>,
        public_bootstrap: bool,
        bootstrap_url: Option<&str>,
    ) -> Result<Self, HyphaeError> {
        let mut book = SeedBook::new();
        book.extend_str(cli_seeds.iter().map(|s| s.as_str()))?;

        let home_seeds = home.join("seeds.txt");
        book.load_file(&home_seeds)?;

        if let Some(path) = seed_file {
            book.load_file(path)?;
        }

        // Prune seeds expiradas do disco
        book.prune_expired();

        let dns_name = std::env::var("MYCELIUM_DNS_SEEDS").ok();
        if public_bootstrap || dns_name.is_some() {
            let name = dns_name
                .as_deref()
                .unwrap_or(DEFAULT_DNS_SEED_NAME);
            match book.fetch_dns_txt(name) {
                Ok(n) => tracing::info!(%name, added = n, "DNS TXT Spore Bank carregado"),
                Err(e) => tracing::warn!(%name, "DNS TXT Spore Bank: {e}"),
            }
        }

        if public_bootstrap {
            let url = bootstrap_url.unwrap_or(DEFAULT_BOOTSTRAP_URL);
            match book.fetch_url(url) {
                Ok(n) => tracing::info!(%url, added = n, "catálogo público de seeds carregado"),
                Err(e) => tracing::warn!(%url, "falha ao buscar seeds públicos: {e}"),
            }
        } else if let Ok(url) = std::env::var("MYCELIUM_BOOTSTRAP_URL") {
            match book.fetch_url(&url) {
                Ok(n) => tracing::info!(%url, added = n, "MYCELIUM_BOOTSTRAP_URL carregada"),
                Err(e) => tracing::warn!(%url, "MYCELIUM_BOOTSTRAP_URL falhou: {e}"),
            }
        }

        // Health check inicial das seeds carregadas
        let _ = book.health_check();

        Ok(book)
    }
}

/// Tenta dial TCP rápido (5s) em qualquer endereço da multiaddr.
/// Retorna Ok se pelo menos um endereço conectar.
pub fn health_dial(multiaddr: &Multiaddr) -> Result<(), HyphaeError> {
    use std::net::{IpAddr, SocketAddr};
    use std::time::Duration;

    // Extrai IP e porta da multiaddr (formato típico: /ip4/X/tcp/P ou /ip6/X/tcp/P)
    let addr_str = multiaddr.to_string();
    let parts: Vec<&str> = addr_str.split('/').collect();
    let mut ip: Option<IpAddr> = None;
    let mut port: Option<u16> = None;
    for i in 0..parts.len() {
        match parts.get(i) {
            Some(&"ip4") if i + 1 < parts.len() => {
                if let Ok(parsed) = parts[i + 1].parse::<std::net::Ipv4Addr>() {
                    ip = Some(IpAddr::V4(parsed));
                }
            }
            Some(&"ip6") if i + 1 < parts.len() => {
                if let Ok(parsed) = parts[i + 1].parse::<std::net::Ipv6Addr>() {
                    ip = Some(IpAddr::V6(parsed));
                }
            }
            Some(&"tcp") if i + 1 < parts.len() => {
                if let Ok(parsed) = parts[i + 1].parse::<u16>() {
                    port = Some(parsed);
                }
            }
            Some(&"udp") if i + 1 < parts.len() => {
                if let Ok(parsed) = parts[i + 1].parse::<u16>() {
                    port = Some(parsed);
                }
            }
            _ => {}
        }
    }
    let Some(ip) = ip else { return Err(HyphaeError::Addr("sem IP na multiaddr".into())) };
    let Some(port) = port else { return Err(HyphaeError::Addr("sem porta na multiaddr".into())) };

    let socket = SocketAddr::new(ip, port);
    std::net::TcpStream::connect_timeout(&socket, Duration::from_secs(5))
        .map(|_| ())
        .map_err(|e| HyphaeError::Addr(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_seed_file_ignoring_comments() {
        let mut book = SeedBook::new();
        book.parse_text("# hi\n\n/dnsaddr/bootstrap.mycelium.network\n")
            .unwrap();
        assert_eq!(book.len(), 1);
    }

    #[test]
    fn accepts_mycelium_prefix_and_ipv6_sort() {
        let mut book = SeedBook::new();
        book.add("/ip4/203.0.113.1/tcp/4001").unwrap();
        book.add("/ip6/2001:db8::1/tcp/4001").unwrap();
        let addrs = book.multiaddrs();
        assert!(addrs[0].to_string().starts_with("/ip6/"));
    }

    #[test]
    fn accepts_dnsaddr() {
        let mut book = SeedBook::new();
        book.add("/dnsaddr/bootstrap.mycelium.network").unwrap();
        assert_eq!(book.len(), 1);
    }

    #[test]
    fn parse_txt_blob() {
        let mut book = SeedBook::new();
        book.parse_text("mycelium=/ip4/9.9.9.9/tcp/1\n/ip6/::1/tcp/2\n")
            .unwrap();
        assert_eq!(book.len(), 2);
    }

    #[test]
    fn membrane_flags_parse_and_filter() {
        let mut book = SeedBook::new();
        book.add("/ip6/2001:db8::1/tcp/4001/floresta").unwrap();
        book.add("/ip4/203.0.113.5/tcp/4001/raiz").unwrap();
        book.add("/ip4/198.51.100.1/tcp/4001/folha").unwrap();
        book.add("/ip6/2001:db8::2/tcp/4001/esporocarp").unwrap();

        let for_folha = book.multiaddrs_for(Membrane::Folha);
        assert!(for_folha.iter().all(|a| {
            let s = a.to_string();
            !s.contains("198.51.100.1")
        }));
        assert!(for_folha[0].to_string().contains("2001:db8::2"));

        let for_floresta = book.multiaddrs_for(Membrane::Floresta);
        assert!(for_floresta[0].to_string().contains("2001:db8::1"));
        assert!(!for_floresta.iter().any(|a| a.to_string().contains("198.51.100.1")));
    }

    #[test]
    fn with_flag_roundtrip() {
        let s = with_membrane_flag("/ip6/2001:db8::1/tcp/4001", Membrane::Esporocarp);
        assert_eq!(s, "/ip6/2001:db8::1/tcp/4001/esporocarp");
        let (base, m) = split_membrane_suffix(&s);
        assert_eq!(base, "/ip6/2001:db8::1/tcp/4001");
        assert_eq!(m, Some(Membrane::Esporocarp));
    }

    #[test]
    fn source_tracking_works() {
        let mut book = SeedBook::new();
        book.add_with_source("/ip4/1.2.3.4/tcp/4001", SeedSource::DnsTxt).unwrap();
        book.add_with_source("/ip4/1.2.3.4/tcp/4001", SeedSource::Gossip).unwrap();
        // Já existe; a fonte mais confiável (DnsTxt) deve permanecer.
        let entry = book.seeds.values().next().unwrap();
        assert_eq!(entry.source, SeedSource::DnsTxt);
    }

    #[test]
    fn gossip_merge_adds_new_seeds_without_overwriting_confidence() {
        let mut book = SeedBook::new();
        book.add_with_source("/ip4/1.2.3.4/tcp/4001", SeedSource::Cli).unwrap();
        let new_seeds = vec![
            "/ip4/1.2.3.4/tcp/4001".to_string(), // já existe (Cli)
            "/ip4/5.6.7.8/tcp/4001".to_string(), // nova
        ];
        let added = book.merge_gossip(&new_seeds).unwrap();
        assert_eq!(added, 1, "só a nova deve ser adicionada");
        assert_eq!(book.len(), 2);
        // A seed existente mantém a fonte Cli (não rebaixada por gossip).
        assert_eq!(
            book.seeds.values().find(|e| e.addr.contains("1.2.3.4")).unwrap().source,
            SeedSource::Cli
        );
        // A nova seed é fonte Gossip.
        assert_eq!(
            book.seeds.values().find(|e| e.addr.contains("5.6.7.8")).unwrap().source,
            SeedSource::Gossip
        );
    }

    #[test]
    fn to_gossip_payload_round_trips() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.add("/ip6/::1/tcp/4001").unwrap();
        let payload = book.to_gossip_payload();
        let mut other = SeedBook::new();
        let added = other.merge_gossip(&payload).unwrap();
        assert_eq!(added, 2);
        assert_eq!(other.len(), 2);
    }

    #[test]
    fn prune_expired_removes_stale() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.add("/ip4/5.6.7.8/tcp/4001").unwrap();
        // Re-baixar last_seen de uma seed para forçar expiração
        let entry = book.seeds.values_mut().next().unwrap();
        entry.last_seen = entry.first_seen; // já vai expirar
        // Mas prune_expired só remove se now - last_seen > TTL.
        // Manipulamos para o passado distante:
        entry.last_seen = 0;
        let removed = book.prune_expired();
        assert!(removed >= 1);
    }

    #[test]
    fn multiaddrs_skip_expired_seeds() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        let entry = book.seeds.values_mut().next().unwrap();
        entry.last_seen = 0; // expirada
        let addrs = book.multiaddrs_for(Membrane::Floresta);
        assert!(addrs.is_empty(), "seed expirada não deve aparecer");
    }

    #[test]
    fn health_dial_rejects_invalid_multiaddr() {
        // /dnsaddr não tem IP/porta, deve falhar.
        let addr: Multiaddr = "/dnsaddr/foo.bar".parse().unwrap();
        assert!(health_dial(&addr).is_err());
    }

    // ── Seed-book webhook (AlertManager → SeedBook) ──────────────────

    #[test]
    fn record_alert_increments_health_failures() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.record_alert("/ip4/1.2.3.4/tcp/4001");
        book.record_alert("/ip4/1.2.3.4/tcp/4001");
        let entry = book.seeds.values().next().unwrap();
        assert_eq!(entry.health_failures, 2);
    }

    #[test]
    fn clear_alert_resets_failures() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.record_alert("/ip4/1.2.3.4/tcp/4001");
        book.clear_alert("/ip4/1.2.3.4/tcp/4001");
        let entry = book.seeds.values().next().unwrap();
        assert_eq!(entry.health_failures, 0);
    }

    #[test]
    fn record_alert_unknown_seed_is_noop() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        // seed não cadastrada: não deve panicar, nem alterar nada
        book.record_alert("/ip4/9.9.9.9/tcp/4001");
        let entry = book.seeds.values().next().unwrap();
        assert_eq!(entry.health_failures, 0);
    }

    // Payload AlertManager WebhookHandler: {receiver,status,alerts:[{status,labels:{instance}}]}
    #[test]
    fn ingest_alert_payload_matches_instance_to_seed() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.add("/ip4/5.6.7.8/tcp/4001").unwrap();
        let payload = r#"{"receiver":"mycelium","status":"firing","alerts":[{"status":"firing","labels":{"instance":"1.2.3.4:4001","alertname":"MyceliumSemVizinhos","severity":"critical"}}]}"#;
        let applied = book.ingest_alert_payload(payload.as_bytes()).unwrap();
        assert_eq!(applied, 1, "apenas a seed 1.2.3.4 deve ser marcada");
        // 1.2.3.4 marcada, 5.6.7.8 imune.
        let s1 = book.seeds.get("/ip4/1.2.3.4/tcp/4001").unwrap();
        let s2 = book.seeds.get("/ip4/5.6.7.8/tcp/4001").unwrap();
        assert_eq!(s1.health_failures, 1);
        assert_eq!(s2.health_failures, 0);
    }

    #[test]
    fn ingest_alert_payload_resolved_clears_failures() {
        let mut book = SeedBook::new();
        book.add("/ip4/1.2.3.4/tcp/4001").unwrap();
        book.record_alert("/ip4/1.2.3.4/tcp/4001");
        let payload = r#"{"receiver":"mycelium","status":"resolved","alerts":[{"status":"resolved","labels":{"instance":"1.2.3.4:4001"}}]}"#;
        let applied = book.ingest_alert_payload(payload.as_bytes()).unwrap();
        assert_eq!(applied, 1);
        let entry = book.seeds.values().next().unwrap();
        assert_eq!(entry.health_failures, 0);
    }

    #[test]
    fn ingest_alert_payload_rejects_malformed_json() {
        let mut book = SeedBook::new();
        assert!(book.ingest_alert_payload(b"not json").is_err());
        assert!(book.ingest_alert_payload(b"").is_err());
    }
}
