#!/usr/bin/env bash
# Copia documentos legais para public/ (servidos pela PWA).
set -euo pipefail
cd "$(dirname "$0")/.."
for f in NOTICE DUAL-LICENSE.md COMMERCIAL-LICENSE.md CREDITS.md AI-USE-RESERVATION.md; do
  [[ -f "$f" ]] && cp -f "$f" "public/$f" 2>/dev/null || cp -f "$f" "public/$(basename "$f")"
done
# Stubs curtos em public/ para ficheiros grandes — manter ai.txt e robots.txt
echo "✓ Legal docs synced to public/"
