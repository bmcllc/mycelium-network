//! R3: ARM + AArch64 golden emit (+ optional arm-none-eabi-as assemble).

use base_recomp::roundtrip::{
    assemble_arm, emit_body, host_supports_arm_assemble,
};
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

#[test]
fn golden_arm_nop_ret() {
    let body = emit_body(&[0x90, 0xC3], "nop_ret", TargetIsa::Arm).unwrap();
    assert_eq!(body, golden("arm_nop_ret.s"));
}

#[test]
fn golden_arm_add3() {
    let body = emit_body(&ADD3, "add3", TargetIsa::Arm).unwrap();
    assert_eq!(body, golden("arm_add3.s"));
}

#[test]
fn golden_aarch64_nop_ret() {
    let body = emit_body(&[0x90, 0xC3], "nop_ret", TargetIsa::AArch64).unwrap();
    assert_eq!(body, golden("aarch64_nop_ret.s"));
}

#[test]
fn golden_aarch64_add3() {
    let body = emit_body(&ADD3, "add3", TargetIsa::AArch64).unwrap();
    assert_eq!(body, golden("aarch64_add3.s"));
}

#[test]
fn arm_assemble_add3_when_toolchain() {
    if !host_supports_arm_assemble() {
        eprintln!("skip: no arm-none-eabi-as");
        return;
    }
    let dir = std::env::temp_dir().join(format!("base-recomp-r3-arm-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    let obj = assemble_arm(&ADD3, "add3", &dir).expect("arm assemble");
    assert!(obj.exists());
    assert!(obj.metadata().unwrap().len() > 0);
}
