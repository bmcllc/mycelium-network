#!/usr/bin/env bash
# APK Android release (soberano) — otimizado, assinado debug (trocar por keystore em produção).
set -euo pipefail
cd "$(dirname "$0")/.."

export VITE_COSMIC_SOVEREIGN=true
export VITE_QUANTUM_SOVEREIGN=local
unset VITE_QUANTUM_API_URL

echo "=== ETΞRNET — Android Release Soberano ==="
echo "  minify/shrink desligados (Capacitor/WebView); versionCode incrementado"
echo ""

npm run build
npx cap sync android
cd android && ./gradlew assembleRelease && cd ..

APK="android/app/build/outputs/apk/release/app-release.apk"
APK_UNSIGNED="android/app/build/outputs/apk/release/app-release-unsigned.apk"
OUT="${APK}"
[[ -f "$OUT" ]] || OUT="${APK_UNSIGNED}"
if [[ -f "$OUT" ]]; then
  echo ""
  echo "✓ APK release: $OUT"
  echo "  Instalar (desinstale debug antes se falhar):"
  echo "    adb uninstall com.voidmsg.messenger 2>/dev/null || true"
  echo "    adb install -r $OUT"
else
  echo "✓ Build release concluído — ver android/app/build/outputs/apk/release/"
fi
