#!/usr/bin/env bash
# Demo/validação: Plasma reativo entre DOIS nós reais (gossip TCP local).
#
# Nó A semeia e expõe o ion; carga HTTP acima do limiar dispara IonOffer;
# nó B aceita, recebe IonMigrate automático e frutifica réplica (IonReady);
# ociosidade persistente recombina a origem (A) mantendo viva a réplica (B).
#
# Uso: bash scripts/scaling-demo.sh [--skip-recombine]
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"
export CARGO_HOME="$PWD/.cargo-home"

BIN=target/debug/mycelium
HA=target/scale-a
HB=target/scale-b
PORT_A=7481
PORT_B=7482
LIBP2P_A=44001
SKIP_RECOMBINE="${1:-}"

rm -rf "$HA" "$HB"
"$BIN" --home "$HA" sprout --contribute 4cpu,8gb,100gb >/dev/null 2>&1
"$BIN" --home "$HB" sprout --contribute 4cpu,8gb,100gb >/dev/null 2>&1

echo "== nó A (origem): daemon + horizon :$PORT_A =="
RUST_LOG=info MYCELIUM_RATE_MAX=100000 \
  "$BIN" --home "$HA" daemon --contribute 4cpu,8gb,100gb \
    --horizon-port "$PORT_A" --listen "/ip4/127.0.0.1/tcp/$LIBP2P_A" \
    >target/scale-a.log 2>&1 &
DA=$!

wait_sock() { for i in $(seq 1 90); do [ -S "$1/mycelium.sock" ] && return 0; sleep 0.5; done; return 1; }
wait_sock "$HA" || { echo "FALHOU: A não acordou"; exit 1; }

PEER_A=$(grep -oE '12D3Koo[A-Za-z0-9]+' target/scale-a.log | head -1)
echo "peer A: $PEER_A"

echo "== nó B (réplica candidata): bootstrap em A =="
RUST_LOG=info \
  "$BIN" --home "$HB" daemon --contribute 4cpu,8gb,100gb \
    --horizon-port "$PORT_B" --bootstrap "/ip4/127.0.0.1/tcp/$LIBP2P_A/p2p/$PEER_A" \
    >target/scale-b.log 2>&1 &
DB=$!
wait_sock "$HB" || { echo "FALHOU: B não acordou"; exit 1; }
sleep 5

echo "== sow + signal no A =="
SOW_OUT=$("$BIN" --home "$HA" sow --message "scaling multi-node" 2>&1)
CID=$(echo "$SOW_OUT" | grep -oE 'Qm[0-9a-f]{64}' | head -1)
echo "plot: $CID"
"$BIN" --home "$HA" signal --plot "$CID" --quorum 1 --ion webapp >/dev/null 2>&1
sleep 4
echo "ion no A: $(curl -s "http://127.0.0.1:$PORT_A/webapp/" | head -c 80)"

echo "== rajada de carga (~105s, cobre 2 janelas de scaling) =="
( while true; do seq 1 400 | xargs -P 40 -I{} curl -s -o /dev/null "http://127.0.0.1:$PORT_A/webapp/"; done ) &
LOOP=$!
sleep 105
kill "$LOOP" 2>/dev/null; wait "$LOOP" 2>/dev/null || true

echo "== observando o ciclo do Plasma (até 180s) =="
REPLICA_BORN=0
for i in $(seq 1 90); do
  if grep -q "IonReady\|frutificada" target/scale-b.log 2>/dev/null; then REPLICA_BORN=1; break; fi
  sleep 2
done
echo "-- log A (plasma) --"
grep -iE "plasma|IonOffer|IonAccept|IonMigrate" target/scale-a.log | tail -4 || echo "(nada)"
echo "-- log B (plasma) --"
grep -iE "plasma|IonMigrate|frutificada|IonReady" target/scale-b.log | tail -4 || echo "(nada)"
echo "-- réplica servindo no B? --"
curl -s "http://127.0.0.1:$PORT_B/webapp/" | head -c 120; echo
echo "REPlica nasceu: $REPLICA_BORN"

echo "== economia: voucher de hospedagem =="
for i in $(seq 1 15); do
  grep -q "voucher resgatado" target/scale-b.log && break
  sleep 2
done
grep -hE "voucher de hospedagem emitido|voucher resgatado" target/scale-a.log target/scale-b.log | tail -2 || true
echo "A: $("$BIN" --home "$HA" balance 2>&1 | grep -oE 'ATP=[0-9]+' | head -1)"
echo "B: $("$BIN" --home "$HB" balance 2>&1 | grep -oE 'ATP=[0-9]+' | head -1)"

if [[ "$SKIP_RECOMBINE" == "--skip-recombine" ]]; then
  kill "$DA" "$DB" 2>/dev/null; wait "$DA" "$DB" 2>/dev/null
  echo "== fim (--skip-recombine) =="
  exit 0
fi

echo "== ociosidade: aguardando recombine na origem A (até ~240s) =="
RECOMBINED=0
for i in $(seq 1 120); do
  if grep -q "recombinada" target/scale-a.log 2>/dev/null; then RECOMBINED=1; break; fi
  sleep 2
done
echo "A recombineu: $RECOMBINED"
sleep 3
echo "-- ions no A pós-recombine --"
"$BIN" --home "$HA" status 2>&1 | grep -E "^ *ions" || true
echo "-- réplica ainda viva no B? --"
curl -s "http://127.0.0.1:$PORT_B/webapp/" | head -c 120; echo

kill "$DA" "$DB" 2>/dev/null; wait "$DA" "$DB" 2>/dev/null
echo "== fim =="
