//! # Singularity — Roteamento por gravidade
//!
//! O **Event Horizon** é a fronteira do micélio: requisições HTTP do mundo
//! externo entram aqui e são proxyadas por **rizomorfos** até o upstream
//! da Chamber com maior gravidade.

mod proxy;

pub use proxy::{serve_horizon, HorizonHandle};

use mycelium_core::NodeId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};

#[derive(Debug, thiserror::Error)]
pub enum SingularityError {
    #[error("nenhum ion orbita o host {0}")]
    NoOrbit(String),
    #[error("ion {0} sem upstream")]
    NoUpstream(String),
}

/// Um backend registrado no horizonte: um Ion do Plasma acessível.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Orbit {
    pub ion: String,
    pub node: NodeId,
    /// Capacidade disponível (quanto maior, mais gravidade).
    pub mass: u64,
    /// Latência fisiológica em "biossegundos" (quanto menor, melhor).
    pub resistance: u64,
    /// URL da Chamber (ex.: `http://127.0.0.1:41234`).
    #[serde(default)]
    pub upstream: String,
}

impl Orbit {
    pub fn gravity(&self) -> f64 {
        self.mass as f64 / (1.0 + self.resistance as f64)
    }
}

/// Tabela de roteamento compartilhada com o proxy HTTP.
pub type HorizonTable = Arc<RwLock<EventHorizon>>;

/// A fronteira do micélio: mapeia hosts/ions para órbitas internas.
#[derive(Debug, Default)]
pub struct EventHorizon {
    /// host lógico → órbitas (ex.: `sporocarp.mycelium/abc123`)
    orbits: HashMap<String, Vec<Orbit>>,
    /// ion name → réplicas orbitando (com balanceamento por gravidade)
    by_ion: HashMap<String, Vec<Orbit>>,
    /// Snapshot de métricas Prometheus (atualizado pelo organismo).
    metrics: String,
    /// Caminho do home do nó (para acessar SporeBank nas rotas CDN).
    home: Option<PathBuf>,
    /// Requisições proxyadas por ion na janela corrente (drenadas pelo
    /// organismo a cada tick de scaling → Plasma `sense`).
    ion_requests: HashMap<String, u64>,
    /// Catálogo JSON de ions: locais + peer_ions via gossip.
    /// O organismo injeta peer_ions a cada tick via `set_peer_ions`.
    peer_ions: HashMap<String, Vec<String>>,
    /// Contador de visitas à console ErgotOS — gatilha auto-semeadura
    /// (efeito manada sem intervencção humana).
    console_hits: AtomicU64,
}

impl EventHorizon {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn shared() -> HorizonTable {
        Arc::new(RwLock::new(Self::new()))
    }

    /// Expõe um Ion sob um host externo e indexa por nome do ion com suporte a múltiplas órbitas.
    pub fn expose(&mut self, host: impl Into<String>, orbit: Orbit) {
        let host = host.into();
        let ion_orbits = self.by_ion.entry(orbit.ion.clone()).or_default();
        ion_orbits.retain(|o| o.node != orbit.node);
        ion_orbits.push(orbit.clone());

        let host_orbits = self.orbits.entry(host).or_default();
        host_orbits.retain(|o| o.node != orbit.node || o.ion != orbit.ion);
        host_orbits.push(orbit);
    }

