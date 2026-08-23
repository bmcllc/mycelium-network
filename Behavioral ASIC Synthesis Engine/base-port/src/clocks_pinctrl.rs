//! Hints de clocks / pinctrl a partir de USB live + DTB (assist).
//!
//! ≠ rates verificados · ≠ phandles resolvidos · `generates_os: false`.

use crate::usb_probe::UsbHwInventory;
use serde::{Deserialize, Serialize};
use specter_probe::acquisition::DtbInfo;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MmioHint {
    pub base: u64,
    pub base_hex: String,
    pub name: String,
    pub source: String,
    pub compatible: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UartBindingHint {
    pub dt_path: String,
    pub reg_bases: Vec<u64>,
    pub reg_bases_hex: Vec<String>,
    pub usb_serial: Option<String>,
    pub usb_base_hex: Option<String>,
    pub clock_names: Vec<String>,
    /// Células brutas — phandles NÃO resolvidos.
    pub clocks_cells_hex: Vec<String>,
    pub pinctrl_names: Vec<String>,
    pub pinctrl_0_cells_hex: Vec<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClocksPinctrlHints {
    pub target: String,
    pub clock_controllers: Vec<MmioHint>,
    pub pinctrl: Vec<MmioHint>,
    pub gpio_banks: Vec<MmioHint>,
    pub uart_bindings: Vec<UartBindingHint>,
    pub dtsi_snippet: String,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
    pub note: String,
}

impl ClocksPinctrlHints {
    pub fn to_yaml(&self) -> anyhow::Result<String> {
        #[derive(Serialize)]
        struct Meta<'a> {
            target: &'a str,
            clock_controllers: &'a [MmioHint],
            pinctrl: &'a [MmioHint],
            gpio_banks: &'a [MmioHint],
            uart_bindings: &'a [UartBindingHint],
            generates_os: bool,
            auto_fix_complete: bool,
            honesty: &'a str,
            note: &'a str,
            files: [&'static str; 3],
        }
        Ok(serde_yaml::to_string(&Meta {
            target: &self.target,
            clock_controllers: &self.clock_controllers,
            pinctrl: &self.pinctrl,
            gpio_banks: &self.gpio_banks,
            uart_bindings: &self.uart_bindings,
            generates_os: self.generates_os,
            auto_fix_complete: self.auto_fix_complete,
            honesty: &self.honesty,
            note: &self.note,
            files: [
                "clocks_pinctrl_hints.yaml",
                "board-ums9620-wedge-clocks-pinctrl.dtsi",
                "CLOCKS_PINCTRL.md",
            ],
        })?)
    }

    pub fn to_json_pretty(&self) -> anyhow::Result<String> {
        Ok(serde_json::to_string_pretty(self)?)
    }

    pub fn to_markdown(&self) -> String {
        let mut md = String::new();
        md.push_str("# Clocks / pinctrl hints — ums9620 wedge\n\n");
        md.push_str(&format!("{}\n\n", base_core::HONESTY_BANNER));
        md.push_str(&format!("- target: `{}`\n", self.target));
        md.push_str(&format!(
            "- clock-controllers: {} · pinctrl: {} · gpio: {} · uart bindings: {}\n\n",
            self.clock_controllers.len(),
            self.pinctrl.len(),
            self.gpio_banks.len(),
            self.uart_bindings.len()
        ));
        md.push_str("## Clock controllers (USB × DT)\n\n");
        md.push_str("| Base | Name | Source |\n|------|------|--------|\n");
        for c in &self.clock_controllers {
            md.push_str(&format!(
                "| `{}` | `{}` | {} |\n",
                c.base_hex, c.name, c.source
            ));
        }
        md.push_str("\n## Pinctrl / GPIO\n\n");
        for p in &self.pinctrl {
            md.push_str(&format!("- pinctrl `{}` ({})\n", p.base_hex, p.name));
        }
        for g in &self.gpio_banks {
            md.push_str(&format!("- gpio `{}` ({})\n", g.base_hex, g.name));
        }
        md.push_str("\n## UART bindings (phandles unresolved)\n\n");
        for u in &self.uart_bindings {
            md.push_str(&format!("### `{}`\n\n", u.dt_path));
            if let Some(usb) = &u.usb_serial {
                md.push_str(&format!("- USB: `{usb}` → {}\n", u.usb_base_hex.as_deref().unwrap_or("—")));
            }
            md.push_str(&format!("- clock-names: {:?}\n", u.clock_names));
            md.push_str(&format!("- clocks cells: {:?}\n", u.clocks_cells_hex));
            md.push_str(&format!("- note: {}\n\n", u.note));
        }
        md.push_str("## Not\n\n");
        md.push_str("- ≠ clock rates / baud verificados no silício\n");
        md.push_str("- ≠ phandle → label resolvido no DTSI stub\n");
        md.push_str("- ≠ OS turnkey\n");
        md.push_str(&format!("\n{}\n", self.note));
        md
    }
}

fn parse_usb_hex_prefix(dev: &str) -> Option<(u64, &str)> {
    let (hex, rest) = dev.split_once('.')?;
    let addr = u64::from_str_radix(hex, 16).ok()?;
    Some((addr, rest))
}

fn hint(base: u64, name: impl Into<String>, source: impl Into<String>, compat: Vec<String>) -> MmioHint {
    MmioHint {
        base,
        base_hex: format!("{base:#x}"),
        name: name.into(),
        source: source.into(),
        compatible: compat,
    }
}

fn cells_hex(cells: &[u32]) -> Vec<String> {
    cells.iter().map(|c| format!("{c:#x}")).collect()
}

fn is_uart_path(path: &str) -> bool {
    let p = path.to_ascii_lowercase();
    p.contains("serial@") || p.contains("uart")
}

fn usb_serial_for_path(usb: &UsbHwInventory, path: &str, reg_bases: &[u64]) -> Option<(String, u64)> {
    for &r in reg_bases {
        if r >= crate::wedge_map::PHYS_HINT_MIN {
            for d in &usb.platform_devices {
                if let Some((a, name)) = parse_usb_hex_prefix(d) {
                    if name.contains("serial") && a == r {
                        return Some((d.clone(), a));
                    }
                }
            }
        }
    }
    let unit = crate::wedge_map::unit_addrs_from_node(path)
        .into_iter()
        .next()
        .unwrap_or(0);
    // ums9620 AP UART bank: 0x20200000 + unit (@0, @10000, …)
    let want = if unit >= crate::wedge_map::PHYS_HINT_MIN {
        unit
    } else {
        0x2020_0000 + unit
    };
    for d in &usb.platform_devices {
        if let Some((a, name)) = parse_usb_hex_prefix(d) {
            if name.contains("serial") && a == want {
                return Some((d.clone(), a));
            }
        }
    }
    None
}

/// Constrói hints a partir de inventário USB + DTB parseado.
pub fn build_clocks_pinctrl_hints(usb: &UsbHwInventory, dtb: &DtbInfo) -> ClocksPinctrlHints {
    let mut clock_controllers = Vec::new();
    let mut seen_clk = std::collections::BTreeSet::new();

    for d in &usb.platform_devices {
        if let Some((a, name)) = parse_usb_hex_prefix(d) {
            if name.contains("clock-controller") && seen_clk.insert(a) {
                clock_controllers.push(hint(a, d.clone(), "usb", vec![]));
            }
        }
    }
    for r in &dtb.mmio_regions {
        let path = r.peripheral.as_deref().unwrap_or("");
        if path.contains("clock-controller") && seen_clk.insert(r.address) {
            clock_controllers.push(hint(
                r.address,
                path.to_string(),
                "dt_reg",
                r.compatible.clone(),
            ));
        }
    }
    clock_controllers.sort_by_key(|c| c.base);

    let mut pinctrl = Vec::new();
    let mut seen_pin = std::collections::BTreeSet::new();
    for d in &usb.platform_devices {
        if let Some((a, name)) = parse_usb_hex_prefix(d) {
            if name.contains("pinctrl") && seen_pin.insert(a) {
                pinctrl.push(hint(a, d.clone(), "usb", vec![]));
            }
        }
    }
    for r in &dtb.mmio_regions {
        let path = r.peripheral.as_deref().unwrap_or("");
        if path.contains("pinctrl") && seen_pin.insert(r.address) {
            pinctrl.push(hint(
                r.address,
                path.to_string(),
                "dt_reg",
                r.compatible.clone(),
            ));
        }
    }
    pinctrl.sort_by_key(|p| p.base);

    let mut gpio_banks = Vec::new();
    let mut seen_gpio = std::collections::BTreeSet::new();
    for d in &usb.platform_devices {
        if let Some((a, name)) = parse_usb_hex_prefix(d) {
            if (name == "gpio" || name.starts_with("gpio") || name.contains(".gpio"))
                && !name.contains("pinctrl")
                && seen_gpio.insert(a)
            {
                gpio_banks.push(hint(a, d.clone(), "usb", vec![]));
            }
        }
    }
    for g in &dtb.gpios {
        if seen_gpio.insert(g.base) {
            gpio_banks.push(hint(g.base, format!("gpio_bank{}", g.bank), "dt_gpio", vec![]));
        }
    }
    gpio_banks.sort_by_key(|g| g.base);

    let mut uart_bindings = Vec::new();
    for h in &dtb.device_prop_hints {
        if !is_uart_path(&h.path) {
            continue;
        }
        if h.clock_names.is_empty() && h.clocks_cells.is_empty() {
            continue;
        }
        let (usb_serial, usb_base) = usb_serial_for_path(usb, &h.path, &h.reg_bases)
            .map(|(s, a)| (Some(s), Some(a)))
            .unwrap_or((None, None));
        // Prefer USB absolute for display when DT reg is bus-relative
        let reg_display: Vec<u64> = if let Some(a) = usb_base {
            vec![a]
        } else {
            let phys: Vec<u64> = h
                .reg_bases
                .iter()
                .copied()
                .filter(|b| *b >= crate::wedge_map::PHYS_HINT_MIN)
                .collect();
            if phys.is_empty() {
                h.reg_bases.clone()
            } else {
                phys
            }
        };
        uart_bindings.push(UartBindingHint {
            dt_path: h.path.clone(),
            reg_bases: reg_display.clone(),
            reg_bases_hex: reg_display.iter().map(|a| format!("{a:#x}")).collect(),
            usb_serial,
            usb_base_hex: usb_base.map(|a| format!("{a:#x}")),
            clock_names: h.clock_names.clone(),
            clocks_cells_hex: cells_hex(&h.clocks_cells),
            pinctrl_names: h.pinctrl_names.clone(),
            pinctrl_0_cells_hex: cells_hex(&h.pinctrl_0_cells),
            note: "clocks= phandles unresolved — wire labels from vendor DT / clock-controller nodes"
                .into(),
        });
    }
    uart_bindings.sort_by(|a, b| a.dt_path.cmp(&b.dt_path));

    let dtsi = render_dtsi_snippet(&clock_controllers, &pinctrl, &uart_bindings);

    ClocksPinctrlHints {
        target: "linux_wedge_uart_ufs_g35".into(),
        clock_controllers,
        pinctrl,
        gpio_banks,
        uart_bindings,
        dtsi_snippet: dtsi,
        generates_os: false,
        auto_fix_complete: false,
        honesty: base_core::HONESTY_NOTE.to_string(),
        note: "Assist only: USB absolute bases + DT clock-names. Resolve phandles in external tree."
            .into(),
    }
}

fn render_dtsi_snippet(
    clocks: &[MmioHint],
    pinctrl: &[MmioHint],
    uarts: &[UartBindingHint],
) -> String {
    let mut s = String::new();
    s.push_str("/* SPDX-License-Identifier: GPL-2.0-only OR MIT */\n");
    s.push_str("/* B.A.S.E. wedge clocks/pinctrl hints — ≠ rates verified · phandles TBD */\n");
    s.push_str("/* generates_os: false · auto_fix_complete: false */\n\n");
    s.push_str("/ {\n");
    s.push_str("    soc {\n");
    s.push_str("        #address-cells = <2>;\n");
    s.push_str("        #size-cells = <2>;\n");
    s.push_str("        ranges;\n\n");

    // Prefer AP clock if present (0x20010000 on ums9620)
    let ap_clk = clocks.iter().find(|c| c.base == 0x2001_0000).or_else(|| clocks.first());
    if let Some(c) = ap_clk {
        s.push_str(&format!(
            "        /* hint: {} ({}) */\n",
            c.name, c.source
        ));
        s.push_str(&format!("        ap_clk: clock-controller@{:x} {{\n", c.base));
        if let Some(comp) = c.compatible.first() {
            s.push_str(&format!("            compatible = \"{comp}\";\n"));
        } else {
            s.push_str("            compatible = \"sprd,ums9620-ap-clk\";\n");
        }
        s.push_str(&format!("            reg = <0x0 {:#x} 0x0 0x1000>;\n", c.base));
        s.push_str("            #clock-cells = <1>;\n");
        s.push_str("            /* full clock tree: copy from vendor DT */\n");
        s.push_str("        };\n\n");
    }

    if let Some(p) = pinctrl.first() {
        s.push_str(&format!("        /* hint: {} ({}) */\n", p.name, p.source));
        s.push_str(&format!("        pinctrl: pinctrl@{:x} {{\n", p.base));
        if let Some(comp) = p.compatible.first() {
            s.push_str(&format!("            compatible = \"{comp}\";\n"));
        } else {
            s.push_str("            compatible = \"sprd,qogirn6pro-pinctrl\";\n");
        }
        s.push_str(&format!("            reg = <0x0 {:#x} 0x0 0x10000>;\n", p.base));
        s.push_str("            /* pin groups for UART0: bind from vendor DT */\n");
        s.push_str("        };\n\n");
    }

    if let Some(u) = uarts.first() {
        let base = u.reg_bases.first().copied().unwrap_or(0x2020_0000);
        s.push_str(&format!("        /* UART0 clocks from {} */\n", u.dt_path));
        s.push_str(&format!("        serial0: serial@{:x} {{\n", base));
        s.push_str("            compatible = \"sprd,ums9620-uart\", \"sprd,sc9836-uart\";\n");
        s.push_str(&format!("            reg = <0x0 {base:#x} 0x0 0x100>;\n"));
        if !u.clock_names.is_empty() {
            let names = u
                .clock_names
                .iter()
                .map(|n| format!("\"{n}\""))
                .collect::<Vec<_>>()
                .join(", ");
            s.push_str(&format!("            clock-names = {names};\n"));
            s.push_str("            /* clocks = <&ap_clk N>, ... — resolve cells: ");
            s.push_str(&u.clocks_cells_hex.join(" "));
            s.push_str(" */\n");
        }
        s.push_str("            /* pinctrl-0 = <&uart0_pins>; — missing or unresolved in this DTB */\n");
        s.push_str("            status = \"okay\";\n");
        s.push_str("        };\n\n");
    }

    s.push_str("    };\n");
    s.push_str("};\n");
    s
}

/// Convenience: parse DTB bytes + USB inventory.
pub fn build_clocks_pinctrl_from_bytes(
    usb: &UsbHwInventory,
    dtb: &[u8],
) -> anyhow::Result<ClocksPinctrlHints> {
    let info = specter_probe::acquisition::dtb::parse_dtb(dtb)?;
    Ok(build_clocks_pinctrl_hints(usb, &info))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::usb_probe::UsbProbeMode;
    use specter_probe::acquisition::{DevicePropHint, DtbInfo, MmioRegion};

    #[test]
    fn uart_clock_names_and_usb_pinctrl() {
        let mut usb = UsbHwInventory {
            ok: true,
            skipped: false,
            mode: UsbProbeMode::Adb,
            ..Default::default()
        };
        usb.platform_devices = vec![
            "20200000.serial".into(),
            "20010000.clock-controller".into(),
            "642e0000.pinctrl".into(),
            "64170000.gpio".into(),
        ];
        let dtb = DtbInfo {
            compatible: vec![],
            model: None,
            mmio_regions: vec![MmioRegion {
                address: 0x2001_0000,
                size: 0x1000,
                peripheral: Some("soc/clock-controller@20010000".into()),
                compatible: vec!["sprd,ums9620-ap-clk".into()],
            }],
            irqs: vec![],
            clocks: vec![],
            gpios: vec![],
            i2c_buses: vec![],
            spi_buses: vec![],
            dma_controllers: vec![],
            device_prop_hints: vec![DevicePropHint {
                path: "soc/ap-apb/serial@0".into(),
                compatible: vec!["sprd,ums9620-uart".into()],
                reg_bases: vec![0],
                clock_names: vec!["enable".into(), "uart".into(), "source".into()],
                clocks_cells: vec![0x15, 0x7, 0x18, 0x3, 0x19],
                pinctrl_names: vec![],
                pinctrl_0_cells: vec![],
            }],
        };
        let h = build_clocks_pinctrl_hints(&usb, &dtb);
        assert!(!h.generates_os);
        assert!(h.clock_controllers.iter().any(|c| c.base == 0x2001_0000));
        assert!(h.pinctrl.iter().any(|p| p.base == 0x642e_0000));
        assert_eq!(h.uart_bindings.len(), 1);
        assert_eq!(h.uart_bindings[0].clock_names.len(), 3);
        assert!(h.dtsi_snippet.contains("clock-names"));
        assert!(h.dtsi_snippet.contains("0x20010000"));
    }
}
