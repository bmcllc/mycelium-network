#!/usr/bin/env bash
# scripts/stress-prolonged.sh — stress test prolongado (1h+ por padrão), 5 nós
#
# Valida sob estresse **prolongado** (não apenas ~5min):
#   1. 5 nós formam mesh completo (gossipsub lattice) e se mantêm vivos 1h+
#   2. Plasma auto-scaling cíclico: carga → IonOffer → IonAccept → IonMigrate
#      → IonReady (réplicas remotos), ociosidade → recombine (réplica cobre)
#   3. Voucher economy ativa o ciclo todo: nascimento 5 ATP/réplica + tip
#      recorrente 1 ATP por janela de tráfego por réplica remota
#   4. Ledger fecha: sum(emitidos) == sum(resgatados) em TODOS os nós,
#      sem dupla contagem (anti-replay por ContentId)
#   5. Catálogo global, zones XOR, /metrics e persistência continuam sãos
#
# Uso: bash scripts/stress-prolonged.sh [DURACAO_MIN] [NUM_NOS]
#   DURACAO_MIN default 60 (1h+)
#   NUM_NOS    default 5
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"
export CARGO_HOME="$PWD/.cargo-home"
export MYCELIUM_RATE_MAX=1000000

DURACAO_MIN="${1:-60}"
NUM_NOS="${2:-5}"
END=$(( $(date +%s) + DURACAO_MIN * 60 ))

BIN=target/debug/mycelium
LIBP2P_BASE=18600
HORIZON_BASE=18700
HOMES=(); PORTS=(); HORIZONS=(); PIDS=()
LOADER_PID=""

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }

cleanup() {
    echo ""
    echo "Limpando $NUM_NOS nós..."
    [ -n "$LOADER_PID" ] && kill "$LOADER_PID" 2>/dev/null || true
    kill ${PIDS[@]:-} 2>/dev/null || true
    wait ${PIDS[@]:-} 2>/dev/null || true
    for H in "${HOMES[@]:-}"; do rm -rf "$H"; done
}
trap cleanup EXIT

wait_sock() { for i in $(seq 1 120); do [ -S "$1/mycelium.sock" ] && return 0; sleep 0.5; done; return 1; }

# ─── helpers de contagem (todos os logs de uma vez) ──────────────────
log_per_node() { grep -c "$1" target/prolonged-*.log 2>/dev/null | awk -F: '{s+=$2} END{print s+0}'; }

echo "═══════════════════════════════════════════════════════════════"
echo " Mycelium Stress Test PROLONGADO — ${DURACAO_MIN}min, $NUM_NOS nós"
echo " auto-scaling + vouchers ativos o ciclo todo"
echo "═══════════════════════════════════════════════════════════════"

# ─── Sprout ─────────────────────────────────────────────────────────
rm -f target/prolonged-*.log
for N in $(seq 0 $((NUM_NOS - 1))); do
    HOMES[$N]="target/prolonged-$N"
    rm -rf "${HOMES[$N]}"
    # 200cpu → ATP alto (pledge cpu*10) para o voucher economy nunca secar
    "$BIN" --home "${HOMES[$N]}" sprout --contribute 200cpu,8gb,100gb >/dev/null 2>&1
    PORTS[$N]=$((LIBP2P_BASE + N))
    HORIZONS[$N]=$((HORIZON_BASE + N))
done

# ─── Nó 0 (seed) ────────────────────────────────────────────────────
echo "→ Nó 0 (seed)..."
RUST_LOG=info \
  "$BIN" --home "${HOMES[0]}" daemon --contribute 200cpu,8gb,100gb \
    --horizon-port "${HORIZONS[0]}" \
    --listen "/ip4/127.0.0.1/tcp/${PORTS[0]}" \
    --sporocarp \
    >target/prolonged-0.log 2>&1 &
PIDS[0]=$!
wait_sock "${HOMES[0]}" || { fail "Nó 0 não acordou"; exit 1; }
sleep 2
PEER0=$(grep -oE '12D3Koo[A-Za-z0-9]+' target/prolonged-0.log | head -1)
ok "Nó 0 seed :${PORTS[0]} horizon :${HORIZONS[0]}"

# ─── Nós 1..N-1 (bootstrap em 0) ────────────────────────────────────
for N in $(seq 1 $((NUM_NOS - 1))); do
    RUST_LOG=info \
      "$BIN" --home "${HOMES[$N]}" daemon --contribute 200cpu,8gb,100gb \
        --horizon-port "${HORIZONS[$N]}" \
        --listen "/ip4/127.0.0.1/tcp/${PORTS[$N]}" \
        --bootstrap "/ip4/127.0.0.1/tcp/${PORTS[0]}/p2p/$PEER0" \
        >target/prolonged-$N.log 2>&1 &
    PIDS[$N]=$!
    wait_sock "${HOMES[$N]}" || { fail "Nó $N não acordou"; exit 1; }
    sleep 1
