#!/usr/bin/env bash
# Repõe Alby Hub local quando: "Failed to load JWT secret: cipher: message authentication failed"
# Causa: pasta de dados foi encriptada com outra password de desbloqueio.
#
# ATENÇÃO: apaga a carteira local do Hub (só use em dev).
set -euo pipefail

HUB_DIR="${ALBYHUB_COMPOSE_DIR:-$HOME/Documentos/hub-master}"
DATA_DIR="${ALBYHUB_DATA_DIR:-$HUB_DIR/albyhub-data}"

if [[ ! -d "$HUB_DIR" ]]; then
  echo "Pasta hub-master não encontrada: $HUB_DIR" >&2
  echo "Defina ALBYHUB_COMPOSE_DIR se o compose estiver noutro sítio." >&2
  exit 1
fi

echo "=== Reset Alby Hub (dev) ==="
echo "Dados: $DATA_DIR"
echo ""
if [[ "${ALBYHUB_RESET_YES:-}" != "1" ]]; then
  read -r -p "Isto APAGA a carteira local do Hub. Continuar? [y/N] " ans
  if [[ "${ans,,}" != "y" && "${ans,,}" != "s" ]]; then
    echo "Cancelado."
    exit 0
  fi
fi

BACKUP="$HUB_DIR/albyhub-data.backup-$(date +%Y%m%d-%H%M%S)"
echo "Backup → $BACKUP"

docker stop albyhub 2>/dev/null || true
if [[ -d "$DATA_DIR" ]]; then
  mv "$DATA_DIR" "$BACKUP"
fi
mkdir -p "$DATA_DIR"

cd "$HUB_DIR"
docker compose up -d albyhub 2>/dev/null || docker start albyhub

echo ""
echo "✓ Hub limpo. Abre http://localhost:8085 e faz setup NOVO."
echo "  Usa uma password que vais lembrar (só desbloqueio do Hub)."
echo "  OAuth: clica Maybe later (não Connect)"
echo "  NWC: http://localhost:8085/apps/new"
echo "  Rede: regtest (NETWORK=regtest no docker-compose)"
echo ""
echo "Se quiseres recuperar dados antigos: mv \"$BACKUP\" \"$DATA_DIR\""
