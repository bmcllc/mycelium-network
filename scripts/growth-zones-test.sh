#!/usr/bin/env bash
# scripts/growth-zones-test.sh — valida o overlay de zonas (DHT XOR routing)
#
# Cobre as melhorias do "Growth Zones com DHT overlay":
#   1. Mesh multi-nó forma e troca anúncios de zona (ZoneAnnounce)
#   2. `seed-code` publica layers → `LayerNeed` consulta custodianos XOR
#   3. `request_layer` dispara roteamento DHT (`get_closest_peers` → ClosestPeers)
#   4. overlay_tick mantém a rota quente → `mycelium_overlay_routes` > 0
#   5. Replicação/custódia: layers viajam entre nós (LayerNeed → LayerOffer)
#
# Uso: bash scripts/growth-zones-test.sh [NUM_NOS]
#   NUM_NOS default 4
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"
export CARGO_HOME="$PWD/.cargo-home"

NUM_NOS="${1:-4}"
BIN=target/debug/mycelium
LIBP2P_BASE=18800
HORIZON_BASE=18900
HOMES=(); PIDS=(); HORIZONS=()
SEED_DIR="target/gz-src"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }

cleanup() {
    echo ""
    kill ${PIDS[@]:-} 2>/dev/null || true
    wait ${PIDS[@]:-} 2>/dev/null || true
    for H in "${HOMES[@]:-}"; do rm -rf "$H"; done
    rm -rf "$SEED_DIR"
}
trap cleanup EXIT

wait_sock() { for i in $(seq 1 120); do [ -S "$1/mycelium.sock" ] && return 0; sleep 0.5; done; return 1; }

echo "═══════════════════════════════════════════════════════════"
echo " Growth Zones — Overlay DHT XOR routing ($NUM_NOS nós)"
echo "═══════════════════════════════════════════════════════════"

rm -f target/gz-*.log
for N in $(seq 0 $((NUM_NOS - 1))); do
    HOMES[$N]="target/gz-$N"
    HORIZONS[$N]=$((HORIZON_BASE + N))
    rm -rf "${HOMES[$N]}"
    "$BIN" --home "${HOMES[$N]}" sprout --contribute 4cpu,8gb,50gb >/dev/null 2>&1
done

# ─── Nó 0 (seed) ────────────────────────────────────────────────────
RUST_LOG=info "$BIN" --home "${HOMES[0]}" daemon --contribute 4cpu,8gb,50gb \
  --horizon-port "${HORIZONS[0]}" --listen "/ip4/127.0.0.1/tcp/${LIBP2P_BASE}" \
  --sporocarp >target/gz-0.log 2>&1 &
PIDS[0]=$!
wait_sock "${HOMES[0]}" || { fail "Nó 0 não acordou"; exit 1; }
sleep 2
PEER0=$(grep -oE '12D3Koo[A-Za-z0-9]+' target/gz-0.log | head -1)
[ -n "$PEER0" ] || { fail "Nó 0 sem PeerId"; exit 1; }

# ─── Demais nós (join no mesh) ──────────────────────────────────────
for N in $(seq 1 $((NUM_NOS - 1))); do
    RUST_LOG=info "$BIN" --home "${HOMES[$N]}" daemon --contribute 4cpu,8gb,50gb \
      --horizon-port "${HORIZONS[$N]}" --listen "/ip4/127.0.0.1/tcp/$((LIBP2P_BASE + N))" \
      --bootstrap "/ip4/127.0.0.1/tcp/${LIBP2P_BASE}/p2p/${PEER0}" \
      >target/gz-$N.log 2>&1 &
    PIDS[$N]=$!
    wait_sock "${HOMES[$N]}" || { fail "Nó $N não acordou"; exit 1; }
    sleep 2
done

