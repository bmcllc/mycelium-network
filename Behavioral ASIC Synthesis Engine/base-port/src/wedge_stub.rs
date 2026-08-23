//! Board stub P0 do wedge G35 — DTS fragment, earlycon, HAL host stub.
//!
//! Gerado a partir de [`WedgeMmioMap`]. ≠ console no silício sem receipt · ≠ OS turnkey.

use crate::wedge_map::{AddrSource, WedgeMmioMap};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WedgeP0Package {
    pub target: String,
    pub uart_base: Option<u64>,
    pub gic_base: Option<u64>,
    pub gicr_base: Option<u64>,
    pub ufs_base: Option<u64>,
    pub p0_ready: bool,
    pub dtsi: String,
    pub cmdline: String,
    pub earlycon_hints: Vec<String>,
    pub hal_c: String,
    pub hal_h: String,
    pub generates_os: bool,
    pub auto_fix_complete: bool,
    pub honesty: String,
    pub note: String,
}

impl WedgeP0Package {
    pub fn to_yaml(&self) -> anyhow::Result<String> {
        #[derive(Serialize)]
        struct Meta<'a> {
            target: &'a str,
            uart_base_hex: Option<String>,
            gic_base_hex: Option<String>,
            gicr_base_hex: Option<String>,
            ufs_base_hex: Option<String>,
            p0_ready: bool,
            earlycon_hints: &'a [String],
            generates_os: bool,
            auto_fix_complete: bool,
            honesty: &'a str,
            note: &'a str,
            files: [&'static str; 5],
        }
        let meta = Meta {
            target: &self.target,
            uart_base_hex: self.uart_base.map(|a| format!("{a:#x}")),
            gic_base_hex: self.gic_base.map(|a| format!("{a:#x}")),
            gicr_base_hex: self.gicr_base.map(|a| format!("{a:#x}")),
            ufs_base_hex: self.ufs_base.map(|a| format!("{a:#x}")),
            p0_ready: self.p0_ready,
            earlycon_hints: &self.earlycon_hints,
            generates_os: self.generates_os,
            auto_fix_complete: self.auto_fix_complete,
            honesty: &self.honesty,
            note: &self.note,
            files: [
                "board-ums9620-wedge-p0.dtsi",
                "cmdline_earlycon.txt",
                "hal_wedge_p0.h",
                "hal_wedge_p0.c",
                "WEDGE_P0.md",
            ],
        };
        Ok(serde_yaml::to_string(&meta)?)
    }

    pub fn to_markdown(&self) -> String {
        let mut md = String::new();
        md.push_str("# Wedge P0 board stub — ums9620 / G35\n\n");
        md.push_str(&format!("{}\n\n", base_core::HONESTY_BANNER));
        md.push_str(&format!(
            "- target: `{}` · p0_ready: **{}**\n",
            self.target, self.p0_ready
        ));
        md.push_str(&format!(
            "- UART: {} · GICD: {} · GICR: {} · UFS: {}\n\n",
            hex_opt(self.uart_base),
            hex_opt(self.gic_base),
            hex_opt(self.gicr_base),
            hex_opt(self.ufs_base)
        ));
        md.push_str("## Files\n\n");
        md.push_str("| File | Role |\n|------|------|\n");
        md.push_str("| `board-ums9620-wedge-p0.dtsi` | Fragmento DT (absolutos P0) |\n");
        md.push_str("| `cmdline_earlycon.txt` | Sugestões `earlycon=` / `console=` |\n");
        md.push_str("| `hal_wedge_p0.[ch]` | Stub host (`HOST_BUILD`) — shadow regs |\n");
        md.push_str("\n## earlycon hints\n\n");
        for h in &self.earlycon_hints {
            md.push_str(&format!("- `{h}`\n"));
        }
        md.push_str("\n## Checklist humano\n\n");
        md.push_str("- [ ] Confirmar baud/clock UART no SoC (USB só deu base)\n");
        md.push_str("- [ ] Confirmar GICR size / #redistributor-regions no vendor DT\n");
        md.push_str("- [ ] Integrar DTSI no tree externo (Linux/TaurOS)\n");
        md.push_str("- [ ] Fase C: receipt HW se testar earlycon no telefone\n");
        md.push_str("\n## Not\n\n");
        md.push_str("- ≠ earlycon verificado no silício\n");
        md.push_str("- ≠ OS bootável / TaurOS turnkey\n");
        md.push_str(&format!("\n{}\n", self.note));
        md
    }
}

