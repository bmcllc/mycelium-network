#!/usr/bin/env bash
# APK Android independente — Harmonia no dispositivo (sem PC / sem CQR remoto).
set -euo pipefail
cd "$(dirname "$0")/.."

export VITE_COSMIC_SOVEREIGN=true
export VITE_QUANTUM_SOVEREIGN=local
unset VITE_QUANTUM_API_URL

echo "=== ETΞRNET — Android Soberano (offline) ==="
echo "  GhostDock + HiggsGit + Phantom Pipeline no telemóvel"
echo "  Sem npm run quantum:lan nem IP do PC"
echo ""

npm run build
npx cap sync android
cd android && ./gradlew assembleDebug && cd ..

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "✓ APK soberano: $APK"
echo "  adb install -r $APK"
echo "  Harmonia Cósmica funciona offline (entropia local + WASM void_core)"