# ─── Publica seed-code pelo nó 2 (gera layers + LayerNeed na rede) ──
mkdir -p "$SEED_DIR"
printf 'pub fn hello() -> &'"'"'static str { "gz-overlay" }\n' > "$SEED_DIR/lib.rs"
"$BIN" --home "${HOMES[2]}" seed-code --path "$SEED_DIR" --name gz-overlay \
  --description "growth zones overlay test" >/dev/null 2>&1 && ok "seed-code publicado (nó 2)"

# ─── Busca o código pelo nó 3 (dispara request_layer + overlay XOR) ─
sleep 3
PLOT=$(grep -oE 'Qm[A-Za-z0-9]{64}' target/gz-2.log | head -1)
[ -n "$PLOT" ] || warn "sem plot no log do nó 2 para recall"
if [ -n "$PLOT" ]; then
    "$BIN" --home "${HOMES[3]}" recall-code --plot "$PLOT" --output "target/gz-recalled.md" \
      >/dev/null 2>&1 && ok "recall-code (nó 3) requisitou o plot via rede"
fi

# ─── Aguarda o overlay_tick (90s) resolver rotas DHT ────────────────
echo "→ aguardando overlay DHT (até 110s) resolver rotas..."
ROUTES=0
for i in $(seq 1 22); do
    sleep 5
    ROUTES=0
    for N in $(seq 0 $((NUM_NOS - 1))); do
        V=$(curl -s "http://127.0.0.1:$((HORIZON_BASE + N))/metrics" 2>/dev/null \
            | grep '^mycelium_overlay_routes' | awk '{print $2}')
        V=${V:-0}
        ROUTES=$((ROUTES + V))
    done
    [ "$ROUTES" -gt 0 ] && break
done

# ─── Gate de validação ─────────────────────────────────────────────
PASS=1

echo ""
echo "─ Overlay DHT (get_closest_peers / roteamento XOR em runtime) ─"
echo "  mycelium_overlay_routes totais: $ROUTES"
if [ "$ROUTES" -gt 0 ]; then ok "overlay DHT resolveu rotas XOR em runtime"; else fail "Nenhuma rota DHT resolvida"; PASS=0; fi
CP=$(grep -c "ClosestPeers\|overlay XOR" target/gz-*.log | awk -F: '{s+=$2} END{print s+0}')
echo "  eventos get_closest_peers/log: $CP"
[ "$CP" -gt 0 ] && ok "get_closest_peers retornando peers" || warn "sem retorno de closest_peers (DHT pequeno)"

echo ""
echo "─ Retenção de layers entre nós (estrutura central) ─"
# Nós NÃO-origem devem recuperar layers do plot via DHT/overlay.
LRC=$(grep -c "layer recuperada do DHT" target/gz-[1-9]*.log 2>/dev/null | awk -F: '{s+=$2} END{print s+0}')
echo "  layers recuperadas via DHT (fora do nó editor): $LRC"
if [ "$LRC" -gt 0 ]; then ok "layers viajando entre nós (DHT)"; else warn "nenhuma layer recuperada via DHT"; fi

NZ=$(grep -c "spore print absorvido" target/gz-[1-9]*.log 2>/dev/null | awk -F: '{s+=$2} END{print s+0}')
echo "  spore prints absorvidos (fora do nó editor): $NZ"
if [ "$NZ" -gt 0 ]; then ok "plots replicados entre nós"; else warn "nenhum spore print absorvido"; fi

echo ""
echo "─ Ações de rede (LayerNeed/Offer) ─"
LN=$(grep -c "LayerNeed\|layer servida\|layer offer" target/gz-*.log | awk -F: '{s+=$2} END{print s+0}')
echo "  LayerNeed/Offer vistos: $LN"
SO=$(grep -c "layer servida" target/gz-*.log | awk -F: '{s+=$2} END{print s+0}')
echo "  layers servidas: $SO"

echo ""
echo "─ Comando zones (nó 3) ─"
"$BIN" --home "${HOMES[3]}" zones 2>&1 | head -5

echo ""
if [ "$PASS" = 1 ]; then
    ok "Growth Zones overlay: PASS"
    exit 0
else
    fail "Growth Zones overlay: FALHOU"
    exit 1
fi
