#!/usr/bin/env bash
# G35 wedge — Specter live (twin/score/watch) + QMP opt-in contra bases P0.
# Bases: UART 0x20200000 · GICD 0x12000000 · GICR 0x12040000 · UFS 0x22000000
# ≠ máquina Unisoc · ≠ OS boot · QEMU -machine virt apenas para QMP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${WEDGE_SPECTER_OUT:-$PILOT/out_real/wedge_specter}"
SPEC="${WEDGE_SPEC:-$PILOT/virt/hardware_spec_wedge_p0.yaml}"
TRACE="${WEDGE_TRACE:-$PILOT/virt/sample_wedge_p0.ndjson}"
MAP="${WEDGE_MAP:-$PILOT/out_real/usb_cross/wedge_mmio_map.yaml}"
QMP_SOCK="${BASE_QMP_SOCK:-/tmp/base-qmp-wedge.sock}"
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

# Optional: validate atlas has GICR
if [[ -f "$MAP" ]]; then
  python3 - <<PY
import yaml, sys
m=yaml.safe_load(open("$MAP"))
bases={e["class"]: e.get("absolute_base_hex") for e in m.get("entries",[])}
need=["uart","gic","gic_redistributor","storage_emmc_ufs"]
missing=[k for k in need if not bases.get(k)]
open("$OUT/atlas_check.json","w").write(__import__("json").dumps({
  "ok": not missing, "bases": bases, "missing": missing,
  "generates_os": False
}, indent=2)+"\n")
if missing:
  print("WARN atlas missing:", missing, file=sys.stderr)
else:
  print("atlas P0+GICR OK:", {k: bases[k] for k in need})
PY
fi

echo "== Specter ingest / score / twin / watch (wedge P0+GICR) =="
"$BASE_BIN" virt ingest "$TRACE" --format ndjson -o "$OUT/ingest"
"$BASE_BIN" virt score --spec "$SPEC" --evidence "$OUT/ingest/evidence_db.yaml" \
  --window-size 4 --max-windows 16 -o "$OUT/score"
"$BASE_BIN" virt twin --spec "$SPEC" --evidence "$OUT/ingest/evidence_db.yaml" \
  -o "$OUT/twin"
"$BASE_BIN" virt watch --spec "$SPEC" --trace "$TRACE" --window-events 2 \
  -o "$OUT/watch"

HIT=$(python3 -c "
import json, pathlib
p=pathlib.Path('$OUT/twin/twin_guest.json')
print(f\"{json.loads(p.read_text()).get('hit_rate',0):.3f}\" if p.is_file() else 'n/a')
")

QMP_JSON="$OUT/qmp_live.json"
rm -f "$QMP_SOCK"
if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then
  cat > "$QMP_JSON" <<EOF
{"phase":"wedge_specter_qmp","ok":false,"skipped":true,"reason":"qemu-system-aarch64 missing","generates_os":false}
EOF
else
  IMG="${HIL_FW_IMAGE:-}"
  if [[ -z "$IMG" ]]; then
    [[ -f "$PILOT/kernel.bin" ]] || python3 "$PILOT/gen_boot.py"
    IMG="$PILOT/kernel.bin"
  fi
  # Optional block device so probe-savevm can succeed; still ≠ ums9620.
  SNAP="$OUT/vmstate.qcow2"
  if command -v qemu-img >/dev/null 2>&1; then
    qemu-img create -f qcow2 "$SNAP" 64M >/dev/null 2>&1 || true
  fi
  set +e
  if [[ -f "$SNAP" ]]; then
    qemu-system-aarch64 -machine virt -cpu cortex-a72 -m 128M \
      -nographic -kernel "$IMG" \
      -drive "file=$SNAP,if=none,id=vd0,format=qcow2" \
      -device virtio-blk-device,drive=vd0 \
      -qmp "unix:$QMP_SOCK,server,nowait" \
      -serial none -monitor none \
      >"$OUT/qemu_qmp.log" 2>&1 &
  else
    qemu-system-aarch64 -machine virt -cpu cortex-a72 -m 128M \
      -nographic -kernel "$IMG" \
      -qmp "unix:$QMP_SOCK,server,nowait" \
      -serial none -monitor none \
      >"$OUT/qemu_qmp.log" 2>&1 &
  fi
  QEMU_PID=$!
  set -e
  sleep 1
  set +e
  "$BASE_BIN" virt qmp probe --socket "$QMP_SOCK" -o "$OUT/qmp_probe" 2>"$OUT/qmp_probe.err"
  PROBE_RC=$?
  "$BASE_BIN" virt qmp status --socket "$QMP_SOCK" -o "$OUT/qmp_status" 2>"$OUT/qmp_status.err"
  STATUS_RC=$?
  # savevm may still fail without writable snapshot backend — record honestly
  "$BASE_BIN" virt qmp probe-savevm --socket "$QMP_SOCK" -o "$OUT/qmp_savevm" 2>"$OUT/qmp_savevm.err"
  SAVE_RC=$?
  "$BASE_BIN" virt qmp quit --socket "$QMP_SOCK" -o "$OUT/qmp_quit" 2>/dev/null
  wait "$QEMU_PID" 2>/dev/null
  set -e
  python3 - <<PY
import json, pathlib
def load(p):
  p=pathlib.Path(p)
  if not p.is_file(): return None
  try: return json.loads(p.read_text())
  except Exception: return {"raw": p.read_text()[:500]}
r={
  "phase":"wedge_specter_qmp",
  "ok": $PROBE_RC==0 and $STATUS_RC==0,
  "probe_rc": $PROBE_RC,
  "status_rc": $STATUS_RC,
  "savevm_rc": $SAVE_RC,
  "savevm": load("$OUT/qmp_savevm/qmp_savevm_probe.json") or load("$OUT/qmp_savevm_probe.json"),
  "status": load("$OUT/qmp_status/qmp_response.json") or load("$OUT/qmp_response.json"),
  "machine":"virt",
  "note":"QMP against generic virt — ≠ ums9620 physical MMIO; Specter twin uses synthetic NDJSON on wedge bases",
  "wedge_bases":{"uart":"0x20200000","gicd":"0x12000000","gicr":"0x12040000","ufs":"0x22000000"},
  "twin_hit_rate":"$HIT",
  "generates_os":False,
  "auto_flash_complete":False,
}
open("$QMP_JSON","w").write(json.dumps(r,indent=2)+"\n")
print("qmp_live:", r["ok"], "savevm_ok=", (r.get("savevm") or {}).get("ok"))
PY
fi

cat > "$OUT/CASE_SUMMARY_WEDGE_SPECTER.md" <<EOF
# Wedge Specter live — twin + QMP

≠ OS turnkey · QEMU \`-machine virt\` **≠** ums9620 · evidência MMIO = NDJSON sintético nas bases atlas.

- twin hit_rate: **$HIT**
- spec: \`$SPEC\` (UART/GICD/GICR/UFS)
- qmp: \`$QMP_JSON\`
- atlas check: \`$OUT/atlas_check.json\`

## Bases

| Class | Base |
|-------|------|
| UART0 | \`0x20200000\` |
| GICD | \`0x12000000\` |
| GICR | \`0x12040000\` |
| UFS | \`0x22000000\` |

## Not

- earlycon no telefone
- guest a tocar físicos Unisoc
- savevm obrigatório (precisa block/vmstate)
EOF

echo "Wedge Specter → $OUT (hit_rate=$HIT)"
echo "generates_os=false"
