//! E4 — Study↔Live: Forth study over Evidence from NDJSON / plugin, optional QMP gate.

use anyhow::Result;
use base_core::evidence::EvidenceDb;
use base_core::spec::types::HardwareSpec;
use base_vm::{run_study_with_evidence, StudyPolicy, StudyReport};
use serde::Serialize;
use std::path::Path;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct LiveStudyReport {
    pub study: StudyReport,
    pub qmp_gated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qmp_notes: Option<Vec<String>>,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
}

/// Corre study com EvidenceDb; se `qmp_socket` existir, faz stop antes e cont depois.
pub fn run_live_study(
    spec: &HardwareSpec,
    evidence: EvidenceDb,
    policy: &StudyPolicy,
    program_src: Option<&str>,
    qmp_socket: Option<&Path>,
) -> Result<(HardwareSpec, LiveStudyReport)> {
    let mut notes = Vec::new();
    let mut qmp_gated = false;

    if let Some(sock) = qmp_socket {
        if sock.exists() {
            match crate::qmp::QmpClient::connect_unix_wait(sock, Duration::from_secs(3)) {
                Ok(mut c) => {
                    match c.stop() {
                        Ok(_) => {
                            qmp_gated = true;
                            notes.push("qmp:stop_before_study".into());
                        }
                        Err(e) => notes.push(format!("qmp:stop_failed:{e}")),
                    }
                }
                Err(e) => notes.push(format!("qmp:connect_failed:{e}")),
            }
        } else {
            notes.push("qmp:socket_missing".into());
        }
    }

    let (refined, study) =
        run_study_with_evidence(spec, Some(evidence), policy, program_src)?;

    if qmp_gated {
        if let Some(sock) = qmp_socket {
            if let Ok(mut c) = crate::qmp::QmpClient::connect_unix(sock) {
                match c.cont() {
                    Ok(_) => notes.push("qmp:cont_after_study".into()),
                    Err(e) => notes.push(format!("qmp:cont_failed:{e}")),
                }
            }
        }
    }

    let report = LiveStudyReport {
        study,
        qmp_gated,
        qmp_notes: if notes.is_empty() { None } else { Some(notes) },
        generates_os: base_core::GENERATES_OS,
        auto_fix_complete: base_core::AUTO_FIX_COMPLETE,
        honesty: base_core::HONESTY_NOTE.to_string(),
    };
    Ok((refined, report))
}

/// Carrega Evidence de YAML ou NDJSON (extensão / conteúdo).
pub fn load_evidence_flexible(path: &Path) -> Result<EvidenceDb> {
    let raw = std::fs::read_to_string(path)?;
    let trimmed = raw.trim_start();
    if trimmed.starts_with('{') || path.extension().and_then(|e| e.to_str()) == Some("ndjson") {
        Ok(crate::trace::ingest_ndjson(raw.as_bytes(), "specter_live_study")?)
    } else {
        Ok(EvidenceDb::from_yaml(&raw)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base_core::evidence::{EvidenceEntry, EvidenceType};
    use base_core::spec::types::*;
    use std::collections::HashMap;

    fn sample_spec() -> HardwareSpec {
        let mut spec = HardwareSpec::empty();
        spec.blocks.push(FunctionalBlock {
            id: "uart0".into(),
            kind: BlockKind::Uart,
            base_address: 0x4003_4000,
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
            confidence: 0.4,
        });
        spec
    }

    #[test]
    fn live_study_refines_with_trace() {
        let mut db = EvidenceDb::new("t");
        db.add(EvidenceEntry {
            id: "e0".into(),
            evidence_type: EvidenceType::MmioWrite {
                address: 0x4003_4000,
                value: Some(1),
            },
            context: HashMap::new(),
        });
        let policy = StudyPolicy {
            threshold: 0.99,
            max_steps: 4,
            continuous: false,
        };
        let (spec, report) =
            run_live_study(&sample_spec(), db, &policy, None, None).unwrap();
        assert!(report.study.live);
        assert!(!report.generates_os);
        assert!(!spec.blocks[0].registers.is_empty() || report.study.total_steps >= 1);
    }
}
