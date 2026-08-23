//! R4: MIPS + PowerPC + SPARC golden emit (assemble live = quando toolchain existir).

use base_recomp::roundtrip::emit_body;
use base_recomp::target::TargetIsa;
use std::fs;
use std::path::PathBuf;

fn golden(name: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/goldens")
        .join(name);
    fs::read_to_string(path).expect("golden readable")
}

const ADD3: [u8; 11] = [
    0xB8, 0x01, 0x00, 0x00, 0x00, 0x05, 0x02, 0x00, 0x00, 0x00, 0xC3,
];

fn assert_golden(bytes: &[u8], name: &str, target: TargetIsa, file: &str) {
    let body = emit_body(bytes, name, target).unwrap();
    assert_eq!(body, golden(file), "mismatch for {file}");
}

#[test]
fn golden_mips_nop_ret() {
    assert_golden(&[0x90, 0xC3], "nop_ret", TargetIsa::Mips, "mips_nop_ret.s");
}

#[test]
fn golden_mips_add3() {
    assert_golden(&ADD3, "add3", TargetIsa::Mips, "mips_add3.s");
}

#[test]
fn golden_ppc_nop_ret() {
    assert_golden(&[0x90, 0xC3], "nop_ret", TargetIsa::Ppc, "ppc_nop_ret.s");
}

#[test]
fn golden_ppc_add3() {
    assert_golden(&ADD3, "add3", TargetIsa::Ppc, "ppc_add3.s");
}

#[test]
fn golden_sparc_nop_ret() {
    assert_golden(&[0x90, 0xC3], "nop_ret", TargetIsa::Sparc, "sparc_nop_ret.s");
}

#[test]
fn golden_sparc_add3() {
    assert_golden(&ADD3, "add3", TargetIsa::Sparc, "sparc_add3.s");
}

#[test]
fn classic_risc_emit_all_targets_cli_aliases() {
    for (alias, isa) in [
        ("mips", TargetIsa::Mips),
        ("ppc", TargetIsa::Ppc),
        ("powerpc", TargetIsa::Ppc),
        ("sparc", TargetIsa::Sparc),
    ] {
        let parsed: TargetIsa = alias.parse().unwrap();
        assert_eq!(parsed, isa);
        let asm = emit_body(&ADD3, "add3", parsed).unwrap();
        assert!(asm.contains("add3"));
    }
}
