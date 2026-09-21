//! Envelope do protocolo Lattice — viaja pelo tópico `mycelium/lattice/v1`.
//!
//! Wire format atual: `{"v":1,"msg":{...}}`. Decodifica também Envelope nu (legado).

use entropy::Shade;
use giggs::Plot;
use inertia::{Momentum, Vector};
use isotope::Atom;
use mycelium_core::{ContentId, NodeId, Nutrient};
use mycelium_nutrients::Voucher;
use plasma::Charge;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thefield::Signal;

/// Versão do wire format suportada por este binário.
pub const ENVELOPE_VERSION: u32 = 1;

/// Mensagens que os nós trocam pelas hifas.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Envelope {
    /// Spore print de um Plot do Giggs.
    SporePrint { plot: Plot },
    /// Signal emitido no TheField.
    SignalBroadcast { signal: Signal },
    /// Ressonância de um nó com um Signal.
    Resonance {
        signal_id: ContentId,
        resonator: NodeId,
    },
    /// Vector do Inertia oferecido à rede (CPU ociosa pode executar).
    VectorOffer { vector: Vector },
    /// Resultado de um Vector executado (local ou remoto).
    MomentumReport {
        vector: Vector,
        momentum: Momentum,
        executor: NodeId,
    },
    /// Átomo do Isotope (estado LWW propagado por hifas).
    AtomSync { key: String, atom: Atom },
    /// Anúncio: este nó tem a layer content-addressed.
    LayerOffer { id: ContentId },
    /// Pedido: preciso desta layer (vizinhos com blob respondem via DHT/offer).
    LayerNeed { id: ContentId, hop: u8 },
    /// Consulta Isotope: preciso deste átomo (Decay pelas hifas).
    DecayQuery { key: String, asker: NodeId },
    /// Resposta Isotope a um Decay.
    DecayReply { key: String, atom: Atom },
    /// Oferta de Shade Entropy para custódia remota.
    ShadeOffer {
        shade: Shade,
        custodian: NodeId,
        from: NodeId,
    },
    /// Pedido de coleta de Shades.
    ShadeRequest {
        requester: NodeId,
        threshold: u8,
    },
    /// Sincronia de ledger Nutrient (CRDT LWW).
    BalanceSync {
        node_id: NodeId,
        balances: HashMap<Nutrient, u64>,
        clock: u64,
    },
    /// Oferta de Ion para migração (carga positiva).
    IonOffer {
        ion: String,
        host: NodeId,
        charge: Charge,
        desired_replicas: u32,
        layers: Vec<ContentId>,
    },
    /// Aceitação de migração.
    IonAccept {
        ion: String,
        acceptor: NodeId,
    },
    /// Dados do Ion para migrar (inclui conteúdo das layers).
    IonMigrate {
        ion: String,
        void: vacuum::Void,
        layers: Vec<(ContentId, Vec<u8>)>,
    },
    /// Ion pronto no destino.
    IonReady {
        ion: String,
        node: NodeId,
        upstream: String,
    },
    /// Anúncio de zona de crescimento.
    ZoneAnnounce {
        prefix: String,
        custodian: NodeId,
    },
    /// Transferência assinada de nutrientes (Micelial Value Layer, GhostID).
    ValueTransfer {
        tx: mycelium_nutrients::SignedTransfer,
    },
    /// Voucher de liquidação assinado pelo pagador (economia sem câmara
    /// de compensação: o beneficiário credita só com assinatura válida).
    VoucherRedeem { voucher: Voucher },
    /// Anúncio do Ion que este nó expõe no seu Event Horizon —
    /// alimenta o catálogo global da console ErgotOS.
    IonAnnounce {
        node_id: NodeId,
        ion: String,
        membrane: String,
    },
    /// Heartbeat de réplica viva: anuncia "ainda estou servindo este ion".
    /// Permite aos pares do ion detectarem réplicas caídas em vez de só pelo
    /// TTL do `peer_ions` (mais rápido para o Plasma reagir).
    IonHeartbeat {
        node_id: NodeId,
        ion: String,
    },
    /// Anúncio de repositório — informação pública de onde baixar código-fonte
    /// via Mycelium Network (sem dados sensíveis como IPs ou chaves SSH).
    RepoAnnounce {
        node_id: NodeId,
        name: String,
        url: String,
        commit: String,
        description: String,
    },
    /// Overlay de zonas: entrega direcionada — só `to` processa `inner`.
    /// Nós intermediários replicam no gossip mas ignoram o conteúdo.
    Direct {
        to: NodeId,
        inner: Box<Envelope>,
    },
}

