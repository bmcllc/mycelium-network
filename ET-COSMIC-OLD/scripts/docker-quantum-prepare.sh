#!/usr/bin/env bash
# Prepara artefactos para Dockerfile.quantum no HOST (sem pip/apt dentro do docker build).
set -euo pipefail
cd "$(dirname "$0")/.."

REQ="quantum/requirements.txt"
BIN_OUT="docker-quantum-bin"
VENV_OUT="docker-quantum-venv"
REQ_HASH="$(sha256sum "$REQ" | awk '{print $1}')"
STAMP="$BIN_OUT/quantum-req.sha256"

mkdir -p "$BIN_OUT"

if [[ ! -x target/release/void-runner ]] || [[ ! -f artifacts/pi_worker.wasm ]]; then
  echo "[quantum:prepare] A compilar void-runner + pi_worker no host (npm run build:vps)…"
  npm run build:vps
fi

cp -f target/release/void-runner "$BIN_OUT/void-runner"
cp -f artifacts/pi_worker.wasm "$BIN_OUT/pi_worker.wasm"
chmod +x "$BIN_OUT/void-runner"

venv_ok() {
  [[ -x "$VENV_OUT/bin/uvicorn" ]] || [[ -x "$VENV_OUT/bin/python3" ]] || [[ -x "$VENV_OUT/bin/python" ]]
}

need_venv=1
if venv_ok && [[ -f "$STAMP" && "$(cat "$STAMP")" == "$REQ_HASH" ]]; then
  need_venv=0
elif venv_ok && [[ ! -f "$STAMP" ]]; then
  echo "$REQ_HASH" > "$STAMP"
  need_venv=0
  echo "[quantum:prepare] venv existente OK (stamp criado)"
fi

if [[ "$need_venv" -eq 1 ]]; then
  echo "[quantum:prepare] A instalar deps Python no host (evita DNS do Docker no build)…"
  if [[ -d "$VENV_OUT" ]] && [[ ! -w "$VENV_OUT" ]]; then
    echo "[quantum:prepare] venv pertence a root — execute:" >&2
    echo "  sudo chown -R \"\$(id -u):\$(id -g)\" docker-quantum-venv" >&2
    echo "  npm run production:quantum:prepare" >&2
    exit 1
  fi
  rm -rf "$VENV_OUT"

  host_py=""
  if command -v python3.12 >/dev/null 2>&1; then
    host_py="python3.12"
  elif python3 -c 'import sys; exit(0 if sys.version_info[:2] == (3, 12) else 1)' 2>/dev/null; then
    host_py="python3"
  fi

  if [[ -n "$host_py" ]]; then
    "$host_py" -m venv "$VENV_OUT"
    "$VENV_OUT/bin/pip" install --upgrade pip
    "$VENV_OUT/bin/pip" install --no-cache-dir -r "$REQ"
  else
    echo "[quantum:prepare] Python 3.12 local ausente — venv via Docker (--network=host)…"
    docker run --rm --network=host \
      -u "$(id -u):$(id -g)" \
      -e HOME=/tmp \
      -v "$(pwd):/w" -w /w \
      python:3.12-slim-bookworm \
      bash -c 'python -m venv /w/docker-quantum-venv && /w/docker-quantum-venv/bin/pip install --no-cache-dir -r /w/quantum/requirements.txt'
  fi

  echo "$REQ_HASH" > "$STAMP"
fi

echo "[quantum:prepare] OK → $BIN_OUT/ + $VENV_OUT/ (build Docker offline)"
