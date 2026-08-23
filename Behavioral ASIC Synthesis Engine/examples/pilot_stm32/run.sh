#!/usr/bin/env bash
# U1 — STM32F103 USART1 wedge (opt-in). NÃO substitui examples/pilot/run.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="${ROOT}/target/debug/base"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${PILOT}/out"
PREF="STMicroelectronics"

if [[ ! -x "$BASE" ]]; then
  echo "Building base-cli…"
  (cd "$ROOT" && cargo build -p base-cli)
fi

echo "== U1 STM32 fixture integrity =="
(cd "$PILOT" && sha256sum -c SHA256SUMS)

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== bir =="
"$BASE" bir "$PILOT/pilot.bsl" --compile --validate -o "$OUT/bir"

echo "== analyze (Capstone --disasm, V1) =="
"$BASE" analyze "$PILOT/fw.bin" --disasm -o "$OUT/analyze_disasm"
# Capstone must hit USART1 regs (page 0x40013000 / addrs 0x40013800…) without traces
grep -E 'base_address: (1073819648|0x40013000)' "$OUT/analyze_disasm/hardware_spec.yaml" >/dev/null \
  || grep -qE '40013(800|000)' "$OUT/analyze_disasm/hardware_spec.yaml"

echo "== analyze (USART1 @ 0x40013800, traces) =="
"$BASE" analyze "$PILOT/fw.bin" \
  --mmio-traces "$PILOT/mmio.json" \
  --classify uart \
  -o "$OUT/analyze"
# Clustering 4K: USART1 @ 0x40013800 → page 0x40013000 (1073819648)
grep -E 'base_address: (1073819648|0x40013000)' "$OUT/analyze/hardware_spec.yaml" >/dev/null \
  || grep -q '40013000' "$OUT/analyze/hardware_spec.yaml"
grep -Eqi 'kind:[[:space:]]*(Uart|uart)' "$OUT/analyze/hardware_spec.yaml"

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

echo "== pcb draft (V2 USART labels, NOT FABRICABLE) =="
"$BASE" pcb "$OUT/synth/synthesized_spec.yaml" -o "$OUT/pcb"
SCH="$OUT/pcb/project.kicad_sch"
test -f "$SCH"
grep -q 'NOT FABRICABLE' "$SCH"
grep -Eq 'usart1_tx|uart0_tx' "$SCH"
grep -Eq 'usart1_rx|uart0_rx' "$SCH"
grep -Eq 'PA9|PA10' "$SCH"

echo "== prove =="
"$BASE" prove "$PILOT/contracts.yaml" -o "$OUT/prove"

echo "== event-graph + goldens (W2) =="
"$BASE" event-graph "$PILOT/contracts.yaml" "$PILOT/trace.csv" \
  --format dot -o "$OUT/event_graph"
"$BASE" event-graph "$PILOT/contracts.yaml" "$PILOT/trace.csv" \
  --format mermaid -o "$OUT/event_graph"
diff -u "$PILOT/expected/event_graph.dot" "$OUT/event_graph/event_graph.dot"
diff -u "$PILOT/expected/event_graph.mmd" "$OUT/event_graph/event_graph.mmd"
# Prove golden: stable fields only (omit smt_lib)
python3 - "$OUT/prove/proof_report.json" "$PILOT/expected/proof_report.golden.json" <<'PY'
import json, pathlib, sys
actual_path = pathlib.Path(sys.argv[1])
golden_path = pathlib.Path(sys.argv[2])
src = json.loads(actual_path.read_text())
got = {
    "backend": src["backend"],
    "contracts_proved": src["contracts_proved"],
    "all_satisfied": src["all_satisfied"],
    "results": [
        {
            "contract": r["contract"],
            "satisfiable": r["satisfiable"],
            "proved": r["proved"],
            "backend": r["backend"],
            "model": r["model"],
        }
        for r in src["results"]
    ],
}
want = json.loads(golden_path.read_text())
assert got == want, f"prove golden mismatch:\n got={got}\nwant={want}"
print("prove golden OK")
PY
# HardwareSpec field allowlist
python3 - "$OUT/analyze/hardware_spec.yaml" "$PILOT/expected/hardware_spec.fields.yaml" <<'PY'
import pathlib, sys
spec = pathlib.Path(sys.argv[1]).read_text()
fields = pathlib.Path(sys.argv[2]).read_text()
# Minimal parse of required_top_level list
keys = []
in_list = False
for line in fields.splitlines():
    if line.strip() == "required_top_level:":
        in_list = True
        continue
    if in_list:
        if line.startswith("  - "):
            keys.append(line[4:].strip())
        elif line and not line.startswith(" "):
            break
        elif line.startswith("required_"):
            break
assert keys, "no required_top_level keys"
for k in keys:
    assert f"{k}:" in spec or f"\n{k}:" in spec or spec.startswith(f"{k}:"), f"missing top-level key {k}"
assert "40013000" in spec or "1073819648" in spec
print(f"hardware_spec fields OK ({len(keys)} keys)")
PY

echo "== replay =="
"$BASE" replay "$PILOT/trace.csv" \
  --contracts "$PILOT/contracts.yaml" \
  --output "$OUT/violations.json"

echo "== CASE_SUMMARY =="
python3 - "$OUT" <<'PY'
import pathlib, sys, re
out = pathlib.Path(sys.argv[1])
design = (out / "design" / "reference_design.yaml").read_text()
assert "STM32F103C8" in design
summary = out / "CASE_SUMMARY.md"
summary.write_text(
    "# U1 STM32 CASE SUMMARY\n\n"
    "- Wedge: STM32F103 USART1 @ 0x40013800\n"
    "- Capstone --disasm: synthetic AArch64 @ page 0x40013000 (V1; ≠ Thumb silicon)\n"
    "- Pins USART1: PA9/PA10 labels no draft PCB (V2; NOT FABRICABLE)\n"
    "- Goldens W2: event-graph + prove vs expected/ (diff, não overwrite)\n"
    "- Prefer manufacturer: STMicroelectronics → STM32F103C8\n"
    "- Gate RP (`examples/pilot/run.sh`) intocado\n"
    f"- design bytes: {len(design)}\n"
    "- status: OK\n"
)
print(summary.read_text())
PY

echo "U1 STM32 smoke OK → $OUT"
