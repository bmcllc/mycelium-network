#!/usr/bin/env bash
# APK Android com subset B2B (VITE_B2B_SKUS).
# Uso: bash scripts/android-build-b2b.sh SOVEREIGN-CITIZEN
#      bash scripts/android-build-b2b.sh VOID-54
set -euo pipefail
cd "$(dirname "$0")/.."

SKU="${1:-SOVEREIGN-CITIZEN}"
export VITE_B2B_SKUS="$SKU"
export VITE_COSMIC_SOVEREIGN="${VITE_COSMIC_SOVEREIGN:-true}"
export VITE_QUANTUM_SOVEREIGN="${VITE_QUANTUM_SOVEREIGN:-local}"
unset VITE_QUANTUM_API_URL

echo "=== ETΞRNET — Android B2B ($SKU) ==="
node scripts/b2b-list-skus.mjs "$SKU"
echo ""

npm run build -- --mode sovereign
npx cap sync android
cd android && ./gradlew assembleDebug && cd ..

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "✓ APK B2B ($SKU): $APK"
echo "  adb install -r $APK"
