#!/usr/bin/env bash
# Fecha R2 local (opção A): harmonia + propose on-chain + estado.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.sovereign ]] && source scripts/load-env-sovereign.sh 2>/dev/null || true

echo "=== R2 local — fecho ==="
echo ""

echo "--- 1/4 cosmic:harmony ---"
npm run cosmic:harmony || true
echo ""

echo "--- 2/4 pmu:anchor:propose:node (Sepolia/local) ---"
npm run pmu:anchor:propose:node
echo ""

echo "--- 3/4 pmu:anchor:state ---"
npm run pmu:anchor:state
echo ""

echo "--- 4/4 finalize (pode falhar se CHALLENGE_PERIOD não passou) ---"
npm run pmu:anchor:finalize || echo "○ finalize: aguarda 1h e corre npm run pmu:anchor:finalize"
echo ""
echo "Pagamento: DOC/R2-Local.md § Pagamento Lightning"
echo "R2 local: critérios em DOC/R2-Local.md"
