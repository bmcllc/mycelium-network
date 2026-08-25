#!/usr/bin/env bash
# Executa testes core/ com Python que tenha numpy+pytest.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_py() {
  local py="$1"
  if "$py" -c "import numpy, pytest" 2>/dev/null; then
    exec "$py" -m pytest core/tests/ "$@"
  fi
}

for candidate in \
  "$ROOT/core/.venv/bin/python" \
  python3 \
  python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    run_py "$candidate" && exit 0
  fi
done

echo "Instale dependências: pip install -r core/requirements.txt" >&2
echo "  (Arch/CachyOS: pip install --user --break-system-packages -r core/requirements.txt)" >&2
exit 1
