# 🍄 Mycelium Network — Integração Integral (P1.3.2, Malha Nativa e Serviços Comunitários)

## 1. Visão Geral e Princípio de Soberania

Este documento consolida a revisão técnica, organização e documentação das entregas executadas do **Plano de Integração Integral** da Mycelium Network.

A arquitetura orienta-se pela **regra central de soberania**:
> **A rede nativa deve operar plenamente sem internet convencional, sem carteira cripto, sem gateway público e sem circuito VEIL obrigatório.**
>
> Componentes como circuitos anônimos multicamadas (VEIL Ω), gateways HTTP reversos (Singularity / Event Horizon) e vouchers econômicos (Nutrients) ampliam privacidade, interoperabilidade e financiamento, mas não constituem dependências para a sobrevivência nem para a comunicação básica da malha comunitária.

---

## 2. Três Estados do Sistema

Para manter fidelidade absoluta entre o código real e as capacidades em campo, distinguimos três estados:

1. **Código existente no repositório (base `407582f`)**:
   - Primitivas criptográficas pós-quânticas (`mycelium-pqc`, ML-KEM-1024), identidades determinísticas (`mycelium-pheromones`), roteamento Libp2p/Gossipsub (`mycelium-hyphae`), armazenamento content-addressed (`mycelium-sporebank`), circuitos de 3 saltos (`mycelium-veil`) e orquestração (`mycelium-node`).
2. **Integração concluída e testada nesta sessão**:
   - Reconciliação completa do scaffold P1.3.2 sobre `407582f`.
   - Ciclo de vida e observabilidade do pool de bridges no VEIL (CLI, controle via socket IPC e daemon).
   - Isolamento topológico de enlaces diretos (`blocked_peers` no `HyphaeNode`) e comprovação de malha A-B-C multissalto puramente local (sem mDNS, sem broadcast, sem internet).
   - Sobrevivência de serviços comunitários nativos via Spore Bank e Lattice gossipsub após desligamento total do nó publicador.
3. **Implementação proposta / Próximas fases**:
   - Homologação física WAN entre ASNs distintos (`docs/veil-homologacao-wan.md`), mantida deliberadamente em status `trial local` até ensaio de campo externo com operadores independentes.
   - Migração e bridge com runtime COSMIC / B.A.S.E. para síntese remota de hardware via malha.

---

## 3. Arquitetura dos Planos de Comunicação

```
                       APLICAÇÕES COMUNITÁRIAS
             Mensagens · Sites · MicroEasy · Mídia · Store
                                │
                 ┌──────────────┴──────────────┐
                 │         THE LATTICE         │
                 │ Giggs · TheField · Inertia  │
                 │ Vacuum · Plasma · Isotope   │
                 │ Entropy                     │
                 └──────────────┬──────────────┘
                                │
                      API NATIVA MYCELIUM
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
         Serviços           Conteúdo           Execução
             │                  │                  │
       Spore Print         Spore Bank          COSMIC
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
                         MYCELIUM CORE
                  identidade · rotas · recursos
                                │
                  HYPHAE + ANASTOMOSE + DTN
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
         Wi-Fi/LAN          Internet IP       Outros meios
             │                  │            Bluetooth/rádio
             └──────────────────┼──────────────────┘
                                │
                       NÓS DA COMUNIDADE

     VEIL Ω = camada opcional de privacidade sobre caminhos elegíveis.
     Singularity = acesso HTTP/gateway opcional.
     Nutrients/crypto = coordenação e financiamento opcionais.
```

### 3.1 Os Cinco Planos Internos

| Plano | Responsável | Dados Transportados | Regra de Projeto |
| :--- | :--- | :--- | :--- |
| **Enlaces** | `mycelium-hyphae` | Conexões e quadros ponto a ponto | Pura infraestrutura, agnóstico à aplicação |
| **Controle** | `mycelium-core` + Gossip | Presença, rotas, capacidades e telemetria | Mensagens curtas, autenticadas e com rate limit |
| **Dados** | `mycelium-sporebank` | Blocos, arquivos e árvores de código | Endereçamento por conteúdo (BLAKE3) e verificação estrita |
| **Serviços** | The Lattice (`giggs`, etc.) | Publicação, materialização e estado | Autorização por serviço e visibilidade (`[public]`) |
| **Economia** | Nutrients + Vouchers | Contribuições de largura de banda e storage | Opcional; ausência de saldo não barra tráfego comunitário essencial |

---

## 4. Detalhamento das Entregas Realizadas

### 4.1 Entrega 1: Preservação do Scaffold e Reconciliação do Workspace
- **Inventário do Scaffold**: O trabalho não-comitado sobre o commit base `407582f` foi auditado e exportado como patch para `/tmp/scaffold_407582f.patch` e documentado no artefato de inventário.
- **Reconciliação de Contratos**:
  - `DaemonOptions` em `crates/mycelium-node/src/lib.rs` agora suporta flags de bridge: `veil_bridges`, `veil_bridge_listen`, `veil_bridge_target`.
  - `Request::VeilStart` e `Response::VeilStatusResult` em `crates/mycelium-node/src/control.rs` reconciliados com serialização limpa (`#[serde(default)]`).
  - Avisos condicionais tratados com `#[cfg(feature = "veil")]` e `#[cfg(not(feature = "veil"))]`.
  - Workspace compila com **0 erros** tanto no modo default quanto com `--features veil`.

