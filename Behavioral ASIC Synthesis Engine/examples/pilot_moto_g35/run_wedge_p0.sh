#!/usr/bin/env bash
# G35 — atlas P0 → board stub (DTS/earlycon/HAL). ≠ OS turnkey · ≠ earlycon no silício.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT_CROSS="${USB_CROSS_OUT:-$PILOT/out_real/usb_cross}"
OUT_WEDGE="${WEDGE_P0_OUT:-$PILOT/out_real/wedge_p0}"
MAP="${WEDGE_MAP:-$OUT_CROSS/wedge_mmio_map.yaml}"
PLAT="${PLATFORM_YAML:-$PILOT/out_real/platform_vendor_boot/platform_inventory.yaml}"
USB_INV="${USB_INV:-$PILOT/out_real/usb_probe/usb_hw_inventory.yaml}"

BASE_BIN="${BASE_BIN:-$ROOT/target/release/base}"
if [[ ! -x "$BASE_BIN" ]]; then
  BASE_BIN="$ROOT/target/debug/base"
fi
if [[ ! -x "$BASE_BIN" ]]; then
  (cd "$ROOT" && cargo build -p base-cli --bin base -q)
  BASE_BIN="$ROOT/target/debug/base"
fi

cd "$ROOT"

if [[ ! -f "$MAP" ]]; then
  echo "NOTE: missing $MAP — running usb-cross first"
  if [[ ! -f "$USB_INV" ]]; then
    "$BASE_BIN" port usb-probe -o "$PILOT/out_real/usb_probe"
    USB_INV="$PILOT/out_real/usb_probe/usb_hw_inventory.yaml"
  fi
  "$BASE_BIN" port usb-cross --usb "$USB_INV" --platform "$PLAT" -o "$OUT_CROSS"
  MAP="$OUT_CROSS/wedge_mmio_map.yaml"
fi

"$BASE_BIN" port wedge-p0 --map "$MAP" -o "$OUT_WEDGE"
echo "Wedge P0 → $OUT_WEDGE/WEDGE_P0.md"
echo "generates_os=false · earlycon ≠ verified on silicon"
