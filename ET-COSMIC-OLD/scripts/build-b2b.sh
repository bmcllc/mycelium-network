#!/usr/bin/env bash
# Build PWA white-label B2B com preflight de produção.
# Uso: bash scripts/build-b2b.sh SOVEREIGN-CITIZEN
#      bash scripts/build-b2b.sh VOID-CATALOG-FULL
#      bash scripts/build-b2b.sh VOID-54 --skip-preflight
set -euo pipefail
cd "$(dirname "$0")/.."

SKU="${1:-SOVEREIGN-CITIZEN}"
SKIP_PREFLIGHT="${2:-}"

echo "=== ETΞRNET — Build B2B ($SKU) ==="
node scripts/b2b-list-skus.mjs "$SKU"
echo ""

if [[ "$SKIP_PREFLIGHT" != "--skip-preflight" ]]; then
  echo "▸ Pré-voo B2B..."
  npm run b2b:production-ready
  echo ""
fi

export VITE_B2B_SKUS="$SKU"
npm run build -- --mode sovereign

echo ""
echo "✓ Build B2B concluído: dist/ (SKU=$SKU)"
echo "  npm run pwa:serve:sovereign   # LAN :4173"
echo "  bash scripts/android-build-b2b.sh $SKU"
