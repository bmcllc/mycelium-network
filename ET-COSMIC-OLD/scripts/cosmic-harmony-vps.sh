#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export QUANTUM_API="${QUANTUM_API:-http://127.0.0.1:8472}"
exec node "$ROOT/scripts/cosmic-harmony.mjs"
