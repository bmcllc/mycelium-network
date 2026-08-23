//! R4 — tension Ψ + check honesty on the UART wedge.
use base_core::inference::extraction::MmioAccess;
use base_core::inference::generate_spec_with_evidence;
use base_core::loop_::evidence_confidence;
use base_core::spec::types::BlockKind;
use base_core::tension::TensionMetric;
use std::fs;
use std::path::PathBuf;

fn pilot_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../examples/pilot")
}

#[test]
fn pilot_tension_report_serializes() {
    let path = pilot_dir().join("mmio.json");
    let text = fs::read_to_string(&path).unwrap();
    let accesses: Vec<MmioAccess> = serde_json::from_str(&text).unwrap();
    let (mut spec, evidence) = generate_spec_with_evidence(&accesses, "pilot/fw.bin");
    for b in &mut spec.blocks {
        b.kind = BlockKind::Uart;
        b.confidence = evidence_confidence(b);
    }
    let report = TensionMetric::compute(&evidence, &spec, 1, 60, 0);
    let json = TensionMetric::to_json(&report).unwrap();
    assert!(json.contains("overall_tension"));
    assert!(json.contains("overall_confidence"));
    assert!(report.overall_tension >= 0.0);
}

#[test]
fn pilot_slow_trace_fixture_exists() {
    let slow = pilot_dir().join("trace_slow.csv");
    assert!(slow.exists(), "examples/pilot/trace_slow.csv required for dual check");
    let orig = fs::read_to_string(pilot_dir().join("trace.csv")).unwrap();
    let slow_txt = fs::read_to_string(&slow).unwrap();
    assert_ne!(orig, slow_txt);
    // 10× timestamps after first line
    assert!(slow_txt.contains("0.000001500"));
}
