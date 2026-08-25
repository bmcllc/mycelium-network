#!/usr/bin/env bash
set -euo pipefail
API="${QUANTUM_API:-http://127.0.0.1:8472}"

if ! curl -sf "${API}/health" >/dev/null 2>&1; then
  echo "[pmu:anchor:state] Motor CQR offline em ${API}" >&2
  echo "  Suba: npm run quantum:dev   (deixe o terminal aberto)" >&2
  exit 1
fi

curl -sf "${API}/pmu/anchor/state" | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log(JSON.stringify(d,null,2));
"
