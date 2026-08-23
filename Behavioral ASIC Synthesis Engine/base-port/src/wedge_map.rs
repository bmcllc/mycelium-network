//! Atlas MMIO absoluto P0 (UART → GICD/GICR → UFS) — USB live + DTB.
//!
//! Combina:
//! - endereços absolutos de `/sys/bus/platform/devices` (USB)
//! - `reg` DTB com `#address-cells` / `#size-cells` + walk de `ranges` (specterprobe)
//! - `@unit` como fallback quando parecer físico (≥ 0x0100_0000)
//!
//! ≠ OS turnkey · `generates_os: false`.

use crate::platform::PlatformInventory;
use crate::usb_probe::UsbHwInventory;
use serde::{Deserialize, Serialize};

/// Threshold: unit-addrs below this are treated as bus-relative unless USB overrides.
pub const PHYS_HINT_MIN: u64 = 0x0100_0000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AddrSource {
    Usb,
    DtUnitAddr,
    DtReg,
    /// Segundo `reg` GICv3 (GICR) após GICD, já em físico via cells/ranges.
    DtGicrReg,
    Unresolved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WedgeMmioEntry {
    pub class: String,
    pub priority: String,
    pub absolute_base: Option<u64>,
    pub absolute_base_hex: Option<String>,
    pub source: AddrSource,
    pub usb_devices: Vec<String>,
    pub dt_nodes: Vec<String>,
    pub dt_reg_bases: Vec<u64>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WedgeMmioMap {
    pub target: String,
    pub entries: Vec<WedgeMmioEntry>,
    pub p0_ready: bool,
    pub p0_missing: Vec<String>,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
    pub note: String,
}

impl WedgeMmioMap {
    pub fn to_yaml(&self) -> anyhow::Result<String> {
        Ok(serde_yaml::to_string(self)?)
    }

    pub fn to_json_pretty(&self) -> anyhow::Result<String> {
        Ok(serde_json::to_string_pretty(self)?)
    }

    pub fn to_markdown_section(&self) -> String {
        let mut md = String::new();
        md.push_str("## Wedge MMIO map (P0 absoluto)\n\n");
        md.push_str(&format!(
            "- target: `{}` · p0_ready: **{}**\n",
            self.target, self.p0_ready
        ));
        if !self.p0_missing.is_empty() {
            md.push_str(&format!("- p0_missing: {:?}\n", self.p0_missing));
        }
        md.push_str("\n| Class | Absolute | Source | USB / DT |\n|-------|----------|--------|----------|\n");
        for e in &self.entries {
            let abs = e
                .absolute_base_hex
                .clone()
                .unwrap_or_else(|| "—".into());
            let usb = e.usb_devices.first().cloned().unwrap_or_else(|| "—".into());
            let dt = e.dt_nodes.first().cloned().unwrap_or_else(|| "—".into());
            md.push_str(&format!(
                "| `{}` | `{}` | {:?} | `{usb}` / `{dt}` |\n",
                e.class, abs, e.source
            ));
        }
        md.push_str(&format!("\n{}\n", self.note));
        md
    }
}

fn parse_usb_device(dev: &str) -> (Option<u64>, &str) {
    if let Some((hex, rest)) = dev.split_once('.') {
        if let Ok(addr) = u64::from_str_radix(hex, 16) {
            return (Some(addr), rest);
        }
    }
    (None, dev)
}

fn classify_usb_name(name: &str) -> String {
    let n = name.to_ascii_lowercase();
    if n.contains("serial") || n.contains("uart") {
        "uart".into()
    } else if n.contains("ufs") || n.contains("sdio") || n.contains("mmc") {
        "storage_emmc_ufs".into()
    } else if n.contains("gpu") || n.contains("dpu") {
        "gpu_framebuffer".into()
    } else if n.contains("gic") || n.contains("interrupt") {
        "gic".into()
    } else if n.contains("timer") {
        "arm_generic_timer".into()
    } else if n.contains("gpio") || n.contains("pinctrl") {
        "gpio".into()
    } else {
        "other".into()
    }
}

/// Extract `@hex` unit addresses from a DT node path.
pub fn unit_addrs_from_node(node: &str) -> Vec<u64> {
    let mut out = Vec::new();
    if let Some(at) = node.rfind('@') {
        let tail = &node[at + 1..];
        let hex = tail
            .split(|c: char| !c.is_ascii_hexdigit())
            .next()
            .unwrap_or("");
        if !hex.is_empty() {
            if let Ok(v) = u64::from_str_radix(hex, 16) {
                out.push(v);
            }
        }
    }
    out
}

fn usb_devs_for_class(usb: &UsbHwInventory, class: &str) -> Vec<(u64, String)> {
    let mut v = Vec::new();
    for d in &usb.platform_devices {
        let (addr, name) = parse_usb_device(d);
        if classify_usb_name(name) != class {
            continue;
        }
        if let Some(a) = addr {
            if a >= PHYS_HINT_MIN {
                v.push((a, d.clone()));
            }
        }
    }
    v.sort_by_key(|(a, _)| *a);
    v
}

fn dt_phys_unit_addrs(nodes: &[String]) -> Vec<u64> {
    let mut addrs = Vec::new();
    for n in nodes {
        for a in unit_addrs_from_node(n) {
            if a >= PHYS_HINT_MIN {
                addrs.push(a);
            }
        }
    }
    addrs.sort();
    addrs.dedup();
    addrs
}

fn resolve_entry(
    class: &str,
    priority: &str,
    usb: &UsbHwInventory,
    plat: &PlatformInventory,
) -> WedgeMmioEntry {
    let usb_hits = usb_devs_for_class(usb, class);
    let dt_comp = plat.components.iter().find(|c| c.class == class);
    let dt_nodes = dt_comp
        .map(|c| c.nodes.clone())
        .unwrap_or_default();
    let dt_regs = dt_comp.map(|c| c.bases.clone()).unwrap_or_default();
    let dt_phys = dt_phys_unit_addrs(&dt_nodes);

    // Arch timer: system registers only — ignore USB peripheral timers (6404xxxx).
    if class == "arm_generic_timer" {
        return WedgeMmioEntry {
            class: class.into(),
            priority: priority.into(),
            absolute_base: None,
            absolute_base_hex: None,
            source: AddrSource::Unresolved,
            usb_devices: usb_hits.into_iter().map(|(_, d)| d).collect(),
            dt_nodes: dt_nodes.into_iter().take(6).collect(),
            dt_reg_bases: dt_regs.into_iter().take(8).collect(),
            note: "Arch timer is system-reg (CNT*); USB *.timer are SoC peripherals — not CNT base"
                .into(),
        };
    }

    // GICv3 redistributor: second physical reg of the gic component (GICD is first).
    if class == "gic_redistributor" {
        let gic = plat.components.iter().find(|c| c.class == "gic");
        let mut phys: Vec<u64> = gic
            .map(|c| {
                c.bases
                    .iter()
                    .copied()
                    .filter(|b| *b >= PHYS_HINT_MIN)
                    .collect()
            })
            .unwrap_or_default();
        phys.sort();
        phys.dedup();
        let gicd = phys.first().copied();
        let gicr = phys.iter().copied().find(|&b| Some(b) != gicd);
        let (absolute, source, note) = if let Some(a) = gicr {
            (
                Some(a),
                AddrSource::DtGicrReg,
                format!("GICv3 GICR from DT reg[1+] {a:#x} (GICD={})", hex_opt(gicd)),
            )
        } else {
            (
                None,
                AddrSource::Unresolved,
                "GICR not found — need ≥2 physical GICv3 reg entries after cells/ranges parse"
                    .into(),
            )
        };
        return WedgeMmioEntry {
            class: class.into(),
            priority: priority.into(),
            absolute_base: absolute,
            absolute_base_hex: absolute.map(|a| format!("{a:#x}")),
            source,
            usb_devices: vec![],
            dt_nodes: gic.map(|c| c.nodes.iter().cloned().take(6).collect()).unwrap_or_default(),
            dt_reg_bases: gic
                .map(|c| c.bases.iter().copied().take(8).collect())
                .unwrap_or_default(),
            note,
        };
    }

    // Prefer USB absolute for uart/storage/gpu; DT reg/unit for gic (often no sysfs).
    let (absolute, source, note) = if let Some((a, _)) = usb_hits.first() {
        (
            Some(*a),
            AddrSource::Usb,
            format!("USB platform device absolute {a:#x}"),
        )
    } else if class == "gic" {
        // Prefer DT reg[0] (GICD) over unit-addr when both exist.
        if let Some(&a) = dt_regs.iter().find(|&&b| b >= PHYS_HINT_MIN) {
            (
                Some(a),
                AddrSource::DtReg,
                format!("DT reg GICD {a:#x}"),
            )
        } else if let Some(&a) = dt_phys.first() {
            (
                Some(a),
                AddrSource::DtUnitAddr,
                format!("DT unit-addr @{a:x} (GICD)"),
            )
        } else {
            (
                None,
                AddrSource::Unresolved,
                "No GICD absolute base".into(),
            )
        }
    } else if let Some(&a) = dt_phys.first() {
        (
            Some(a),
            AddrSource::DtUnitAddr,
            format!("DT unit-addr @{a:x} (≥ PHYS_HINT_MIN)"),
        )
    } else if let Some(&a) = dt_regs.iter().find(|&&b| b >= PHYS_HINT_MIN) {
        (
            Some(a),
            AddrSource::DtReg,
            format!("DT reg {a:#x}"),
        )
    } else {
        (
            None,
            AddrSource::Unresolved,
            "No absolute base — need rooted DT / USB device".into(),
        )
    };

    WedgeMmioEntry {
        class: class.into(),
        priority: priority.into(),
        absolute_base: absolute,
        absolute_base_hex: absolute.map(|a| format!("{a:#x}")),
        source,
        usb_devices: usb_hits.into_iter().map(|(_, d)| d).collect(),
        dt_nodes: dt_nodes.into_iter().take(6).collect(),
        dt_reg_bases: dt_regs.into_iter().take(8).collect(),
        note,
    }
}

/// Constrói atlas P0 (+ P1/P2 úteis) para wedge G35.
pub fn build_wedge_mmio_map(usb: &UsbHwInventory, plat: &PlatformInventory) -> WedgeMmioMap {
    let classes: &[(&str, &str)] = &[
        ("uart", "P0"),
        ("gic", "P0"),
        ("gic_redistributor", "P0"),
        ("arm_generic_timer", "P0"),
        ("storage_emmc_ufs", "P0"),
        ("gpio", "P1"),
        ("gpu_framebuffer", "P2"),
    ];

    let entries: Vec<WedgeMmioEntry> = classes
        .iter()
        .map(|(c, p)| resolve_entry(c, p, usb, plat))
        .collect();

    let mut p0_missing = Vec::new();
    for e in &entries {
        if e.priority != "P0" {
            continue;
        }
        if e.class == "arm_generic_timer" || e.class == "gic_redistributor" {
            // timer: no MMIO; GICR strongly preferred but GICD alone keeps p0_ready
            if e.class == "gic_redistributor" && e.absolute_base.is_none() {
                p0_missing.push(e.class.clone());
            }
            continue;
        }
        if e.absolute_base.is_none() {
            p0_missing.push(e.class.clone());
        }
    }

    let p0_ready = entries.iter().any(|e| e.class == "uart" && e.absolute_base.is_some())
        && entries.iter().any(|e| e.class == "gic" && e.absolute_base.is_some())
        && entries
            .iter()
            .any(|e| e.class == "storage_emmc_ufs" && e.absolute_base.is_some())
        && !entries.iter().any(|e| {
            e.priority == "P0"
                && e.absolute_base.is_none()
                && e.class != "arm_generic_timer"
                && e.class != "gic_redistributor"
        });

    WedgeMmioMap {
        target: "linux_wedge_uart_ufs_g35".into(),
        entries,
        p0_ready,
        p0_missing,
        generates_os: false,
        auto_fix_complete: false,
        honesty: base_core::HONESTY_NOTE.to_string(),
        note: "Atlas P0: USB + DT reg (cells/ranges). GICR em p0_missing se ausente — ≠ OS bootável."
            .into(),
    }
}

fn hex_opt(a: Option<u64>) -> String {
    a.map(|x| format!("{x:#x}")).unwrap_or_else(|| "—".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::platform::{
        CpuDiscovery, DiscoveryStatus, DtbStats, OsPortReadiness, PlatformComponent,
        PlatformInventory,
    };
    use crate::usb_probe::UsbProbeMode;

    fn plat_with(nodes_gic: &str, nodes_uart: &str) -> PlatformInventory {
        PlatformInventory {
            claim: "test",
            generates_os: false,
            auto_fix_complete: false,
            model: None,
            root_compatible: vec![],
            cpu: CpuDiscovery {
                status: DiscoveryStatus::Found,
                isa_hint: "a64".into(),
                compatible: vec![],
                cores_hint: None,
                notes: String::new(),
            },
            components: vec![
                PlatformComponent {
                    class: "gic".into(),
                    status: DiscoveryStatus::Found,
                    compatible: vec!["arm,gic-v3".into()],
                    nodes: vec![nodes_gic.into()],
                    bases: vec![0x1200_0000, 0x1204_0000],
                    notes: String::new(),
                    rewrite_hint: String::new(),
                },
                PlatformComponent {
                    class: "uart".into(),
                    status: DiscoveryStatus::Found,
                    compatible: vec![],
                    nodes: vec![nodes_uart.into()],
                    bases: vec![0],
                    notes: String::new(),
                    rewrite_hint: String::new(),
                },
                PlatformComponent {
                    class: "storage_emmc_ufs".into(),
                    status: DiscoveryStatus::Found,
                    compatible: vec![],
                    nodes: vec!["soc/ap-ahb/ufs@2000000".into()],
                    bases: vec![0x2000000],
                    notes: String::new(),
                    rewrite_hint: String::new(),
                },
                PlatformComponent {
                    class: "arm_generic_timer".into(),
                    status: DiscoveryStatus::Partial,
                    compatible: vec![],
                    nodes: vec!["timer".into()],
                    bases: vec![],
                    notes: String::new(),
                    rewrite_hint: String::new(),
                },
            ],
            dtb_stats: DtbStats {
                mmio_regions: 0,
                irqs: 0,
                gpios: 0,
                i2c_buses: 0,
                spi_buses: 0,
                dma_controllers: 0,
            },
            os_port_readiness: OsPortReadiness {
                required: vec![],
                found: vec![],
                missing: vec![],
                score: 0.0,
                guidance: vec![],
            },
            honesty: "t",
        }
    }

    #[test]
    fn p0_ready_with_usb_uart_ufs_and_gic_unit() {
        let mut usb = UsbHwInventory {
            ok: true,
            skipped: false,
            mode: UsbProbeMode::Adb,
            ..Default::default()
        };
        usb.platform_devices = vec![
            "20200000.serial".into(),
            "22000000.ufs".into(),
        ];
        let plat = plat_with("interrupt-controller@12000000", "soc/ap-apb/serial@0");
        let m = build_wedge_mmio_map(&usb, &plat);
        assert!(m.p0_ready, "missing={:?}", m.p0_missing);
        let uart = m.entries.iter().find(|e| e.class == "uart").unwrap();
        assert_eq!(uart.absolute_base, Some(0x2020_0000));
        assert_eq!(uart.source, AddrSource::Usb);
        let gic = m.entries.iter().find(|e| e.class == "gic").unwrap();
        assert_eq!(gic.absolute_base, Some(0x1200_0000));
        assert_eq!(gic.source, AddrSource::DtReg);
        let gicr = m
            .entries
            .iter()
            .find(|e| e.class == "gic_redistributor")
            .unwrap();
        assert_eq!(gicr.absolute_base, Some(0x1204_0000));
        assert_eq!(gicr.source, AddrSource::DtGicrReg);
        let ufs = m.entries.iter().find(|e| e.class == "storage_emmc_ufs").unwrap();
        assert_eq!(ufs.absolute_base, Some(0x2200_0000));
        assert!(!m.generates_os);
        assert!(!m.p0_missing.contains(&"gic_redistributor".into()));
    }

    #[test]
    fn unit_addr_parse() {
        assert_eq!(
            unit_addrs_from_node("interrupt-controller@12000000"),
            vec![0x1200_0000]
        );
    }
}
