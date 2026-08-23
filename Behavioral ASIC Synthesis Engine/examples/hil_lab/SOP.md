# HIL Lab SOP (Gate A3) — template

> Copiar/adaptar ao lab do Cliente. Path **live** = USB + programador, **sem mock**.  
> Receipt `lab_assist` sob SOW — **nunca** `mode=production` / SaaS turnkey.

## 1. Operador

- Nome / contato: _______________
- Só flasheia silício com SOW §HIL assinado (Gate A5 / `HIL_SOW_SIGNED=1`).

## 2. Path LIVE (produção de lab — sem mock)

```bash
cp examples/hil_lab/probes.env.example examples/hil_lab/probes.env
# editar BASE_HIL_PROGRAMMER_CMD + opcional BASE_HIL_PROBE_IDS / HIL_FW_IMAGE

cargo build -p base-cli --features hil_live
export BASE_HIL_ALLOW_FLASH=1
export BASE_HIL_PROGRAMMER_CMD='…'   # picotool / openocd / probe-rs
# opcional: export HIL_SOW_SIGNED=1   # só com contrato

./examples/hil_lab/run_hil_lab_live.sh
# ou:
base hil lab-status --sop examples/hil_lab/SOP.md --live -o /tmp/hil/
base hil flash firmware.bin --live -o /tmp/hil/
# → mode=lab_assist · production=false
```

`--live` recusa `--mock-detected` / `--mock-flash`. Catálogo USB: ST-Link, DAPLink, Pico, J-Link + `BASE_HIL_PROBE_IDS`.

## 3. Rehearsal offline (CI / sem probe)

```bash
./examples/hil_lab/run_hil_lab_assist.sh   # A1/A2 com mock — ≠ live
base hil flash fw.bin --mock-flash -o /tmp/hil/   # mock_dry_run
```

## 4. Rollback / log

- Guardar `hil_flash_receipt.json` + hash do binário.
- Se falhar: reverter imagem anterior documentada no SOW.

## 5. Proibido

- Flash no CI default  
- Claim `production: true` / `mode=production` / SaaS plug-and-flash  
- `--live` com mock  
- `--sow-signed` / `HIL_SOW_SIGNED=1` sem contrato  

Ref: `base-vault/22 - Path to v1.2/22.30 - SOW Industrial Gate.md`
