#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Docker ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|bitcoind|lnd|rtl|nostr|quantum|etrnet|void-frontend' || true

echo ""
echo "=== LND carteira ==="
if docker exec lnd test -f /root/.lnd/data/chain/bitcoin/regtest/admin.macaroon 2>/dev/null; then
  echo "✓ admin.macaroon presente"
else
  echo "✗ carteira não criada — npm run lnd:create"
fi

echo ""
echo "=== REST LND (host :8180) ==="
if curl -sk --connect-timeout 2 https://127.0.0.1:8180/v1/genseed 2>&1 | grep -q "wallet already unlocked"; then
  echo "✓ REST OK (carteira desbloqueada)"
elif curl -sk --connect-timeout 2 https://127.0.0.1:8180/v1/genseed 2>&1 | grep -q cipher_seed; then
  echo "○ REST OK (aguardando initwallet — npm run lnd:create)"
else
  echo "✗ REST inacessível"
fi

echo ""
echo "=== NOSTR relay (:7777) ==="
if curl -sf --connect-timeout 2 http://127.0.0.1:7777 >/dev/null 2>&1; then
  echo "✓ relay HTTP responde"
else
  echo "○ relay offline ou sem HTTP na :7777 (ws://localhost:7777 em dev)"
fi

echo ""
echo "=== Motor quântico (:8472) ==="
QAPI="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"
QAPI="${QAPI%/}"
if curl -sf --connect-timeout 2 "${QAPI}/health" >/dev/null 2>&1; then
  echo "✓ CQR em ${QAPI}"
  if curl -sf --connect-timeout 2 "${QAPI}/cosmic/void/runner/status" 2>/dev/null | grep -q '"available":true'; then
    echo "✓ GhostDocker Rust (void-runner)"
  else
    echo "○ void-runner offline — npm run build:vps ou --profile quantum"
  fi
else
  echo "○ CQR offline — npm run quantum:dev ou docker compose --profile quantum up -d quantum-engine"
fi

echo ""
echo "=== Anchor RPC ==="
RPC="${ANCHOR_RPC_URL:-http://127.0.0.1:8545}"
if curl -sf -X POST "$RPC" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | grep -q result; then
  echo "✓ RPC ${RPC}"
else
  echo "○ RPC offline — npm run anchor:local"
fi

echo ""
echo "=== RTL ==="
echo "  UI: http://localhost:3000"
echo "  Password UI: voidrtldev (npm run rtl:reset-password) — NÃO é wallet_password"
echo "  LND unlock: secrets/wallet_password"
echo ""
echo "Pré-voo completo: npm run production:preflight"
