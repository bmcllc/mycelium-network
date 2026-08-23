//! Test Sparc sweep mismatches

use base_recomp::{TargetIsa, semexec::{differential_sweep}};

fn main() {
    let t = TargetIsa::Sparc;
    let s = differential_sweep(t);
    println!("Sparc sweep: applicable={}, matched={}, mismatches={}", s.applicable, s.matched, s.mismatches.len());
    for (label, ref_state, isa_state) in &s.mismatches {
        println!("  Mismatch: {}", label);
        println!("    ref gpr: {:?}", ref_state.gpr);
        println!("    ref flags: {:?}", ref_state.flags);
        println!("    ref pc: {:?}", ref_state.pc);
        println!("    isa gpr: {:?}", isa_state.gpr);
        println!("    isa flags: {:?}", isa_state.flags);
        println!("    isa pc: {:?}", isa_state.pc);
    }
}
