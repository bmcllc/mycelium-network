#!/usr/bin/env bash
# Pipeline único: validar + build PWA soberano B2B + (opcional) stack Docker.
# Uso:
#   bash scripts/production-go.sh                    # SOVEREIGN-CITIZEN
#   bash scripts/production-go.sh FULL-ENTERPRISE
#   START_STACK=1 bash scripts/production-go.sh      # sobe stack antes do preflight
set -euo pipefail
cd "$(dirname "$0")/.."

SKU="${1:-SOVEREIGN-CITIZEN}"
START_STACK="${START_STACK:-0}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ETΞRNET — Production Go (SKU=$SKU)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [[ "$START_STACK" == "1" ]]; then
  echo "▸ Stack Docker (soberano + quantum)..."
  npm run stack:up:full
  sleep 3
  echo ""
fi

echo "▸ Gate B2B..."
npm run b2b:production-ready
echo ""

echo "▸ Validação (testes + rotas + TypeScript)..."
npm test
npm run routes:check
npx tsc --noEmit
echo ""

echo "▸ Pré-voo de produção..."
npm run production:preflight
echo ""

echo "▸ Build PWA white-label ($SKU)..."
export VITE_B2B_SKUS="$SKU"
npm run build -- --mode sovereign
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ PRODUÇÃO PRONTA"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Artefacto: dist/"
echo "  Servir LAN:  npm run pwa:serve:sovereign"
echo "  Servidor:    NODE_ENV=production node server/server.js"
echo "  APK B2B:     bash scripts/android-build-b2b.sh $SKU"
echo "  Stack:       npm run stack:up:full && npm run stack:status"
echo ""
