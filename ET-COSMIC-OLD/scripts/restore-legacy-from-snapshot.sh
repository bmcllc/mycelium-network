#!/usr/bin/env bash
# Restaura painéis e motores do snapshot (pós-purge). Não sobrescreve ficheiros IMC v2 novos.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="$ROOT/archive/snapshot-full-20260521"
cd "$ROOT"

if [[ ! -d "$SNAP" ]]; then
  echo "✗ Snapshot não encontrado: $SNAP"
  echo "  Corra: npm run imc:backup"
  exit 1
fi

echo "→ Restaurar src/components/ (só ficheiros em falta)"
for f in "$SNAP"/src/components/*.tsx; do
  base=$(basename "$f")
  dest="src/components/$base"
  if [[ ! -f "$dest" ]]; then
    cp "$f" "$dest"
    echo "  + $dest"
  fi
done

echo "→ (skip) quantum/ — IMC v2 não usa emulação Python"

echo "→ Restaurar server/aqre/ (limites clássicos, opcional)"
if [[ -d "$SNAP/server/aqre" ]]; then
  mkdir -p server/aqre
  rsync -a "$SNAP/server/aqre/" server/aqre/
  echo "  server/aqre/ OK"
fi

for extra in \
  src/crypto/heptaryQuantum.test.ts \
  src/research/quantumResearch.ts; do
  if [[ -f "$SNAP/$extra" && ! -f "$ROOT/$extra" ]]; then
    mkdir -p "$(dirname "$ROOT/$extra")"
    cp "$SNAP/$extra" "$ROOT/$extra"
    echo "  + $extra"
  fi
done

echo "✓ Restauração física concluída. Actualize rotas: npm run imc:restore-routes"
