#!/usr/bin/env bash
# Verifica JSON-RPC em ANCHOR_RPC_URL (default :8545)
set -euo pipefail
RPC="${ANCHOR_RPC_URL:-http://127.0.0.1:8545}"
PORT="${RPC##*:}"
PORT="${PORT%%/*}"

echo "[rpc] $RPC"

if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep ":${PORT} " || echo "[rpc] Nada a escutar na porta $PORT"
fi

RESP=$(curl -sS -m 3 -X POST "$RPC" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>&1) || {
  echo "[rpc] FALHA curl: $RESP"
  exit 1
}

echo "[rpc] Resposta: $RESP"
if echo "$RESP" | grep -q '"result"'; then
  echo "[rpc] OK — nó Ethereum acessível"
  exit 0
fi
echo "[rpc] Resposta sem eth_chainId — não é um nó JSON-RPC válido"
exit 1
