#!/usr/bin/env bash
# Build Android com Harmonia: GhostDocker (void-runner) + HiggsGit + Phantom Pipeline.
# Injeta VITE_QUANTUM_API_URL no bundle — o telemóvel fala com o motor CQR remoto.
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== ETΞRNET — Android Harmonia (GhostDocker / Higgs / Phantom) ==="
echo ""

# ── Env ───────────────────────────────────────────────────────────────────────
for f in .env .env.sovereign .env.android; do
  [[ -f "$f" ]] && { set -a; source "$f" 2>/dev/null || true; set +a; }
done

if [[ -z "${VITE_QUANTUM_API_URL:-}" ]] && [[ "${ANDROID_CQR_LAN_AUTO:-}" == "1" ]]; then
  LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1); exit}' || true)"
  if [[ -z "$LAN_IP" ]]; then
    LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [[ -n "$LAN_IP" ]]; then
    export VITE_QUANTUM_API_URL="http://${LAN_IP}:8472"
    echo -e "${GREEN}✓${NC} ANDROID_CQR_LAN_AUTO → ${VITE_QUANTUM_API_URL}"
  fi
fi

QAPI="${VITE_QUANTUM_API_URL:-}"
QAPI="${QAPI%/}"

if [[ -z "$QAPI" ]] || [[ "$QAPI" == "same-origin" ]]; then
  echo -e "${RED}✗${NC} Defina VITE_QUANTUM_API_URL em .env.android (IP LAN ou HTTPS VPS)." >&2
  echo "  Exemplo Wi‑Fi: VITE_QUANTUM_API_URL=http://192.168.1.42:8472" >&2
  echo "  Ou: ANDROID_CQR_LAN_AUTO=1 no .env.android" >&2
  exit 1
fi

export VITE_QUANTUM_API_URL="$QAPI"
export VITE_QUANTUM_DEV="${VITE_QUANTUM_DEV:-true}"

echo "Motor CQR no APK: ${VITE_QUANTUM_API_URL}"
echo ""

# ── Pré-voo CQR + void-runner ─────────────────────────────────────────────────
echo "--- Pré-voo GhostDocker ---"
if curl -sf --max-time 5 "${QAPI}/health" >/dev/null; then
  echo -e "${GREEN}✓${NC} CQR online"
else
  echo -e "${YELLOW}○${NC} CQR offline em ${QAPI} — suba: npm run quantum:lan (mesma Wi‑Fi que o telemóvel)"
fi
RUNNER="$(curl -sf --max-time 5 "${QAPI}/cosmic/void/runner/status" 2>/dev/null || true)"
if echo "$RUNNER" | grep -q '"available":true'; then
  echo -e "${GREEN}✓${NC} void-runner (GhostDocker Rust)"
else
  echo -e "${YELLOW}○${NC} void-runner indisponível — Harmonia usará GhostDock TS no telemóvel"
  echo "  Repare no host: npm run build:vps"
fi
echo ""

# ── Vite + Capacitor ──────────────────────────────────────────────────────────
npm run build
npx cap sync android

echo ""
echo "--- Gradle (APK debug) ---"
cd android
./gradlew assembleDebug
cd ..

APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK" ]]; then
  echo ""
  echo -e "${GREEN}✓ APK Harmonia${NC}: $APK"
  echo "  Instalar: adb install -r $APK"
  echo "  No app: Compute → Harmonia Cósmica → Executar ciclo"
  echo "  CQR deve estar acessível em: ${VITE_QUANTUM_API_URL}"
else
  echo -e "${RED}✗${NC} APK não encontrado" >&2
  exit 1
fi
