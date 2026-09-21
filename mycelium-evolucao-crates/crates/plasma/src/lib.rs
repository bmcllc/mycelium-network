//! # Plasma — Orquestração auto-organizada
//!
//! Um **Ion** é uma carga de trabalho viva: uma Chamber do Vacuum ligada
//! a um nome lógico, com carga elétrica (demanda) que atrai ou repele
//! réplicas. O Plasma se auto-organiza — Ions nascem onde há nutrientes
//! e morrem (recombinam) quando a demanda cai.
//!
//! Stub coeso: o "cluster" é in-memory; migração real via hifas fica para
//! a próxima fase.

use mycelium_core::{FruitingBody, NodeId, Nutrient, Vitality};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use vacuum::Chamber;

#[derive(Debug, thiserror::Error)]
pub enum PlasmaError {
    #[error("ion {0} não encontrado no plasma")]
    IonNotFound(String),
    #[error("ion {0} já orbitando")]
    AlreadyOrbiting(String),
    #[error("ion decomposto: não pode reagir")]
    Decomposed,
}

/// Estado de carga de um Ion — quanto "atrai" réplicas.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Charge {
    /// Demanda alta: o Plasma deve brotar réplicas.
    Positive,
    /// Em equilíbrio: uma instância basta.
    Neutral,
    /// Demanda baixa: candidatos a recombinação (morte).
    Negative,
}

/// Contrato mínimo de sobrevivência de um Ion.
///
/// A carga continua decidindo quando o Ion precisa crescer, mas nunca pode
/// ultrapassar os limites declarados por esta política. Isso transforma
/// disponibilidade em uma propriedade explícita do serviço, em vez de uma
/// consequência acidental do tráfego atual.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SurvivalPolicy {
    /// Número mínimo de cópias que devem permanecer vivas.
    pub min_replicas: u32,
    /// Limite superior para evitar crescimento sem controle.
    pub max_replicas: u32,
}

impl SurvivalPolicy {
    pub fn new(min_replicas: u32, max_replicas: u32) -> Self {
        let min_replicas = min_replicas.max(1);
        Self {
            min_replicas,
            max_replicas: max_replicas.max(min_replicas),
        }
    }
}

impl Default for SurvivalPolicy {
    fn default() -> Self {
        Self::new(1, 64)
    }
}

/// Uma carga de trabalho auto-organizada.
#[derive(Debug)]
pub struct Ion {
    pub name: String,
    pub host: NodeId,
    pub chamber: Chamber,
    pub charge: Charge,
    /// Réplicas desejadas sob carga positiva.
    pub desired_replicas: u32,
    /// Política declarada de sobrevivência deste serviço.
    pub survival: SurvivalPolicy,
}

impl Ion {
    pub fn birth(name: impl Into<String>, host: NodeId, chamber: Chamber) -> Self {
        Self::birth_with_policy(name, host, chamber, SurvivalPolicy::default())
    }

    pub fn birth_with_policy(
        name: impl Into<String>,
        host: NodeId,
        chamber: Chamber,
        survival: SurvivalPolicy,
    ) -> Self {
        Self {
            name: name.into(),
            host,
            chamber,
            charge: Charge::Neutral,
            desired_replicas: survival.min_replicas,
            survival,
        }
    }

    /// Ajusta a carga conforme a demanda observada (req/s, heurística).
    pub fn sense(&mut self, requests_per_sec: u64) {
        match requests_per_sec {
            0 => {
                self.charge = if self.survival.min_replicas > 1 {
                    Charge::Neutral
                } else {
                    Charge::Negative
                };
                self.desired_replicas = self.survival.min_replicas;
            }
            1..=50 => {
                self.charge = Charge::Neutral;
                self.desired_replicas = self.survival.min_replicas;
            }
            n => {
                self.charge = Charge::Positive;
                self.desired_replicas = (1 + (n / 50) as u32)
                    .max(self.survival.min_replicas)
                    .min(self.survival.max_replicas);
            }
        }
    }
}

impl FruitingBody for Ion {
    fn kind(&self) -> &'static str {
        "ion"
    }

    fn vitality(&self) -> Vitality {
        self.chamber.vitality()
    }

    fn diet(&self) -> Vec<Nutrient> {
        self.chamber.diet()
    }

    fn decompose(&mut self) {
        self.chamber.decompose();
        self.charge = Charge::Negative;
    }
}

/// O Plasma local: o conjunto de Ions que orbitam este nó.
#[derive(Debug, Default)]
pub struct Cloud {
    ions: HashMap<String, Ion>,
}

impl Cloud {
    pub fn new() -> Self {
        Self::default()
    }

    /// Injeta um Ion no Plasma.
    pub fn inject(&mut self, ion: Ion) -> Result<(), PlasmaError> {
        if self.ions.contains_key(&ion.name) {
            return Err(PlasmaError::AlreadyOrbiting(ion.name));
        }
        self.ions.insert(ion.name.clone(), ion);
        Ok(())
    }

    pub fn get(&self, name: &str) -> Option<&Ion> {
        self.ions.get(name)
    }

    pub fn get_mut(&mut self, name: &str) -> Option<&mut Ion> {
        self.ions.get_mut(name)
    }