### 4.2 Entrega 2: Conclusão do VEIL P1.3.2 (Bridges, Failover e Telemetria)
- **Pool de Entradas Opaque (`EntryPool`)**:
  - O pool de bridges (`crates/mycelium-veil/src/bridge.rs`) foi conectado ao daemon em `crates/mycelium-node/src/organism.rs`.
  - Quando pontes são especificadas (`--veil-bridge <ADDR>`), o cliente constrói um pool **somente-bridges**, nunca inserindo o endereço direto do Guard.
  - Implementada telemetria de conexão em tempo real:
    - `entrada_ativa`: id da bridge que estabeleceu o circuito (ex.: `bridge-1`).
    - `entradas`: lista das pontes cadastradas.
    - `tentativas_failover`: quantidade de entradas que falharam antes do sucesso.
    - `motivos_falha`: diagnóstico descritivo de recusas TCP ou timeout de handshake.
- **Serviço de Bridge Dedicada (`--veil-role bridge`)**:
  - Encaminhamento transparente de tráfego TCP bruto para o endpoint do Guard especificado via `--veil-bridge-target`.
  - Suporte ao encerramento limpo através de `mycelium veil stop` / `Request::VeilStop`.
- **Suíte de Aceitação**:
  - Implementada em `crates/mycelium-node/tests/veil_p1_3_2_acceptance.rs` com 4 testes de aceitação executando daemons reais:
    1. `test_acceptance_1_single_bridge_daemon_circuit_and_socks5` (**PASSED**)
    2. `test_acceptance_2_bridge_failover_transparent` (**PASSED**)
    3. `test_acceptance_3_fail_closed_when_all_bridges_fail_no_destination_leak` (**PASSED**)
    4. `test_acceptance_4_bridge_role_dedicated_lifecycle_and_shutdown` (**PASSED**)
  - **Aviso de Homologação**: Conforme diretrizes da P1.2/P1.3, o circuito com bridges foi verificado em loopback com isolamento de processos. A validação em WAN física entre operadoras distintas permanece catalogada como *ensaio de campo pendente*.

### 4.3 Entrega 3: Malha Independente A-B-C sem Internet Convencional
- **Mecanismo de Bloqueio Topológico (`blocked_peers`)**:
  - Adicionado campo `blocked_peers: Vec<PeerId>` ao struct `HyphaeConfig` e métodos `block_peer` / `blocked_peers` no `HyphaeNode`.
  - Evita a conexão direta (auto-dialing de Kademlia e Identify do libp2p em loopback), simulando nós geograficamente distantes que só conseguem se comunicar via nós intermediários.
- **Suíte de Aceitação**:
  - Implementada em `crates/mycelium-hyphae/tests/multihop_topology_acceptance.rs` com o teste `test_multihop_topology_a_b_c_without_direct_link` (**PASSED**).
  - Demonstra que:
    1. O Nó A conhece e conecta **apenas** ao Nó B.
    2. O Nó C conhece e conecta **apenas** ao Nó B.
    3. `connected_peer_ids()` de A e C comprovam que **não há enlace direto** entre eles.
    4. Mensagens publicadas por A no tópico Gossipsub `/mycelium/lattice/1.0.0` chegam a C com integridade verificada através do encaminhamento de B.
    5. A queda do Nó B interrompe a entrega, comprovando que o tráfego dependia exclusivamente do salto intermediário.
- **Fronteira e Interpretação Técnica**:
  > [!IMPORTANT]
  > O teste comprova o encaminhamento multissalto de pubsub (Lattice Gossipsub) através de B na malha. Ele **não equivale ainda** a um roteador unicast geral ponto a ponto, DTN completo ou escolha dinâmica de rotas em malha heterogênea.

### 4.4 Entrega 4: Primeiro Serviço Comunitário Nativo
- **Publicação e Sobrevivência Sem Ponto Central**:
  - Em redes convencionais, se o servidor do publicador cai, o serviço web deixa de responder (erro 502/504 ou DNS offline).
  - Na Mycelium Network, serviços comunitários públicos semeados no Spore Bank geram envelopes `SporePrint` que são absorvidos pelas réplicas locais via Lattice Gossipsub.
- **Suíte de Aceitação**:
  - Implementada em `crates/mycelium-node/tests/community_service_survival_acceptance.rs` com o teste `test_community_service_content_survival_after_publisher_shutdown` (**PASSED**).
  - Demonstra que:
    1. **Nó 1 (Publicador)** semeia um serviço web nativo (`index.html`) com visibilidade `[public]`.
    2. **Nó 2 (Réplica)** absorve e persiste o Plot com cálculo autônomo do ContentId (BLAKE3).
    3. **Nó 1 é desligado e fica 100% offline** (processo terminado e socket fechado).
    4. **Nó 2 atende à restauração** (`RecallCode`), materializando os arquivos do serviço de forma íntegra no disco.
    5. A verificação byte a byte prova que a comunidade continua consumindo o serviço de forma descentralizada.
