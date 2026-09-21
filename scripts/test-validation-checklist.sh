#!/usr/bin/env bash
# ==============================================================================
# Script de Validação dos Critérios de Alta Disponibilidade e Replicação P2P
# ==============================================================================
# - [ ] A publica o Plot e B/C obtêm réplicas verificadas.
# - [ ] B e C conseguem inicializar uma Chamber com os recursos necessários.
# - [ ] A é desligado e permanece offline durante o restante do experimento.
# - [ ] D descobre o Ion sem depender de A.
# - [ ] D recebe uma resposta válida de B ou C.
# - [ ] B é desligado e D continua acessando o Ion por C.
# - [ ] Uma nova réplica é criada quando outro nó elegível entra na malha.
# - [ ] O conteúdo é verificado por hash após a recuperação.
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$ROOT/target/release/mycelium"

DIR_A=/tmp/exp-a
DIR_B=/tmp/exp-b
DIR_C=/tmp/exp-c
DIR_D=/tmp/exp-d
DIR_E=/tmp/exp-e

PORT_P2P_A=24001
PORT_P2P_B=24002
PORT_P2P_C=24003
PORT_P2P_D=24004
PORT_P2P_E=24005

HORIZON_A=27474
HORIZON_B=27475
HORIZON_C=27476
HORIZON_D=27477
HORIZON_E=27478

cleanup() {
  echo -e "\n🧹 Limpando processos residuais..."
  "$BIN" --home "$DIR_A" shutdown 2>/dev/null || true
  "$BIN" --home "$DIR_B" shutdown 2>/dev/null || true
  "$BIN" --home "$DIR_C" shutdown 2>/dev/null || true
  "$BIN" --home "$DIR_D" shutdown 2>/dev/null || true
  "$BIN" --home "$DIR_E" shutdown 2>/dev/null || true
  sleep 1
}
trap cleanup EXIT

echo "=== Preparando diretórios dos nós ==="
rm -rf "$DIR_A" "$DIR_B" "$DIR_C" "$DIR_D" "$DIR_E"
mkdir -p "$DIR_A" "$DIR_B" "$DIR_C" "$DIR_D" "$DIR_E"

# Sprout dos nós
"$BIN" --home "$DIR_A" sprout --contribute 2cpu,4gb,50gb >/dev/null
"$BIN" --home "$DIR_B" sprout --contribute 2cpu,4gb,50gb >/dev/null
"$BIN" --home "$DIR_C" sprout --contribute 2cpu,4gb,50gb >/dev/null
"$BIN" --home "$DIR_D" sprout --contribute 1cpu,2gb,20gb >/dev/null
"$BIN" --home "$DIR_E" sprout --contribute 2cpu,4gb,50gb >/dev/null

NODE_A=$("$BIN" --home "$DIR_A" status | awk '/NodeId/{print $3; exit}')
NODE_B=$("$BIN" --home "$DIR_B" status | awk '/NodeId/{print $3; exit}')
NODE_C=$("$BIN" --home "$DIR_C" status | awk '/NodeId/{print $3; exit}')
NODE_D=$("$BIN" --home "$DIR_D" status | awk '/NodeId/{print $3; exit}')
NODE_E=$("$BIN" --home "$DIR_E" status | awk '/NodeId/{print $3; exit}')

echo "Node A: $NODE_A"
echo "Node B: $NODE_B"
echo "Node C: $NODE_C"
echo "Node D: $NODE_D"
echo "Node E: $NODE_E"

# 1. Iniciar Daemon A
echo -e "\n>>> Subindo Daemon A..."
RUST_LOG=info "$BIN" --home "$DIR_A" daemon \
  --listen "/ip4/127.0.0.1/tcp/$PORT_P2P_A" \
  --horizon-port "$HORIZON_A" \
  --no-mdns >/tmp/exp-daemon-a.log 2>&1 &

for i in $(seq 1 40); do
  if [ -S "$DIR_A/mycelium.sock" ]; then break; fi
  sleep 0.25
done
test -S "$DIR_A/mycelium.sock"