/// Frame versionado no fio.
#[derive(Clone, Debug, Serialize, Deserialize)]
struct EnvelopeFrame {
    v: u32,
    msg: Envelope,
}

impl Envelope {
    pub fn encode(&self) -> Result<Vec<u8>, serde_json::Error> {
        serde_json::to_vec(&EnvelopeFrame {
            v: ENVELOPE_VERSION,
            msg: self.clone(),
        })
    }

    /// Decodifica frame `v:1` ou Envelope nu (legado). Versões futuras → erro.
    pub fn decode(bytes: &[u8]) -> Result<Self, serde_json::Error> {
        if let Ok(frame) = serde_json::from_slice::<EnvelopeFrame>(bytes) {
            if frame.v == 0 || frame.v > ENVELOPE_VERSION {
                return Err(serde::de::Error::custom(format!(
                    "envelope versão {} não suportada (max {ENVELOPE_VERSION})",
                    frame.v
                )));
            }
            return Ok(frame.msg);
        }
        // Legado: Envelope sem wrapper `v`.
        serde_json::from_slice(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_versioned_frame() {
        let env = Envelope::LayerNeed {
            id: ContentId::of(b"layer"),
            hop: 0,
        };
        let bytes = env.encode().unwrap();
        let s = std::str::from_utf8(&bytes).unwrap();
        assert!(s.contains("\"v\":1"));
        assert!(s.contains("\"msg\""));
        let back = Envelope::decode(&bytes).unwrap();
        match back {
            Envelope::LayerNeed { id, hop } => {
                assert_eq!(id, ContentId::of(b"layer"));
                assert_eq!(hop, 0);
            }
            _ => panic!("tipo errado"),
        }
    }

    #[test]
    fn legacy_bare_envelope_still_decodes() {
        let env = Envelope::LayerOffer {
            id: ContentId::of(b"x"),
        };
        let bare = serde_json::to_vec(&env).unwrap();
        let back = Envelope::decode(&bare).unwrap();
        assert!(matches!(back, Envelope::LayerOffer { .. }));
    }

    #[test]
    fn unknown_version_is_rejected() {
        let env = Envelope::LayerNeed {
            id: ContentId::of(b"layer"),
            hop: 0,
        };
        let mut frame = EnvelopeFrame {
            v: 99,
            msg: env,
        };
        let raw = serde_json::to_vec(&frame).unwrap();
        assert!(Envelope::decode(&raw).is_err());
        frame.v = 1;
        assert!(Envelope::decode(&serde_json::to_vec(&frame).unwrap()).is_ok());
    }

    #[test]
    fn direct_envelope_roundtrip() {
        let inner = Envelope::LayerNeed {
            id: ContentId::of(b"layer-xor"),
            hop: 1,
        };
        let direct = Envelope::Direct {
            to: NodeId::derive(b"destino"),
            inner: Box::new(inner),
        };
        let back = Envelope::decode(&direct.encode().unwrap()).unwrap();
        match back {
            Envelope::Direct { to, inner } => {
                assert_eq!(to, NodeId::derive(b"destino"));
                assert!(matches!(*inner, Envelope::LayerNeed { .. }));
            }
            _ => panic!("tipo errado"),
        }
    }

    #[test]
    fn ion_announce_roundtrip() {
        let env = Envelope::IonAnnounce {
            node_id: NodeId::derive(b"node"),
            ion: "webapp".into(),
            membrane: "floresta".into(),
        };
        let back = Envelope::decode(&env.encode().unwrap()).unwrap();
        match back {
            Envelope::IonAnnounce { node_id, ion, membrane } => {
                assert_eq!(node_id, NodeId::derive(b"node"));
                assert_eq!(ion, "webapp");
                assert_eq!(membrane, "floresta");
            }
            _ => panic!("tipo errado"),
        }
    }

    #[test]
    fn ion_heartbeat_roundtrip() {
        let env = Envelope::IonHeartbeat {
            node_id: NodeId::derive(b"node"),
            ion: "webapp".into(),
        };
        let back = Envelope::decode(&env.encode().unwrap()).unwrap();
        match back {
            Envelope::IonHeartbeat { node_id, ion } => {
                assert_eq!(node_id, NodeId::derive(b"node"));
                assert_eq!(ion, "webapp");
            }
            _ => panic!("tipo errado"),
        }
    }
}
