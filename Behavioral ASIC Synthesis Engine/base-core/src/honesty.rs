//! Honesty constants — B.A.S.E. is **not** an OS turnkey synthesizer.
//!
//! MMIO heuristics / DTB checklists / paleo-phylo assists never imply a bootable OS.

/// Always false: we do not emit a complete operating system.
pub const GENERATES_OS: bool = false;

/// Always false: structural refine / assist ≠ autonomous product fix.
pub const AUTO_FIX_COMPLETE: bool = false;

/// One-line banner for markdown atlases and CLI help.
pub const BANNER: &str = "≠ OS turnkey: `generates_os: false` · `auto_fix_complete: false` — heurísticas de MMIO sozinhas **não** bastam para gerar o sistema operacional completo.";

/// Extra line when a checklist hits 100%.
pub const READINESS_FULL_CAVEAT: &str = "Checklist 100% ≠ OS pronto / bootável / TaurOS — só pré-requisitos descobertos (DTB/evidência).";

/// Short YAML/JSON note field value.
pub const NOTE: &str =
    "not_os_turnkey: MMIO heuristics alone are insufficient for a complete OS";

#[inline]
pub fn generates_os_false() -> bool {
    GENERATES_OS
}

#[inline]
pub fn auto_fix_false() -> bool {
    AUTO_FIX_COMPLETE
}

#[inline]
pub fn default_note() -> String {
    NOTE.to_string()
}

/// Markdown honesty block (shared across atlases).
pub fn markdown_section() -> String {
    format!(
        "## Honesty\n\n- {}\n- `generates_os: {}` · `auto_fix_complete: {}`\n- {}\n",
        BANNER, GENERATES_OS, AUTO_FIX_COMPLETE, READINESS_FULL_CAVEAT
    )
}