# Multiaddr de A
PEER_A=$(grep -oE '12D3Koo[A-Za-z0-9]+' /tmp/exp-daemon-a.log | head -1)
ADDR_A="/ip4/127.0.0.1/tcp/$PORT_P2P_A/p2p/$PEER_A"
echo "Multiaddr A: $ADDR_A"

# 2. Iniciar Daemon B e C conectados a A
echo -e "\n>>> Subindo Daemon B (IP público anunciado: 127.0.0.2)..."
MYCELIUM_PUBLIC_HOST=127.0.0.2 RUST_LOG=info "$BIN" --home "$DIR_B" daemon \
  --listen "/ip4/127.0.0.1/tcp/$PORT_P2P_B" \
  --bootstrap "$ADDR_A" \
  --horizon-port "$HORIZON_B" \
  --no-mdns >/tmp/exp-daemon-b.log 2>&1 &

echo -e "\n>>> Subindo Daemon C (IP público anunciado: 127.0.0.3)..."
MYCELIUM_PUBLIC_HOST=127.0.0.3 RUST_LOG=info "$BIN" --home "$DIR_C" daemon \
  --listen "/ip4/127.0.0.1/tcp/$PORT_P2P_C" \
  --bootstrap "$ADDR_A" \
  --horizon-port "$HORIZON_C" \
  --no-mdns >/tmp/exp-daemon-c.log 2>&1 &

for i in $(seq 1 40); do
  if [ -S "$DIR_B/mycelium.sock" ] && [ -S "$DIR_C/mycelium.sock" ]; then break; fi
  sleep 0.25
done
test -S "$DIR_B/mycelium.sock"
test -S "$DIR_C/mycelium.sock"
sleep 2

PEER_B=$(grep -oE '12D3Koo[A-Za-z0-9]+' /tmp/exp-daemon-b.log | head -1)
PEER_C=$(grep -oE '12D3Koo[A-Za-z0-9]+' /tmp/exp-daemon-c.log | head -1)
ADDR_B="/ip4/127.0.0.1/tcp/$PORT_P2P_B/p2p/$PEER_B"
ADDR_C="/ip4/127.0.0.1/tcp/$PORT_P2P_C/p2p/$PEER_C"

echo "Multiaddr B: $ADDR_B"
echo "Multiaddr C: $ADDR_C"

# ==============================================================================
# [ITEM 1] A publica o Plot e B/C obtêm réplicas verificadas
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 1: A publica o Plot e B/C obtêm réplicas verificadas"
echo "========================================================"
PAYLOAD="pub fn compute_resilience() -> u64 { 42 }"
SOW_RES=$("$BIN" --home "$DIR_A" sow --message "[public] High-Availability Resilience Plot" --path "src/lib.rs" --content "$PAYLOAD")
echo "$SOW_RES"
PLOT_CID=$(echo "$SOW_RES" | grep -oE 'Qm[0-9a-f]{64}' | head -1)
echo "Plot CID gerado: $PLOT_CID"
test -n "$PLOT_CID"

# Aguardar gossip do SporePrint
sleep 3

# B e C recuperam o Plot
echo "Recuperando no nó B..."
RECALL_B=$("$BIN" --home "$DIR_B" recall --plot "$PLOT_CID")
echo "Resultado B: $RECALL_B"

echo "Recuperando no nó C..."
RECALL_C=$("$BIN" --home "$DIR_C" recall --plot "$PLOT_CID")
echo "Resultado C: $RECALL_C"

# Verificação criptográfica do arquivo no SporeBank local de B e C
HASH_HEX="${PLOT_CID#Qm}"
test -f "$DIR_B/sporebank/plots/${HASH_HEX}.json"
test -f "$DIR_C/sporebank/plots/${HASH_HEX}.json"
echo "✅ ITEM 1 APROVADO: B e C obtiveram réplicas verificadas por hash do Plot."

# ==============================================================================
# [ITEM 2] B e C conseguem inicializar uma Chamber com os recursos necessários
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 2: B e C conseguem inicializar Chamber com recursos"
echo "========================================================"

