//! Host roundtrip smoke: assemble x86_64 emit with GNU `as` + link/run.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use thiserror::Error;

use crate::emit::emit_module;
use crate::lift::lift_x86_32;
use crate::target::TargetIsa;

#[derive(Debug, Error)]
pub enum RoundtripError {
    #[error("host is not x86_64 linux (got {arch}/{os})")]
    UnsupportedHost { arch: String, os: String },
    #[error("lift/emit produced Unknown gaps — refuse roundtrip")]
    HasGaps { count: usize },
    #[error("missing tool `{0}` on PATH")]
    MissingTool(String),
    #[error("assembler failed: {0}")]
    Assemble(String),
    #[error("link failed: {0}")]
    Link(String),
    #[error("harness exited {code} (expected eax/return {expected})")]
    Mismatch { code: i32, expected: u32 },
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Lift(#[from] crate::lift::LiftError),
}

/// True when this crate can attempt a live `as`/`cc` roundtrip.
pub fn host_supports_x86_64_roundtrip() -> bool {
    cfg!(all(target_arch = "x86_64", target_os = "linux"))
        && which("as").is_some()
        && which("cc").is_some()
}

fn which(bin: &str) -> Option<PathBuf> {
    Command::new("sh")
        .arg("-c")
        .arg(format!("command -v {bin}"))
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| PathBuf::from(String::from_utf8_lossy(&o.stdout).trim()))
}

/// Lift → emit x86_64 → assemble → link harness → run; expect `expected` in return (eax).
pub fn smoke_x86_64(
    bytes: &[u8],
    fn_name: &str,
    expected: u32,
    work_dir: &Path,
) -> Result<PathBuf, RoundtripError> {
    if !cfg!(all(target_arch = "x86_64", target_os = "linux")) {
        return Err(RoundtripError::UnsupportedHost {
            arch: std::env::consts::ARCH.into(),
            os: std::env::consts::OS.into(),
        });
    }
    if which("as").is_none() {
        return Err(RoundtripError::MissingTool("as".into()));
    }
    if which("cc").is_none() {
        return Err(RoundtripError::MissingTool("cc".into()));
    }

    fs::create_dir_all(work_dir)?;
    let module = lift_x86_32(bytes, fn_name)?;
    if module.lift_gaps > 0 {
        return Err(RoundtripError::HasGaps {
            count: module.lift_gaps,
        });
    }

    let asm = emit_module(&module, TargetIsa::X86_64);
    let s_path = work_dir.join(format!("{fn_name}.s"));
    let o_path = work_dir.join(format!("{fn_name}.o"));
    let c_path = work_dir.join("harness.c");
    let bin_path = work_dir.join("harness");

    // GNU as (x86): `#` comments; `;` separates statements — strip `;` banners.
    let mut gas = String::new();
    gas.push_str(".text\n");
    gas.push_str(&strip_asm_comments(&asm));
    gas.push_str(&format!(".type {fn_name}, @function\n"));
    fs::write(&s_path, gas)?;
    // Keep full emit (with honesty banner) for humans.
    fs::write(work_dir.join(format!("{fn_name}.full.s")), &asm)?;

    let as_out = Command::new("as")
        .args(["--64", "-o"])
        .arg(&o_path)
        .arg(&s_path)
        .output()?;
    if !as_out.status.success() {
        return Err(RoundtripError::Assemble(format!(
            "{}\n{}",
            String::from_utf8_lossy(&as_out.stderr),
            String::from_utf8_lossy(&as_out.stdout)
        )));
    }

    let harness = format!(
        r#"/* auto-generated R2 roundtrip — static_recomp_complete: false */
extern int {fn_name}(void);
int main(void) {{
    int r = {fn_name}();
    return (r == {expected}) ? 0 : 2;
}}
"#
    );
    fs::write(&c_path, harness)?;

    let cc_out = Command::new("cc")
        .args(["-no-pie", "-o"])
        .arg(&bin_path)
        .arg(&c_path)
        .arg(&o_path)
        .output()?;
    if !cc_out.status.success() {
        return Err(RoundtripError::Link(format!(
            "{}\n{}",
            String::from_utf8_lossy(&cc_out.stderr),
            String::from_utf8_lossy(&cc_out.stdout)
        )));
    }

    let run = Command::new(&bin_path).output()?;
    let code = run.status.code().unwrap_or(-1);
    if code != 0 {
        return Err(RoundtripError::Mismatch { code, expected });
    }

    Ok(bin_path)
}

/// Body-only ASM (no `;` comment lines) for golden diffs.
pub fn emit_body(
    bytes: &[u8],
    fn_name: &str,
    target: TargetIsa,
) -> Result<String, crate::lift::LiftError> {
    let module = lift_x86_32(bytes, fn_name)?;
    let full = emit_module(&module, target);
    Ok(strip_asm_comments(&full))
}

pub fn emit_x86_64_body(bytes: &[u8], fn_name: &str) -> Result<String, crate::lift::LiftError> {
    emit_body(bytes, fn_name, TargetIsa::X86_64)
}

pub fn strip_asm_comments(asm: &str) -> String {
    asm.lines()
        .filter(|l| {
            let t = l.trim_start();
            // `;` gas banners · `@` ARM · `!` SuperH comment lines (not instructions)
            !(t.starts_with(';')
                || t.starts_with("@ ")
                || t == "@"
                || t.starts_with('!'))
        })
        .map(|l| l.trim_end())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
        + "\n"
}

/// True when `arm-none-eabi-as` (or override `BASE_RECOMP_ARM_AS`) is on PATH.
pub fn host_supports_arm_assemble() -> bool {
    arm_assembler().is_some()
}

fn arm_assembler() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("BASE_RECOMP_ARM_AS") {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return Some(pb);
        }
    }
    which("arm-none-eabi-as").or_else(|| which("arm-linux-gnueabi-as"))
}

/// Lift → emit ARM → assemble only (no qemu run). Object path returned.
pub fn assemble_arm(bytes: &[u8], fn_name: &str, work_dir: &Path) -> Result<PathBuf, RoundtripError> {
    let Some(assembler) = arm_assembler() else {
        return Err(RoundtripError::MissingTool("arm-none-eabi-as".into()));
    };
    let module = lift_x86_32(bytes, fn_name)?;
    if module.lift_gaps > 0 {
        return Err(RoundtripError::HasGaps {
            count: module.lift_gaps,
        });
    }
    fs::create_dir_all(work_dir)?;
    let body = strip_asm_comments(&emit_module(&module, TargetIsa::Arm));
    let s_path = work_dir.join(format!("{fn_name}.s"));
    let o_path = work_dir.join(format!("{fn_name}.o"));
    let mut gas = String::new();
    gas.push_str(".text\n.syntax unified\n.arm\n");
    gas.push_str(&body);
    fs::write(&s_path, gas)?;
    fs::write(
        work_dir.join(format!("{fn_name}.full.s")),
        emit_module(&module, TargetIsa::Arm),
    )?;

    let as_out = Command::new(&assembler)
        .arg("-o")
        .arg(&o_path)
        .arg(&s_path)
        .output()?;
    if !as_out.status.success() {
        return Err(RoundtripError::Assemble(format!(
            "{}\n{}",
            String::from_utf8_lossy(&as_out.stderr),
            String::from_utf8_lossy(&as_out.stdout)
        )));
    }
    Ok(o_path)
}
