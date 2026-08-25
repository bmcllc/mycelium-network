#!/usr/bin/env bash
# Deploy ETRNETAnchor em localhost — sobe Hardhat node em background se necessário
set -euo pipefail
cd "$(dirname "$0")/.."

RPC="${ANCHOR_RPC_URL:-http://127.0.0.1:8545}"
PORT="${RPC##*:}"
PORT="${PORT%%/*}"
PID_FILE=".anchor-node.pid"
STARTED_NODE=false

port_in_use() {
  ss -tln 2>/dev/null | grep -q ":${PORT} " || \
    ss -tln 2>/dev/null | grep -q "127.0.0.1:${PORT}"
}

rpc_ok() {
  local resp
  resp=$(curl -sS -m 5 -X POST "$RPC" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>&1) || return 1
  echo "$resp" | grep -q '"result"'
}

wait_for_rpc() {
  local i
  for i in $(seq 1 40); do
    if rpc_ok; then return 0; fi
    sleep 0.5
  done
  return 1
}

start_node_background() {
  echo "[anchor:local] A iniciar Hardhat node em background (:${PORT})..."
  nohup npx hardhat node > /tmp/etrnet-hardhat-node.log 2>&1 &
  echo $! > "$PID_FILE"
  STARTED_NODE=true
  if ! wait_for_rpc; then
    echo "[anchor:local] Nó não respondeu a tempo. Ver: tail /tmp/etrnet-hardhat-node.log" >&2
    exit 1
  fi
  echo "[anchor:local] Nó online (PID $(cat "$PID_FILE"))"
}

if port_in_use && ! rpc_ok; then
  echo "[anchor:local] Porta $PORT ocupada mas JSON-RPC inválido." >&2
  echo "  npm run anchor:rpc-check && npm run anchor:node:stop" >&2
  exit 1
fi

if ! rpc_ok; then
  if port_in_use; then
    echo "[anchor:local] Porta $PORT em uso sem JSON-RPC — pare o processo e tente de novo." >&2
    exit 1
  fi
  start_node_background
fi

echo "[anchor:local] RPC OK em $RPC — deploy ETRNETAnchor..."
npx hardhat run scripts/deploy-anchor.cjs --network localhost | tee /tmp/etrnet-anchor-deploy.log

ADDR=$(grep -oE '0x[a-fA-F0-9]{40}' /tmp/etrnet-anchor-deploy.log | tail -1)
if [[ -z "$ADDR" ]] && [[ -f vault/etrnet-anchor-deploy.json ]]; then
  ADDR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('vault/etrnet-anchor-deploy.json','utf8')).address)")
fi

if [[ -z "$ADDR" ]]; then
  echo "[anchor:local] Não foi possível obter o endereço do deploy." >&2
  exit 1
fi

node scripts/sync-anchor-env.mjs "$ADDR" --local-hardhat-key
echo "[anchor:local] OK — $ADDR"

if [[ "$STARTED_NODE" == true ]]; then
  echo ""
  echo "[anchor:local] Hardhat node continua em background (MetaMask / proposeRoot)."
  echo "  Parar: npm run anchor:node:stop"
  echo "  Log:   tail -f /tmp/etrnet-hardhat-node.log"
fi