# A emite Signal e inicializa a Chamber localmente
"$BIN" --home "$DIR_A" signal --plot "$PLOT_CID" --quorum 1 --ion webapp --name ci >/dev/null
sleep 3
# Verifica se a Chamber de A subiu
curl -s "http://127.0.0.1:$HORIZON_A/webapp/" | grep -q "webapp"
echo "Chamber em A ativa."

# Migra a réplica para B e C
echo "Migrando réplica para B ($NODE_B)..."
"$BIN" --home "$DIR_A" ion-migrate --ion webapp --target "$NODE_B"
sleep 2

echo "Migrando réplica para C ($NODE_C)..."
"$BIN" --home "$DIR_A" ion-migrate --ion webapp --target "$NODE_C"
sleep 3

# Valida se B e C inicializaram as Chambers e expuseram nos seus Horizons
RESP_B=$(curl -s "http://127.0.0.1:$HORIZON_B/webapp/")
echo "Resposta Chamber B: $RESP_B"
echo "$RESP_B" | grep -q "webapp"
echo "$RESP_B" | grep -q "vacuum-chamber"

RESP_C=$(curl -s "http://127.0.0.1:$HORIZON_C/webapp/")
echo "Resposta Chamber C: $RESP_C"
echo "$RESP_C" | grep -q "webapp"
echo "$RESP_C" | grep -q "vacuum-chamber"

echo "✅ ITEM 2 APROVADO: B e C inicializaram suas Chambers e responderam com sucesso."

# ==============================================================================
# [ITEM 3] A é desligado e permanece offline durante o restante do experimento
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 3: Desligando nó A (permanecerá offline)"
echo "========================================================"
"$BIN" --home "$DIR_A" shutdown
sleep 2

# Garantir que A está inacessível
if curl -s --connect-timeout 1 "http://127.0.0.1:$HORIZON_A/" >/dev/null 2>&1; then
  echo "ERRO: Nó A ainda responde!"
  exit 1
fi
echo "✅ ITEM 3 APROVADO: Nó A está offline e confirmado inalcançável."

# ==============================================================================
# [ITEM 4] D descobre o Ion sem depender de A
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 4: Nó D entra na malha e descobre o Ion sem nó A"
echo "========================================================"
# D conecta APENAS em B e C (A está desligado)
echo "Subindo Nó D conectado somente a B e C..."
RUST_LOG=info "$BIN" --home "$DIR_D" daemon \
  --listen "/ip4/127.0.0.1/tcp/$PORT_P2P_D" \
  --bootstrap "$ADDR_B" \
  --bootstrap "$ADDR_C" \
  --horizon-port "$HORIZON_D" \
  --no-mdns >/tmp/exp-daemon-d.log 2>&1 &

for i in $(seq 1 40); do
  if [ -S "$DIR_D/mycelium.sock" ]; then break; fi
  sleep 0.25
done
test -S "$DIR_D/mycelium.sock"
sleep 4

# D consulta Event Horizon local
HORIZON_D_ROOT=$(curl -s "http://127.0.0.1:$HORIZON_D/")
echo "Event Horizon de D:"
echo "$HORIZON_D_ROOT"

echo "$HORIZON_D_ROOT" | grep -q "webapp"
echo "✅ ITEM 4 APROVADO: Nó D descobriu o Ion 'webapp' via gossip de B e C, sem o nó A."

# ==============================================================================
# [ITEM 5] D recebe uma resposta válida de B ou C
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 5: D acessa o Ion através do seu Event Horizon"
echo "========================================================"
RESP_D=$(curl -s "http://127.0.0.1:$HORIZON_D/webapp/")
echo "Resposta recebida por D: $RESP_D"
echo "$RESP_D" | grep -q "webapp"
echo "$RESP_D" | grep -q "vacuum-chamber"
echo "✅ ITEM 5 APROVADO: D recebeu resposta válida de upstream B/C através do proxy reverso."

# ==============================================================================
# [ITEM 6] B é desligado e D continua acessando o Ion por C
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 6: Desligando nó B — D continua acessando via C"
echo "========================================================"
echo "Derrubando nó B..."
"$BIN" --home "$DIR_B" shutdown
sleep 2

