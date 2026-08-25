#!/usr/bin/env bash
# Pré-voo mesh NOSTR — Fase 6 (relay + flags staging).
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}○${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; FAIL=1; }

FAIL=0
[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true

echo "=== ETΞRNET — Pré-voo mesh (Fase 6) ==="
echo ""

PRIMARY="${VITE_NOSTR_RELAY_PRIMARY:-ws://localhost:7777}"
FALLBACK="${VITE_NOSTR_RELAY_FALLBACK:-wss://relay.damus.io}"

echo "--- Relays configurados ---"
echo "  Primário:  $PRIMARY"
echo "  Fallback:  $FALLBACK"
echo ""

if [[ "$PRIMARY" == ws://localhost* ]] || [[ "$PRIMARY" == ws://127.0.0.1* ]]; then
  warn "Primário é localhost — OK em dev; em staging use wss://relay.seudominio"
else
  ok "Primário não é localhost (staging/produção)"
fi

echo "--- Sonda WebSocket ---"
if bash scripts/relay-health.sh; then
  ok "Todos os relays responderam"
else
  fail "Relay inacessível — npm run stack:up (nostr-relay)"
fi
echo ""

echo "--- Mesh P2P ---"
if [[ "${VITE_ENABLE_NOSTR_MESH:-}" == "true" ]]; then
  ok "VITE_ENABLE_NOSTR_MESH=true (mesh ativo — stack soberana)"
else
  warn "Mesh desligado — adicione VITE_ENABLE_NOSTR_MESH=true em .env.sovereign"
fi

if [[ "${VITE_NOSTR_RELAY_DISCOVERY:-}" == "true" ]]; then
  warn "VITE_NOSTR_RELAY_DISCOVERY=true (relays públicos — só se intencional)"
else
  ok "Descoberta pública de relays desligada (PMU seguro)"
fi
echo ""

echo "--- WebRTC ICE ---"
echo "  STUN padrão: stun:stun.l.google.com:19302 (ver DOC/Mesh-Producao.md para TURN)"
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}Mesh pré-voo: OK${NC}"
  exit 0
fi
echo -e "${RED}Mesh pré-voo: corrigir itens em vermelho.${NC}"
exit 1
