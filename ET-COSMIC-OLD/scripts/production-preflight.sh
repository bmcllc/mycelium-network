#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ET-RNET — Pré-voo de produção
#
# Verifica se o ambiente está pronto para deploy de produção.
# Uso: npm run production:preflight
#      ou: bash scripts/production-preflight.sh [--strict]
#
# --strict: trata avisos (○) como erros
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

FAIL=0
WARN=0
STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}○${NC} $*"; WARN=$((WARN + 1)); }
fail() { echo -e "  ${RED}✗${NC} $*"; FAIL=$((FAIL + 1)); }

# Carregar variáveis (ordem: base → soberano → produção)
for envfile in .env .env.sovereign .env.production; do
  [[ -f "$envfile" ]] && { set -a; source "$envfile" 2>/dev/null || true; set +a; }
done
# Aliases Vite → servidor (Compose usa VITE_* no .env.sovereign)
LND_REST_URL="${LND_REST_URL:-${VITE_LND_REST_URL:-https://127.0.0.1:8180}}"
LND_MACAROON_HEX="${LND_MACAROON_HEX:-${VITE_LND_MACAROON_HEX:-}}"
if [[ "${BITCOIN_NETWORK:-${VITE_BITCOIN_NETWORK:-}}" == "regtest" ]] && [[ -z "${LND_TLS_SKIP:-}" ]]; then
  LND_TLS_SKIP=true
fi
NWC_SECRET="${NWC_SECRET:-${VITE_NWC_SECRET:-}}"
VITE_NOSTR_RELAY_PRIMARY="${VITE_NOSTR_RELAY_PRIMARY:-ws://localhost:7777}"
VITE_QUANTUM_API_URL="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  ETΞRNET — Pré-voo de Produção${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ── 1. Ferramentas ─────────────────────────────────────────────────────────────
echo -e "${CYAN}▸ Ferramentas${NC}"

command -v node >/dev/null 2>&1 && ok "node $(node -v)" || fail "node não encontrado"
command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || fail "npm não encontrado"

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [[ "${NODE_MAJOR:-0}" -ge 22 ]]; then
  ok "Node >= 22 (fetch nativo disponível)"
else
  warn "Node < 22 — recomendado >= 22 para fetch nativo"
fi
echo ""

# ── 2. Segredos & .env ────────────────────────────────────────────────────────
echo -e "${CYAN}▸ Variáveis de Ambiente (produção)${NC}"

check_required() {
  local name="$1"
  local desc="${2:-}"
  if [[ -n "${!name:-}" ]]; then ok "$name ✓${desc:+ ($desc)}"
  else fail "$name ausente${desc:+ — $desc}"; fi
}

check_optional() {
  local name="$1"
  local desc="${2:-}"
  if [[ -n "${!name:-}" ]]; then ok "$name ✓${desc:+ ($desc)}"
  else warn "$name ausente${desc:+ — $desc}"; fi
}

if [[ "${PREFLIGHT_PAYMENTS:-}" == "1" ]]; then
  check_required LND_REST_URL "endpoint REST do nó Lightning"
  check_required LND_MACAROON_HEX "admin macaroon em hex"
else
  check_optional LND_REST_URL "Lightning (só obrigatório com PREFLIGHT_PAYMENTS=1)"
  check_optional LND_MACAROON_HEX "macaroon (pagamentos / produção financeira)"
fi
check_optional VITE_NWC_SECRET "NIP-47 Nostr Wallet Connect"
check_required VITE_NOSTR_RELAY_PRIMARY "relay NOSTR principal"
check_optional VITE_NOSTR_RELAY_FALLBACK "relay de fallback"
check_optional VITE_ETRNET_TREASURY_NPUB "royalties — sem isto, taxa de protocolo inativa"
check_optional VITE_ETRNET_ANCHOR_ADDRESS "contrato DAO (Ethereum)"
check_optional VITE_QUANTUM_API_URL "motor quântico (GhostDocker / Harmonia)"
echo ""

# ── 3. Segurança: ficheiros que NÃO devem ser commitados ──────────────────────
echo -e "${CYAN}▸ Segurança de Segredos${NC}"

for danger in .env .env.sovereign .env.production server/db-apikeys.json; do
  if git ls-files --error-unmatch "$danger" >/dev/null 2>&1; then
    fail "$danger está no git — REMOVER IMEDIATAMENTE (git rm --cached $danger)"
  else
    ok "$danger não versionado"
  fi
done
echo ""

# ── 4. Build do frontend ──────────────────────────────────────────────────────
echo -e "${CYAN}▸ Build Frontend${NC}"

if [[ -f dist/index.html ]]; then
  DIST_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
  ok "dist/index.html presente (${DIST_SIZE})"
else
  warn "dist/ não existe — execute: npm run build"
fi
echo ""

# ── 5. TypeScript ──────────────────────────────────────────────────────────────
echo -e "${CYAN}▸ TypeScript${NC}"

if npx tsc --noEmit >/dev/null 2>&1; then
  ok "tsc --noEmit sem erros"
else
  fail "tsc --noEmit com erros"
fi
echo ""

# ── 6. Testes ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}▸ Testes${NC}"

if npx vitest run --reporter=dot >/dev/null 2>&1; then
  ok "vitest run — testes passando"
else
  fail "vitest run — testes falhando"
fi
echo ""

# ── 7. Server Node (conectividade LND) ────────────────────────────────────────
echo -e "${CYAN}▸ Conectividade LND${NC}"

