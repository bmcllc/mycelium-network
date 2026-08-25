#!/usr/bin/env bash
# Pré-voo da stack soberana — Fases 4/5/6 (local ou VPS).
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
if [[ -f .env.sovereign ]]; then
  source scripts/load-env-sovereign.sh 2>/dev/null || true
else
  warn ".env.sovereign ausente — copie de .env.sovereign.example"
fi

echo "=== ETΞRNET — Pré-voo soberano ==="
echo ""

echo "--- Variáveis (presença, sem valores) ---"
check_env() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then ok "$name definido"
  else warn "$name ausente"; fi
}
check_env VITE_NOSTR_RELAY_PRIMARY
check_env VITE_NWC_SECRET
check_env NWC_SECRET
check_env VITE_ETRNET_ANCHOR_ADDRESS
check_env VITE_QUANTUM_API_URL
check_env ANCHOR_RPC_URL
check_env ANCHOR_PRIVATE_KEY
echo ""

echo "--- Docker (stack) ---"
if command -v docker >/dev/null 2>&1; then
  for c in bitcoind lnd rtl nostr-relay; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
      ok "container $c"
    else
      warn "container $c offline (npm run stack:up)"
    fi
  done
else
  warn "docker não instalado"
fi
echo ""

echo "--- Motor quântico (:8472) ---"
QAPI="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"
QAPI="${QAPI%/}"
if curl -sf "${QAPI}/health" >/dev/null 2>&1; then
  ok "CQR online em ${QAPI}"
  if curl -sf "${QAPI}/pmu/anchor/state" >/dev/null 2>&1; then
    ok "GET /pmu/anchor/state"
  else
    warn "/pmu/anchor/state indisponível"
  fi
else
  warn "CQR offline — npm run quantum:dev ou docker compose --profile quantum up -d quantum-engine"
fi
if curl -sf "${QAPI}/cosmic/void/runner/status" 2>/dev/null | grep -q '"available":true'; then
  ok "GhostDocker Rust (void-runner)"
else
  warn "void-runner offline — fallback GhostDock TS no browser"
fi
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx quantum-engine; then
  ok "container quantum-engine"
else
  warn "container quantum-engine offline (--profile quantum)"
fi
echo ""

echo "--- Anchor RPC (Ethereum) ---"
RPC="${ANCHOR_RPC_URL:-${VITE_ETHEREUM_RPC_URL:-http://127.0.0.1:8545}}"
if curl -sf -X POST "$RPC" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | grep -q result; then
  ok "RPC Ethereum ${RPC}"
else
  warn "RPC inacessível em ${RPC} (npm run anchor:local ou Sepolia)"
fi
if [[ -n "${VITE_ETRNET_ANCHOR_ADDRESS:-}" ]]; then
  ok "VITE_ETRNET_ANCHOR_ADDRESS configurado"
else
  warn "anchor não no frontend — npm run anchor:local ou anchor:sync-env"
fi
echo ""

echo "--- NOSTR relay ---"
if bash scripts/relay-health.sh 2>/dev/null; then
  ok "relay WebSocket"
else
  warn "relay offline — npm run stack:up"
fi
echo ""

echo "--- NWC (NIP-47) ---"
_nwc="${VITE_NWC_SECRET:-${NWC_SECRET:-${NWC_INTEROP_URI:-}}}"
if [[ -n "$_nwc" ]] && [[ "$_nwc" == nostr+walletconnect://* ]]; then
  ok "URI NWC presente (teste: npm run nwc:interop)"
elif uri="$(node scripts/load-nwc-uri.mjs 2>/dev/null)" && [[ "$uri" == nostr+walletconnect://* ]]; then
  ok "URI NWC no .env.sovereign (parser Node; & na URI não quebra bash)"
  warn "Duplique em VITE_NWC_SECRET=... para o Vite /finance/payment"
else
  warn "NWC ausente — RTL → Settings → NWC → VITE_NWC_SECRET ou NWC_SECRET"
fi
echo ""

echo "--- Economia SOV (VOID-710) ---"
if npm run -s finance:preflight >/dev/null 2>&1; then
  ok "finance:preflight (ledger + bazaar + hosting + miners)"
else
  warn "finance:preflight — npm run finance:preflight"
fi
echo ""

echo "--- Build / qualidade ---"
if npx tsc --noEmit >/dev/null 2>&1; then ok "tsc --noEmit"
else fail "tsc com erros"; fi
echo ""

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}Pré-voo: OK (avisos amarelos são opcionais).${NC}"
  exit 0
fi
echo -e "${RED}Pré-voo: falhas encontradas.${NC}"
exit 1
