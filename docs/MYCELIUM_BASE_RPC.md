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
