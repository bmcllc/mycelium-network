#!/usr/bin/env bash
# Carrega .env.sovereign na shell atual (export). Uso: source scripts/load-env-sovereign.sh
if [[ -n "${1:-}" ]]; then
  _ENV_FILE="$1"
elif [[ -f "${PWD}/.env.sovereign" ]]; then
  _ENV_FILE="${PWD}/.env.sovereign"
elif [[ -n "${BASH_SOURCE[0]:-}" ]]; then
  _ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.sovereign"
else
  _ENV_FILE="${PWD}/.env.sovereign"
fi
if [[ ! -f "$_ENV_FILE" ]]; then
  echo "[env] $_ENV_FILE não encontrado" >&2
  return 1 2>/dev/null || exit 1
fi
set -a
# shellcheck disable=SC1090
source "$_ENV_FILE"
set +a

# Defaults soberanos (evita avisos no pré-voo quando a chave está comentada no ficheiro)
export VITE_QUANTUM_API_URL="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"
export VITE_ENABLE_NOSTR_MESH="${VITE_ENABLE_NOSTR_MESH:-true}"
export VITE_PROTOCOL_ROYALTY_BPS="${VITE_PROTOCOL_ROYALTY_BPS:-10}"
export VITE_REQUIRE_ATTRIBUTION="${VITE_REQUIRE_ATTRIBUTION:-true}"
export VITE_NOSTR_RELAY_FALLBACK="${VITE_NOSTR_RELAY_FALLBACK:-wss://relay.damus.io}"
export LND_REST_URL="${LND_REST_URL:-${VITE_LND_REST_URL:-https://127.0.0.1:8180}}"
if [[ "${BITCOIN_NETWORK:-${VITE_BITCOIN_NETWORK:-}}" == "regtest" ]]; then
  export LND_TLS_SKIP="${LND_TLS_SKIP:-true}"
fi

echo "[env] Carregado: $_ENV_FILE"
