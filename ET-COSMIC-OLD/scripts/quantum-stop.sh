#!/usr/bin/env bash
# Para o motor CQR na porta 8472 (ou QUANTUM_PORT).
set -euo pipefail
PORT="${QUANTUM_PORT:-8472}"

if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  PID=$(ss -tlnp 2>/dev/null | grep ":${PORT}" | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
  if [[ -n "${PID:-}" ]]; then
    echo "[quantum:stop] A terminar PID ${PID} (porta ${PORT})..."
    kill "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
    sleep 0.5
    if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
      echo "[quantum:stop] Aviso: processo ainda responde; tente: kill -9 ${PID}" >&2
      exit 1
    fi
    echo "[quantum:stop] Motor CQR parado."
    exit 0
  fi
fi

echo "[quantum:stop] Nenhum motor CQR ativo na porta ${PORT}."
