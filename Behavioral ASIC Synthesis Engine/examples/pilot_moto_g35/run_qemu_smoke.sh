#!/usr/bin/env bash
# Moto G35 OS-port assist — fase B (QEMU AArch64). Opt-in; ≠ CI default.
# Requer: qemu-system-aarch64 + Image/kernel (HIL_FW_IMAGE ou kernel.bin stub limitado).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$PILOT/out_qemu"
mkdir -p "$OUT"

if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then
  cat > "$OUT/qemu_boot_smoke.json" <<EOF
{"phase":"B","ok":false,"skipped":true,"reason":"qemu-system-aarch64 not installed","production":false}
EOF
  echo "SKIP: qemu-system-aarch64 missing — wrote $OUT/qemu_boot_smoke.json"
  exit 0
fi

IMG="${HIL_FW_IMAGE:-}"
if [[ -z "$IMG" ]]; then
  # Stub path: use raw kernel.bin — may not boot a full OS; still exercises QEMU launch.
  python3 "$PILOT/gen_boot.py"
  IMG="$PILOT/kernel.bin"
  echo "NOTE: using synth kernel.bin — set HIL_FW_IMAGE to TaurOS/Android Image for real smoke"
fi

TIMEOUT_SEC="${QEMU_TIMEOUT_SEC:-8}"
LOG="$OUT/qemu.log"
set +e
timeout "$TIMEOUT_SEC" qemu-system-aarch64 \
  -machine virt -cpu cortex-a72 -m 256M \
  -nographic -kernel "$IMG" \
  >"$LOG" 2>&1
RC=$?
set -e

# timeout → 124; early guest crash also ok for "smoke launched"
LAUNCHED=1
if [[ $RC -eq 127 ]]; then LAUNCHED=0; fi

python3 - <<PY
import json
r = {
  "phase": "B",
  "ok": bool($LAUNCHED),
  "skipped": False,
  "qemu_exit": $RC,
  "kernel": "$IMG",
  "timeout_sec": $TIMEOUT_SEC,
  "log": "$LOG",
  "production": False,
  "note": "boot mínimo auditável; ≠ desktop TaurOS",
}
open("$OUT/qemu_boot_smoke.json","w").write(json.dumps(r, indent=2)+"\n")
print("qemu_boot_smoke:", r)
if not r["ok"]:
  raise SystemExit(1)
PY

cat > "$OUT/CASE_SUMMARY_G35_B.md" <<EOF
# Moto G35 fase B — QEMU

- kernel: $IMG
- qemu_exit: $RC
- production: false
EOF
echo "Pilot Moto G35 fase B OK → $OUT"