    /// Reage: Ions com carga negativa e sem tráfego são recombinados
    /// (removidos do Plasma, Chamber decomposta).
    pub fn react(&mut self) -> Vec<String> {
        let doomed: Vec<String> = self
            .ions
            .iter()
            .filter(|(_, ion)| {
                ion.charge == Charge::Negative
                    && ion.survival.min_replicas == 1
                    && ion.vitality() != Vitality::Decomposed
            })
            .map(|(name, _)| name.clone())
            .collect();

        for name in &doomed {
            if let Some(mut ion) = self.ions.remove(name) {
                ion.decompose();
            }
        }
        doomed
    }

    /// Remove um Ion do Plasma devolvendo-o ao chamador (recombine
    /// controlada pelo organismo — decomposição explícita fora daqui).
    pub fn remove(&mut self, name: &str) -> Option<Ion> {
        self.ions.remove(name)
    }

    /// Ions que pedem réplicas (carga positiva).
    pub fn hungry(&self) -> impl Iterator<Item = &Ion> {
        self.ions
            .values()
            .filter(|i| i.charge == Charge::Positive && i.desired_replicas > 1)
    }

    pub fn len(&self) -> usize {
        self.ions.len()
    }

    pub fn is_empty(&self) -> bool {
        self.ions.is_empty()
    }

    pub fn names(&self) -> impl Iterator<Item = &String> {
        self.ions.keys()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mycelium_core::Resources;
    use vacuum::{Chamber, LayerPool, Void};

    fn chamber(name: &str) -> Chamber {
        let mut pool = LayerPool::new();
        let layer = pool.deposit(format!("layer-{name}").into_bytes());
        let void = Void {
            name: name.into(),
            layers: vec![layer],
            entrypoint: "/bin/serve".into(),
        };
        Chamber::suck(void, &pool, Resources::default()).unwrap()
    }

    #[test]
    fn ion_senses_demand_and_asks_for_replicas() {
        let host = NodeId::derive(b"node");
        let mut ion = Ion::birth("webapp", host, chamber("webapp"));
        ion.sense(0);
        assert_eq!(ion.charge, Charge::Negative);

        ion.sense(10);
        assert_eq!(ion.charge, Charge::Neutral);

        ion.sense(200);
        assert_eq!(ion.charge, Charge::Positive);
        assert_eq!(ion.desired_replicas, 5);
    }

    #[test]
    fn survival_policy_keeps_minimum_and_caps_growth() {
        let host = NodeId::derive(b"node");
        let policy = SurvivalPolicy::new(3, 5);
        let mut ion = Ion::birth_with_policy("api", host, chamber("api"), policy);

        ion.sense(0);
        assert_eq!(ion.charge, Charge::Neutral);
        assert_eq!(ion.desired_replicas, 3);

        ion.sense(10_000);
        assert_eq!(ion.charge, Charge::Positive);
        assert_eq!(ion.desired_replicas, 5);
    }

    #[test]
    fn protected_ion_is_not_recombined_when_idle() {
        let host = NodeId::derive(b"node");
        let mut cloud = Cloud::new();
        let mut ion = Ion::birth_with_policy(
            "critical-api",
            host,
            chamber("critical-api"),
            SurvivalPolicy::new(2, 4),
        );
        ion.sense(0);
        cloud.inject(ion).unwrap();

        assert!(cloud.react().is_empty());
        assert_eq!(cloud.len(), 1);
    }

    #[test]
    fn cloud_recombines_negative_ions() {
        let host = NodeId::derive(b"node");
        let mut cloud = Cloud::new();
        let mut ion = Ion::birth("idle", host, chamber("idle"));
        ion.sense(0);
        cloud.inject(ion).unwrap();

        let doomed = cloud.react();
        assert_eq!(doomed, vec!["idle".to_string()]);
        assert!(cloud.is_empty());
    }

    #[test]
    fn cloud_remove_hands_ion_back_to_caller() {
        let host = NodeId::derive(b"node");
        let mut cloud = Cloud::new();
        let mut ion = Ion::birth("web", host, chamber("web"));
        ion.sense(200);
        assert_eq!(ion.charge, Charge::Positive);
        cloud.inject(ion).unwrap();

        // Remove sem decompor: o chamador decide (recombine controlada).
        let mut taken = cloud.remove("web").expect("ion presente");
        assert!(cloud.is_empty());
        assert_eq!(taken.name, "web");
        taken.decompose();
        assert_eq!(taken.charge, Charge::Negative);
        assert!(cloud.remove("web").is_none());
    }

    #[test]
    fn cannot_inject_duplicate_ion() {
        let host = NodeId::derive(b"node");
        let mut cloud = Cloud::new();
        cloud
            .inject(Ion::birth("webapp", host, chamber("a")))
            .unwrap();
        assert!(matches!(
            cloud.inject(Ion::birth("webapp", host, chamber("b"))),
            Err(PlasmaError::AlreadyOrbiting(_))
        ));
    }

    #[test]
    fn fruiting_body_contract() {
        let ion = Ion::birth("api", NodeId::derive(b"n"), chamber("api"));
        assert_eq!(ion.kind(), "ion");
        assert_eq!(ion.vitality(), Vitality::Fruiting);
        assert!(ion.diet().contains(&Nutrient::Enzymes));
    }
}
