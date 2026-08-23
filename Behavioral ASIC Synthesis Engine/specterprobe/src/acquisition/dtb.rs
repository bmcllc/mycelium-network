use crate::acquisition::{
    ClockMap, DevicePropHint, DmaController, DtbInfo, GpioMap, I2cBus, IrqMap, MmioRegion, SpiBus,
};
use anyhow::Context;
use device_tree_parser::DeviceTreeParser;
use std::path::Path;

pub fn parse_dtb_file(path: &Path) -> anyhow::Result<DtbInfo> {
    let data = std::fs::read(path).context("Failed to read DTB file")?;
    parse_dtb(&data)
}

pub fn parse_dtb(data: &[u8]) -> anyhow::Result<DtbInfo> {
    let parser = DeviceTreeParser::new(data);
    let tree = parser
        .parse_tree()
        .map_err(|e| anyhow::anyhow!("DTB parse error: {e}"))?;

    let compatible = get_compatible_list(&tree);
    let model = tree
        .properties
        .iter()
        .find(|p| p.name == "model")
        .and_then(|p| match &p.value {
            device_tree_parser::PropertyValue::String(s) => Some(s.to_string()),
            _ => None,
        });

    let mut mmio_regions = Vec::new();
    let mut irqs = Vec::new();
    let mut clocks = Vec::new();
    let mut gpios = Vec::new();
    let mut i2c_buses = Vec::new();
    let mut spi_buses = Vec::new();
    let mut dma_controllers = Vec::new();
    let mut device_prop_hints = Vec::new();

    let root_bus = bus_context(&tree, None);
    walk_node(
        &tree,
        "",
        &root_bus,
        &[],
        &mut mmio_regions,
        &mut irqs,
        &mut clocks,
        &mut gpios,
        &mut i2c_buses,
        &mut spi_buses,
        &mut dma_controllers,
        &mut device_prop_hints,
    );

    Ok(DtbInfo {
        compatible,
        model,
        mmio_regions,
        irqs,
        clocks,
        gpios,
        i2c_buses,
        spi_buses,
        dma_controllers,
        device_prop_hints,
    })
}

fn get_compatible_list(node: &device_tree_parser::DeviceTreeNode) -> Vec<String> {
    node.properties
        .iter()
        .find(|p| p.name == "compatible")
        .and_then(|p| match &p.value {
            device_tree_parser::PropertyValue::StringList(list) => {
                Some(list.iter().map(|s| (*s).to_string()).collect())
            }
            device_tree_parser::PropertyValue::String(s) => Some(vec![s.to_string()]),
            _ => None,
        })
        .unwrap_or_default()
}

#[derive(Clone, Debug)]
struct RangeMap {
    child_addr: u64,
    parent_addr: u64,
    size: u64,
}

/// Bus addressing for children of a node (`#address-cells` / `#size-cells` / `ranges`).
#[derive(Clone, Debug)]
struct BusContext {
    address_cells: u32,
    size_cells: u32,
    /// `None` = no `ranges` property (identity). `Some([])` = empty `ranges;` (1:1).
    ranges: Option<Vec<RangeMap>>,
}

fn cells_u32(node: &device_tree_parser::DeviceTreeNode, name: &str, default: u32) -> u32 {
    node.prop_u32(name).unwrap_or(default)
}

fn pack_cells(cells: &[u32]) -> u64 {
    let mut v = 0u64;
    for &c in cells {
        v = (v << 32) | u64::from(c);
    }
    v
}

fn bus_context(
    node: &device_tree_parser::DeviceTreeNode,
    parent: Option<&BusContext>,
) -> BusContext {
    let address_cells = cells_u32(node, "#address-cells", 2);
    let size_cells = cells_u32(node, "#size-cells", 1);
    let parent_addr_cells = parent.map(|p| p.address_cells).unwrap_or(2);
    let ranges = parse_ranges(node, address_cells, parent_addr_cells, size_cells);
    BusContext {
        address_cells,
        size_cells,
        ranges,
    }
}

