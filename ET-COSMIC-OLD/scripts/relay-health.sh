#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true
exec node scripts/relay-health.mjs "$@"
