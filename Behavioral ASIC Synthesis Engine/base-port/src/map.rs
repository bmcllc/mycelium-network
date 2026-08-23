//! Address / driver map — source MMIO → abstract HAL id + strategy.

use base_core::spec::types::{BlockKind, FunctionalBlock, HardwareSpec};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TranslationStrategy {
    /// Remap via MMU / page table when possible.
    Mmu,
    /// Trap / emulate accesses (default for most peripherals).
    Trap,
    /// PIO / bit-bang fallback (audio-like).
    Pio,
    /// Stub only — no live translation yet.
    Stub,
}

impl TranslationStrategy {
    pub fn for_kind(kind: &BlockKind) -> Self {
        match kind {
            BlockKind::Dma => Self::Mmu,
            BlockKind::Gpu => Self::Trap,
            BlockKind::Audio => Self::Pio,
            BlockKind::Unknown => Self::Stub,
            _ => Self::Trap,
        }
    }

    pub fn as_u8(self) -> u8 {
        match self {
            Self::Mmu => 0,
            Self::Trap => 1,
            Self::Pio => 2,
            Self::Stub => 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MappedRegion {
    pub block_id: String,
    pub kind: String,
    pub source_base: u64,
    pub size: u64,
    /// Abstract HAL symbol (stable across target arches).
    pub hal_id: String,
    /// Suggested target base (policy: source + 0x100000, like HalGenerator).
    pub target_base: u64,
    pub strategy: TranslationStrategy,
    pub registers: Vec<MappedRegister>,
    pub rewrite_needed: bool,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MappedRegister {
    pub name: String,
    pub offset: u32,
    pub purpose: String,
    pub observed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressDriverMap {
    pub source_arch: String,
    pub target_hal: String,
    pub entries: Vec<MappedRegion>,
    pub honesty: &'static str,
}

pub fn build_address_map(
    spec: &HardwareSpec,
    observed_addrs: &[u64],
    target_hal: &str,
) -> AddressDriverMap {
    let arch = format!("{:?}", spec.cpu.architecture);
    let entries = spec
        .blocks
        .iter()
        .map(|b| map_block(b, observed_addrs))
        .collect();
    AddressDriverMap {
        source_arch: arch,
        target_hal: target_hal.to_string(),
        entries,
        honesty: "Map guides HAL wrap/remap — does not replace driver rewrite for new ISA",
    }
}

fn map_block(block: &FunctionalBlock, observed: &[u64]) -> MappedRegion {
    let size = if block.size == 0 { 0x1000 } else { block.size };
    let strategy = TranslationStrategy::for_kind(&block.kind);
    let kind = format!("{:?}", block.kind);
    let hal_id = format!(
        "hal_{}_{:08x}",
        kind.to_lowercase(),
        block.base_address as u32
    );
    let registers: Vec<MappedRegister> = block
        .registers
        .iter()
        .map(|r| {
            let abs = block.base_address + r.offset as u64;
            MappedRegister {
                name: r.name.clone().unwrap_or_else(|| format!("reg_{:x}", r.offset)),
                offset: r.offset,
                purpose: format!("{:?}", r.purpose),
                observed: observed.iter().any(|&a| a == abs || (a & !0xfff) == (abs & !0xfff)),
            }
        })
        .collect();
    let unobserved = registers.iter().filter(|r| !r.observed).count();
    let rewrite_needed = matches!(block.kind, BlockKind::Unknown)
        || unobserved > registers.len().saturating_div(2)
        || matches!(strategy, TranslationStrategy::Stub);

    MappedRegion {
        block_id: block.id.clone(),
        kind,
        source_base: block.base_address,
        size,
        hal_id,
        target_base: block.base_address.wrapping_add(0x100000),
        strategy,
        registers,
        rewrite_needed,
        notes: if rewrite_needed {
            "Needs human driver/HAL work on target arch".into()
        } else {
            "Candidate for trap/MMU wrap with existing contracts".into()
        },
    }
}
