//! Relatório de sessão Specter Live.

use base_core::tension::Conclusiveness;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtSessionWindow {
    pub index: usize,
    pub evidence_count: usize,
    pub unique_mmio: usize,
    pub overall_tension: f64,
    pub overall_confidence: f64,
    pub conclusiveness: Conclusiveness,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtSessionReport {
    pub phase: String,
    pub ok: bool,
    pub skipped: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skip_reason: Option<String>,
    pub windows: Vec<VirtSessionWindow>,
    pub total_evidence: usize,
    pub final_confidence: f64,
    pub final_conclusiveness: Conclusiveness,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qemu_exit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qemu_bin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kernel: Option<String>,
    pub production: bool,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
    pub note: String,
}

impl VirtSessionReport {
    pub fn to_yaml(&self) -> Result<String, serde_yaml::Error> {
        serde_yaml::to_string(self)
    }

    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}
