#!/usr/bin/env bash
# HIL Lab LIVE — USB real + programador, SEM mock.
# ≠ claim mode=production (receipt = lab_assist sob SOW).
# Requer: probe USB + --features hil_live + ALLOW_FLASH + CMD.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
OUT="$ROOT/examples/hil_lab/out_live"
rm -rf "$OUT"
mkdir -p "$OUT"

if [[ -f "$ROOT/examples/hil_lab/probes.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/examples/hil_lab/probes.env"
fi

: "${BASE_HIL_ALLOW_FLASH:=1}"
: "${BASE_HIL_PROGRAMMER_CMD:=}"
export BASE_HIL_ALLOW_FLASH
export BASE_HIL_REQUIRE_LIVE=1

if [[ -z "${BASE_HIL_PROGRAMMER_CMD}" ]]; then
  echo "ERROR: set BASE_HIL_PROGRAMMER_CMD (see examples/hil_lab/probes.env.example)" >&2
  exit 2
fi
export BASE_HIL_PROGRAMMER_CMD

echo "== Build CLI hil_live (USB + programmer, no mock) =="
cargo build -p base-cli --features hil_live -q
BASE="$ROOT/target/debug/base"
SOP="$ROOT/examples/hil_lab/SOP.md"

SOW_ARGS=()
if [[ "${HIL_SOW_SIGNED:-}" == "1" ]]; then
  SOW_ARGS+=(--sow-signed)
fi

echo "== Gate A lab-status --live (USB only) =="
"$BASE" hil lab-status --sop "$SOP" --live "${SOW_ARGS[@]}" -o "$OUT"
python3 - <<'PY' "$OUT/hil_lab_gate.json"
import json, sys
r = json.load(open(sys.argv[1]))
assert r.get("production") is False, "must never claim production=true"
assert r.get("live") is True
checks = {c["id"]: c for c in r["checks"]}
if not checks["A1"]["green"]:
    print("A1 BLOCK — plug ST-Link/DAPLink/Pico or set BASE_HIL_PROBE_IDS", file=sys.stderr)
    print(checks["A1"]["detail"], file=sys.stderr)
    sys.exit(3)
assert checks["A2"]["green"] is True, checks["A2"]
assert checks["A3"]["green"] is True
assert checks["A4"]["green"] is True
print("live A1/A2 GREEN production=false lab_assist_ready=", r.get("lab_assist_ready"))
PY

FW="${HIL_FW_IMAGE:-}"
if [[ -z "$FW" ]]; then
  FW="$OUT/lab_fw.bin"
  printf 'BASE-HIL-LIVE' > "$FW"
  echo "NOTE: using placeholder firmware $FW — set HIL_FW_IMAGE for real image"
fi

echo "== flash --live (lab_assist; ≠ production) =="
"$BASE" hil flash "$FW" --live -o "$OUT"
python3 - <<'PY' "$OUT/hil_flash_receipt.json"
import json, sys
r = json.load(open(sys.argv[1]))
assert r.get("production") is False
assert r.get("mode") != "production"
assert r.get("mode") == "lab_assist", r
assert r.get("live") is True
print("lab_assist flash OK")
PY

cat > "$OUT/CASE_SUMMARY_HIL_LAB_LIVE.md" <<EOF
# HIL Lab LIVE CASE SUMMARY

- path: USB Detected + hil_programmer (no mock)
- receipt mode: lab_assist
- production: false
- SOW A5: HIL_SOW_SIGNED=${HIL_SOW_SIGNED:-0}
EOF

echo "HIL lab LIVE OK → $OUT"
