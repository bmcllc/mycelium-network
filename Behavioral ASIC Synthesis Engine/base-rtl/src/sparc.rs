//! SPARC RTL generation — SIR → synthesizable Verilog.

use std::fs;
use std::path::Path;
use base_recomp::elf::lift_elf_text;
use crate::verilog::VerilogCore;

pub fn generate(elf_path: Option<&Path>, output: &Path) -> anyhow::Result<VerilogCore> {
    let name = "sparc_sir_core".to_string();

    let init_mem = if let Some(path) = elf_path {
        let (text, _module) = lift_elf_text(path, "main")?;
        let words: Vec<u32> = text.bytes
            .chunks(4)
            .map(|c| u32::from_be_bytes(c.try_into().unwrap_or([0; 4])))
            .collect();
        Some(words)
    } else {
        None
    };

    let mut verilog = String::new();
    
    // Include all pipeline modules
    verilog.push_str(include_str!("cores/sparc_delay.v"));
    verilog.push_str("\n\n");
    verilog.push_str(include_str!("cores/sparc_hazard.v"));
    verilog.push_str("\n\n");
    verilog.push_str(include_str!("cores/sparc_forwarding.v"));
    verilog.push_str("\n\n");
    
    // Pipeline core
    verilog.push_str(&include_str!("cores/sparc_pipeline.v")
        .replace("MODULE_NAME", &name)
        .replace("MEM_INIT_BLOCK", &init_mem.map(|_| String::new()).unwrap_or_default())
    );
    
    let tb = VerilogCore { name, isa: "sparc".into(), width: 32, regs: 32, verilog, testbench: String::new() };
    fs::write(output, &tb.verilog)?;
    Ok(tb)
}
