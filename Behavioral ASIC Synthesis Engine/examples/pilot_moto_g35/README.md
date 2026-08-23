# Pilot — Moto G35 5G (OS Port Validation Assist)

Unisoc ums9620 / AArch64 (`manila`). **≠** TaurOS completo gerado pelo B.A.S.E.

## Wedge P0 (recomendado)

```bash
./run_wedge_pipeline.sh
# → out_real/… · ver WEDGE_HANDOFF.md (tree externo)
```

| Passo | Script |
|-------|--------|
| Pipeline | `./run_wedge_pipeline.sh` |
| USB | `./run_usb_probe.sh` |
| Atlas | `./run_usb_cross.sh` |
| Stub DT/HAL | `./run_wedge_p0.sh` |
| Specter/QEMU | `./run_wedge_qemu_smoke.sh` |
| Fase C assist | `./run_wedge_hw_assist.sh` (sem flash) |
| Handoff | [WEDGE_HANDOFF.md](WEDGE_HANDOFF.md) |

Bases: UART `0x20200000` · GIC `0x12000000` · UFS `0x22000000`.

## Outros

| Fase | Script |
|------|--------|
| A Forense | `./run.sh` |
| B QEMU genérico | `./run_qemu_smoke.sh` |
| Specter Live | `./run_virt_live.sh` |
| Firmware real | `./run_real_fw.sh` (Firmware.zip) |
| C lab | [SOP.md](SOP.md) + receipt |

Vault: `base-vault/24`–`26` · tag `v1.6.1-rc`.
