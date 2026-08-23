# Moto G35 real Firmware.zip — CASE SUMMARY
> Product: ums9620 / QogirN6Pro (Unisoc) · Android 14 stock · ≠ TaurOS complete

| Image | Blocks | Ψ | Confidence | Port package |
|-------|--------|---|------------|--------------|
| `analyze_lk` | 45 | 0.164 | 85.9% conclusive_match | wrap=35 rewrite=10 fossils=184 |
| `analyze_boot` | 53 | 0.303 | 76.8% inconclusive | wrap=53 rewrite=0 fossils=22 |
| `analyze_kernel` | 415 | 0.192 | 83.9% inconclusive | wrap=415 rewrite=0 fossils=12 |

## OS-port platform inventory (DTB)

### `platform_dtbo` — readiness 36% · CPU `unknown`

- found: mmu, storage_emmc_ufs, device_tree, cpu
- missing: gic, arm_generic_timer, dram_controller, uart, gpio, pmic, gpu_framebuffer
- see `platform_dtbo/PLATFORM_INVENTORY.md`

### `platform_vendor_boot` — readiness 100% · CPU `ARMv8.2-A / Cortex-A76 + Cortex-A55 (big.LITTLE)`

- found: gic, arm_generic_timer, mmu, dram_controller, uart, gpio, pmic, storage_emmc_ufs, gpu_framebuffer, device_tree, cpu
- missing: (none)
- see `platform_vendor_boot/PLATFORM_INVENTORY.md`


Nota: só `port_package_lk` recebe `--dtb` no script; inventário OS-port completo vem de `platform_vendor_boot/` (não do DTBO).

Required classes: cpu, gic, arm_generic_timer, mmu, dram_controller, uart, gpio, pmic, storage_emmc_ufs, gpu_framebuffer, device_tree

## Filogenia (lk / boot / kernel)

- Newick: `(analyze_lk:0.253652,(analyze_boot:0.117143,analyze_kernel:0.096798)n3:0.253652);`
- `analyze_lk`↔`analyze_boot`: d_φ=0.557 J_geno=0.150 Φ=0.794 shared=1
- `analyze_lk`↔`analyze_kernel`: d_φ=0.481 J_geno=0.150 Φ=0.853 shared=1
- `analyze_boot`↔`analyze_kernel`: d_φ=0.188 J_geno=0.750 Φ=0.853 shared=3
- ver `phylo/PHYLO_ATLAS.md`

## Primary atlas

- **Use `port_package_lk/` first** — Capstone MMIO real, Ψ ConclusiveMatch
- `PORT_PACKAGE.md`, `address_driver_map.yaml`, `fossil_inventory.yaml`, `hal_mmio_stub.c`
- **Platform gaps** come from DTB — MMIO heuristics alone are not enough for OS port
- Boot/kernel packages are heuristic-heavy (many Reverse labels) — cross-check with LK

## Honesty

- ≠ OS turnkey: heurísticas de MMIO sozinhas **não** bastam para gerar o SO completo
- `generates_os: false` · `auto_fix_complete: false`
- Checklist DTB 100% ≠ OS bootável / TaurOS turnkey
- Filogenia ≠ prova de plágio; d_φ usa bandas SoC + fenótipo quando páginas divergem
- Firmware.zip / real_fw/ gitignored — not redistributed by this repo
- status: **OK**
