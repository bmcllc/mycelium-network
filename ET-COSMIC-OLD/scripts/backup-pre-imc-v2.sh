#!/usr/bin/env bash
# Backup completo do monorepo ANTES da linha IMC v2.0 (exclui node_modules, target, dist).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="${1:-$(date +%Y%m%d)}"
DEST="${ROOT}/archive/snapshot-full-${STAMP}"

echo "→ Backup ET-COSMIC → ${DEST}"
mkdir -p "${ROOT}/archive"
rsync -a --delete \
  --exclude node_modules \
  --exclude target \
  --exclude void_core/target \
  --exclude void_core/pkg \
  --exclude dist \
  --exclude .git \
  --exclude archive/snapshot-full-* \
  --exclude coverage \
  --exclude docker-quantum-venv \
  --exclude docker-quantum-bin \
  --exclude secrets \
  --exclude 'secrets/**' \
  "${ROOT}/" "${DEST}/" || true

cat > "${DEST}/BACKUP-README.md" <<EOF
# Snapshot pré-IMC v2.0

- Data: ${STAMP}
- Origem: ET-COSMIC monorepo completo (291 SKUs, painéis legado, quantum/, etc.)
- Uso: restaurar estado anterior; comparar diff com \`main\` após pivot IMC.

O projeto activo passa a \`VITE_IMC_V2=1\` + manifesto \`src/b2b/imcInfrastructure.ts\`.
EOF

echo "✓ Backup em ${DEST} ($(du -sh "${DEST}" | cut -f1))"
