#!/bin/bash
# Gera master-sku-list.pdf a partir de src/b2b/masterSkuList.json
set -euo pipefail
cd "$(dirname "$0")"
node scripts/generate-master-sku-pdf.mjs
