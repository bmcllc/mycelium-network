#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "provider" && "$MODE" != "gateway" ]]; then
  echo "uso: $0 provider|gateway" >&2
  exit 2
fi

MYCELIUM_BIN="${MYCELIUM_BIN:-mycelium}"
RPC_CHAIN_ID="${RPC_CHAIN_ID:-8453}"
RPC_TTL_MS="${RPC_TTL_MS:-3000}"
WRITE_ARM="${S1_MAINNET_WRITE:-NO}"
ALLOW_WRITE=()

if [[ "$WRITE_ARM" == "YES_I_ACCEPT_MAINNET_BROADCAST" ]]; then
  ALLOW_WRITE=(--rpc-allow-write)
  echo "[mainnet] WRITE ARMADO: eth_sendRawTransaction permitido pelo transporte."
else
  echo "[mainnet] READ-ONLY: defina S1_MAINNET_WRITE=YES_I_ACCEPT_MAINNET_BROADCAST para armar broadcast."
fi

if [[ "$MODE" == "provider" ]]; then
  HOME_DIR="${MYCELIUM_PROVIDER_HOME:-$PWD/.rpc-mainnet/provider}"
  LISTEN="${MYCELIUM_PROVIDER_LISTEN:-/ip4/0.0.0.0/tcp/4101}"
  UPSTREAM="${BASE_UPSTREAM_RPC:-http://127.0.0.1:9545}"

  mkdir -p "$HOME_DIR"
  exec "$MYCELIUM_BIN" --home "$HOME_DIR" daemon \
    --listen "$LISTEN" \
    --horizon-port 0 \
    --no-mdns \
    --rpc-provider "$UPSTREAM" \
    --rpc-chain-id "$RPC_CHAIN_ID" \
    "${ALLOW_WRITE[@]}"
fi

: "${MYCELIUM_BOOTSTRAP:?defina MYCELIUM_BOOTSTRAP}"
: "${MYCELIUM_PROVIDER_NODE:?defina MYCELIUM_PROVIDER_NODE}"
: "${MYCELIUM_PROVIDER_KEM:?defina MYCELIUM_PROVIDER_KEM}"

HOME_DIR="${MYCELIUM_GATEWAY_HOME:-$PWD/.rpc-mainnet/gateway}"
LISTEN="${MYCELIUM_GATEWAY_LISTEN:-/ip4/127.0.0.1/tcp/4102}"
GATEWAY="${BASE_RPC_BIND:-127.0.0.1:8545}"

mkdir -p "$HOME_DIR"
exec "$MYCELIUM_BIN" --home "$HOME_DIR" daemon \
  --listen "$LISTEN" \
  --horizon-port 0 \
  --no-mdns \
  --bootstrap "$MYCELIUM_BOOTSTRAP" \
  --rpc-gateway "$GATEWAY" \
  --rpc-provider-node "$MYCELIUM_PROVIDER_NODE" \
  --rpc-provider-kem "$MYCELIUM_PROVIDER_KEM" \
  --rpc-chain-id "$RPC_CHAIN_ID" \
  --rpc-ttl-ms "$RPC_TTL_MS" \
  "${ALLOW_WRITE[@]}"
