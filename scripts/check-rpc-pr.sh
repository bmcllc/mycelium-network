#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-${TMPDIR:-/tmp}/mycelium-rpc-target-${USER:-user}}"
mkdir -p "$CARGO_TARGET_DIR"

echo "[rpc-pr] cargo target: $CARGO_TARGET_DIR"
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
