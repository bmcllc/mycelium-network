#!/usr/bin/env bash
# APK com CQR remoto embutido (VPS / túnel HTTPS) — usar longe sem reconfigurar.
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${1:-${VITE_QUANTUM_API_URL:-}}"
if [[ -z "$URL" ]]; then
  echo "Uso: npm run android:build:remote -- https://cqr.seudominio.example" >&2
  echo "  ou: VITE_QUANTUM_API_URL=https://... npm run android:build:remote" >&2
  exit 1
fi

if [[ "$URL" == *"<"* ]] || [[ "$URL" == *">"* ]]; then
  echo "Não uses <IP> na linha de comandos (o fish interpreta como redirecionamento)." >&2
  echo "  npm run android:build:remote -- 'https://192.168.1.10:9443'" >&2
  exit 1
fi
if [[ "$URL" =~ (IP-LAN|IP-VPS|<IP>|YOUR_IP|SEU_IP|example\.com) ]]; then
  echo "Substitua o placeholder pelo IP real da máquina (Wi‑Fi/LAN)." >&2
  echo "  Descobrir IP: ip -4 -o addr show scope global" >&2
  echo "  Ou: npm run android:build:lan" >&2
  exit 1
fi

URL="${URL%/}"
export VITE_QUANTUM_API_URL="$URL"
unset VITE_COSMIC_SOVEREIGN
unset VITE_QUANTUM_SOVEREIGN

echo "=== Android remoto — CQR em ${URL} ==="
if curl -sf --max-time 8 "${URL}/health" >/dev/null; then
  echo "✓ health OK"
else
  echo "○ CQR ainda não responde (build continua)"
fi

npm run build
npx cap sync android
cd android && ./gradlew assembleDebug && cd ..
echo "✓ APK: android/app/build/outputs/apk/debug/app-debug.apk"
