#!/usr/bin/env bash
# Checklist Real+ — LND, CQR, relay, mesh, Harmonia (5 passos operacionais).
set -euo pipefail
cd "$(dirname "$0")/.."

CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  ETΞRNET — Checklist Real+ (5 passos)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

for envfile in .env .env.sovereign .env.production; do
  [[ -f "$envfile" ]] && { set -a; source "$envfile" 2>/dev/null || true; set +a; }
done
QAPI="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"

echo -e "${CYAN}1/5 — Pré-voo soberano (.env + Docker base)${NC}"
if [[ ! -f .env.sovereign ]]; then
  echo "  ○ Copie: cp .env.sovereign.example .env.sovereign"
fi
npm run production:preflight:sovereign || true
echo ""

echo -e "${CYAN}2/5 — Stack Docker (bitcoind, LND, relay)${NC}"
npm run stack:status || true
echo ""

echo -e "${CYAN}3/5 — Motor CQR + Harmonia (Real+)${NC}"
if curl -sf --max-time 5 "${QAPI}/health" >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} CQR online em ${QAPI}"
  curl -sf --max-time 5 "${QAPI}/cosmic/void/runner/status" 2>/dev/null | head -c 200 || true
  echo ""
else
  echo -e "  ○ CQR offline — subir: npm run stack:up:harmony"
fi
echo ""

echo -e "${CYAN}4/5 — Mesh / BLE (telemóvel)${NC}"
npm run mesh:preflight || true
echo ""

echo -e "${CYAN}5/5 — APK soberano (Perfil A)${NC}"
if [[ -f android/app/build/outputs/apk/release/app-release.apk ]]; then
  echo -e "  ${GREEN}✓${NC} APK release: android/app/build/outputs/apk/release/app-release.apk"
else
  echo -e "  ○ APK não compilado — npm run android:build:release:sovereign"
fi
echo ""

echo -e "${BOLD}Próximos comandos:${NC}"
echo "  npm run stack:up:full          # LND + CQR + relay"
echo "  npm run production:harmony     # ciclo Harmonia"
echo "  npm run android:build:release:sovereign"
echo ""
