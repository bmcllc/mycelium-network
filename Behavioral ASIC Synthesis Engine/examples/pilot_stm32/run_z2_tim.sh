#!/usr/bin/env bash
# Z2 — USART1 + TIM2 no mesmo STM32 (opt-in). NÃO substitui run.sh / run_w1_spi.sh / run_x3_i2c.sh.
#
# TIM2 @ 0x40000000 (APB1) → page 0x40000000 (≠ USART1 / SPI2 / I2C1).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="${ROOT}/target/debug/base"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${PILOT}/out_z2_tim"
PREF="STMicroelectronics"
CLASSIFY="0x40013000=uart,0x40000000=timer"

if [[ ! -x "$BASE" ]]; then
  echo "Building base-cli…"
  (cd "$ROOT" && cargo build -p base-cli)
fi

echo "== Z2 STM32 USART+TIM fixture integrity =="
(cd "$PILOT" && sha256sum -c SHA256SUMS.z2)

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== bir TIM2 =="
"$BASE" bir "$PILOT/pilot_tim.bsl" --compile --validate -o "$OUT/bir_tim"

echo "== analyze dual (classify per page) =="
"$BASE" analyze "$PILOT/fw.bin" \
  --mmio-traces "$PILOT/mmio_usart_tim.json" \
  --classify "$CLASSIFY" \
  -o "$OUT/analyze"

grep -E 'base_address: (1073819648|0x40013000)' "$OUT/analyze/hardware_spec.yaml" >/dev/null
grep -E 'base_address: (1073741824|0x40000000)' "$OUT/analyze/hardware_spec.yaml" >/dev/null
grep -Eqi 'kind:[[:space:]]*(Uart|uart)' "$OUT/analyze/hardware_spec.yaml"
grep -Eqi 'kind:[[:space:]]*(Timer|timer)' "$OUT/analyze/hardware_spec.yaml"

echo "== design (prefer ST) =="
"$BASE" design "$OUT/analyze/hardware_spec.yaml" \
  --preferred-manufacturer "$PREF" \
  --max-bom-cost 80 \
  -o "$OUT/design"
grep -q 'STM32F103C8' "$OUT/design/reference_design.yaml"

echo "== synth (prefer ST) =="
"$BASE" synth "$OUT/analyze/hardware_spec.yaml" \
  --preferred-manufacturer "$PREF" \
  --max-bom-cost 80 \
  -o "$OUT/synth"
grep -q 'STM32F103C8' "$OUT/synth/synthesized_spec.yaml"
grep -Eqi 'interface:[[:space:]]*uart|"uart"|uart' "$OUT/synth/synthesized_spec.yaml"
grep -Eqi 'interface:[[:space:]]*timer|"timer"|timer' "$OUT/synth/synthesized_spec.yaml"

echo "== prove TIM2 contracts =="
"$BASE" prove "$PILOT/contracts_tim.yaml" -o "$OUT/prove_tim"

echo "== replay TIM2 =="
"$BASE" replay "$PILOT/trace_tim.csv" \
  --contracts "$PILOT/contracts_tim.yaml" \
  --output "$OUT/violations_tim.json"

echo "== CASE_SUMMARY_Z2 =="
python3 - "$OUT" <<'PY'
import pathlib, sys, re
out = pathlib.Path(sys.argv[1])
design = (out / "design" / "reference_design.yaml").read_text()
synth = (out / "synth" / "synthesized_spec.yaml").read_text()
assert "STM32F103C8" in design
assert re.search(r"(?i)uart", synth), "synth missing uart"
assert re.search(r"(?i)timer", synth), "synth missing timer"
summary = out / "CASE_SUMMARY_Z2.md"
summary.write_text(
    "# Z2 STM32 CASE SUMMARY\n\n"
    "- Dual wedge: USART1 @ 0x40013800 + TIM2 @ 0x40000000\n"
    "- Classify: `0x40013000=uart,0x40000000=timer`\n"
    "- Prefer manufacturer: STMicroelectronics → STM32F103C8\n"
    "- Gates USART / SPI / I2C / triple intocados\n"
    f"- design bytes: {len(design)}\n"
    "- status: OK\n"
)
print(summary.read_text())
PY

echo "Z2 STM32 TIM smoke OK → $OUT"
