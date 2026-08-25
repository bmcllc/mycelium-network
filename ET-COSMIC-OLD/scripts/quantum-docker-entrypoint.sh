#!/bin/sh
# Arranque do motor CQR em container (GhostDocker / Harmonia / PMU).
set -eu

export ET_RNET_ROOT="${ET_RNET_ROOT:-/app}"
export VOID_COSMIC_ROOT="${VOID_COSMIC_ROOT:-/app}"
export VOID_POOL_DIR="${VOID_POOL_DIR:-/app/void_pool}"
export VOID_RUNNER_BIN="${VOID_RUNNER_BIN:-/usr/local/bin/void-runner}"
export VOID_PI_WASM="${VOID_PI_WASM:-/app/artifacts/pi_worker.wasm}"
export QUANTUM_HOST="${QUANTUM_HOST:-0.0.0.0}"
export QUANTUM_PORT="${QUANTUM_PORT:-8472}"

mkdir -p "$VOID_POOL_DIR"

cd /app/quantum
exec python -m uvicorn server:app --host "$QUANTUM_HOST" --port "$QUANTUM_PORT"