fn parse_ranges(
    node: &device_tree_parser::DeviceTreeNode,
    child_addr_cells: u32,
    parent_addr_cells: u32,
    size_cells: u32,
) -> Option<Vec<RangeMap>> {
    if !node.has_property("ranges") {
        return None;
    }
    let Some(raw) = node.prop_u32_array("ranges") else {
        // Empty `ranges;` → 1:1 identity
        return Some(Vec::new());
    };
    if raw.is_empty() {
        return Some(Vec::new());
    }
    let entry = (child_addr_cells + parent_addr_cells + size_cells) as usize;
    if entry == 0 || raw.len() % entry != 0 {
        return Some(Vec::new());
    }
    let mut out = Vec::new();
    let mut i = 0;
    while i + entry <= raw.len() {
        let child_addr = pack_cells(&raw[i..i + child_addr_cells as usize]);
        i += child_addr_cells as usize;
        let parent_addr = pack_cells(&raw[i..i + parent_addr_cells as usize]);
        i += parent_addr_cells as usize;
        let size = if size_cells == 0 {
            0
        } else {
            pack_cells(&raw[i..i + size_cells as usize])
        };
        i += size_cells as usize;
        out.push(RangeMap {
            child_addr,
            parent_addr,
            size,
        });
    }
    Some(out)
}

fn apply_ranges(addr: u64, ranges: &Option<Vec<RangeMap>>) -> u64 {
    match ranges.as_deref() {
        None | Some([]) => addr,
        Some(maps) => {
            for r in maps {
                if r.size == 0 {
                    if addr == r.child_addr {
                        return r.parent_addr;
                    }
                    continue;
                }
                if addr >= r.child_addr && addr < r.child_addr.saturating_add(r.size) {
                    return r.parent_addr + (addr - r.child_addr);
                }
            }
            addr
        }
    }
}

/// Translate a bus-local address through ancestor buses toward CPU physical.
fn to_cpu_physical(mut addr: u64, ancestors: &[BusContext]) -> u64 {
    for bus in ancestors {
        addr = apply_ranges(addr, &bus.ranges);
    }
    addr
}

/// Parse `reg` using the **parent** bus `#address-cells` / `#size-cells` (DT spec).
pub fn parse_reg_cells(reg: &[u32], address_cells: u32, size_cells: u32) -> Vec<(u64, u64)> {
    let entry = (address_cells + size_cells) as usize;
    if entry == 0 || reg.len() < entry {
        return Vec::new();
    }
    let mut regions = Vec::new();
    let mut i = 0;
    while i + entry <= reg.len() {
        let addr = pack_cells(&reg[i..i + address_cells as usize]);
        let size = if size_cells == 0 {
            0
        } else {
            pack_cells(&reg[i + address_cells as usize..i + entry])
        };
        regions.push((addr, size));
        i += entry;
    }
    regions
}

fn get_reg_translated(
    node: &device_tree_parser::DeviceTreeNode,
    parent_bus: &BusContext,
    ancestors: &[BusContext],
) -> Vec<(u64, u64)> {
    let Some(reg) = node.prop_u32_array("reg") else {
        return Vec::new();
    };
    parse_reg_cells(&reg, parent_bus.address_cells, parent_bus.size_cells)
        .into_iter()
        .map(|(addr, size)| (to_cpu_physical(addr, ancestors), size))
        .collect()
}

fn get_string_list(node: &device_tree_parser::DeviceTreeNode, name: &str) -> Vec<String> {
    node.properties
        .iter()
        .find(|p| p.name == name)
        .and_then(|p| match &p.value {
            device_tree_parser::PropertyValue::StringList(list) => {
                Some(list.iter().map(|s| (*s).to_string()).collect())
            }
            device_tree_parser::PropertyValue::String(s) => Some(vec![s.to_string()]),
            _ => None,
        })
        .unwrap_or_default()
}

