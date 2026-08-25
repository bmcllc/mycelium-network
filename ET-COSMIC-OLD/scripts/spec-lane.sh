#!/usr/bin/env bash
# Cria feature Spec-Kit com prefixo de faixa (cliente | dev | b2b).
set -euo pipefail
LANE="${1:?Usage: spec-lane.sh <cliente|dev|b2b> [--short-name slug] description...}"
shift
case "$LANE" in
  cliente|dev|b2b) ;;
  *) echo "Faixa inválida: $LANE (use cliente, dev ou b2b)" >&2; exit 1 ;;
esac
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHORT=""
ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --short-name)
      SHORT="${2:-}"
      shift 2
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done
DESC="${ARGS[*]:-}"
if [ -z "$DESC" ]; then
  echo "Descrição da feature em falta." >&2
  exit 1
fi
if [ -n "$SHORT" ]; then
  exec "$ROOT/.specify/scripts/bash/create-new-feature.sh" --short-name "${LANE}-${SHORT}" "$DESC"
else
  exec "$ROOT/.specify/scripts/bash/create-new-feature.sh" --short-name "$LANE" "$DESC"
fi
