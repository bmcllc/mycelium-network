#!/usr/bin/env bash
# Sincroniza build Vite → projeto Android Capacitor (v2 experimental).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== ETΞRNET — Android sync ==="
echo "v1 produção = PWA. APK = v2 (ver DOC/Decisao-Plataforma-v1.md)"
echo ""

npm run build
npx cap sync android

echo ""
echo "✓ dist/ copiado para android/"
echo "  Abrir IDE: npm run android:open"
echo "  Ou: cd android && ./gradlew assembleDebug"
