#!/usr/bin/env bash
# Repõe password da UI RTL (NÃO é a password da carteira LND).
# Limpa bloqueio por tentativas falhadas (reinício do contentor).
set -euo pipefail
cd "$(dirname "$0")/.."

DEV_PASS="${RTL_UI_PASSWORD:-voidrtldev}"
HASH="$(node -e "const c=require('crypto');process.stdout.write(c.createHash('sha256').update(process.argv[1]).digest('hex'))" "$DEV_PASS")"

python3 <<PY
import json
from pathlib import Path
p = Path("config/rtl.json")
cfg = json.loads(p.read_text())
cfg["multiPassHashed"] = "$HASH"
cfg.pop("multiPass", None)
p.write_text(json.dumps(cfg, indent=2) + "\n")
PY

echo "✓ config/rtl.json atualizado (hash SHA-256 da password UI)"
echo "  Password RTL (UI): $DEV_PASS"
echo "  (NÃO uses secrets/wallet_password — essa é só para LND)"
echo ""

if docker ps --format '{{.Names}}' | grep -qx rtl; then
  docker restart rtl >/dev/null
  echo "✓ Contentor rtl reiniciado (tentativas falhadas limpas)"
  sleep 3
  echo "  Abre: http://localhost:3000"
else
  echo "○ Contentor rtl offline — npm run stack:up"
fi
