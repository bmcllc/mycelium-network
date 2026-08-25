#!/usr/bin/env bash
# Liberta porta 8545 (Hardhat node / anvil preso)
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${ANCHOR_PORT:-8545}"
PID_FILE=".anchor-node.pid"

if [[ -f "$PID_FILE" ]]; then
  BG_PID=$(cat "$PID_FILE")
  if kill -0 "$BG_PID" 2>/dev/null; then
    echo "[anchor:node:stop] A terminar nó background PID $BG_PID"
    kill "$BG_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$BG_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$PORT" 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser "${PORT}/tcp" 2>/dev/null | tr ' ' '\n' || true
  fi
}

PIDS=$(pids)
if [[ -z "$PIDS" ]]; then
  echo "[anchor:node:stop] Porta $PORT livre."
  exit 0
fi

echo "[anchor:node:stop] A terminar processo(s) na porta $PORT: $PIDS"
kill $PIDS 2>/dev/null || true
sleep 1
PIDS2=$(pids)
if [[ -n "$PIDS2" ]]; then
  echo "[anchor:node:stop] kill -9..."
  kill -9 $PIDS2 2>/dev/null || true
fi
echo "[anchor:node:stop] Feito."
