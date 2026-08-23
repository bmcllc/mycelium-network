//! W2 — goldens STM32 (event-graph + prove + field allowlist).
use std::fs;
use std::path::PathBuf;

fn expected_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../examples/pilot_stm32/expected")
}

#[test]
fn stm32_event_graph_goldens_exist_and_mention_usart1() {
    let dir = expected_dir();
    let dot = fs::read_to_string(dir.join("event_graph.dot")).expect("event_graph.dot");
    let mmd = fs::read_to_string(dir.join("event_graph.mmd")).expect("event_graph.mmd");
    assert!(dot.contains("0x4001380c") || dot.contains("0x40013800"));
    assert!(dot.contains("usart_init_to_tx"));
    assert!(mmd.contains("IRQ 0x25"));
    assert!(mmd.contains("usart_tx_byte"));
}

#[test]
fn stm32_prove_golden_is_sat_symbolic() {
    let text = fs::read_to_string(expected_dir().join("proof_report.golden.json")).unwrap();
    let v: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(v["backend"], "symbolic");
    assert_eq!(v["contracts_proved"], 2);
    assert_eq!(v["all_satisfied"], true);
    let results = v["results"].as_array().expect("results");
    assert_eq!(results.len(), 2);
    for r in results {
        assert_eq!(r["proved"], true);
        assert_eq!(r["satisfiable"], true);
        assert_eq!(r["backend"], "symbolic");
    }
}

#[test]
fn stm32_hardware_spec_fields_allowlist() {
    let text = fs::read_to_string(expected_dir().join("hardware_spec.fields.yaml")).unwrap();
    assert!(text.contains("required_top_level"));
    assert!(text.contains("blocks"));
    assert!(text.contains("0x40013800"));
    assert!(text.contains("STM32F103C8"));
}
