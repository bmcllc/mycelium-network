#!/usr/bin/env bash
# Interop NWC real — gera DOC/evidence/nwc-interop-YYYY-MM-DD.json
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true

# Parser Node evita que & na URI quebre com `source` bash
export NWC_INTEROP_LIVE=1
if [[ -z "${NWC_INTEROP_URI:-}" ]]; then
  NWC_INTEROP_URI="$(node scripts/load-nwc-uri.mjs 2>/dev/null || true)"
  export NWC_INTEROP_URI
fi

node scripts/validate-nwc-uri.mjs || exit 1

echo "=== NWC Interop (live) ==="
echo "Relay/wallet via URI (não exibida)."
mkdir -p DOC/evidence

npx vitest run src/crypto/nwcInterop.live.test.ts

echo ""
echo "Relatório em DOC/evidence/nwc-interop-*.json"
