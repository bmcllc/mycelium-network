#!/usr/bin/env bash
# Wrapper docker compose — evita WARN buildx quando o plugin não está instalado.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker buildx version >/dev/null 2>&1; then
  export COMPOSE_DOCKER_CLI_BUILD=0
  export DOCKER_BUILDKIT=0
fi

exec docker compose --env-file .env.sovereign -f docker-compose.sovereign.yml "$@"
