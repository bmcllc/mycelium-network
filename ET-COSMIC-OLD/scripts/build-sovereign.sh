#!/usr/bin/env bash
# Build PWA soberana — valida licença VOID-00 e compila Vite mode sovereign.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Build soberano (VOID-QRC Fase 3–4) ==="

for envfile in .env .env.sovereign; do
  [[ -f "$envfile" ]] && { set -a; source "$envfile" 2>/dev/null || true; set +a; }
done

node scripts/license-preflight.mjs

if [[ "${VITE_VOID_LICENSE_ENFORCE:-}" == "true" ]]; then
  missing=0
  for k in VITE_VOID_LICENSE_VENDOR_PK VITE_VOID_LICENSE_PAYLOAD_HEX VITE_VOID_LICENSE_SIGNATURE_HEX; do
    if [[ -z "${!k:-}" ]]; then
      echo "✗ $k em falta — npm run license:setup license.json"
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]] && echo "✓ Licença VOID-00 configurada (enforce)"
fi

npm run validate
npx vite build --mode sovereign

echo ""
echo "✓ Build soberano concluído (dist/)"
echo "  Community: GhostID sem enforce · Comercial: npm run license:setup"
echo "  Servir: npm run pwa:serve:sovereign"
echo "  Pagamentos: /finance/payment"
