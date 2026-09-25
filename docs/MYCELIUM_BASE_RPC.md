# Mycelium Base RPC — RPC soberano com transporte pós-quântico

## Objetivo

Expor localmente um endpoint Ethereum JSON-RPC compatível com o S1:

```text
http://127.0.0.1:8545
```

sem tornar Alchemy, QuickNode, dRPC ou outro RPC SaaS um ponto obrigatório.

O Mycelium não cria o estado da Base. Pelo menos um peer provedor precisa executar um nó Base real. Clientes leves consultam esses provedores pela malha.

## Arquitetura

```text
S1 BPF
  |
  | HTTP JSON-RPC
  v
127.0.0.1:8545
  |
  v
Mycelium RPC Gateway
  |
  | LIVE / unicast, TTL curto
  | ML-KEM-1024 + ChaCha20-Poly1305 via VEIL
  v
Mycelium mesh
  |
  +---- provider A ----> base-reth-node + base-consensus
  +---- provider B ----> base-reth-node + base-consensus
  +---- provider C ----> base-reth-node + base-consensus
```

O nó Base do provider deve ficar em loopback/LAN privada; somente a interface Mycelium é exposta.

## Segurança

Estado atual do repositório:

- ML-KEM-1024/FIPS 203: implementado em `mycelium-pqc`.
- ChaCha20-Poly1305: implementado no transporte VEIL.
- Unicast DTN multissalto: implementado em `mycelium-hyphae`.
- Identidade Ed25519: ainda existe em partes do stack.

Portanto, o estado atual é **transporte pós-quântico**, não identidade integralmente pós-quântica.

A promoção para identidade híbrida deve usar assinatura:

```text
Ed25519 + ML-DSA-87
```

durante a transição. Nunca substituir silenciosamente a identidade antiga.

## Regras do RPC financeiro

Chamadas de leitura são permitidas por padrão:

- `eth_chainId`
- `eth_blockNumber`
- `eth_call`
- `eth_estimateGas`
- `eth_getBalance`
- `eth_getBlockByNumber`
- `eth_getCode`
- `eth_getLogs`
- `eth_getProof`
- `eth_getStorageAt`
- `eth_getTransactionReceipt`
- `eth_feeHistory`

Envio de transação é **opt-in**:

- `eth_sendRawTransaction`

Namespaces perigosos permanecem fail-closed:

- `admin_*`
- `debug_*`
- `engine_*`
- `miner_*`
- `personal_*`
- `trace_*`
- `txpool_*`
- métodos de assinatura local

A chave privada nunca trafega no RPC. O S1 assina localmente e, quando habilitado, envia apenas a transação já assinada.

## Frescor

RPC usado para arbitragem não deve usar entrega atrasada.

Cada pedido contém:

- `created_at_ms`
- `expires_at_ms`
- `chain_id`
- `request_id` BLAKE3
- corpo JSON-RPC

TTL inicial: 3 segundos.

Bundle expirado deve ser descartado, não entregue posteriormente pelo DTN.

## Provider

Um provider executa:

```text
Base node local
    ^
    | localhost
Mycelium RPC Provider
    ^
    | Mycelium
clientes
```

O provider anuncia capacidades:

- chain ID
- archive/full
- `eth_getProof`
- `eth_sendRawTransaction`
- QPS
- perfil criptográfico
- validade do anúncio

## Quórum

Métodos determinísticos podem consultar múltiplos providers.

Exemplos:

- `eth_chainId`: igualdade exata.
- `eth_getCode` em bloco fixado: igualdade exata.
- `eth_getStorageAt` em bloco fixado: igualdade exata.
- `eth_getProof`: validar contra o state root do bloco.
- `eth_blockNumber`: aceitar providers dentro de uma pequena janela de altura; não exigir igualdade.

Para o caminho crítico do S1, a requisição deve fixar `blockTag` sempre que possível. Isso evita comparar respostas relativas a blocos diferentes.

## Integração planejada

### P0 — protocolo

Crate `mycelium-rpc`:

- tipos JSON-RPC;
- policy fail-closed;
- TTL;
- anúncios de provider;
- framing request/response;
- adapter para Base node local.

### P1 — transporte Mycelium

Adicionar ao protocolo do organismo:

- `RpcProviderAdvert`
- `RpcRequest`
- `RpcResponse`

As mensagens RPC LIVE não devem ser persistidas para entrega tardia.

### P2 — gateway local

Interface alvo:

```bash
mycelium daemon \
  --rpc-gateway 127.0.0.1:8545 \
  --rpc-chain-id 8453 \
  --rpc-require-pqc
```

S1:

```bash
export BASE_RPC_URL=http://127.0.0.1:8545
```

### P3 — provider

Interface alvo:

```bash
mycelium daemon \
  --rpc-provider http://127.0.0.1:9545 \
  --rpc-chain-id 8453 \
  --rpc-archive \
  --rpc-get-proof
```

O `127.0.0.1:9545` é o JSON-RPC do Base node local do provider.

### P4 — identidade híbrida

Adicionar ML-DSA-87 à identidade/descritor do provider, mantendo Ed25519 durante migração.

### P5 — envio mainnet

Somente após P0-P4:

- habilitar explicitamente `eth_sendRawTransaction`;
- limite de tamanho;
- nonce/replay guard;
- allowlist chain ID 8453;
- quorum/failover;
- telemetria sem registrar transação privada antes do broadcast.

