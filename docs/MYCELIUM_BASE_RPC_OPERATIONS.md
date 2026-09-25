# Mycelium Base RPC — Operação Real

## Objetivo

Subir um provider Mycelium que consulte Base Mainnet real e um gateway local compatível com o S1:

```text
S1 -> http://127.0.0.1:8545 -> Mycelium LIVE -> provider -> Base
```

O caminho de escrita permanece desligado por padrão.

## Alinhamento com a arquitetura Mycelium

O RPC financeiro pertence ao plano **LIVE**. Ele não usa DTN/store-and-forward.

Isto segue a separação já definida na documentação do projeto:

```text
LIVE = vizinhos, relay, dial, ICE, status, horizon, RPC financeiro
DTN  = Plots, Signals, Isotope, artifacts, mailbox
```

Uma cotação, `eth_call`, `eth_getProof` ou resposta de arbitragem atrasada é descartada pelo TTL.

## Modo A — prova com Base real, sem full node local

Use este modo apenas para comprovar o caminho real S1 -> Mycelium -> Base. O endpoint público da Base é rate-limited e não é o alvo final de produção.

### 1. Build

```bash
cd "/media/bruno/SAMBOOK/Mycelium-Network-PQC"

export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$PWD/target}"
cargo build -p mycelium-cli --locked

BIN="$CARGO_TARGET_DIR/debug/mycelium"
```

### 2. Provider

```bash
PROVIDER_HOME="$PWD/.rpc-real/provider"
mkdir -p "$PROVIDER_HOME"

"$BIN" --home "$PROVIDER_HOME" daemon \
  --listen /ip4/127.0.0.1/tcp/4101 \
  --horizon-port 0 \
  --no-mdns \
  --no-nostr-transport \
  --rpc-provider https://mainnet.base.org \
  --rpc-chain-id 8453 \
  >"$PROVIDER_HOME/daemon.log" 2>&1 &

echo $! >"$PROVIDER_HOME/daemon.pid"
```

O provider executa `eth_chainId` no upstream ao iniciar. Se não receber 8453, falha fechado.

### 3. Descobrir NodeId / PeerId / chave KEM pública

```bash
PSTATUS="$("$BIN" --home "$PROVIDER_HOME" status)"

PNODE="$(awk -F': ' '/NodeId/{print $2; exit}' <<<"$PSTATUS" | xargs)"
PPEER="$(awk -F': ' '/PeerId/{print $2; exit}' <<<"$PSTATUS" | xargs)"
PKEM="$(awk -F': ' '/rpc_kem_pub/{print $2; exit}' <<<"$PSTATUS" | xargs)"

printf 'NodeId=%s\nPeerId=%s\nKEM=%s\n' "$PNODE" "$PPEER" "$PKEM"
```

A chave `rpc_kem_pub` é pública. A privada permanece em:

```text
$PROVIDER_HOME/rpc-kem.key
```

### 4. Gateway

```bash
CLIENT_HOME="$PWD/.rpc-real/client"
mkdir -p "$CLIENT_HOME"

BOOTSTRAP="/ip4/127.0.0.1/tcp/4101/p2p/$PPEER"

"$BIN" --home "$CLIENT_HOME" daemon \
  --listen /ip4/127.0.0.1/tcp/4102 \
  --horizon-port 0 \
  --no-mdns \
  --no-nostr-transport \
  --bootstrap "$BOOTSTRAP" \
  --rpc-gateway 127.0.0.1:8545 \
  --rpc-provider-node "$PNODE" \
  --rpc-provider-kem "$PKEM" \
  --rpc-chain-id 8453 \
  --rpc-ttl-ms 3000 \
  >"$CLIENT_HOME/daemon.log" 2>&1 &

echo $! >"$CLIENT_HOME/daemon.pid"
```

Não use `--rpc-allow-write` nesta fase.

### 5. Prova blockchain real

```bash
export BASE_RPC_URL='http://127.0.0.1:8545'

curl -sS \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  "$BASE_RPC_URL"

curl -sS \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":2,"method":"eth_blockNumber","params":[]}' \
  "$BASE_RPC_URL"
```

Esperado:

```text
eth_chainId -> 0x2105
eth_blockNumber -> bloco Base real
```

### 6. S1

```bash
cd "/media/bruno/SAMBOOK/S1 BPF"

export BASE_RPC_URL='http://127.0.0.1:8545'

./s1 discover
./s1 policy
```

## Modo B — provider soberano com Base node próprio

A Base moveu o operador público para o repositório `base/base`. O compose oficial expõe o RPC execution em `localhost:8545`.

### 1. Base

```bash
git clone https://github.com/base/base.git
cd base
```

Configure `.env.mainnet`:

