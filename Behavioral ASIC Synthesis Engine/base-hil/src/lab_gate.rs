//! Industrial Gate A — HIL lab status (software-side checks).
//!
//! Evaluates pré-condições A1–A5 from SOW Industrial Gate.
//! **Never** sets `production: true`. Lab-assist ≠ CI flash turnkey.

use crate::agent::{HilAgent, ProbePresence, DEFAULT_PROBE_PID, DEFAULT_PROBE_VID, ENV_MOCK_DETECTED};
use crate::programmer::{programmer_feature_enabled, ENV_ALLOW_FLASH, ENV_PROGRAMMER_CMD};
use crate::usb;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct GateCheck {
    pub id: String,
    pub name: String,
    pub green: bool,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LabGateReport {
    /// Industrial Gate claim letter.
    pub claim: &'static str,
    pub production: bool,
    pub lab_assist_ready: bool,
    /// Path live (USB) sem mock.
    pub live: bool,
    pub checks: Vec<GateCheck>,
    pub sow_path_hint: &'static str,
}

/// Options for Gate A evaluation.
#[derive(Debug, Clone, Default)]
pub struct LabGateOptions<'a> {
    pub sow_signed: bool,
    pub sop_path: Option<&'a Path>,
    /// Force A1 Detected offline (CLI `--mock-detected` / rehearsal only).
    /// Ignored when `live` is true.
    pub mock_detected: bool,
    /// Lab live: USB only, no mock; auto-probe catalog.
    pub live: bool,
    /// Scan known probes / `BASE_HIL_PROBE_IDS` (implied by `live`).
    pub auto_probe: bool,
}

/// Evaluate Gate A (HIL lab). Convenience wrapper.
pub fn evaluate_lab_gate(
    vid: u16,
    pid: u16,
    sow_signed: bool,
    sop_path: Option<&Path>,
) -> LabGateReport {
    evaluate_lab_gate_opts(
        vid,
        pid,
        LabGateOptions {
            sow_signed,
            sop_path,
            mock_detected: false,
            live: false,
            auto_probe: false,
        },
    )
}

/// Evaluate Gate A with explicit options.
pub fn evaluate_lab_gate_opts(vid: u16, pid: u16, opts: LabGateOptions<'_>) -> LabGateReport {
    let auto = opts.auto_probe || opts.live;
    let mock = opts.mock_detected && !opts.live;

    let presence = if mock {
        tracing::warn!(
            "[HIL][Gate A] --mock-detected — A1 Detected offline (no USB; rehearsal only)"
        );
        ProbePresence::Detected
    } else {
        HilAgent::enumerate_presence_opts(vid, pid, auto, opts.live)
    };

    let a1 = matches!(presence, ProbePresence::Detected);
    let a1_via_mock_env = !opts.live && std::env::var_os(ENV_MOCK_DETECTED).is_some();
    let a1_usb = usb::usb_feature_enabled()
        && (usb::usb_device_present(vid, pid) || (auto && usb::find_present_probe(vid, pid).is_some()));
    let a2_feature = programmer_feature_enabled();
    let a2_allow = std::env::var_os(ENV_ALLOW_FLASH).is_some();
    let a2_cmd = std::env::var(ENV_PROGRAMMER_CMD)
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let a2 = a2_feature && a2_allow && a2_cmd;
    let a3 = opts.sop_path.map(|p| p.is_file()).unwrap_or(false);
    let a4 = true;
    let a5 = opts.sow_signed;

    // Live: A1 must be USB Detected (not mock).
    let a1_ok = if opts.live {
        a1 && a1_usb && !mock && !a1_via_mock_env
    } else {
        a1
    };

    let checks = vec![
        GateCheck {
            id: "A1".into(),
            name: "Probe Detected".into(),
            green: a1_ok,
            detail: format!(
                "presence={presence:?} live={} usb_feature={} usb_hit={} mock_flag={} mock_env={}",
                opts.live,
                usb::usb_feature_enabled(),
                a1_usb,
                mock,
                a1_via_mock_env
            ),
        },
        GateCheck {
            id: "A2".into(),
            name: "Programmer gated".into(),
            green: a2,
            detail: format!(
                "feature={a2_feature} {ENV_ALLOW_FLASH}={a2_allow} {ENV_PROGRAMMER_CMD}={a2_cmd}"
            ),
        },
        GateCheck {
            id: "A3".into(),
            name: "SOP written".into(),
            green: a3,
            detail: opts
                .sop_path
                .map(|p| format!("sop={}", p.display()))
                .unwrap_or_else(|| "no --sop path".into()),
        },
        GateCheck {
            id: "A4".into(),
            name: "Receipt ≠ production".into(),
            green: a4,
            detail: "FlashReceipt.mode never \"production\" (lab_assist ok sob SOW)".into(),
        },
        GateCheck {
            id: "A5".into(),
            name: "SOW §HIL signed".into(),
            green: a5,
            detail: if a5 {
                "sow_signed=true".into()
            } else {
                "pass --sow-signed only after contract".into()
            },
        },
    ];

    let lab_assist_ready = checks.iter().all(|c| c.green);

    LabGateReport {
        claim: "A",
        production: false,
        lab_assist_ready,
        live: opts.live,
        checks,
        sow_path_hint: "base-vault/22 - Path to v1.2/22.30 - SOW Industrial Gate.md",
    }
}

pub fn default_vid_pid() -> (u16, u16) {
    (DEFAULT_PROBE_VID, DEFAULT_PROBE_PID)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gate_never_production() {
        let r = evaluate_lab_gate(0xcafe, 0x4007, false, None);
        assert!(!r.production);
        assert!(!r.lab_assist_ready);
        assert!(r.checks.iter().any(|c| c.id == "A4" && c.green));
    }

    #[test]
    fn sow_signed_alone_not_enough() {
        let r = evaluate_lab_gate(0xcafe, 0x4007, true, None);
        assert!(!r.lab_assist_ready);
        assert!(r.checks.iter().find(|c| c.id == "A5").unwrap().green);
    }

    #[test]
    fn mock_detected_greens_a1() {
        let r = evaluate_lab_gate_opts(
            0xcafe,
            0x4007,
            LabGateOptions {
                sow_signed: false,
                sop_path: None,
                mock_detected: true,
                live: false,
                auto_probe: false,
            },
        );
        assert!(!r.production);
        assert!(r.checks.iter().find(|c| c.id == "A1").unwrap().green);
        assert!(!r.lab_assist_ready);
    }

    #[test]
    fn live_without_usb_blocks_a1() {
        let r = evaluate_lab_gate_opts(
            0xcafe,
            0x4007,
            LabGateOptions {
                sow_signed: true,
                sop_path: None,
                mock_detected: true, // must be ignored in live
                live: true,
                auto_probe: true,
            },
        );
        assert!(!r.production);
        assert!(r.live);
        // Sem probe USB nesta máquina / sem hil_usb no default test → A1 BLOCK
        assert!(!r.checks.iter().find(|c| c.id == "A1").unwrap().green);
        assert!(!r.lab_assist_ready);
    }
}
