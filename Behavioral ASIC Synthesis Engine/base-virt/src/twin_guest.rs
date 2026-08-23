//! Twin↔guest — diff HardwareSpec (modelo) vs EvidenceDb (guest/emulador).
//!
//! Path to v1.6 F0: oráculo de falsificação. ≠ OS turnkey · ≠ HIL production.

use base_core::evidence::{EvidenceDb, EvidenceType};
use base_core::honesty;
use base_core::spec::types::HardwareSpec;
use base_core::tension::TensionMetric;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwinGuestHit {
    pub address: u64,
    pub block_id: String,
    pub op: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwinGuestMiss {
    pub address: u64,
    pub op: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwinGuestReport {
    pub phase: String,
    pub ok: bool,
    pub guest_events: usize,
    pub hits: usize,
    pub misses: usize,
    pub twin_only_blocks: Vec<String>,
    pub hit_rate: f64,
    pub psi_confidence: f64,
    pub hit_samples: Vec<TwinGuestHit>,
    pub miss_samples: Vec<TwinGuestMiss>,
    /// Last written values in twin shadow RAM (addr → value).
    pub twin_shadow: HashMap<String, u64>,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
    pub note: String,
}

fn find_block<'a>(spec: &'a HardwareSpec, addr: u64) -> Option<&'a base_core::spec::types::FunctionalBlock> {
    spec.blocks.iter().find(|b| {
        let size = b.size.max(1);
        addr >= b.base_address && addr < b.base_address + size
    })
}

/// Replays guest Evidence against Spec twin (shadow MMIO map).
pub fn compare_twin_guest(spec: &HardwareSpec, guest: &EvidenceDb) -> TwinGuestReport {
    let mut shadow: HashMap<u64, u64> = HashMap::new();
    let mut hits = Vec::new();
    let mut misses = Vec::new();
    let mut touched_blocks: HashSet<String> = HashSet::new();

    for entry in &guest.entries {
        match &entry.evidence_type {
            EvidenceType::MmioWrite { address, value } => {
                if let Some(block) = find_block(spec, *address) {
                    touched_blocks.insert(block.id.clone());
                    if let Some(v) = value {
                        shadow.insert(*address, *v);
                    }
                    hits.push(TwinGuestHit {
                        address: *address,
                        block_id: block.id.clone(),
                        op: "mmio_write".into(),
                        value: *value,
                    });
                } else {
                    misses.push(TwinGuestMiss {
                        address: *address,
                        op: "mmio_write".into(),
                        reason: "address_not_in_spec".into(),
                    });
                }
            }
            EvidenceType::MmioRead { address } => {
                if let Some(block) = find_block(spec, *address) {
                    touched_blocks.insert(block.id.clone());
                    hits.push(TwinGuestHit {
                        address: *address,
                        block_id: block.id.clone(),
                        op: "mmio_read".into(),
                        value: shadow.get(address).copied(),
                    });
                } else {
                    misses.push(TwinGuestMiss {
                        address: *address,
                        op: "mmio_read".into(),
                        reason: "address_not_in_spec".into(),
                    });
                }
            }
            EvidenceType::Irq { vector, .. } => {
                // IRQs count as hit if any interrupt vector matches, else soft miss.
                let known = spec.interrupts.iter().any(|i| i.vector == *vector);
                if known || !spec.interrupts.is_empty() {
                    hits.push(TwinGuestHit {
                        address: *vector as u64,
                        block_id: "irq".into(),
                        op: "irq".into(),
                        value: Some(*vector as u64),
                    });
                } else {
                    // Spec sem tabela IRQ — ainda conta como observação guest-only leve.
                    misses.push(TwinGuestMiss {
                        address: *vector as u64,
                        op: "irq".into(),
                        reason: "irq_not_modeled".into(),
                    });
                }
            }
            _ => {}
        }
    }

    let mmio_events = hits.len() + misses.len();
    let hit_rate = if mmio_events > 0 {
        hits.len() as f64 / mmio_events as f64
    } else {
        0.0
    };

    let twin_only: Vec<String> = spec
        .blocks
        .iter()
        .filter(|b| !touched_blocks.contains(&b.id))
        .map(|b| b.id.clone())
        .collect();

    let tension = TensionMetric::compute(guest, spec, 0, 0, 0);

    let twin_shadow: HashMap<String, u64> = shadow
        .into_iter()
        .map(|(a, v)| (format!("0x{a:x}"), v))
        .collect();

    TwinGuestReport {
        phase: "twin_guest".into(),
        ok: true,
        guest_events: guest.count(),
        hits: hits.len(),
        misses: misses.len(),
        twin_only_blocks: twin_only,
        hit_rate,
        psi_confidence: tension.overall_confidence,
        hit_samples: hits.into_iter().take(64).collect(),
        miss_samples: misses.into_iter().take(64).collect(),
        twin_shadow,
        generates_os: honesty::GENERATES_OS,
        auto_fix_complete: honesty::AUTO_FIX_COMPLETE,
        honesty: honesty::NOTE.to_string(),
        note: "Twin↔guest MMIO shadow — ≠ OS turnkey / ≠ DigitalTwin BIR completo".into(),
    }
}

impl TwinGuestReport {
    pub fn to_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(self)
    }
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base_core::evidence::{EvidenceEntry, EvidenceType};
    use base_core::spec::types::*;
    use std::collections::HashMap;

    fn spec_a00000() -> HardwareSpec {
        let mut spec = HardwareSpec::empty();
        spec.blocks.push(FunctionalBlock {
            id: "mame0".into(),
            kind: BlockKind::Unknown,
            base_address: 0xA00000,
            size: 0x1000,
            registers: vec![],
            protocol: Protocol {
                states: vec![],
                transitions: vec![],
                entry_condition: None,
                exit_condition: None,
            },
            timing: TimingProfile {
                activation: None,
                processing: None,
                interrupt_response: None,
                dma_setup: None,
                polling_interval: None,
            },
            dma: None,
            dependencies: vec![],
            confidence: 0.5,
        });
        spec
    }

    #[test]
    fn hit_on_overlap() {
        let mut db = EvidenceDb::new("g");
        db.add(EvidenceEntry {
            id: "e0".into(),
            evidence_type: EvidenceType::MmioWrite {
                address: 0xA00000,
                value: Some(0x12),
            },
            context: HashMap::new(),
        });
        let r = compare_twin_guest(&spec_a00000(), &db);
        assert_eq!(r.hits, 1);
        assert_eq!(r.misses, 0);
        assert!((r.hit_rate - 1.0).abs() < 1e-9);
        assert!(!r.generates_os);
    }

    #[test]
    fn miss_outside_spec() {
        let mut db = EvidenceDb::new("g");
        db.add(EvidenceEntry {
            id: "e0".into(),
            evidence_type: EvidenceType::MmioRead { address: 0x40034000 },
            context: HashMap::new(),
        });
        let r = compare_twin_guest(&spec_a00000(), &db);
        assert_eq!(r.hits, 0);
        assert_eq!(r.misses, 1);
    }
}
