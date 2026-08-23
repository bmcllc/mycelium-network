//! R5: SuperH SH-2 / SH-4 golden emit + honesty banner intact.

use base_recomp::emit::emit_module;
use base_recomp::honesty::{STATIC_RECOMP_COMPLETE, WIN32_ABI_COMPLETE, RUNS_ANY_PE};
use base_recomp::lift::lift_x86_32;
use base_recomp::roundtrip::emit_body;
use base_recomp::target::{SuperHFlavor, TargetIsa};
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

#[test]
fn golden_sh2_nop_ret() {
    let body = emit_body(
        &[0x90, 0xC3],
        "nop_ret",
        TargetIsa::SuperH(SuperHFlavor::Sh2),
    )
    .unwrap();
    assert_eq!(body, golden("sh_nop_ret.s"));
}

#[test]
fn golden_sh4_add3() {
    let body = emit_body(&ADD3, "add3", TargetIsa::SuperH(SuperHFlavor::Sh4)).unwrap();
    assert_eq!(body, golden("sh_add3.s"));
}

#[test]
fn sh2_and_sh4_bodies_match_subset() {
    let a = emit_body(&ADD3, "add3", TargetIsa::SuperH(SuperHFlavor::Sh2)).unwrap();
    let b = emit_body(&ADD3, "add3", TargetIsa::SuperH(SuperHFlavor::Sh4)).unwrap();
    assert_eq!(a, b, "subset ops identical; flavor only in full banner");
}

#[test]
fn full_emit_distinguishes_flavor() {
    let m = lift_x86_32(&[0xC3], "f").unwrap();
    let sh2 = emit_module(&m, TargetIsa::SuperH(SuperHFlavor::Sh2));
    let sh4 = emit_module(&m, TargetIsa::SuperH(SuperHFlavor::Sh4));
    assert!(sh2.contains("SH-2 (Saturn class)"));
    assert!(sh4.contains("SH-4 (Dreamcast class)"));
    assert!(sh2.contains("static_recomp_complete"));
    assert!(sh4.contains("static_recomp_complete"));
}

#[test]
fn honesty_banner_intact_at_r5() {
    assert!(!STATIC_RECOMP_COMPLETE);
    assert!(!WIN32_ABI_COMPLETE);
    assert!(!RUNS_ANY_PE);
}

#[test]
fn cli_aliases_sh() {
    assert_eq!(
        "sh2".parse::<TargetIsa>().unwrap(),
        TargetIsa::SuperH(SuperHFlavor::Sh2)
    );
    assert_eq!(
        "sh4".parse::<TargetIsa>().unwrap(),
        TargetIsa::SuperH(SuperHFlavor::Sh4)
    );
    assert_eq!(
        "superh".parse::<TargetIsa>().unwrap(),
        TargetIsa::SuperH(SuperHFlavor::Sh2)
    );
}