fn hex_opt(a: Option<u64>) -> String {
    a.map(|x| format!("{x:#x}")).unwrap_or_else(|| "—".into())
}

fn entry_base(map: &WedgeMmioMap, class: &str) -> Option<u64> {
    map.entries
        .iter()
        .find(|e| e.class == class)
        .and_then(|e| e.absolute_base)
}

fn entry_source(map: &WedgeMmioMap, class: &str) -> Option<AddrSource> {
    map.entries
        .iter()
        .find(|e| e.class == class)
        .map(|e| e.source.clone())
}

/// Gera pacote board stub a partir do atlas P0.
pub fn build_wedge_p0_package(map: &WedgeMmioMap) -> WedgeP0Package {
    let uart = entry_base(map, "uart");
    let gic = entry_base(map, "gic");
    let gicr = entry_base(map, "gic_redistributor");
    let ufs = entry_base(map, "ufs").or_else(|| entry_base(map, "storage_emmc_ufs"));

    let dtsi = render_dtsi(uart, gic, gicr, ufs, map);
    let hints = earlycon_hints(uart);
    let cmdline = hints.first().cloned().unwrap_or_default();
    let (hal_h, hal_c) = render_hal(uart, gic, gicr, ufs);

    WedgeP0Package {
        target: map.target.clone(),
        uart_base: uart,
        gic_base: gic,
        gicr_base: gicr,
        ufs_base: ufs,
        p0_ready: map.p0_ready && uart.is_some() && gic.is_some() && ufs.is_some(),
        dtsi,
        cmdline,
        earlycon_hints: hints,
        hal_c,
        hal_h,
        generates_os: false,
        auto_fix_complete: false,
        honesty: base_core::HONESTY_NOTE.to_string(),
        note: format!(
            "Stub assist from wedge map (uart={:?} gicd={:?} gicr={:?} ufs={:?}). Sources: uart={:?} gic={:?} gicr={:?} ufs={:?}.",
            uart.map(|a| format!("{a:#x}")),
            gic.map(|a| format!("{a:#x}")),
            gicr.map(|a| format!("{a:#x}")),
            ufs.map(|a| format!("{a:#x}")),
            entry_source(map, "uart"),
            entry_source(map, "gic"),
            entry_source(map, "gic_redistributor"),
            entry_source(map, "storage_emmc_ufs"),
        ),
    }
}

fn earlycon_hints(uart: Option<u64>) -> Vec<String> {
    let Some(u) = uart else {
        return vec!["(no uart base — run usb-cross first)".into()];
    };
    vec![
        format!("earlycon=uart8250,mmio32,{u:#x},115200n8"),
        format!("earlycon=sprd_serial,{u:#x},115200n8"),
        format!("console=ttyS0,115200 earlycon=uart8250,mmio32,{u:#x},115200n8"),
    ]
}

