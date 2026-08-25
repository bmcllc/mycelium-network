#!/usr/bin/env bash
# Sincroniza docs/archive/bruno-theory/mirror/ a partir do volume de pesquisa local.
set -euo pipefail
SRC="${THEORY_ARCHIVE_SRC:-/run/media/bruno/WII/PS4/Games}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/docs/archive/bruno-theory/mirror"

if [[ ! -d "$SRC" ]]; then
  echo "✗ Origem não encontrada: $SRC" >&2
  echo "  Monte o disco de teoria ou exporte THEORY_ARCHIVE_SRC=/caminho/para/Games" >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete \
  --exclude='cachyos-desktop-linux-260426.iso' \
  --exclude='DOSSIÊ CONFIDENCIAL_*' \
  --exclude='*.uf2' \
  --exclude='*.mp3' \
  --exclude='*.iso' \
  --max-size=12m \
  "$SRC/" "$DEST/"

for f in \
  "Furc V2.pdf" "RE_CORE.pdf" "Re_Core (UPDATED).pdf" \
  "As Três Leis de Bruno (Revisão FURC 3.0).pdf" "As_Treis_Leis_de_Bruno.pdf" \
  "Física Causal-Holográfica.pdf" "Física Quiral-Geométrica.pdf" \
  "Mecânica Causal — Teoria Geométrica.pdf" "Reator de Fusão Aneutrônica FQN-A.pdf" \
  "utriusquecosmima01flud.pdf" "atalantafugiensh00maie.pdf" "AD0680976.pdf" \
  "OperatingManual_BF.pdf" \
  "Operating Manual For Spaceship Earth - Buckminster Fuller - (1969).pdf" \
  "the-complete-works-leonardo-da-vinci.pdf" "notebook_of_da_vinci.pdf"
do
  [[ -f "$SRC/$f" ]] && rsync -a "$SRC/$f" "$DEST/"
done

rsync -a --max-size=25m "$SRC/complemento/" "$DEST/complemento/" 2>/dev/null || true
rsync -a --max-size=25m "$SRC/Enoque/" "$DEST/Enoque/" 2>/dev/null || true
rsync -a --max-size=25m "$SRC/Extra/" "$DEST/Extra/" 2>/dev/null || true

echo "✓ Espelho atualizado: $DEST ($(du -sh "$DEST" | cut -f1))"