    pub fn route(&self, host: &str) -> Result<&Orbit, SingularityError> {
        self.orbits
            .get(host)
            .and_then(|orbits| {
                orbits.iter().max_by(|a, b| {
                    a.gravity()
                        .partial_cmp(&b.gravity())
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
            })
            .ok_or_else(|| SingularityError::NoOrbit(host.to_string()))
    }

    /// Roteia pelo nome do Ion (path `/webapp/...`) selecionando a réplica de maior gravidade.
    pub fn route_ion(&self, ion: &str) -> Result<&Orbit, SingularityError> {
        self.by_ion
            .get(ion)
            .and_then(|orbits| {
                orbits.iter().max_by(|a, b| {
                    a.gravity()
                        .partial_cmp(&b.gravity())
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
            })
            .ok_or_else(|| SingularityError::NoOrbit(ion.to_string()))
    }

    /// Réplicas candidatas em ordem decrescente de gravidade. O proxy só deve
    /// tentar outra réplica em métodos de leitura, nunca reenviar POST/PUT.
    pub fn route_ion_candidates(&self, ion: &str) -> Result<Vec<Orbit>, SingularityError> {
        let mut candidates = self
            .by_ion
            .get(ion)
            .cloned()
            .ok_or_else(|| SingularityError::NoOrbit(ion.to_string()))?;
        candidates.retain(|orbit| !orbit.upstream.is_empty());
        candidates.sort_by(|a, b| {
            b.gravity()
                .partial_cmp(&a.gravity())
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.node.cmp(&b.node))
        });
        if candidates.is_empty() {
            return Err(SingularityError::NoUpstream(ion.to_string()));
        }
        Ok(candidates)
    }

    pub fn collapse(&mut self, node: &NodeId) {
        for orbits in self.orbits.values_mut() {
            orbits.retain(|o| &o.node != node);
        }
        self.orbits.retain(|_, orbits| !orbits.is_empty());
        for orbits in self.by_ion.values_mut() {
            orbits.retain(|o| &o.node != node);
        }
        self.by_ion.retain(|_, orbits| !orbits.is_empty());
    }

    /// Remove apenas a réplica expirada de um Ion, preservando outros Ions
    /// ainda saudáveis no mesmo nó (heartbeats são por par Ion/NodeId).
    pub fn collapse_ion_node(&mut self, ion: &str, node: &NodeId) {
        for orbits in self.orbits.values_mut() {
            orbits.retain(|o| o.ion != ion || &o.node != node);
        }
        self.orbits.retain(|_, orbits| !orbits.is_empty());
        let mut empty = false;
        if let Some(orbits) = self.by_ion.get_mut(ion) {
            orbits.retain(|o| &o.node != node);
            empty = orbits.is_empty();
        }
        if empty {
            self.by_ion.remove(ion);
        }
    }

    pub fn remove_ion(&mut self, ion: &str) {
        self.by_ion.remove(ion);
        for orbits in self.orbits.values_mut() {
            orbits.retain(|o| o.ion != ion);
        }
        self.orbits.retain(|_, orbits| !orbits.is_empty());
    }

    pub fn hosts(&self) -> impl Iterator<Item = &String> {
        self.orbits.keys()
    }

    pub fn ions(&self) -> impl Iterator<Item = &String> {
        self.by_ion.keys()
    }

    pub fn ion_upstreams(&self) -> Vec<(String, String)> {
        let mut list = Vec::new();
        for (k, orbits) in &self.by_ion {
            if let Some(best) = orbits.iter().max_by(|a, b| {
                a.gravity()
                    .partial_cmp(&b.gravity())
                    .unwrap_or(std::cmp::Ordering::Equal)
            }) {
                list.push((k.clone(), best.upstream.clone()));
            }
        }
        list
    }

    /// Snapshot de métricas para Prometheus (atualizado pelo organismo).
    pub fn metrics_snapshot(&self) -> &str {
        &self.metrics
    }

    /// Conta uma requisição proxyada para o ion (chamado pelo rizomorfo).
    pub fn note_request(&mut self, ion: &str) {
        *self.ion_requests.entry(ion.to_string()).or_insert(0) += 1;
    }

    /// Drena os contadores da janela (zera) — o organismo converte em
    /// req/s e alimenta `Ion::sense` do Plasma.
    pub fn take_request_counts(&mut self) -> HashMap<String, u64> {
        std::mem::take(&mut self.ion_requests)
    }

    /// Registra uma visita à console ErgotOS (gatilha auto-semeadura).
    pub fn bump_console_hit(&self) {
        self.console_hits.fetch_add(1, Ordering::Relaxed);
    }

    /// Drena o contador de visitas (lido pelo organismo no tick de métricas).
    pub fn take_console_hits(&self) -> u64 {
        self.console_hits.swap(0, Ordering::Relaxed)
    }

    /// Catálogo JSON de ions: locais (via `by_ion`) + remotos (via gossip `peer_ions`).
    pub fn catalog_json(&self) -> String {
        let mut all_ions: Vec<String> = self.by_ion.keys().cloned().collect();
        // Adiciona ions dos peers (gossip).
        for peer_ions in self.peer_ions.values() {
            for ion in peer_ions {
                if !all_ions.contains(ion) {
                    all_ions.push(ion.clone());
                }
            }
        }
        all_ions.sort();
        all_ions.dedup();
        let peers: Vec<serde_json::Value> = self
            .peer_ions
            .iter()
            .map(|(node, ions)| {
                serde_json::json!({
                    "node_id": node,
                    "ions": ions,
                })
            })
            .collect();
        serde_json::to_string(&serde_json::json!({
            "local_ions": self.by_ion.keys().cloned().collect::<Vec<_>>(),
            "peer_ions": peers,
            "all_ions": all_ions,
        }))
        .unwrap_or_else(|_| r#"{"all_ions":[]}"#.to_string())
    }

    /// Injeta peer_ions do gossip (chamado pelo organismo no tick de zonas).
    pub fn set_peer_ions(&mut self, peer_ions: HashMap<String, Vec<String>>) {
        self.peer_ions = peer_ions;
    }

    /// Define o snapshot de métricas (chamado pelo organismo periodicamente).
    pub fn set_metrics(&mut self, snapshot: String) {
        self.metrics = snapshot;
    }

    pub fn set_home(&mut self, home: PathBuf) {
        self.home = Some(home);
    }

    pub fn get_home(&self) -> Option<&std::path::Path> {
        self.home.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn orbit(ion: &str, node: u8, mass: u64, resistance: u64) -> Orbit {
        Orbit {
            ion: ion.into(),
            node: NodeId::derive(&[node]),
            mass,
            resistance,
            upstream: format!("http://127.0.0.1:{}", 8000 + node as u16),
        }
    }

    #[test]
    fn heaviest_orbit_wins() {
        let mut horizon = EventHorizon::new();
        horizon.expose("app.mycelium", orbit("webapp", 1, 10, 0));
        horizon.expose("app.mycelium", orbit("webapp", 2, 100, 0));
        assert_eq!(
            horizon.route("app.mycelium").unwrap().node,
            NodeId::derive(&[2])
        );
    }

    #[test]
    fn route_by_ion_name() {
        let mut horizon = EventHorizon::new();
        horizon.expose("h", orbit("api", 1, 10, 0));
        assert_eq!(horizon.route_ion("api").unwrap().upstream, "http://127.0.0.1:8001");
    }

    #[test]
    fn route_by_ion_name_selects_heaviest_gravity() {
        let mut horizon = EventHorizon::new();
        // Réplica 1: massa 10, resistência 0 => gravidade 10.0
        horizon.expose("h1", orbit("app", 1, 10, 0));
        // Réplica 2: massa 50, resistência 0 => gravidade 50.0
        horizon.expose("h2", orbit("app", 2, 50, 0));
        // Réplica 3: massa 100, resistência 99 => gravidade 1.0
        horizon.expose("h3", orbit("app", 3, 100, 99));

        let best = horizon.route_ion("app").unwrap();
        assert_eq!(best.node, NodeId::derive(&[2]));
        assert_eq!(best.upstream, "http://127.0.0.1:8002");
    }

    #[test]
    fn resistance_drags_gravity_down() {
        let mut horizon = EventHorizon::new();
        horizon.expose("app.mycelium", orbit("webapp", 1, 100, 99));
        horizon.expose("app.mycelium", orbit("webapp", 2, 60, 0));
        assert_eq!(
            horizon.route("app.mycelium").unwrap().node,
            NodeId::derive(&[2])
        );
    }

    #[test]
    fn candidates_are_sorted_for_read_failover() {
        let mut horizon = EventHorizon::new();
        horizon.expose("h", orbit("app", 1, 20, 0));
        horizon.expose("h", orbit("app", 2, 80, 0));
        let candidates = horizon.route_ion_candidates("app").unwrap();
        assert_eq!(candidates.len(), 2);
        assert_eq!(candidates[0].node, NodeId::derive(&[2]));
        horizon.collapse(&candidates[0].node);
        assert_eq!(horizon.route_ion("app").unwrap().node, candidates[1].node);
    }

    #[test]
    fn expired_replica_does_not_kill_other_ion_on_same_node() {
        let mut horizon = EventHorizon::new();
        horizon.expose("h", orbit("a", 1, 20, 0));
        horizon.expose("h", orbit("b", 1, 20, 0));
        horizon.collapse_ion_node("a", &NodeId::derive(&[1]));
        assert!(horizon.route_ion("a").is_err());
        assert!(horizon.route_ion("b").is_ok());
    }

    #[test]
    fn collapsed_node_leaves_the_horizon() {
        let mut horizon = EventHorizon::new();
        horizon.expose("app.mycelium", orbit("webapp", 1, 10, 0));
        horizon.collapse(&NodeId::derive(&[1]));
        assert!(matches!(
            horizon.route("app.mycelium"),
            Err(SingularityError::NoOrbit(_))
        ));
    }

    #[test]
    fn request_counters_drain_and_reset() {
        let mut horizon = EventHorizon::new();
        horizon.note_request("webapp");
        horizon.note_request("webapp");
        horizon.note_request("api");

        let counts = horizon.take_request_counts();
        assert_eq!(counts.get("webapp"), Some(&2));
        assert_eq!(counts.get("api"), Some(&1));

        // Janela drenada: próxima leitura vem vazia.
        assert!(horizon.take_request_counts().is_empty());
    }
}
