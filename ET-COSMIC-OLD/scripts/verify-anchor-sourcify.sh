#!/usr/bin/env bash
# Verifica ETRNETAnchor na Sourcify (sem API key Etherscan).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true

VAULT="vault/etrnet-anchor-deploy.json"
if [[ ! -f "$VAULT" ]]; then
  echo "Deploy primeiro: npm run anchor:sepolia" >&2
  exit 1
fi

read -r ADDR DAO NET < <(node -e "
const j=require('./vault/etrnet-anchor-deploy.json');
if(j.network!=='sepolia'){ console.error('Vault não é sepolia'); process.exit(1); }
console.log(j.address, j.daoMultisig, j.network);
")

echo "=== Sourcify verify — Sepolia ==="
echo "  Contrato: $ADDR"
echo "  DAO:      $DAO"
echo ""

npx hardhat verify --network sepolia "$ADDR" "$DAO"

echo ""
echo "Ver no repositório: https://repo.sourcify.dev/contracts/full_match/11155111/${ADDR,,}/"
echo "Sepolia explorer:   https://sepolia.etherscan.io/address/$ADDR"
