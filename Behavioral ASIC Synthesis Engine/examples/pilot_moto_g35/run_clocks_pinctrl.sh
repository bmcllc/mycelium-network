#!/usr/bin/env bash
# G35 — clocks/pinctrl hints (USB × vendor_boot DTB). ≠ OS · phandles unresolved.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${CLOCKS_PINCTRL_OUT:-$PILOT/out_real/clocks_pinctrl}"
USB_YAML="${USB_INV:-$PILOT/out_real/usb_probe/usb_hw_inventory.yaml}"
USB_JSON="$PILOT/out_real/usb_probe/usb_hw_inventory.json"
DTB="${WEDGE_DTB:-$PILOT/real_fw/vendor_boot.img}"

BASE_BIN="${BASE_BIN:-$ROOT/target/release/base}"
if [[ ! -x "$BASE_BIN" ]]; then
  BASE_BIN="$ROOT/target/debug/base"
fi
if [[ ! -x "$BASE_BIN" ]]; then
  (cd "$ROOT" && cargo build -p base-cli --bin base -q)
  BASE_BIN="$ROOT/target/debug/base"
fi

USB="$USB_YAML"
if [[ ! -f "$USB" ]]; then
  USB="$USB_JSON"
fi
if [[ ! -f "$USB" ]]; then
  echo "ERR: missing USB inventory — run run_usb_probe.sh first"
  exit 1
fi
if [[ ! -f "$DTB" ]]; then
  echo "ERR: missing $DTB"
  exit 1
fi

cd "$ROOT"
"$BASE_BIN" port clocks-pinctrl --usb "$USB" --dtb "$DTB" -o "$OUT"
echo "Clocks/pinctrl → $OUT/CLOCKS_PINCTRL.md"
echo "generates_os=false"