if [[ -n "${LND_REST_URL:-}" ]] && [[ -n "${LND_MACAROON_HEX:-}" ]]; then
  LND_URL="${LND_REST_URL%/}/v1/getinfo"
  if curl -sf --max-time 5 \
    -H "Grpc-Metadata-Macaroon: ${LND_MACAROON_HEX}" \
    ${LND_TLS_SKIP:+--insecure} \
    "$LND_URL" >/dev/null 2>&1; then
    ok "LND acessível em ${LND_REST_URL}"
  else
    warn "LND inacessível em ${LND_REST_URL} — servidor rejeitará start em NODE_ENV=production"
  fi
elif [[ "${PREFLIGHT_PAYMENTS:-}" == "1" ]]; then
  fail "LND não configurado — PREFLIGHT_PAYMENTS=1"
else
  ok "LND omitido (Harmonia/CQR/Android sem pagamentos Lightning)"
fi
echo ""

# ── 8. Docker (se disponível) ─────────────────────────────────────────────────
echo -e "${CYAN}▸ Docker${NC}"

if command -v docker >/dev/null 2>&1; then
  ok "docker disponível"
  for c in bitcoind lnd rtl nostr-relay quantum-engine cqr-gateway; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
      ok "container $c ativo"
    else
      warn "container $c offline"
    fi
  done
else
  warn "docker não instalado (não obrigatório para deploy sem containers)"
fi
echo ""

# ── 9. Pipeline cósmico (GhostDocker / Higgs / Phantom) ─────────────────────────
echo -e "${CYAN}▸ GhostDocker / Harmonia (CQR :8472)${NC}"

QAPI="${VITE_QUANTUM_API_URL:-http://127.0.0.1:8472}"
QAPI="${QAPI%/}"
if [[ "$QAPI" == "same-origin" ]] || [[ "$QAPI" == "." ]]; then
  QAPI="http://127.0.0.1:8472"
fi

if curl -sf --max-time 5 "${QAPI}/health" >/dev/null 2>&1; then
  ok "Motor CQR online em ${QAPI}"
  RUNNER_JSON="$(curl -sf --max-time 5 "${QAPI}/cosmic/void/runner/status" 2>/dev/null || true)"
  if echo "$RUNNER_JSON" | grep -q '"available":true'; then
    ok "void-runner + pi_worker.wasm (GhostDocker Rust)"
  elif echo "$RUNNER_JSON" | grep -q '"available"'; then
    warn "void-runner indisponível — Harmonia usa GhostDock TS (fallback)"
    warn "  Repare: npm run build:vps  ou  docker compose --profile quantum up -d quantum-engine"
  else
    warn "/cosmic/void/runner/status sem resposta"
  fi
else
  warn "CQR offline — GhostDocker/Higgs/Phantom em fallback TS no browser"
  warn "  Local: npm run quantum:dev   Docker: --profile quantum up -d quantum-engine"
fi

if [[ -x target/release/void-runner ]] && [[ -f artifacts/pi_worker.wasm ]]; then
  ok "void-runner local (target/release + artifacts/pi_worker.wasm)"
elif [[ -f target/release/void-runner ]] || [[ -f artifacts/pi_worker.wasm ]]; then
  warn "build:vps incompleto — falta void-runner ou pi_worker.wasm"
else
  warn "void-runner não compilado — npm run build:vps (opcional se usar Docker quantum)"
fi
echo ""

# ── 10. NOSTR relay ────────────────────────────────────────────────────────────
echo -e "${CYAN}▸ NOSTR Relay${NC}"

RELAY="${VITE_NOSTR_RELAY_PRIMARY:-ws://localhost:7777}"
# Testa apenas se for localhost (não testar relays externos)
if [[ "$RELAY" == *localhost* ]] || [[ "$RELAY" == *127.0.0.1* ]]; then
  if bash scripts/relay-health.sh 2>/dev/null; then
    ok "relay local acessível"
  else
    warn "relay local offline — npm run stack:up"
  fi
else
  ok "relay externo configurado: $RELAY"
fi
echo ""

# ── 11. Catálogo B2B (white-label) ─────────────────────────────────────────────
echo -e "${CYAN}▸ Catálogo B2B${NC}"

if npm run b2b:production-ready >/dev/null 2>&1; then
  ok "B2B production-ready (283 SKUs + 72 rotas UI)"
else
  fail "B2B production-ready — npm run b2b:production-ready"
fi
echo ""

# ── 12. VOID-00 License ────────────────────────────────────────────────────────
echo -e "${CYAN}▸ VOID-00 License${NC}"

if node scripts/license-preflight.mjs >/dev/null 2>&1; then
  ok "license preflight (WASM + community/enforce)"
else
  warn "license preflight — npm run license:preflight"
fi
echo ""

# ── Resultado ──────────────────────────────────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "  ${RED}✗ FALHOU${NC} — $FAIL erro(s), $WARN aviso(s)"
  echo -e "  Corrija os erros (${RED}✗${NC}) antes de fazer deploy."
  echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 1
elif [[ "$STRICT" -eq 1 ]] && [[ "$WARN" -gt 0 ]]; then
  echo -e "  ${YELLOW}○ AVISOS${NC} — $WARN aviso(s) (--strict trata como erro)"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 1
else
  if [[ "$WARN" -gt 0 ]]; then
    echo -e "  ${GREEN}✓ PRONTO${NC} — 0 erros, $WARN aviso(s) (opcionais)"
  else
    echo -e "  ${GREEN}✓ PRONTO${NC} — tudo verificado"
  fi
  echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Próximos passos:"
  echo -e "    1. ${CYAN}npm run build${NC}"
  echo -e "    2. ${CYAN}NODE_ENV=production node server/server.js${NC}"
  echo -e "    ou: ${CYAN}docker build -f Dockerfile.production -t etrnet-production .${NC}"
  echo -e "    Harmonia: ${CYAN}npm run production:harmony${NC}  (GhostDocker → Higgs → Phantom)"
  echo ""
  exit 0
fi