```dotenv
BASE_NODE_L1_ETH_RPC=<ETHEREUM_L1_EXECUTION_RPC>
BASE_NODE_L1_BEACON=<ETHEREUM_L1_BEACON_ENDPOINT>
```

Para soberania completa, estes endpoints L1 também devem ser infraestrutura própria.

Suba a imagem publicada:

```bash
docker compose up -d
```

Teste:

```bash
curl -sS \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  http://127.0.0.1:8545
```

### 2. Mycelium provider em frente ao Base local

```bash
mycelium --home /var/lib/mycelium-base-provider daemon \
  --listen /ip4/0.0.0.0/tcp/4101 \
  --horizon-port 0 \
  --no-mdns \
  --rpc-provider http://127.0.0.1:8545 \
  --rpc-chain-id 8453
```

O RPC Base pode permanecer em loopback. A interface exposta aos clientes é a malha Mycelium.

## Historical proofs

Não habilite no primeiro ensaio S1.

Quando P3 exigir `eth_getProof` histórico, o Base node pode usar:

```dotenv
RETH_HISTORICAL_PROOFS=true
```

Isso cria banco adicional de proofs e tem custo relevante de disco/I/O e backfill. Ative apenas no provider destinado a proof/archive.

## WAN / CGNAT

Para dois nós na mesma máquina ou LAN, use conexão direta e `--no-nostr-transport`.

Para cliente residencial atrás de CGNAT:

- mantenha o provider alcançável por Mycelium;
- use Nostr Transport/relay da própria rede quando necessário;
- o JSON-RPC continua cifrado ponta a ponta em nível de aplicação;
- nenhum relay intermediário precisa conhecer o payload RPC.

## Validação de regressão

```bash
bash scripts/check-rpc-pr.sh
```

Se o filesystem do target tiver menos de 10 GiB livres, o script falha antes do build. Defina `CARGO_TARGET_DIR` para um volume com espaço suficiente.


## Modo final — operação mainnet

O launcher operacional é:

```bash
scripts/rpc-mainnet.sh provider
scripts/rpc-mainnet.sh gateway
```

Sem variável de armamento, ambos sobem em modo read-only.

### Provider

```bash
export MYCELIUM_BIN=/caminho/para/mycelium
export BASE_UPSTREAM_RPC=http://127.0.0.1:9545
export MYCELIUM_PROVIDER_HOME=/var/lib/mycelium-base-provider

scripts/rpc-mainnet.sh provider
```

Depois obtenha do `mycelium status` o NodeId, PeerId/bootstrap e `rpc_kem_pub`.

### Gateway

```bash
export MYCELIUM_BIN=/caminho/para/mycelium
export MYCELIUM_BOOTSTRAP='/ip4/IP/tcp/4101/p2p/PEER_ID'
export MYCELIUM_PROVIDER_NODE='NODE_ID'
export MYCELIUM_PROVIDER_KEM='RPC_KEM_PUBLIC_HEX'
export MYCELIUM_GATEWAY_HOME="$HOME/.local/share/mycelium-s1-gateway"

scripts/rpc-mainnet.sh gateway
```

O S1 usa:

```bash
export BASE_RPC_URL=http://127.0.0.1:8545
```

### Armar broadcast

O transporte só libera `eth_sendRawTransaction` quando provider **e** gateway forem iniciados com:

```bash
export S1_MAINNET_WRITE=YES_I_ACCEPT_MAINNET_BROADCAST
```

A flag não cria nem assina transações. Ela apenas permite que uma transação já assinada pelo S1 atravesse o transporte. As políticas econômicas, chain ID, code hash, nonce/replay e demais travas continuam pertencendo ao S1/Risk Kernel.

Se nenhuma rota superar premium + custo + margem + lucro mínimo, o estado operacional esperado é **nenhuma transmissão**.


## Limite atual de autonomia

Manter provider e gateway ativos **não** torna o S1 autônomo por si só. Estes daemons apenas disponibilizam o transporte RPC.

O S1 ainda precisa de um loop operacional próprio para executar continuamente:

```text
discover
  -> policy
  -> revalidate
  -> send
```

Esse loop deve permanecer fail-closed:

- nenhuma promoção sem edge econômico real;
- nenhuma abertura de keystore antes do opt-in explícito;
- nenhuma reserva de orçamento antes da validação das condições de envio;
- nenhuma transmissão sem `BASE_RPC_URL` local e `S1_MAINNET_WRITE=YES_I_ACCEPT_MAINNET_BROADCAST`;
- se E3 não estiver satisfeito para a oportunidade atual, o estado esperado continua sendo zero broadcast.

Portanto, o estado operacional correto deste corte é: **transporte pronto; estratégia autônoma contínua ainda pertence ao S1 e não é fornecida pelos daemons Mycelium**.