## Estado desta branch

Este corte implementa apenas P0. Não declarar a malha RPC operacional até P1-P3 estarem integrados e testados em pelo menos dois hosts reais.


## P1/P2 experimental — gateway LIVE implementado

A branch `feature/mycelium-base-rpc-pqc` agora contém o primeiro caminho ponta a ponta:

1. `127.0.0.1:8545` recebe JSON-RPC HTTP.
2. O gateway valida a policy local e cria `RpcMeshRequest` com TTL.
3. O requester faz ML-KEM-1024 com a chave pública fixada do provider e deriva chaves de domínio separado para request/response.
4. O request é cifrado com ChaCha20-Poly1305 e segue por unicast Mycelium usando `forward_dtn_now`.
5. Nenhum nó — origem ou intermediário — persiste RPC para entrega tardia.
6. O provider decifra, aplica novamente a policy e consulta seu Base node local.
7. A resposta usa a chave de sessão derivada do mesmo segredo ML-KEM; isso autentica criptograficamente que ela veio de quem decapsulou o request.
8. Segredos de sessão recebem zeroização; o gateway entrega o JSON-RPC original ao cliente local.

O P1/P2 ainda usa provider explícito. Discovery/quorum automático pertence ao P3.

### Provider

O Base node deve expor RPC apenas localmente, por exemplo em `127.0.0.1:9545`.

```bash
mycelium --home /tmp/rpc-provider daemon \
  --listen /ip4/0.0.0.0/tcp/4001 \
  --rpc-provider http://127.0.0.1:9545 \
  --rpc-chain-id 8453
```

Depois:

```bash
mycelium --home /tmp/rpc-provider status
```

Copie do status:

- `NodeId`
- `PeerId` / endereço de bootstrap
- `rpc_kem_pub`

A chave `rpc_kem_pub` é pública. A chave privada fica em `{home}/rpc-kem.key` e, em Unix, é criada com modo 0600.

### Cliente/gateway

```bash
mycelium --home /tmp/rpc-client daemon \
  --bootstrap /ip4/IP_DO_PROVIDER/tcp/4001/p2p/PEERID_DO_PROVIDER \
  --rpc-gateway 127.0.0.1:8545 \
  --rpc-provider-node NODEID_DO_PROVIDER \
  --rpc-provider-kem RPC_KEM_PUB_HEX \
  --rpc-chain-id 8453 \
  --rpc-ttl-ms 3000
```

Teste:

```bash
curl -sS \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  http://127.0.0.1:8545
```

Esperado para Base Mainnet:

```json
{"jsonrpc":"2.0","id":1,"result":"0x2105"}
```

Depois:

```bash
export BASE_RPC_URL=http://127.0.0.1:8545
```

e o S1 pode usar o gateway como um endpoint Ethereum normal.

### Escrita permanece opt-in

Sem flag adicional, `eth_sendRawTransaction` e `eth_sendTransaction` são recusados.

Somente depois da homologação de leitura:

```bash
--rpc-allow-write
```

A chave privada EVM continua no S1. O Mycelium transporta somente a transação já assinada.

### Gates antes de promover P1/P2

```bash
cargo fmt --all --check
cargo test -p mycelium-rpc --locked
cargo test -p mycelium-node --locked
cargo clippy -p mycelium-rpc -p mycelium-node --all-targets -- -D warnings
cargo build --workspace --locked
```

Também é obrigatório um teste com dois homes/processos reais, comprovando:

- `eth_chainId` ponta a ponta;
- adulteração AEAD rejeitada;
- provider offline retorna erro/timeout e não cria bundle persistente;
- resposta após TTL é descartada;
- método de escrita é negado sem `--rpc-allow-write`;
- `BASE_RPC_URL=http://127.0.0.1:8545` funciona no S1.

### Limite de segurança atual

A confidencialidade do payload RPC é pós-quântica via ML-KEM-1024. A autenticação global da identidade do nó ainda depende parcialmente de Ed25519/PeerBinding. Portanto P1/P2 **não** deve ser descrito como identidade 100% pós-quântica até P4 (Ed25519 + ML-DSA-87).


### Smoke de dois nós sem full node Base

A branch inclui um mock RPC local para provar o transporte antes de instalar/sincronizar um Base node:

```bash
bash scripts/rpc-two-node-smoke.sh
```

O script:

- sobe um mock Base apenas em loopback;
- sobe um provider Mycelium com identidade ML-KEM persistente;
- sobe um segundo nó com gateway HTTP local;
- testa `eth_chainId = 0x2105`;
- testa que `eth_sendRawTransaction` é recusado por padrão;
- desliga o provider e confirma fail-closed;
- compara o diretório DTN antes/depois para comprovar que RPC offline não foi persistido.

Depois desse smoke, substitua `--rpc-provider http://127.0.0.1:<porta-mock>` pelo RPC do Base node real.

### Gates adicionais de segurança implementados

- cada `RpcMeshRequest` contém nonce CSPRNG de 128 bits, evitando colisão entre chamadas idênticas no mesmo milissegundo;
- replay cache é limitado pelo TTL do pedido, não por limpeza global;
- o provider chama `eth_chainId` no upstream ao iniciar e falha fechado se a chain não for a configurada;
- uma resposta forjada por alguém que apenas observou o request não é aceita: o segredo de resposta deriva do segredo ML-KEM que só requester e provider legítimo conhecem.
