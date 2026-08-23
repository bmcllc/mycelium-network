//! Loop OBSERVE → SCORE em janelas sobre EvidenceDb acumulado.

use crate::session::{VirtSessionReport, VirtSessionWindow};
use base_core::evidence::EvidenceDb;
use base_core::honesty;
use base_core::spec::types::HardwareSpec;
use base_core::tension::{Conclusiveness, TensionMetric};

#[derive(Debug, Clone)]
pub struct LiveConfig {
    pub window_size: usize,
    pub max_windows: usize,
    pub function_count: usize,
    pub instruction_count: usize,
    pub call_edge_count: usize,
}

impl Default for LiveConfig {
    fn default() -> Self {
        Self {
            window_size: 32,
            max_windows: 64,
            function_count: 0,
            instruction_count: 0,
            call_edge_count: 0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct LiveWindowScore {
    pub window: VirtSessionWindow,
}

/// Corre Ψ em prefixos crescentes (janelas cumulativas) do EvidenceDb.
pub fn run_live_windows(
    evidence: &EvidenceDb,
    spec: &HardwareSpec,
    cfg: &LiveConfig,
) -> VirtSessionReport {
    let window_size = cfg.window_size.max(1);
    let n = evidence.entries.len();
    let mut windows = Vec::new();
    let mut final_conf = 0.0;
    let mut final_conc = Conclusiveness::Inconclusive;

    if n == 0 {
        return VirtSessionReport {
            phase: "specter_live".into(),
            ok: false,
            skipped: false,
            skip_reason: Some("empty_evidence".into()),
            windows,
            total_evidence: 0,
            final_confidence: 0.0,
            final_conclusiveness: Conclusiveness::Inconclusive,
            qemu_exit: None,
            qemu_bin: None,
            kernel: None,
            production: false,
            generates_os: honesty::GENERATES_OS,
            auto_fix_complete: honesty::AUTO_FIX_COMPLETE,
            honesty: honesty::NOTE.to_string(),
            note: "Specter Live: sem evidência — nada a pontuar".into(),
        };
    }

    let mut end = window_size.min(n);
    let mut idx = 0usize;
    while idx < cfg.max_windows && end <= n {
        let mut slice_db = EvidenceDb::new(&format!("{}#w{}", evidence.source, idx));
        for e in evidence.entries.iter().take(end) {
            slice_db.add(e.clone());
        }
        let report = TensionMetric::compute(
            &slice_db,
            spec,
            cfg.function_count,
            cfg.instruction_count,
            cfg.call_edge_count,
        );
        let w = VirtSessionWindow {
            index: idx,
            evidence_count: slice_db.count(),
            unique_mmio: slice_db.unique_mmio_addresses().len(),
            overall_tension: report.overall_tension,
            overall_confidence: report.overall_confidence,
            conclusiveness: report.conclusiveness,
        };
        final_conf = w.overall_confidence;
        final_conc = w.conclusiveness;
        windows.push(w);

        if end >= n {
            break;
        }
        end = (end + window_size).min(n);
        idx += 1;
    }

    VirtSessionReport {
        phase: "specter_live".into(),
        ok: true,
        skipped: false,
        skip_reason: None,
        windows,
        total_evidence: n,
        final_confidence: final_conf,
        final_conclusiveness: final_conc,
        qemu_exit: None,
        qemu_bin: None,
        kernel: None,
        production: false,
        generates_os: honesty::GENERATES_OS,
        auto_fix_complete: honesty::AUTO_FIX_COMPLETE,
        honesty: honesty::NOTE.to_string(),
        note: "Specter Live Ψ windows — ≠ OS turnkey / ≠ HIL production".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base_core::evidence::{EvidenceEntry, EvidenceType};
    use base_core::spec::types::*;
    use std::collections::HashMap;

    fn tiny_spec() -> HardwareSpec {
        HardwareSpec {
            version: 1,
            source: "virt_test".into(),
            cpu: CpuSpec {
                architecture: CpuArch::Arm64,
                clock_mhz: 1000,
                endianness: Endian::Little,
                cores: 1,
            },
            memory: MemoryLayout { regions: vec![] },
            blocks: vec![FunctionalBlock {
                id: "uart0".into(),
                kind: BlockKind::Uart,
                base_address: 0x40034000,
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
            }],
            interrupts: vec![],
            dma_channels: vec![],
            constraints: SystemConstraints {
                max_power_watts: 1.0,
                required_bandwidths: vec![],
                pin_count: None,
                pcb_layers: None,
                temp_range: None,
            },
            confidence: 0.5,
        }
    }

    #[test]
    fn windows_grow_confidence_path() {
        let mut db = EvidenceDb::new("t");
        for i in 0..40 {
            db.add(EvidenceEntry {
                id: format!("e{i}"),
                evidence_type: EvidenceType::MmioWrite {
                    address: 0x40034000 + (i % 4) * 4,
                    value: Some(i as u64),
                },
                context: HashMap::new(),
            });
        }
        let report = run_live_windows(
            &db,
            &tiny_spec(),
            &LiveConfig {
                window_size: 10,
                max_windows: 8,
                ..Default::default()
            },
        );
        assert!(report.ok);
        assert!(!report.windows.is_empty());
        assert_eq!(report.total_evidence, 40);
        assert!(!report.generates_os);
    }
}
