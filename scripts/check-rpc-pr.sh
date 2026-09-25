#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
MIN_FREE_GIB="${RPC_PR_MIN_FREE_GIB:-10}"

if [[ -z "${CARGO_TARGET_DIR:-}" ]]; then
  CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}"
  CARGO_TARGET_DIR="$CACHE_ROOT/mycelium-rpc-target"
  export CARGO_TARGET_DIR
fi
mkdir -p "$CARGO_TARGET_DIR"

FREE_KIB="$(df -Pk "$CARGO_TARGET_DIR" | awk 'NR==2 {print $4}')"
MIN_KIB="$((MIN_FREE_GIB * 1024 * 1024))"
if [[ "${FREE_KIB:-0}" -lt "$MIN_KIB" ]]; then
  echo "[rpc-pr] ERROR: pouco espaço no filesystem de CARGO_TARGET_DIR" >&2
  echo "[rpc-pr] target: $CARGO_TARGET_DIR" >&2
  echo "[rpc-pr] livre : $((FREE_KIB / 1024 / 1024)) GiB" >&2
  echo "[rpc-pr] mínimo: $MIN_FREE_GIB GiB" >&2
  echo "[rpc-pr] defina CARGO_TARGET_DIR para um volume com mais espaço." >&2
  exit 2
fi

echo "[rpc-pr] cargo target: $CARGO_TARGET_DIR"
echo "[rpc-pr] espaço livre: $((FREE_KIB / 1024 / 1024)) GiB"
echo "[rpc-pr] whitespace/diff gate against $BASE_REF"
git diff --check "$BASE_REF"...HEAD --   Cargo.toml Cargo.lock   cli/mycelium-cli/src/main.rs   crates/mycelium-rpc   crates/mycelium-hyphae/src/lib.rs   crates/mycelium-node   docs/MYCELIUM_BASE_RPC.md   scripts/rpc-two-node-smoke.sh   scripts/check-rpc-pr.sh

echo "[rpc-pr] tests"
cargo test -p mycelium-rpc --locked
cargo test -p mycelium-hyphae --locked
cargo test -p mycelium-node --locked

echo "[rpc-pr] clippy strict on new crate"
cargo clippy -p mycelium-rpc --all-targets --no-deps -- -D warnings

echo "[rpc-pr] workspace build"
cargo build --workspace --locked

echo "[rpc-pr] two-node smoke"
bash scripts/rpc-two-node-smoke.sh

echo "[rpc-pr] PASS"
echo "[rpc-pr] NOTE: workspace-wide cargo fmt is intentionally not a blocking gate;"
echo "[rpc-pr] historical rustfmt debt is tracked separately from P1/P2 behavior."
