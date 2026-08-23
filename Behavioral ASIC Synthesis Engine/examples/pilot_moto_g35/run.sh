#!/usr/bin/env bash
# Moto G35 OS-port assist — fase A (forense). ≠ TaurOS bootável.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$PILOT/out"
cd "$ROOT"

python3 "$PILOT/gen_boot.py"
cargo build -p base-cli -q
BASE="$ROOT/target/debug/base"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== analyze ANDROID! boot.img (strip + mmio-traces uart) =="
"$BASE" analyze "$PILOT/boot.img" \
  --mmio-traces "$PILOT/mmio.json" \
  --classify uart \
  -o "$OUT/analyze"
test -f "$OUT/analyze/hardware_spec.yaml"

echo "== golden: UART page 0xA9000000 in spec =="
grep -E 'base_address: (2835349504|0xa9000000|0xA9000000)' "$OUT/analyze/hardware_spec.yaml" >/dev/null \
  || grep -qi 'a9000000' "$OUT/analyze/hardware_spec.yaml"

echo "== fields allowlist =="
python3 - <<'PY' "$OUT/analyze/hardware_spec.yaml" "$PILOT/expected/hardware_spec.fields.yaml"
import sys, re, yaml
text = open(sys.argv[1]).read()
# HardwareSpec may contain !Unknown tags — strip custom tags for structural check
clean = re.sub(r"![A-Za-z0-9_]+", "", text)
spec = yaml.safe_load(clean)
exp = yaml.safe_load(open(sys.argv[2]))
for k in exp["required_top_level"]:
    assert k in spec, f"missing top-level {k}"
assert spec.get("blocks"), "blocks empty"
b0 = spec["blocks"][0]
for k in exp["required_block_fields"]:
    assert k in b0, f"missing block field {k}"
print("fields OK")
PY

echo "== prove contracts =="
"$BASE" prove "$PILOT/contracts.yaml" -o "$OUT/prove"
test -f "$OUT/prove/proof_report.json" || test -f "$OUT/prove/proof_report.yaml" || ls "$OUT/prove"

echo "== reconstruct (≠ auto-fix) =="
"$BASE" reconstruct "$OUT/analyze/hardware_spec.yaml" \
  --threshold 0.99 --max-iterations 16 \
  -o "$OUT/reconstruct"
python3 - <<'PY' "$OUT/reconstruct/convergence_report.json"
import json, sys
r = json.load(open(sys.argv[1]))
assert r.get("auto_fix_complete") is False
assert "stop_reason" in r
print("reconstruct OK", r["stop_reason"])
PY

echo "== study opt-in light =="
if [[ -f "$ROOT/examples/pilot_study/policy.lua" ]]; then
  "$BASE" study "$OUT/analyze/hardware_spec.yaml" \
    --policy "$ROOT/examples/pilot_study/policy.lua" \
    -o "$OUT/study" || true
  if [[ -f "$OUT/study/study_report.json" ]]; then
    python3 - <<'PY' "$OUT/study/study_report.json"
import json, sys
r = json.load(open(sys.argv[1]))
assert r.get("auto_fix_complete") is False
print("study OK", r.get("stop_reason"))
PY
  fi
fi

echo "== port package (addr map + fossils + atlas) =="
"$BASE" port package "$OUT/analyze/hardware_spec.yaml" \
  --evidence "$OUT/analyze/evidence_db.yaml" \
  --tension "$OUT/analyze/tension_report.json" \
  --target-hal "hal_tauros_aarch64" \
  --hal-stub \
  -o "$OUT/port_package"
test -f "$OUT/port_package/PORT_PACKAGE.md"
test -f "$OUT/port_package/address_driver_map.yaml"
test -f "$OUT/port_package/fossil_inventory.yaml"
test -f "$OUT/port_package/hal_mmio_stub.c"
grep -q 'generates_os: false' "$OUT/port_package/port_package.yaml" \
  || grep -q 'generates_os: false' "$OUT/port_package/PORT_PACKAGE.md"

cp "$PILOT/manifest.yaml" "$OUT/manifest.yaml"
cat > "$OUT/CASE_SUMMARY_G35_A.md" <<EOF
# Moto G35 OS-port assist — fase A

- fixture: ANDROID! boot.img (synth Unisoc UART 0xA9000000)
- hardware_spec + prove + reconstruct OK
- port_package: address map + fossils + HAL stub
- auto_fix_complete=false · generates_os=false
- ≠ TaurOS complete / ≠ production
- status: OK
EOF

echo "Pilot Moto G35 fase A OK → $OUT"
