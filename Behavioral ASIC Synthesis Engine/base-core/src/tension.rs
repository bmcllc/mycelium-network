/// Tensão Ψ — métrica formal de confiança baseada na Paleocomputação Estrutural.
///
/// Ψ(B, H) = ∫ δ(ω_obs, ω_H) dμ
///
/// A tensão é convertida em conclusividade via:
///   conclusive:        confidence ≥ 0.85 (Ψ_normalized ≤ 0.15)
///   inconclusive:      0.15 < confidence < 0.85
///   conclusive_no:     confidence ≤ 0.15 (Ψ_normalized ≥ 0.85)
use crate::evidence::{EvidenceDb, EvidenceType, EvidenceEntry};
use crate::spec::types::{HardwareSpec, FunctionalBlock};

/// Status de conclusão da análise
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Conclusiveness {
    ConclusiveMatch,     // ≥ 85% — é um match confiável
    ConclusiveNoMatch,   // ≤ 15% — definitivamente não é um match
    Inconclusive,        // entre 15% e 85% — precisa de mais evidência
}

/// Resultado completo da análise de tensão
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TensionReport {
    pub overall_tension: f64,
    pub overall_confidence: f64,
    pub compilatory_entropy: f64,
    pub conclusiveness: Conclusiveness,
    pub function_count: usize,
    pub instruction_count: usize,
    pub call_edge_count: usize,
    pub block_tensions: Vec<BlockTension>,
    /// Always false — Ψ scoring ≠ OS synthesis.
    #[serde(default = "crate::honesty::generates_os_false")]
    pub generates_os: bool,
    /// Always false — confidence ≠ auto-fix complete.
    #[serde(default = "crate::honesty::auto_fix_false")]
    pub auto_fix_complete: bool,
    #[serde(default = "crate::honesty::default_note")]
    pub honesty: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BlockTension {
    pub block_id: String,
    pub tension: f64,
    pub confidence: f64,
    pub conclusiveness: Conclusiveness,
    pub components: TensionComponents,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TensionComponents {
    pub register_divergence: f64,
    pub access_divergence: f64,
    pub timing_divergence: f64,
    pub structural_divergence: f64,
    pub function_evidence: f64,    // quantas funções vs esperado
    pub block_weight: f64,
}

/// Calculador de tensão Ψ
pub struct TensionMetric;

impl TensionMetric {
    /// Calcula a tensão entre Evidence DB e HardwareSpec
    pub fn compute(
        evidence: &EvidenceDb,
        spec: &HardwareSpec,
        function_count: usize,
        instruction_count: usize,
        call_edge_count: usize,
    ) -> TensionReport {
        let total_evidence = evidence.count() as f64;
        let unique_addrs = evidence.unique_mmio_addresses().len() as f64;

        // Entropia compilatória S(B) = ln(evidence_density × block_complexity)
        let compilatory_entropy = if total_evidence > 0.0 && unique_addrs > 0.0 {
            let density = total_evidence / unique_addrs.max(1.0);
            let complexity = spec.blocks.len().max(1) as f64;
            (density * complexity.sqrt()).ln().max(0.0)
        } else { 0.0 };

        // Evidência estrutural de alto nível (funções, instruções, call graph)
        let fn_evidence = function_count.min(1000) as f64 / 1000.0;   // 0..1, 1000+ = 1.0
        let insn_evidence = instruction_count.min(100000) as f64 / 100000.0;
        let call_evidence = call_edge_count.min(10000) as f64 / 10000.0;
        let structural_mass = (fn_evidence + insn_evidence + call_evidence) / 3.0;

        let mut block_tensions = Vec::new();
        let mut total_weight = 0.0;
        let mut weighted_tension = 0.0;

        for block in &spec.blocks {
            let bt = Self::compute_block_tension(block, evidence, structural_mass);
            weighted_tension += bt.tension * bt.components.block_weight;
            total_weight += bt.components.block_weight;
            block_tensions.push(bt);
        }

        let overall_tension = if total_weight > 0.0 {
            weighted_tension / total_weight
        } else {
            compilatory_entropy.min(1.0)
        };

        let psi_norm = overall_tension / (1.0 + overall_tension);
        let confidence = (1.0 - psi_norm).max(0.0).min(1.0);
        let conclusiveness = Self::classify(confidence);

        TensionReport {
            overall_tension,
            overall_confidence: confidence,
            compilatory_entropy,
            conclusiveness,
            function_count,
            instruction_count,
            call_edge_count,
            block_tensions,
            generates_os: crate::honesty::GENERATES_OS,
            auto_fix_complete: crate::honesty::AUTO_FIX_COMPLETE,
            honesty: crate::honesty::NOTE.to_string(),
        }
    }

    fn compute_block_tension(
        block: &FunctionalBlock,
        evidence: &EvidenceDb,
        structural_mass: f64,
    ) -> BlockTension {
        let relevant: Vec<&EvidenceEntry> = evidence.entries.iter().filter(|e| {
            match &e.evidence_type {
                EvidenceType::MmioWrite { address, .. } | EvidenceType::MmioRead { address } => {
                    block.base_address <= *address && *address < block.base_address + block.size
                }
                _ => false,
            }
        }).collect();

        // δ_reg: register coverage
        let observed_addrs: Vec<u64> = relevant.iter().filter_map(|e| {
            match e.evidence_type {
                EvidenceType::MmioWrite { address, .. } | EvidenceType::MmioRead { address } => Some(address),
                _ => None,
            }
        }).collect();

        let register_divergence = {
            let covered = block.registers.iter().filter(|r| {
                observed_addrs.contains(&(block.base_address + r.offset as u64))
            }).count() as f64;
            let reg_count = block.registers.len() as f64;
            let obs_count = observed_addrs.len() as f64;

            if obs_count > 0.0 && reg_count > 0.0 {
                let coverage = covered / obs_count.max(reg_count);
                1.0 - coverage
            } else if obs_count > 0.0 && reg_count == 0.0 {
                0.9  // has evidence but no model
            } else {
                0.5  // no evidence to compare
            }
        };

        // δ_acc: access pattern
        let writes = relevant.iter().filter(|e| matches!(e.evidence_type, EvidenceType::MmioWrite { .. })).count() as f64;
        let reads = relevant.iter().filter(|e| matches!(e.evidence_type, EvidenceType::MmioRead { .. })).count() as f64;
        let total_acc = writes + reads;

        let access_divergence = if total_acc > 0.0 {
            let obs_wr_ratio = writes / total_acc;
            let model_writes = block.registers.iter()
                .filter(|r| matches!(r.access, crate::spec::types::AccessType::Write | crate::spec::types::AccessType::ReadWrite))
                .count() as f64;
            let model_total = block.registers.len() as f64;
            let model_wr_ratio = if model_total > 0.0 { model_writes / model_total } else { 0.5 };
            (obs_wr_ratio - model_wr_ratio).abs()
        } else { 0.0 };

        // δ_tim: timing evidence
        let timing_divergence = if block.timing.activation.is_some() || block.timing.processing.is_some() {
            if relevant.len() > 5 { 0.15 } else { 0.4 }
        } else { 0.85 };

        // δ_str: structural divergence
        let structural_divergence = {
            let base = if block.registers.is_empty() { 0.85 }
                      else if block.confidence < 0.3 { 0.6 }
                      else if block.confidence < 0.6 { 0.35 }
                      else { 0.1 };
            // Boost by structural mass: if we have lots of functions/instructions
            // but few registers, the model is incomplete
            if structural_mass > 0.5 && block.registers.len() <= 1 {
                (base + 0.2f64).min(1.0)
            } else {
                base
            }
        };

        // dμ: weight scales with evidence volume
        let evidence_volume = relevant.len() as f64;
        let reg_count = block.registers.len() as f64;
        let block_weight = 0.5f64
            + 0.3f64 * (evidence_volume / 20.0).min(1.0)
            + 0.2f64 * (reg_count / 16.0).min(1.0);

        // Aggregate components with weights
        let fn_evidence = structural_mass;
        let components = TensionComponents {
            register_divergence,
            access_divergence,
            timing_divergence,
            structural_divergence,
            function_evidence: fn_evidence,
            block_weight,
        };

        // Weighted combination
        let raw_tension =
            register_divergence * 0.30
            + access_divergence * 0.15
            + timing_divergence * 0.15
            + structural_divergence * 0.25
            + (1.0 - fn_evidence) * 0.15;

        let psi_norm = raw_tension / (1.0 + raw_tension);
        let confidence = (1.0 - psi_norm).max(0.0).min(1.0);

        // Sigmoid sharpening: push confidence toward extremes
        let sharpened = Self::sharpen(confidence);

        BlockTension {
            block_id: block.id.clone(),
            tension: raw_tension,
            confidence: sharpened,
            conclusiveness: Self::classify(sharpened),
            components,
        }
    }

    /// Sigmoid sharpening: push values toward 0 or 1
    fn sharpen(x: f64) -> f64 {
        // f(x) = 1 / (1 + e^(-s*(x-0.5))) where s = steepness
        let s = 6.0; // steepness factor
        1.0 / (1.0 + (-s * (x - 0.5)).exp())
    }

    /// Classifica a confiança em conclusiva ou não
    pub fn classify(confidence: f64) -> Conclusiveness {
        if confidence >= 0.85 {
            Conclusiveness::ConclusiveMatch
        } else if confidence <= 0.15 {
            Conclusiveness::ConclusiveNoMatch
        } else {
            Conclusiveness::Inconclusive
        }
    }

    /// Serializa o relatório para JSON (artefato `tension_report.json`).
    pub fn to_json(report: &TensionReport) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(report)
    }

    /// Relatório de diagnóstico em texto
    pub fn format_report(report: &TensionReport) -> String {
        let mut s = String::new();
        s.push_str(&format!("=== Tension Report ===\n"));
        s.push_str(&format!("Functions: {} | Instructions: {} | Call edges: {}\n",
            report.function_count, report.instruction_count, report.call_edge_count));
        s.push_str(&format!("Compilatory entropy S(B): {:.4}\n", report.compilatory_entropy));
        s.push_str(&format!("Overall tension Ψ: {:.4}\n", report.overall_tension));
        s.push_str(&format!("Overall confidence: {:.2}%\n", report.overall_confidence * 100.0));
        s.push_str(&format!("Conclusiveness: {:?}\n", report.conclusiveness));

        if report.block_tensions.len() <= 10 {
            s.push_str("\nPer-block:\n");
            for bt in &report.block_tensions {
                s.push_str(&format!("  {:.30}: conf={:.1}% {:?} (reg={:.2}, acc={:.2}, tim={:.2}, str={:.2})\n",
                    bt.block_id,
                    bt.confidence * 100.0,
                    bt.conclusiveness,
                    bt.components.register_divergence,
                    bt.components.access_divergence,
                    bt.components.timing_divergence,
                    bt.components.structural_divergence,
                ));
            }
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::evidence::*;
    use crate::spec::types::*;
    use std::collections::HashMap;

    fn sample_evidence() -> EvidenceDb {
        let mut db = EvidenceDb::new("test");
        db.add(EvidenceEntry {
            id: "ev_001".into(),
            evidence_type: EvidenceType::MmioWrite { address: 0x10000000, value: Some(1) },
            context: [("func".into(), "init".into())].into(),
        });
        db.add(EvidenceEntry {
            id: "ev_002".into(),
            evidence_type: EvidenceType::MmioWrite { address: 0x10000004, value: Some(0) },
            context: HashMap::new(),
        });
        db.add(EvidenceEntry {
            id: "ev_003".into(),
            evidence_type: EvidenceType::MmioRead { address: 0x10000004 },
            context: HashMap::new(),
        });
        db
    }

    fn sample_spec() -> HardwareSpec {
        let mut spec = HardwareSpec::empty();
        spec.blocks.push(FunctionalBlock {
            id: "gpu_0".into(), kind: BlockKind::Gpu,
            base_address: 0x10000000, size: 0x1000,
            registers: vec![
                Register { offset: 0, name: Some("control".into()), width: 32,
                    access: AccessType::ReadWrite, purpose: RegisterPurpose::Control,
                    reset_value: None, observed_values: vec![], bitfields: vec![], polling: false, count: 0,
                },
                Register { offset: 4, name: Some("status".into()), width: 32,
                    access: AccessType::Read, purpose: RegisterPurpose::Status,
                    reset_value: None, observed_values: vec![], bitfields: vec![], polling: false, count: 0,
                },
            ],
            protocol: Protocol { states: vec![], transitions: vec![], entry_condition: None, exit_condition: None },
            timing: TimingProfile {
                activation: Some(LatencyRange::new(100, 500, 300)),
                processing: None, interrupt_response: None, dma_setup: None, polling_interval: None,
            },
            dma: None, dependencies: vec![], confidence: 0.8,
        });
        spec
    }

    #[test]
    fn test_tension_compute() {
        let evidence = sample_evidence();
        let spec = sample_spec();
        let report = TensionMetric::compute(&evidence, &spec, 100, 5000, 200);
        assert!(report.overall_tension >= 0.0);
        assert!(report.overall_confidence >= 0.0 && report.overall_confidence <= 1.0);
        assert!(!report.block_tensions.is_empty());
        assert!(!report.generates_os);
        assert!(!report.auto_fix_complete);
        assert!(report.honesty.contains("not_os_turnkey"));
    }

    #[test]
    fn test_conclusiveness_classify() {
        assert_eq!(TensionMetric::classify(0.90), Conclusiveness::ConclusiveMatch);
        assert_eq!(TensionMetric::classify(0.10), Conclusiveness::ConclusiveNoMatch);
        assert_eq!(TensionMetric::classify(0.50), Conclusiveness::Inconclusive);
    }

    #[test]
    fn test_sharpen() {
        let s = TensionMetric::sharpen(0.5);
        assert!((s - 0.5).abs() < 0.1, "0.5 should stay near 0.5");
        let s_high = TensionMetric::sharpen(0.75);
        assert!(s_high > 0.75, "0.75 should be pushed higher");
        let s_low = TensionMetric::sharpen(0.25);
        assert!(s_low < 0.25, "0.25 should be pushed lower");
    }

    #[test]
    fn test_high_evidence_high_confidence() {
        let mut evidence = EvidenceDb::new("test");
        for i in 0..20 {
            evidence.add(EvidenceEntry {
                id: format!("ev_{}", i),
                evidence_type: EvidenceType::MmioWrite { address: 0x10000000 + i * 4, value: Some(i) },
                context: HashMap::new(),
            });
        }
        let mut spec = HardwareSpec::empty();
        spec.blocks.push(FunctionalBlock {
            id: "test".into(), kind: BlockKind::Unknown,
            base_address: 0x10000000, size: 0x200,
            registers: (0..20).map(|i| Register {
                offset: i * 4, name: Some(format!("r{}", i)), width: 32,
                access: AccessType::ReadWrite, purpose: RegisterPurpose::UnknownPurpose,
                reset_value: None, observed_values: vec![], bitfields: vec![], polling: false, count: 0,
            }).collect(),
            protocol: Protocol { states: vec![], transitions: vec![], entry_condition: None, exit_condition: None },
            timing: TimingProfile {
                activation: Some(LatencyRange::new(100, 500, 300)),
                processing: None, interrupt_response: None, dma_setup: None, polling_interval: None,
            },
            dma: None, dependencies: vec![], confidence: 0.9,
        });
        let report = TensionMetric::compute(&evidence, &spec, 520, 35740, 4183);
        assert!(report.overall_confidence >= 0.85,
            "High evidence should be conclusive, got {:.2}%",
            report.overall_confidence * 100.0);
        assert_eq!(report.conclusiveness, Conclusiveness::ConclusiveMatch);
    }

    #[test]
    fn test_format_report() {
        let evidence = sample_evidence();
        let spec = sample_spec();
        let report = TensionMetric::compute(&evidence, &spec, 100, 5000, 200);
        let text = TensionMetric::format_report(&report);
        assert!(text.contains("Tension Report"));
        assert!(text.contains("confidence"));
    }

    #[test]
    fn test_more_evidence_lower_tension() {
        // Mesmo bloco; sparse cobre metade dos regs, dense cobre todos (+ mass estrutural)
        let mut spec = HardwareSpec::empty();
        spec.blocks.push(FunctionalBlock {
            id: "uart_0".into(),
            kind: BlockKind::Uart,
            base_address: 0x40034000,
            size: 0x40,
            registers: (0..8)
                .map(|i| Register {
                    offset: i * 4,
                    name: Some(format!("r{}", i)),
                    width: 32,
                    access: AccessType::ReadWrite,
                    purpose: RegisterPurpose::UnknownPurpose,
                    reset_value: None,
                    observed_values: vec![],
                    bitfields: vec![],
                    polling: false,
                    count: 0,
                })
                .collect(),
            protocol: Protocol {
                states: vec![],
                transitions: vec![],
                entry_condition: None,
                exit_condition: None,
            },
            timing: TimingProfile {
                activation: Some(LatencyRange::new(100, 500, 300)),
                processing: None,
                interrupt_response: None,
                dma_setup: None,
                polling_interval: None,
            },
            dma: None,
            dependencies: vec![],
            confidence: 0.5,
        });

        let mut sparse = EvidenceDb::new("sparse");
        for i in 0..2 {
            sparse.add(EvidenceEntry {
                id: format!("s{}", i),
                evidence_type: EvidenceType::MmioWrite {
                    address: 0x40034000 + i * 4,
                    value: Some(1),
                },
                context: HashMap::new(),
            });
        }
        let mut dense = EvidenceDb::new("dense");
        for i in 0..8 {
            dense.add(EvidenceEntry {
                id: format!("d{}", i),
                evidence_type: EvidenceType::MmioWrite {
                    address: 0x40034000 + i * 4,
                    value: Some(1),
                },
                context: HashMap::new(),
            });
        }

        let low = TensionMetric::compute(&sparse, &spec, 5, 50, 1);
        let high = TensionMetric::compute(&dense, &spec, 200, 8000, 400);
        assert!(
            high.overall_confidence > low.overall_confidence,
            "aligned denser evidence should raise confidence: sparse={:.3}, dense={:.3}",
            low.overall_confidence,
            high.overall_confidence
        );
        let json = TensionMetric::to_json(&high).unwrap();
        assert!(json.contains("overall_tension"));
        assert!(json.contains("overall_confidence"));
    }
}
