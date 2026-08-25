#!/usr/bin/env bash
# Delega auditoria PMU ao ET-RNET (pmu-base compartilhado).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export VOID_POOL_DIR="${VOID_POOL_DIR:-$ROOT/void_pool}"
export QUANTUM_API="${QUANTUM_API:-http://127.0.0.1:8472}"
exec node "$ROOT/scripts/pmu-audit.mjs"
