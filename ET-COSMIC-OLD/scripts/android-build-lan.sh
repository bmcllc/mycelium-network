#!/usr/bin/env bash
# APK com CQR na LAN (auto-detecta IP + porta 9443 do cqr-gateway).
set -euo pipefail
cd "$(dirname "$0")/.."

LAN_IP="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | head -1 || true)"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1 || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  echo "Não foi possível detectar IP LAN. Passe manualmente:" >&2
  echo "  npm run android:build:remote -- 'https://192.168.x.x:9443'" >&2
  exit 1
fi

PORT="${CQR_HTTPS_PORT:-9443}"
exec bash scripts/android-build-remote.sh "https://${LAN_IP}:${PORT}"