- **Fronteira e Interpretação Técnica**:
  > [!IMPORTANT]
  > O teste comprova a **sobrevivência e restauração do conteúdo** numa réplica autônoma; ele **não comprova ainda** que um processo/serviço HTTP ativo continue atendendo requisições dinâmicas automaticamente após a queda do processo original (próxima etapa de orquestração de processos/Chamber).

---

## 5. Matriz de Testes Automatizados

Comandos de validação executados com o target isolado (`CARGO_TARGET_DIR=/tmp/target`):

| Teste | Escopo | Resultado |
| :--- | :--- | :--- |
| `veil_p1_3_2_acceptance.rs` | 4 testes de aceitação VEIL Bridges (modo daemon + SOCKS5) | **4 passed; 0 failed** |
| `multihop_topology_acceptance.rs` | Topologia multissalto A-B-C sem conexão direta A-C | **1 passed; 0 failed** |
| `community_service_survival_acceptance.rs` | Sobrevivência de serviço comunitário pós-shutdown do publicador | **1 passed; 0 failed** |
| `mycelium-veil` (unittests) | Criptografia em cebola, KEM, 7 camadas, pools e relays | **53 passed; 0 failed** |
| `mycelium-hyphae` (unittests) | Libp2p swarm, Kademlia DHT, Gossipsub, membranas e seeds | **34 passed; 0 failed** |
| `mycelium-node` (unittests) | Organism, controle IPC, protocolos, visibilidade e store | **25 passed; 0 failed** |
| `veil_socks5_integration.rs` | Integração SOCKS5 do daemon e filtragem anti-SSRF | **1 passed; 0 failed** |
| `cargo check --workspace` | Verificação do workspace completo sem warnings críticos | **0 errors; 0 warnings** |

---

## 6. Instruções de Operação e Comandos CLI

### 6.1 Executando o Daemon com Pontes VEIL

```bash
# Iniciar daemon cliente com pool de pontes e sem conexão direta ao Guard:
mycelium daemon \
  --veil \
  --veil-role client \
  --veil-port 1080 \
  --veil-bridge 127.0.0.1:9001 \
  --veil-bridge 127.0.0.1:9002

# Iniciar nó com papel de Bridge dedicada:
mycelium daemon \
  --veil \
  --veil-role bridge \
  --veil-bridge-listen 0.0.0.0:9001 \
  --veil-bridge-target 198.51.100.2:9050

# Consultar status do VEIL e telemetria de pontes:
mycelium status
# ou:
mycelium veil status
```

### 6.2 Semeando e Recuperando Serviços Comunitários

```bash
# Semear um serviço público localmente e anunciá-lo na malha:
mycelium sow \
  --path index.html \
  --message "[public] Portal Comunitário da Vila v1" \
  --file ./portal/index.html

# Em qualquer outro nó da malha (mesmo com o publicador desligado):
mycelium recall-code \
  --plot <CID_DO_PLOT> \
  --output ./servico_restaurado
```

## 7. Roteamento Unicast & DTN (Gate A) e Continuidade de Execução Ativa (Gate B)

### 7.1 Roteamento Unicast Direcionado e DTN Store-and-Forward (Gate A)
A malha nativa do Mycelium (`mycelium-hyphae`) evoluiu para além do broadcast pubsub (Gossipsub):
- **Canais Privativos DTN**: Cada nó escuta exclusivamente no tópico `/mycelium/dtn/<peer_id>`. Enlaces multissalto direcionados A→B→C transmitem o dado sem vazar para nós não envolvidos (comprovado com nó observador D sem qualquer vazamento de telemetria ou carga).
- **Métrica XOR Greedy**: O nó intermediário B analisa a distância XOR de seus pares conectados em relação ao destino final; avança o pacote se e somente se houver vizinho estritamente mais próximo do que ele próprio.
- **Store-and-Forward DTN**: Se o destino C estiver temporariamente offline, o pacote é retido com segurança no `DtnBundleStore` do nó intermediário. Quando C reconecta (`Anastomosis`), o bundle é descarregado automaticamente (*flush*), garantindo tolerância a redes intermitentes e desconectadas.

### 7.2 Continuidade Real de Execução de Serviços Comunitários (Gate B)
A sobrevivência de serviços comunitários não se limita a arquivos inertes no disco:
- **Materialização Autônoma de Câmaras**: No `Organism`, quando um serviço perde todos os seus publicadores/executores (`HyphaEvent::Atrophy`), o nó réplica detecta o estado órfão e materializa dinamicamente a Câmara correspondente através do Vácuo (`vacuum`).
- **Resiliência do Event Horizon**: O proxy HTTP reverso do nó réplica serve o serviço dinamicamente com status `HTTP 200 OK`, preservando a experiência web comunitária mesmo após o desligamento total do publicador original.

