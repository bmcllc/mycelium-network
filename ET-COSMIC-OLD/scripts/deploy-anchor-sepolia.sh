#!/usr/bin/env bash
# Deploy ETRNETAnchor em Sepolia + sync env (Fase 5).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true

need() {
  if [[ -z "${!1:-}" ]]; then
    echo "Variável obrigatória ausente: $1" >&2
    exit 1
  fi
}

need PRIVATE_KEY
need SEPOLIA_RPC_URL
need DAO_MULTISIG

if ! node scripts/sepolia-balance-check.mjs; then
  echo "" >&2
  echo "Depois do faucet: npm run anchor:sepolia" >&2
  exit 1
fi

echo "=== Deploy ETRNETAnchor — Sepolia ==="
echo "DAO_MULTISIG: $DAO_MULTISIG"
echo ""

npm run anchor:deploy

ADDR="$(node -e "const j=require('./vault/etrnet-anchor-deploy.json'); if(j.network!=='sepolia') process.exit(1); console.log(j.address)")"
npm run anchor:sync-env -- "$ADDR" --sepolia

echo ""
echo "Verificar código (Sourcify, grátis): npm run anchor:verify-sepolia"
echo "Reinicie: npm run quantum:stop && npm run quantum:dev   e   npm run dev"
