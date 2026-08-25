#!/usr/bin/env bash
# Instala git hooks do repositório (Hermiticidade VOID-QRC).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SRC="$ROOT/scripts/hooks/pre-commit"
HOOK_DST="$ROOT/.git/hooks/pre-commit"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Não é um repositório git: $ROOT" >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "✓ pre-commit instalado → $HOOK_DST"
echo "  Gate: pytest core/tests (Hermiticidade + Anderson)"
