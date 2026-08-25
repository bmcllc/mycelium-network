#!/usr/bin/env bash
# Inicia o server Node com variáveis de .env.sovereign
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source scripts/load-env-sovereign.sh
exec node server/server.js