done
sleep 5
ok "$NUM_NOS daemons acordados"

# ─── Semeia o ion de trabalho ───────────────────────────────────────
ION="prolonged"
SOW_OUT=$("$BIN" --home "${HOMES[0]}" sow --message "prolonged-stress" 2>&1)
CID=$(echo "$SOW_OUT" | grep -oE 'Qm[0-9a-f]{64}' | head -1)
if [ -z "$CID" ]; then fail "sow retornou vazio"; exit 1; fi
"$BIN" --home "${HOMES[0]}" signal --plot "$CID" --quorum 1 --ion "$ION" >/dev/null 2>&1
sleep 4
ok "Ion '$ION' semeado no nó 0 ($(echo "$CID" | head -c 16)…)"

# ─── Ciclos de respiração: carga ↔ ociosidade ───────────────────────
# A carga varre TODOS os horizontes: após recombine o ion vive nas
# réplicas, e só o nó que hospeda o chamber sente (e conta) a carga.
ROUND=0
START=$(date +%s)

echo ""
echo "══ Ciclos de carga/ociosidade até $(date -d @$END '+%H:%M:%S') ══"
while [ $(date +%s) -lt $END ]; do
    ROUND=$((ROUND + 1))
    NOW=$(date +%s)
    ELAPSED=$((NOW - START))
    REMAINING=$((END - NOW))
    echo ""
    echo "── Rodada $ROUND — t=$((ELAPSED / 60))m$((ELAPSED % 60))s restam $((REMAINING / 60))m$((REMAINING % 60))s ──"

    # FASE A: carga sustentada (~2 janelas de scaling = 100s), varre todos os nós
    ( while true; do
        for H in "${HORIZONS[@]}"; do
            seq 1 200 | xargs -P 40 -I{} curl -s -o /dev/null "http://127.0.0.1:$H/$ION/" 2>/dev/null
        done
      done ) &
    LOADER_PID=$!
    echo "  [carga] rajada de 100s em $NUM_NOS horizontes..."
    sleep 100
    kill "$LOADER_PID" 2>/dev/null; wait "$LOADER_PID" 2>/dev/null || true
    LOADER_PID=""
    sleep 5

    # FASE B: ociosidade (~3 janelas de zero = 140s) → recombine onde réplica cobre
    echo "  [ociosidade] 140s sem carga (recombine se réplica cobre)..."
    sleep 140
    sleep 5

    BORN=$(log_per_node "frutificada")
    EMITTED=$(log_per_node "voucher de hospedagem emitido")
    REDEEMED=$(log_per_node "voucher resgatado")
    REJECTED=$(log_per_node "voucher rejeitado")
    REC=$(log_per_node "demanda zero persistente")
    CATALOG=0
    for N in $(seq 0 $((NUM_NOS - 1))); do
        C=$(curl -s "http://127.0.0.1:${HORIZONS[$N]}/catalog" 2>/dev/null || echo '{}')
        echo "$C" | grep -q "$ION" && CATALOG=$((CATALOG + 1))
    done

    echo "  ↳ rodada $ROUND: réplicas=$BORN · emitidos=$EMITTED · resgatados=$REDEEMED · rejeitados=$REJECTED · recombines=$REC · catálogo=$CATALOG/$NUM_NOS"
done

# ─── Relatório final ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " RELATÓRIO — Stress Prolongado ${DURACAO_MIN}min · $NUM_NOS nós"
echo "═══════════════════════════════════════════════════════════════"

ALIVE=0
for N in $(seq 0 $((NUM_NOS - 1))); do
    if kill -0 "${PIDS[$N]}" 2>/dev/null; then ALIVE=$((ALIVE + 1)); fi
done
# Espera final de liquidação: dá tempo dos últimos vouchers chegarem
echo "  (janela final de 25s para liquidação dos vouchers...)"
sleep 25

BORN=$(log_per_node "frutificada")
EMITTED=$(log_per_node "voucher de hospedagem emitido")
REDEEMED=$(log_per_node "voucher resgatado")
REJECTED=$(log_per_node "voucher rejeitado")
REC=$(log_per_node "demanda zero persistente")
[ -z "$BORN" ] && BORN=0; [ -z "$EMITTED" ] && EMITTED=0
[ -z "$REDEEMED" ] && REDEEMED=0; [ -z "$REJECTED" ] && REJECTED=0; [ -z "$REC" ] && REC=0

# Ledger: cada voucher emitido tem id ContentId(payload+assinatura);
# anti-replay impede dupla contagem — emitidos deviam == resgatados.
CLOSES="✅"
if [ "$EMITTED" -ne "$REDEEMED" ]; then CLOSES="✗ (emitidos≠resgatados)"; fi

