//! Z1 — goldens STM32 SPI2 (event-graph + prove; verified, not overwritten).
use std::fs;
use std::path::PathBuf;

fn expected_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../examples/pilot_stm32/expected_spi")
}

#[test]
fn stm32_spi_event_graph_goldens_exist_and_mention_spi2() {
    let dir = expected_dir();
    let dot = fs::read_to_string(dir.join("event_graph.dot")).expect("event_graph.dot");
    let mmd = fs::read_to_string(dir.join("event_graph.mmd")).expect("event_graph.mmd");
    assert!(dot.contains("0x40003800") || dot.contains("0x4000380c"));
    assert!(dot.contains("spi2_init_to_irq"));
    assert!(mmd.contains("IRQ 0x24"));
    assert!(mmd.contains("spi2_xfer_byte"));
}

#[test]
fn stm32_spi_prove_golden_is_sat_symbolic() {
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
    assert_eq!(results[0]["contract"], "spi2_init_to_irq");
    assert_eq!(results[1]["contract"], "spi2_xfer_byte");
}