fn walk_node(
    node: &device_tree_parser::DeviceTreeNode,
    parent_name: &str,
    parent_bus: &BusContext,
    ancestors: &[BusContext],
    mmio_regions: &mut Vec<MmioRegion>,
    irqs: &mut Vec<IrqMap>,
    clocks: &mut Vec<ClockMap>,
    gpios: &mut Vec<GpioMap>,
    i2c_buses: &mut Vec<I2cBus>,
    spi_buses: &mut Vec<SpiBus>,
    dma_controllers: &mut Vec<DmaController>,
    device_prop_hints: &mut Vec<DevicePropHint>,
) {
    let node_name = node.name;
    let full_name = if parent_name.is_empty() {
        node_name.to_string()
    } else {
        format!("{}/{}", parent_name, node_name)
    };

    let compat = get_compatible_list(node);
    let regs = get_reg_translated(node, parent_bus, ancestors);
    let interrupts = node.prop_u32_array("interrupts").unwrap_or_default();

    for &(addr, size) in &regs {
        mmio_regions.push(MmioRegion {
            address: addr,
            size,
            peripheral: Some(full_name.clone()),
            compatible: compat.clone(),
        });
    }

    for &irq in &interrupts {
        irqs.push(IrqMap {
            irq,
            peripheral: full_name.clone(),
            flags: 0,
        });
    }

    let is_clock_ctrl = node_name.contains("clock-controller")
        || compat.iter().any(|c| {
            let l = c.to_ascii_lowercase();
            l.contains("clock-controller")
                || l.contains("-clk")
                || l.contains("-gate")
                || (l.contains("clock") && l.contains("sprd"))
        });
    if is_clock_ctrl {
        for &(addr, _) in &regs {
            clocks.push(ClockMap {
                clock_id: clocks.len() as u32,
                name: Some(format!("{full_name}@{addr:#x}")),
                frequency: None,
            });
        }
    }

    let clock_names = get_string_list(node, "clock-names");
    let clocks_cells = node.prop_u32_array("clocks").unwrap_or_default();
    let pinctrl_names = get_string_list(node, "pinctrl-names");
    let pinctrl_0_cells = node.prop_u32_array("pinctrl-0").unwrap_or_default();
    if !clock_names.is_empty()
        || !clocks_cells.is_empty()
        || !pinctrl_names.is_empty()
        || !pinctrl_0_cells.is_empty()
    {
        device_prop_hints.push(DevicePropHint {
            path: full_name.clone(),
            compatible: compat.clone(),
            reg_bases: regs.iter().map(|(a, _)| *a).collect(),
            clock_names,
            clocks_cells,
            pinctrl_names,
            pinctrl_0_cells,
        });
    }

    if compat.iter().any(|c| c.contains("gpio")) {
        for &(addr, _) in &regs {
            gpios.push(GpioMap {
                bank: gpios.len() as u32,
                base: addr,
                count: 32,
            });
        }
    }

    if compat.iter().any(|c| c.contains("i2c")) {
        for &(addr, _) in &regs {
            i2c_buses.push(I2cBus {
                bus_id: i2c_buses.len() as u32,
                address: addr,
                clock: None,
            });
        }
    }

    if compat.iter().any(|c| c.contains("spi")) {
        for &(addr, _) in &regs {
            spi_buses.push(SpiBus {
                bus_id: spi_buses.len() as u32,
                address: addr,
                chip_select: 0,
            });
        }
    }

    if compat.iter().any(|c| c.contains("dma")) {
        for &(addr, _) in &regs {
            dma_controllers.push(DmaController {
                address: addr,
                channels: 8,
                interrupts: interrupts.clone(),
            });
        }
    }

    // This node as bus for its children.
    let this_bus = bus_context(node, Some(parent_bus));
    let mut child_ancestors = Vec::with_capacity(ancestors.len() + 1);
    child_ancestors.push(this_bus.clone());
    child_ancestors.extend_from_slice(ancestors);

    for child in &node.children {
        walk_node(
            child,
            &full_name,
            &this_bus,
            &child_ancestors,
            mmio_regions,
            irqs,
            clocks,
            gpios,
            i2c_buses,
            spi_buses,
            dma_controllers,
            device_prop_hints,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_reg_two_cells_gicv3_style() {
        // #address-cells=<2> #size-cells=<2>
        // GICD 0x12000000/0x20000, GICR 0x12040000/0x100000
        let reg = [
            0u32, 0x1200_0000, 0, 0x2_0000, 0, 0x1204_0000, 0, 0x10_0000,
        ];
        let regions = parse_reg_cells(&reg, 2, 2);
        assert_eq!(
            regions,
            vec![(0x1200_0000, 0x2_0000), (0x1204_0000, 0x10_0000)]
        );
    }

    #[test]
    fn parse_reg_one_cell_pairs() {
        let reg = [0x4001_3800u32, 0x400, 0x4001_3c00, 0x400];
        let regions = parse_reg_cells(&reg, 1, 1);
        assert_eq!(
            regions,
            vec![(0x4001_3800, 0x400), (0x4001_3c00, 0x400)]
        );
    }

    #[test]
    fn naive_pair_parse_would_misread_gic() {
        // Documents the old bug: treating 2+2 cells as (addr,size) pairs of u32.
        let reg = [
            0u32, 0x1200_0000, 0, 0x2_0000, 0, 0x1204_0000, 0, 0x10_0000,
        ];
        let mut naive = Vec::new();
        let mut i = 0;
        while i + 1 < reg.len() {
            naive.push((reg[i] as u64, reg[i + 1] as u64));
            i += 2;
        }
        assert_eq!(naive[0], (0, 0x1200_0000)); // wrong "address"
        assert_ne!(naive[0].0, 0x1200_0000);
    }
}
