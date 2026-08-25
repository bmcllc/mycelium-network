#!/usr/bin/env bash
# Expõe o motor CQR (:8472) na Internet — Cloudflare ou localtunnel (npx, sem instalar pacotes).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${QUANTUM_PORT:-8472}"
LOCAL="http://127.0.0.1:${PORT}"

if ! curl -sf "${LOCAL}/health" >/dev/null 2>&1; then
  echo "[cqr:tunnel] CQR offline em ${LOCAL}" >&2
  echo "  Terminal 1: npm run quantum:stop && npm run quantum:lan" >&2
  exit 1
fi

echo "[cqr:tunnel] Motor OK. A abrir túnel público na porta ${PORT}…"
echo "[cqr:tunnel] No telemóvel: Harmonia → Motor CQR remoto → colar URL → GUARDAR → TESTAR"
echo ""

if command -v cloudflared >/dev/null 2>&1; then
  echo "[cqr:tunnel] Backend: cloudflared (trycloudflare.com)"
  exec cloudflared tunnel --url "${LOCAL}"
fi

echo "[cqr:tunnel] cloudflared não instalado — a usar localtunnel (npx)…"
echo "[cqr:tunnel] (Opcional: sudo pacman -S cloudflared)"
echo ""
exec npx --yes localtunnel --port "${PORT}"