fn render_dtsi(
    uart: Option<u64>,
    gic: Option<u64>,
    gicr: Option<u64>,
    ufs: Option<u64>,
    map: &WedgeMmioMap,
) -> String {
    let mut s = String::new();
    s.push_str("/* SPDX-License-Identifier: GPL-2.0-only OR MIT */\n");
    s.push_str("/* B.A.S.E. wedge P0 fragment — ums9620 / moto g35\n");
    s.push_str(" * ABSOLUTE bases from USB×DT atlas. ≠ verified earlycon on silicon.\n");
    s.push_str(" * generates_os: false · auto_fix_complete: false\n");
    s.push_str(&format!(" * target: {}\n", map.target));
    s.push_str(" */\n\n");
    s.push_str("/ {\n");
    s.push_str("    chosen {\n");
    if uart.is_some() {
        s.push_str(
            "        /* Prefer one of cmdline_earlycon.txt; stdout-path is a hint */\n",
        );
    }
    if let Some(u) = uart {
        s.push_str(&format!(
            "        stdout-path = \"/soc/serial@{u:x}:115200n8\";\n"
        ));
    }
    s.push_str("    };\n\n");
    s.push_str("    soc {\n");
    s.push_str("        #address-cells = <2>;\n");
    s.push_str("        #size-cells = <2>;\n");
    s.push_str("        compatible = \"simple-bus\";\n");
    s.push_str("        ranges;\n\n");

    if let Some(g) = gic {
        match gicr {
            Some(r) => {
                s.push_str(&format!(
                    "        /* GICv3 — GICD {g:#x} · GICR {r:#x} (DT reg cells/ranges) */\n"
                ));
                s.push_str(&format!("        gic: interrupt-controller@{g:x} {{\n"));
                s.push_str("            compatible = \"arm,gic-v3\";\n");
                s.push_str("            #interrupt-cells = <3>;\n");
                s.push_str("            interrupt-controller;\n");
                s.push_str(&format!("            reg = <0x0 {g:#x} 0x0 0x20000>,\n"));
                s.push_str(&format!(
                    "                  <0x0 {r:#x} 0x0 0x100000>; /* GICR size from vendor DT */\n"
                ));
                s.push_str(
                    "            /* #redistributor-regions / interrupts: bind from vendor DT */\n",
                );
                s.push_str("        };\n\n");
            }
            None => {
                s.push_str(&format!(
                    "        /* GICv3 — GICD at {g:#x}; GICR missing from atlas */\n"
                ));
                s.push_str(&format!("        gic: interrupt-controller@{g:x} {{\n"));
                s.push_str("            compatible = \"arm,gic-v3\";\n");
                s.push_str("            #interrupt-cells = <3>;\n");
                s.push_str("            interrupt-controller;\n");
                s.push_str(&format!(
                    "            reg = <0x0 {g:#x} 0x0 0x10000>; /* GICD size placeholder */\n"
                ));
                s.push_str("        };\n\n");
            }
        }
    }

    if let Some(u) = uart {
        s.push_str("        /* UART0 — USB 20200000.serial; clock/pinctrl TBD */\n");
        s.push_str(&format!("        serial0: serial@{u:x} {{\n"));
        s.push_str("            compatible = \"sprd,sc9836-uart\", \"sprd,sc9860-uart\";\n");
        s.push_str(&format!("            reg = <0x0 {u:#x} 0x0 0x100>;\n"));
        s.push_str("            status = \"okay\";\n");
        s.push_str("            /* clocks / interrupts: bind from full vendor DT */\n");
        s.push_str("        };\n\n");
    }

    if let Some(f) = ufs {
        s.push_str("        /* UFS — USB 22000000.ufs; phy/PMIC TBD */\n");
        s.push_str(&format!("        ufs@{f:x} {{\n"));
        s.push_str("            compatible = \"jedec,ufs-2.0\";\n");
        s.push_str(&format!("            reg = <0x0 {f:#x} 0x0 0x10000>;\n"));
        s.push_str("            status = \"disabled\"; /* enable after phy/clk bring-up */\n");
        s.push_str("        };\n\n");
    }

    s.push_str("    };\n");
    s.push_str("};\n");
    s
}