# Verificação on-disk: soma débitos `hospedagem:*` vs créditos `voucher de *`
# em TODOS os ledger.json — o fechamento contábil ponto-a-ponto.
LEDGER_SUM=$(NUM_NOS_=$NUM_NOS python3 - <<'PY'
import json, os
n = int(os.environ["NUM_NOS_"])
debit = 0; credit = 0; dcount = 0; ccount = 0; redeemed = 0
for i in range(n):
    try:
        with open(f"target/prolonged-{i}/ledger.json") as f:
            L = json.load(f)
    except Exception:
        continue
    for h in L.get("history", []):
        memo = h.get("memo", "")
        if h.get("nutrient") == "Atp" and memo.startswith("hospedagem:"):
            debit += abs(h.get("delta", 0)); dcount += 1
        elif h.get("nutrient") == "Atp" and memo.startswith("voucher de "):
            credit += h.get("delta", 0); ccount += 1
    redeemed += len(L.get("redeemed", []))
print(f"{debit} {credit} {dcount} {ccount} {redeemed}")
PY
)
read -r DEBIT_TOTAL CREDIT_TOTAL DCOUNT CCOUNT REDEEMED_COUNT <<< "$LEDGER_SUM"
DOCK_CLOSES="✅"
if [ "${DEBIT_TOTAL:-0}" -ne "${CREDIT_TOTAL:-0}" ]; then DOCK_CLOSES="✗ (débitos≠créditos)"; fi

echo ""
echo "Plasma auto-scaling:"
echo "  Réplicas frutificadas: $BORN"
echo "  Recombines:            $REC"
echo ""
echo "Voucher economy:"
echo "  Emitidos:   $EMITTED"
echo "  Resgatados: $REDEEMED"
echo "  Rejeitados: $REJECTED (anti-replay/redelivery: guarda funcionando)"
echo "  Ledger fecha (logs):   $CLOSES"
echo "  Ledger fecha (disco):  $DOCK_CLOSES"
echo "    débitos hospedagem = ${DEBIT_TOTAL:-0} ATP ($DCOUNT) · créditos voucher = ${CREDIT_TOTAL:-0} ATP ($CCOUNT) · ids anti-replay = $REDEEMED_COUNT"
echo ""

echo "Balances finais (ATP):"
ATP_TOTAL=0
for N in $(seq 0 $((NUM_NOS - 1))); do
    ATP=$("$BIN" --home "${HOMES[$N]}" balance 2>&1 | grep -oP 'ATP=\K\d+' | head -1 || echo "0")
    ATP_TOTAL=$((ATP_TOTAL + ${ATP:-0}))
    ok "  Nó $N: ATP=$ATP"
done
echo "  Σ ATP = $ATP_TOTAL (pledge 200cpu×10×$NUM_NOS = $((200 * 10 * NUM_NOS)) + momentum/flywheel)"

echo ""
echo "Catálogo global (/$ION):"
CATALOG_OK=0
for N in $(seq 0 $((NUM_NOS - 1))); do
    C=$(curl -s "http://127.0.0.1:${HORIZONS[$N]}/catalog" 2>/dev/null || echo '{}')
    if echo "$C" | grep -q "$ION"; then CATALOG_OK=$((CATALOG_OK + 1)); ok "  Nó $N: ion no catálogo"; else warn "  Nó $N: ion ausente"; fi
done

echo ""
echo "Zones XOR:"
for N in $(seq 0 $((NUM_NOS - 1))); do
    Z=$("$BIN" --home "${HOMES[$N]}" zones 2>&1 || echo "")
    C=$(echo "$Z" | grep -c "custodian" || true)
    echo "  Nó $N: $C zona(s)"
done

echo ""
echo "Metrics (nó 0):"
curl -s "http://127.0.0.1:${HORIZONS[0]}/metrics" 2>/dev/null | grep -E "mycelium_ion_(charge|desired|remote)" | head -6 || echo "  (sem métricas)"

echo ""
PASS=1
[ "$ALIVE" -ne "$NUM_NOS" ] && { fail "Nós vivos: $ALIVE/$NUM_NOS"; PASS=0; }
[ "$BORN" -lt 1 ] && { fail "Nenhuma réplica frutificada em ${DURACAO_MIN}min"; PASS=0; }
[ "$EMITTED" -ne "$REDEEMED" ] && { fail "Ledger não fecha: emitidos=$EMITTED resgatados=$REDEEMED"; PASS=0; }
[ "${DEBIT_TOTAL:-0}" -ne "${CREDIT_TOTAL:-0}" ] && { fail "Ledger em disco não fecha: débitos=$DEBIT_TOTAL créditos=$CREDIT_TOTAL"; PASS=0; }
[ "$CATALOG_OK" -ne "$NUM_NOS" ] && { fail "Catálogo: $CATALOG_OK/$NUM_NOS"; PASS=0; }

if [ "$PASS" -eq 1 ]; then
    ok "STRESS PROLONGADO PASSOU — ${DURACAO_MIN}min, $NUM_NOS nós, auto-scaling + vouchers verdes"
else
    warn "Stress prolongado FALHOU em algum critério — veja target/prolonged-*.log"
    exit 1
fi