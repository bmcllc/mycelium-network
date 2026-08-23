//! Assemble and serialize the port package (YAML + MD atlas).

use crate::fossils::{build_fossil_inventory, FossilInventory};
use crate::map::{build_address_map, AddressDriverMap};
use base_core::evidence::EvidenceDb;
use base_core::spec::types::HardwareSpec;
use base_core::tension::TensionReport;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default)]
pub struct PortPackageOptions {
    pub target_hal: String,
    pub target_arch_note: String,
}

impl PortPackageOptions {
    pub fn new(target_hal: impl Into<String>) -> Self {
        Self {
            target_hal: target_hal.into(),
            target_arch_note: "abstract HAL — bind to concrete ISA in SOW".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortPackage {
    pub claim: &'static str,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub target_hal: String,
    pub target_arch_note: String,
    pub address_driver_map: AddressDriverMap,
    pub fossil_inventory: FossilInventory,
    pub driver_checklist: Vec<DriverChecklistItem>,
    pub rewrite_avoidance: RewriteAvoidance,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverChecklistItem {
    pub block_id: String,
    pub hal_id: String,
    pub action: String,
    pub rewrite_needed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewriteAvoidance {
    pub wrap_candidates: usize,
    pub must_rewrite: usize,
    pub guidance: Vec<String>,
}

pub fn build_port_package(
    spec: &HardwareSpec,
    evidence: Option<&EvidenceDb>,
    tension: Option<&TensionReport>,
    opts: PortPackageOptions,
) -> PortPackage {
    let observed = evidence
        .map(|e| e.unique_mmio_addresses())
        .unwrap_or_default();
    let address_driver_map = build_address_map(spec, &observed, &opts.target_hal);
    let fossil_inventory = build_fossil_inventory(spec, evidence, tension);

    let driver_checklist: Vec<DriverChecklistItem> = address_driver_map
        .entries
        .iter()
        .map(|e| DriverChecklistItem {
            block_id: e.block_id.clone(),
            hal_id: e.hal_id.clone(),
            action: if e.rewrite_needed {
                "REWRITE or deep HAL — insufficient observation / Unknown".into()
            } else {
                "WRAP — trap/MMU map + reuse contracts; avoid full rewrite".into()
            },
            rewrite_needed: e.rewrite_needed,
        })
        .collect();

    let must_rewrite = driver_checklist.iter().filter(|d| d.rewrite_needed).count();
    let wrap_candidates = driver_checklist.len().saturating_sub(must_rewrite);

    let mut guidance = vec![
        "Use address_driver_map.yaml as the single source for source→HAL binds.".into(),
        "Treat fossil_inventory.yaml as do-not-invent list before coding drivers.".into(),
        "Generate host HAL stubs with `base fw` after synth — still ≠ silicon OS.".into(),
        "ISA-specific asm/boot still requires human/external OS tree (TaurOS/ReactOS).".into(),
    ];
    if must_rewrite == 0 && !driver_checklist.is_empty() {
        guidance.push(
            "All blocks are wrap candidates — prioritize trap table over rewrite.".into(),
        );
    }

    PortPackage {
        claim: "port_package_assist",
        generates_os: base_core::GENERATES_OS,
        auto_fix_complete: base_core::AUTO_FIX_COMPLETE,
        target_hal: opts.target_hal,
        target_arch_note: opts.target_arch_note,
        address_driver_map,
        fossil_inventory,
        driver_checklist,
        rewrite_avoidance: RewriteAvoidance {
            wrap_candidates,
            must_rewrite,
            guidance,
        },
    }
}

impl PortPackage {
    pub fn to_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(self)
    }

    pub fn map_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(&self.address_driver_map)
    }

    pub fn fossils_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(&self.fossil_inventory)
    }

    pub fn to_markdown(&self) -> String {
        let mut md = String::new();
        md.push_str("# PORT_PACKAGE — atlas de port (B.A.S.E.)\n\n");
        md.push_str(&format!("> {}\n\n", base_core::HONESTY_BANNER));
        md.push_str(&format!(
            "- claim: `{}` · generates_os: **{}** · auto_fix_complete: **{}**\n",
            self.claim, self.generates_os, self.auto_fix_complete
        ));
        md.push_str(&format!(
            "- target HAL: `{}` ({})\n",
            self.target_hal, self.target_arch_note
        ));
        md.push_str(&format!(
            "- source arch: `{}`\n\n",
            self.address_driver_map.source_arch
        ));

        md.push_str("## Rewrite avoidance\n\n");
        md.push_str(&format!(
            "| Wrap candidates | Must rewrite |\n|-----------------|-------------|\n| {} | {} |\n\n",
            self.rewrite_avoidance.wrap_candidates, self.rewrite_avoidance.must_rewrite
        ));
        for g in &self.rewrite_avoidance.guidance {
            md.push_str(&format!("- {g}\n"));
        }

        md.push_str("\n## Address / driver map\n\n");
        md.push_str("| Block | Source | HAL id | Strategy | Rewrite? |\n");
        md.push_str("|-------|--------|--------|----------|----------|\n");
        for e in &self.address_driver_map.entries {
            md.push_str(&format!(
                "| {} | `0x{:08x}` | `{}` | {:?} | {} |\n",
                e.block_id,
                e.source_base,
                e.hal_id,
                e.strategy,
                if e.rewrite_needed { "YES" } else { "wrap" }
            ));
        }

        md.push_str("\n## Driver checklist\n\n");
        for d in &self.driver_checklist {
            md.push_str(&format!(
                "- [{}] `{}` → `{}` — {}\n",
                if d.rewrite_needed { " " } else { "x" },
                d.block_id,
                d.hal_id,
                d.action
            ));
        }

        md.push_str("\n## Fossil inventory (Paleo estrato)\n\n");
        md.push_str(&format!(
            "Summary: unobs_reg={} unknown_block={} unknown_purpose={} high_ψ={} orphan={}\n\n",
            self.fossil_inventory.summary.unobserved_registers,
            self.fossil_inventory.summary.unknown_blocks,
            self.fossil_inventory.summary.unknown_purpose,
            self.fossil_inventory.summary.high_psi_blocks,
            self.fossil_inventory.summary.orphan_evidence
        ));
        for f in self.fossil_inventory.fossils.iter().take(40) {
            md.push_str(&format!(
                "- **{:?}** {} — {}\n  - hint: {}\n",
                f.kind,
                f.block_id.as_deref().unwrap_or("-"),
                f.detail,
                f.rewrite_hint
            ));
        }
        if self.fossil_inventory.fossils.len() > 40 {
            md.push_str(&format!(
                "\n… +{} more in `fossil_inventory.yaml`\n",
                self.fossil_inventory.fossils.len() - 40
            ));
        }

        md.push_str("\n## Artefactos\n\n");
        md.push_str("- `port_package.yaml` — pacote completo\n");
        md.push_str("- `address_driver_map.yaml` — binds source→HAL\n");
        md.push_str("- `fossil_inventory.yaml` — não inventar\n");
        md.push_str("- `PORT_PACKAGE.md` — este atlas\n");
        md.push_str("\n");
        md.push_str(&base_core::honesty_markdown());
        md.push_str("\nRef: `base-vault/24 - Path to v1.4/` · Paleo map `22.31`\n");
        md
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base_core::spec::types::*;

    fn mini_spec() -> HardwareSpec {
        let mut spec = HardwareSpec::empty();
        spec.cpu.architecture = CpuArch::Arm64;
        spec.blocks.push(FunctionalBlock {
            id: "uart0".into(),
            kind: BlockKind::Uart,
            base_address: 0xA900_0000,
            size: 0x1000,
            registers: vec![Register {
                offset: 0,
                name: Some("DR".into()),
                width: 32,
                access: AccessType::ReadWrite,
                purpose: RegisterPurpose::DataPort,
                reset_value: None,
                observed_values: vec![],
                bitfields: vec![],
                polling: false,
                count: 0,
            }],
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
            confidence: 0.9,
        });
        spec.confidence = 0.9;
        spec
    }

    #[test]
    fn package_never_claims_os() {
        let spec = mini_spec();
        let pkg = build_port_package(
            &spec,
            None,
            None,
            PortPackageOptions::new("hal_abstract_v1"),
        );
        assert!(!pkg.generates_os);
        assert!(!pkg.auto_fix_complete);
        assert!(!pkg.address_driver_map.entries.is_empty());
        let md = pkg.to_markdown();
        assert!(md.contains("PORT_PACKAGE"));
    }
}