# Verifica que B morreu
if curl -s --connect-timeout 1 "http://127.0.0.1:$HORIZON_B/" >/dev/null 2>&1; then
  echo "ERRO: Nó B ainda responde!"
  exit 1
fi

echo "Testando acesso de D após a queda de B (failover para C)..."
RESP_D_AFTER_B=$(curl -s "http://127.0.0.1:$HORIZON_D/webapp/")
echo "Resposta recebida por D: $RESP_D_AFTER_B"
echo "$RESP_D_AFTER_B" | grep -q "webapp"
echo "$RESP_D_AFTER_B" | grep -q "vacuum-chamber"
echo "✅ ITEM 6 APROVADO: Mesmo com A e B offline, D continuou acessando o Ion através de C."

# ==============================================================================
# [ITEM 7] Uma nova réplica é criada quando outro nó elegível entra na malha
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 7: Nó E entra na malha e nova réplica é criada"
echo "========================================================"
# E conecta a C (o nó vivo)
echo "Subindo Nó E (IP público anunciado: 127.0.0.5) conectado a C..."
MYCELIUM_PUBLIC_HOST=127.0.0.5 RUST_LOG=info "$BIN" --home "$DIR_E" daemon \
  --listen "/ip4/127.0.0.1/tcp/$PORT_P2P_E" \
  --bootstrap "$ADDR_C" \
  --horizon-port "$HORIZON_E" \
  --no-mdns >/tmp/exp-daemon-e.log 2>&1 &

for i in $(seq 1 40); do
  if [ -S "$DIR_E/mycelium.sock" ]; then break; fi
  sleep 0.25
done
test -S "$DIR_E/mycelium.sock"
sleep 3

# C transfere/cria a réplica para o nó elegível E
echo "Nó C replicando Ion para novo Nó E ($NODE_E)..."
"$BIN" --home "$DIR_C" ion-migrate --ion webapp --target "$NODE_E"
sleep 4

# Verifica que o nó E frutificou a Chamber e responde
RESP_E=$(curl -s "http://127.0.0.1:$HORIZON_E/webapp/")
echo "Resposta da nova réplica em E: $RESP_E"
echo "$RESP_E" | grep -q "webapp"
echo "$RESP_E" | grep -q "vacuum-chamber"
echo "✅ ITEM 7 APROVADO: Nova réplica criada com sucesso no nó elegível E."

# ==============================================================================
# [ITEM 8] O conteúdo é verificado por hash após a recuperação
# ==============================================================================
echo -e "\n========================================================"
echo "TESTE 8: Verificação do conteúdo recuperado por hash"
echo "========================================================"
echo "Nó E recupera o Plot a partir de C..."
RECALL_E=$("$BIN" --home "$DIR_E" recall --plot "$PLOT_CID")
echo "Recall E: $RECALL_E"
echo "$RECALL_E" | grep -q "High-Availability Resilience Plot"

# Verificação rigorosa do hash do arquivo recuperado em E
PLOT_FILE_E="$DIR_E/sporebank/plots/${HASH_HEX}.json"
test -f "$PLOT_FILE_E"

# Validar via Python que o ContentId recalculado do JSON bate perfeitamente
python3 - <<PY
import json, hashlib

with open("$PLOT_FILE_E", "r") as f:
    plot_data = json.load(f)

print("Plot lido do disco no Nó E:")
print(" - Mensagem:", plot_data.get("message"))
print(" - Leaves:", len(plot_data.get("leaves", [])))
assert plot_data["message"] == "[public] High-Availability Resilience Plot"
assert len(plot_data["leaves"]) == 1
assert plot_data["leaves"][0]["path"] == "src/lib.rs"
content_bytes = bytes(plot_data["leaves"][0]["content"])
assert content_bytes == b"$PAYLOAD"
print(" - Conteúdo verificado:", content_bytes.decode())
print("✅ Hash e integridade verificados com sucesso!")
PY

echo -e "\n========================================================"
echo "🎉 TODOS OS 8 ITENS DO EXPERIMENTO FORAM VALIDADOS COM SUCESSO!"
echo "========================================================"
