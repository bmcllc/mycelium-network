#!/usr/bin/env bash
# Sobe motor CQR (Python :8472) e Vite sovereign num único comando.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  if [[ -n "${QPID:-}" ]]; then
    kill "$QPID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev:cqr] A preparar venv e iniciar motor CQR na porta 8472..."
bash quantum/start.sh &
QPID=$!

for i in {1..30}; do
  if curl -sf http://127.0.0.1:8472/health >/dev/null 2>&1; then
    echo "[dev:cqr] Motor CQR online."
    break
  fi
  sleep 0.5
  if [[ $i -eq 30 ]]; then
    echo "[dev:cqr] Aviso: health check falhou; Vite arranca na mesma (modo degradado)."
  fi
done

echo "[dev:cqr] A iniciar Vite (sovereign)..."
exec npm run dev
