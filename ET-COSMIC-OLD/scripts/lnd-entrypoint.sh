#!/bin/sh
# Só usa auto-unlock depois da carteira existir (lncli create).
set -e

NETWORK="${BITCOIN_NETWORK:-regtest}"
WALLET_DIR="/root/.lnd/data/chain/bitcoin/${NETWORK}"
UNLOCK_ARG=""

if [ -f "${WALLET_DIR}/wallet.db" ] || [ -f "${WALLET_DIR}/admin.macaroon" ]; then
  if [ -f /secrets/wallet_password ]; then
    UNLOCK_ARG="--wallet-unlock-password-file=/secrets/wallet_password"
  fi
else
  echo "[lnd-entrypoint] Carteira ainda não existe — a iniciar LND sem auto-unlock."
  echo "[lnd-entrypoint] Depois: npm run lnd:create"
fi

exec lnd "$@" ${UNLOCK_ARG}
