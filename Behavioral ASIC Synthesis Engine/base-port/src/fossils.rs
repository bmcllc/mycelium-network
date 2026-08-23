//! Fossil inventory — MMIO/code regions without evidence (Paleo: estrato não observado).

use base_core::evidence::EvidenceDb;
use base_core::spec::types::{HardwareSpec, RegisterPurpose};
use base_core::tension::{BlockTension, TensionReport};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FossilKind {
    /// Register declared but never seen in evidence.
    UnobservedRegister,
    /// Block kind Unknown — fossilized classification gap.
    UnknownBlock,
    /// Register purpose UnknownPurpose.
    UnknownPurpose,
    /// High Ψ block — fragile estrato.
    HighPsiBlock,
    /// Address observed in evidence but not in any block (orphan fossil).
    OrphanEvidence,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FossilRecord {
    pub kind: FossilKind,
    pub block_id: Option<String>,
    pub address: Option<u64>,
    pub detail: String,
    pub rewrite_hint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FossilInventory {
    pub fossils: Vec<FossilRecord>,
    pub summary: FossilSummary,
    pub honesty: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FossilSummary {
    pub unobserved_registers: usize,
    pub unknown_blocks: usize,
    pub unknown_purpose: usize,
    pub high_psi_blocks: usize,
    pub orphan_evidence: usize,
}

pub fn build_fossil_inventory(
    spec: &HardwareSpec,
    evidence: Option<&EvidenceDb>,
    tension: Option<&TensionReport>,
) -> FossilInventory {
    let observed: Vec<u64> = evidence
        .map(|e| e.unique_mmio_addresses())
        .unwrap_or_default();
    let mut fossils = Vec::new();

    for block in &spec.blocks {
        if matches!(block.kind, base_core::spec::types::BlockKind::Unknown) {
            fossils.push(FossilRecord {
                kind: FossilKind::UnknownBlock,
                block_id: Some(block.id.clone()),
                address: Some(block.base_address),
                detail: format!("block {} kind=Unknown confidence={:.2}", block.id, block.confidence),
                rewrite_hint: "Classify (uart/spi/…) or capture more MMIO before porting".into(),
            });
        }
        for reg in &block.registers {
            let abs = block.base_address + reg.offset as u64;
            if matches!(reg.purpose, RegisterPurpose::UnknownPurpose) {
                fossils.push(FossilRecord {
                    kind: FossilKind::UnknownPurpose,
                    block_id: Some(block.id.clone()),
                    address: Some(abs),
                    detail: format!("{}+0x{:x} purpose unknown", block.id, reg.offset),
                    rewrite_hint: "Name/purpose from datasheet or Capstone before HAL bind".into(),
                });
            }
            if evidence.is_some()
                && !observed
                    .iter()
                    .any(|&a| a == abs || (a >= block.base_address && a < block.base_address + block.size.max(0x1000)))
            {
                fossils.push(FossilRecord {
                    kind: FossilKind::UnobservedRegister,
                    block_id: Some(block.id.clone()),
                    address: Some(abs),
                    detail: format!(
                        "{} {} @ 0x{:x} never in evidence",
                        block.id,
                        reg.name.as_deref().unwrap_or("?"),
                        abs
                    ),
                    rewrite_hint: "Do not invent behavior — leave stub or gather traces".into(),
                });
            }
        }
    }

    if let Some(t) = tension {
        for bt in &t.block_tensions {
            push_high_psi(&mut fossils, bt);
        }
    }

    if let Some(ev) = evidence {
        for &addr in &ev.unique_mmio_addresses() {
            let covered = spec.blocks.iter().any(|b| {
                let sz = b.size.max(0x1000);
                addr >= b.base_address && addr < b.base_address + sz
            });
            if !covered {
                fossils.push(FossilRecord {
                    kind: FossilKind::OrphanEvidence,
                    block_id: None,
                    address: Some(addr),
                    detail: format!("evidence MMIO 0x{addr:x} outside known blocks"),
                    rewrite_hint: "New FunctionalBlock or ignore as noise".into(),
                });
            }
        }
    }

    let summary = FossilSummary {
        unobserved_registers: fossils
            .iter()
            .filter(|f| f.kind == FossilKind::UnobservedRegister)
            .count(),
        unknown_blocks: fossils
            .iter()
            .filter(|f| f.kind == FossilKind::UnknownBlock)
            .count(),
        unknown_purpose: fossils
            .iter()
            .filter(|f| f.kind == FossilKind::UnknownPurpose)
            .count(),
        high_psi_blocks: fossils
            .iter()
            .filter(|f| f.kind == FossilKind::HighPsiBlock)
            .count(),
        orphan_evidence: fossils
            .iter()
            .filter(|f| f.kind == FossilKind::OrphanEvidence)
            .count(),
    };

    FossilInventory {
        fossils,
        summary,
        honesty: "Fossils = unobserved/fragile strata — not dead-code decompiler output",
    }
}

fn push_high_psi(out: &mut Vec<FossilRecord>, bt: &BlockTension) {
    // High tension / low confidence → fragile for port
    if bt.tension >= 0.4 || bt.confidence < 0.5 {
        out.push(FossilRecord {
            kind: FossilKind::HighPsiBlock,
            block_id: Some(bt.block_id.clone()),
            address: None,
            detail: format!(
                "Ψ={:.3} confidence={:.2} {:?}",
                bt.tension, bt.confidence, bt.conclusiveness
            ),
            rewrite_hint: "Stabilize with more traces before claiming driver port complete".into(),
        });
    }
}