fn render_hal(
    uart: Option<u64>,
    gic: Option<u64>,
    gicr: Option<u64>,
    ufs: Option<u64>,
) -> (String, String) {
    let mut h = String::new();
    h.push_str("/* B.A.S.E. wedge P0 HAL — host stub */\n");
    h.push_str("#pragma once\n");
    h.push_str("#include <stdint.h>\n\n");
    if let Some(u) = uart {
        h.push_str(&format!("#define WEDGE_UART0_BASE  UINT64_C({u:#x})\n"));
    }
    if let Some(g) = gic {
        h.push_str(&format!("#define WEDGE_GICD_BASE   UINT64_C({g:#x})\n"));
    }
    if let Some(r) = gicr {
        h.push_str(&format!("#define WEDGE_GICR_BASE   UINT64_C({r:#x})\n"));
    }
    if let Some(f) = ufs {
        h.push_str(&format!("#define WEDGE_UFS_BASE    UINT64_C({f:#x})\n"));
    }
    h.push_str("\nvoid wedge_p0_init(void);\n");
    h.push_str("uint32_t wedge_p0_peek(uint64_t base, uint32_t off);\n");
    h.push_str("void wedge_p0_poke(uint64_t base, uint32_t off, uint32_t val);\n");

    let mut c = String::new();
    c.push_str("/* B.A.S.E. wedge P0 HAL — HOST_BUILD shadow only */\n");
    c.push_str("/* ≠ silicon MMIO · generates_os: false */\n");
    c.push_str("#include \"hal_wedge_p0.h\"\n\n");
    c.push_str("#ifndef HOST_BUILD\n");
    c.push_str("#define HOST_BUILD 1\n");
    c.push_str("#endif\n\n");
    c.push_str("#ifdef HOST_BUILD\n");
    c.push_str("static uint32_t g_uart_shadow[64];\n");
    c.push_str("static uint32_t g_gic_shadow[256];\n");
    c.push_str("static uint32_t g_ufs_shadow[256];\n");
    c.push_str("#endif\n\n");
    c.push_str("void wedge_p0_init(void) {\n");
    c.push_str("    /* no-op on host; on silicon would enable clocks/pinctrl */\n");
    c.push_str("}\n\n");
    c.push_str("static uint32_t *shadow_for(uint64_t base) {\n");
    c.push_str("#ifdef HOST_BUILD\n");
    if uart.is_some() {
        c.push_str("    if (base == WEDGE_UART0_BASE) return g_uart_shadow;\n");
    }
    if gic.is_some() {
        c.push_str("    if (base == WEDGE_GICD_BASE) return g_gic_shadow;\n");
    }
    if gicr.is_some() {
        c.push_str("    if (base == WEDGE_GICR_BASE) return g_gic_shadow;\n");
    }
    if ufs.is_some() {
        c.push_str("    if (base == WEDGE_UFS_BASE) return g_ufs_shadow;\n");
    }
    c.push_str("    return g_uart_shadow;\n");
    c.push_str("#else\n");
    c.push_str("    (void)base; return 0;\n");
    c.push_str("#endif\n");
    c.push_str("}\n\n");
    c.push_str("uint32_t wedge_p0_peek(uint64_t base, uint32_t off) {\n");
    c.push_str("#ifdef HOST_BUILD\n");
    c.push_str("    uint32_t *s = shadow_for(base);\n");
    c.push_str("    return s[(off >> 2) & 63u];\n");
    c.push_str("#else\n");
    c.push_str("    return *(volatile uint32_t *)(uintptr_t)(base + off);\n");
    c.push_str("#endif\n");
    c.push_str("}\n\n");
    c.push_str("void wedge_p0_poke(uint64_t base, uint32_t off, uint32_t val) {\n");
    c.push_str("#ifdef HOST_BUILD\n");
    c.push_str("    uint32_t *s = shadow_for(base);\n");
    c.push_str("    s[(off >> 2) & 63u] = val;\n");
    c.push_str("#else\n");
    c.push_str("    *(volatile uint32_t *)(uintptr_t)(base + off) = val;\n");
    c.push_str("#endif\n");
    c.push_str("}\n");

    (h, c)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wedge_map::{AddrSource, WedgeMmioEntry, WedgeMmioMap};

    #[test]
    fn stub_emits_absolute_bases_with_gicr() {
        let map = WedgeMmioMap {
            target: "linux_wedge_uart_ufs_g35".into(),
            entries: vec![
                WedgeMmioEntry {
                    class: "uart".into(),
                    priority: "P0".into(),
                    absolute_base: Some(0x2020_0000),
                    absolute_base_hex: Some("0x20200000".into()),
                    source: AddrSource::Usb,
                    usb_devices: vec![],
                    dt_nodes: vec![],
                    dt_reg_bases: vec![],
                    note: String::new(),
                },
                WedgeMmioEntry {
                    class: "gic".into(),
                    priority: "P0".into(),
                    absolute_base: Some(0x1200_0000),
                    absolute_base_hex: Some("0x12000000".into()),
                    source: AddrSource::DtReg,
                    usb_devices: vec![],
                    dt_nodes: vec![],
                    dt_reg_bases: vec![],
                    note: String::new(),
                },
                WedgeMmioEntry {
                    class: "gic_redistributor".into(),
                    priority: "P0".into(),
                    absolute_base: Some(0x1204_0000),
                    absolute_base_hex: Some("0x12040000".into()),
                    source: AddrSource::DtGicrReg,
                    usb_devices: vec![],
                    dt_nodes: vec![],
                    dt_reg_bases: vec![],
                    note: String::new(),
                },
                WedgeMmioEntry {
                    class: "storage_emmc_ufs".into(),
                    priority: "P0".into(),
                    absolute_base: Some(0x2200_0000),
                    absolute_base_hex: Some("0x22000000".into()),
                    source: AddrSource::Usb,
                    usb_devices: vec![],
                    dt_nodes: vec![],
                    dt_reg_bases: vec![],
                    note: String::new(),
                },
            ],
            p0_ready: true,
            p0_missing: vec![],
            generates_os: false,
            auto_fix_complete: false,
            honesty: "t".into(),
            note: "t".into(),
        };
        let pkg = build_wedge_p0_package(&map);
        assert!(pkg.p0_ready);
        assert_eq!(pkg.gicr_base, Some(0x1204_0000));
        assert!(pkg.dtsi.contains("0x12040000"));
        assert!(pkg.hal_h.contains("WEDGE_GICR_BASE"));
        assert!(!pkg.generates_os);
    }
}
