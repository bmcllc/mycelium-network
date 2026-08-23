#!/usr/bin/env bash
# G35 wedge P0 — Specter score/twin + QEMU smoke genérico (≠ máquina Unisoc).
# Bases: UART 0x20200000 · GICD 0x12000000 · GICR 0x12040000 · UFS 0x22000000
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${WEDGE_QEMU_OUT:-$PILOT/out_real/wedge_qemu}"
SPEC="${WEDGE_SPEC:-$PILOT/virt/hardware_spec_wedge_p0.yaml}"
TRACE="${WEDGE_TRACE:-$PILOT/virt/sample_wedge_p0.ndjson}"
mkdir -p "$OUT"

BASE_BIN="${BASE_BIN:-$ROOT/target/release/base}"
if [[ ! -x "$BASE_BIN" ]]; then
  BASE_BIN="$ROOT/target/debug/base"
fi
if [[ ! -x "$BASE_BIN" ]]; then
  (cd "$ROOT" && cargo build -p base-cli --bin base -q)
  BASE_BIN="$ROOT/target/debug/base"
fi

cd "$ROOT"

echo "== virt ingest / score / twin (wedge P0) =="
"$BASE_BIN" virt ingest "$TRACE" --format ndjson -o "$OUT/ingest"
"$BASE_BIN" virt score --spec "$SPEC" --evidence "$OUT/ingest/evidence_db.yaml" \
  --window-size 4 --max-windows 16 -o "$OUT/score"
"$BASE_BIN" virt twin --spec "$SPEC" --evidence "$OUT/ingest/evidence_db.yaml" \
  -o "$OUT/twin"
"$BASE_BIN" virt watch --spec "$SPEC" --trace "$TRACE" --window-events 2 \
  -o "$OUT/watch"

QEMU_JSON="$OUT/qemu_wedge_smoke.json"
if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then
  cat > "$QEMU_JSON" <<EOF
{"phase":"wedge_p0_b","ok":false,"skipped":true,"reason":"qemu-system-aarch64 not installed","generates_os":false,"machine":"virt","note":"generic virt ≠ ums9620"}
EOF
  echo "SKIP QEMU — wrote $QEMU_JSON"
else
  IMG="${HIL_FW_IMAGE:-}"
  if [[ -z "$IMG" ]]; then
    if [[ -f "$PILOT/kernel.bin" ]]; then
      IMG="$PILOT/kernel.bin"
    else
      python3 "$PILOT/gen_boot.py"
      IMG="$PILOT/kernel.bin"
    fi
  fi
  TIMEOUT_SEC="${QEMU_TIMEOUT_SEC:-6}"
  LOG="$OUT/qemu.log"
  set +e
  timeout "$TIMEOUT_SEC" qemu-system-aarch64 \
    -machine virt -cpu cortex-a72 -m 128M \
    -nographic -kernel "$IMG" \
    -serial none -monitor none \
    >"$LOG" 2>&1
  RC=$?
  set -e
  LAUNCHED=1
  [[ $RC -eq 127 ]] && LAUNCHED=0
  python3 - <<PY
import json
r = {
  "phase": "wedge_p0_b",
  "ok": bool($LAUNCHED),
  "skipped": False,
  "qemu_exit": $RC,
  "kernel": "$IMG",
  "machine": "virt",
  "note": "generic QEMU virt — ≠ Unisoc ums9620 board; bases P0 only for Specter twin",
  "wedge_bases": {"uart": "0x20200000", "gic": "0x12000000", "ufs": "0x22000000"},
  "generates_os": False,
  "production": False,
}
open("$QEMU_JSON","w").write(json.dumps(r, indent=2)+"\n")
print("qemu_wedge_smoke:", r)
PY
fi

# Twin hit rate for summary
HIT=$(python3 -c "
import json, pathlib
p = pathlib.Path(r'''$OUT/twin/twin_guest.json''')
if p.is_file():
  d=json.loads(p.read_text())
  print(f\"{d.get('hit_rate',0):.3f}\")
else:
  print('n/a')
")

cat > "$OUT/CASE_SUMMARY_WEDGE_QEMU.md" <<EOF
# Wedge P0 — Specter + QEMU smoke

≠ OS turnkey: \`generates_os: false\` · QEMU \`-machine virt\` **≠** SoC ums9620.

- spec: \`$SPEC\`
- trace: \`$TRACE\`
- twin hit_rate: $HIT
- qemu: \`$QEMU_JSON\`
- bases: UART \`0x20200000\` · GIC \`0x12000000\` · UFS \`0x22000000\`

## Not

- earlycon no telefone
- máquina QEMU Unisoc completa
- TaurOS bootável
EOF

echo "Wedge QEMU smoke → $OUT (hit_rate=$HIT)"
echo "generates_os=false"
