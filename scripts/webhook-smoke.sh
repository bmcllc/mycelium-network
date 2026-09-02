#!/usr/bin/env bash
# scripts/webhook-smoke.sh — valida o recebedor de webhook do seed book.
#
# 1. Sprout + daemon (sporocarp) 1 nó
# 2. POSTa um payload AlertManager WebhookHandler para POST /seedwebhook
# 3. Verifica seeds.health.jsonl criado com o payload
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"
export CARGO_HOME="$PWD/.cargo-home"

BIN=target/debug/mycelium
HOME_DIR="target/wh-webhook"
HORIZON=19074
LIBP2P=19000
LOG=target/wh-webhook.log
RED='\033[0;31m'; GREEN='\033[0m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }

cleanup() {
    kill ${PID:-} 2>/dev/null || true
    wait ${PID:-} 2>/dev/null || true
    rm -rf "$HOME_DIR" "$LOG"
}
trap cleanup EXIT

wait_sock() { for i in $(seq 1 120); do [ -S "$1/mycelium.sock" ] && return 0; sleep 0.5; done; return 1; }

rm -rf "$HOME_DIR" "$LOG"
"$BIN" --home "$HOME_DIR" sprout --contribute 4cpu,8gb,50gb >/dev/null 2>&1
"$BIN" --home "$HOME_DIR" daemon --contribute 4cpu,8gb,50gb \
  --listen "/ip4/127.0.0.1/tcp/${LIBP2P}" --sporocarp --horizon-port $HORIZON \
  >"$LOG" 2>&1 &
PID=$!
wait_sock "$HOME_DIR" || { fail "daemon não acordou"; exit 1; }
sleep 1

# Seed de teste para casar com o instance do alerta.
"$BIN" --home "$HOME_DIR" seeds add "/ip4/1.2.3.4/tcp/4001" >/dev/null 2>&1 || true

# Payload AlertManager WebhookHandler (formato real).
read -r -d '' PAYLOAD <<'JSON'
{"receiver":"mycelium","status":"firing","alerts":[{"status":"firing","labels":{"instance":"1.2.3.4:4001","alertname":"MyceliumSemVizinhos","severity":"critical"},"annotations":{"summary":"isolado"},"startsAt":"2026-01-01T00:00:00Z"}}]
JSON

echo "→ POSTando payload AlertManager em /seedwebhook ..."
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:${HORIZON}/seedwebhook" \
    -H "Content-Type: application/json" -d "$PAYLOAD")
echo "  HTTP $R"
[ "$R" = "200" ] && ok "webhook aceitou payload (200)" || fail "webhook rejeitou (HTTP $R)"

# O feed deve existir e conter o payload.
FEED="$HOME_DIR/seeds.health.jsonl"
sleep 1
if [ -f "$FEED" ]; then
    ok "seeds.health.jsonl criado"
    echo "  conteúdo:"
    sed 's/^/    /' "$FEED"
    grep -q "MyceliumSemVizinhos" "$FEED" && ok "alerta persistido no feed" || fail "alerta não persistido"
else
    fail "seeds.health.jsonl não criado"
    exit 1
fi

echo ""
ok "Seed-book webhook: PASS"
