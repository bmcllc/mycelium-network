# Especificação Técnica — Mycelium VEIL Ω

**Status**: Especificação Formal do Protocolo v0.1.0  
**Autor**: The Lattice & Núcleo Mycelium  

---

## 1. Arquitetura Geral do Sistema

O **Mycelium VEIL Ω** é composto por dois planos funcionais de comunicação, sustentados pelo ecossistema de crates Rust do Mycelium e pela herança criptográfica do `ET-COSMIC-OLD`:

```
+-------------------------------------------------------------------------+
|                              VEIL CLIENT                                |
|  - SOCKS5 Local Proxy (RFC 1928, porta 1080)                            |
|  - DNS Leak Prevention (Resolução remota exclusiva no nó Exit)          |
|  - Kill Switch (Fail-closed em desconexão)                              |
|  - Interface TUN / Camada de Transporte de Sistema                      |
+-------------------------------------------------------------------------+
                                   |
            +----------------------+----------------------+
            |                                             |
            v                                             v
  [ PLANO LIVE: Interativo ]                    [ PLANO MIX: Assíncrono ]
  - Onion Routing em 3 saltos                   - Mixnet com Atrasos de Poisson
  - Células fixas de 512 bytes                  - Batch Shuffling & Loopix
  - Handshake híbrido ML-KEM-1024               - Sharding QEL k-de-n
  - Saída IP voluntária (Exit Node)             - Tráfego de Cobertura (Cover)
            |                                             |
            +----------------------+----------------------+
                                   |
                                   v
+-------------------------------------------------------------------------+
|                  AS 7 CAMADAS DE PRIVACIDADE E PROTEÇÃO                 |
|   0. Identidade Efêmera (GhostID + MAC Administrado Localmente)         |
|   1. Fragmentação e Reconstrução Segura QEL (sem vazar sessionKey)      |
|   2. Roteamento Multi-Hop & DistanceBridge (Guard, Middle, Exit)        |
|   3. Consenso Causal e Anti-Replay (HashChronicle + Cone de Luz)        |
|   4. Execução Isolada (ANIMUS / SYMBIONT / COSMIC Sandbox)             |
|   5. Ofuscação Temporal & Shaping (QRC + Padding Estocástico)          |
|   6. Zero-Trace em RAM & Auditabilidade ZKP (Pedersen H Independente)   |
+-------------------------------------------------------------------------+
                                   |
                                   v
+-------------------------------------------------------------------------+
|                     SUBSTRATO DE REDE MYCELIUM                          |
|  - Hyphae (libp2p, Circuit Relay v2, Kademlia DHT, hole-punching)       |
|  - PQC (ML-KEM-1024, ML-DSA-87)                                         |
|  - DistanceBridge (Score de transportes: TCP, QUIC, LoRa, BLE)          |
|  - ZKP (Commitments auditados, HashcashProof anti-Sybil)                |
+-------------------------------------------------------------------------+
```

---

## 2. As 7 Camadas: Do Legado GhostVPN ao VEIL Ω

### Camada 0: Identidade Efêmera & MAC Local
- **GhostID Desacoplado**: As identidades de sessão são instâncias efêmeras geradas via entropia do sistema. A chave permanente `gland.seed` e o NodeId da rede física nunca são revelados aos circuitos.
- **MAC Administrado Localmente**: Para evitar que a rotação física derrube conexões Wi-Fi (como no legado de 5s), o VEIL Ω utiliza rotação determinística ao iniciar sessões ou ao migrar de circuito, respeitando os bits de *locally administered address* (`address[0] |= 0x02; address[0] &= 0xfe`).

### Camada 1: Fragmentação Segura (QEL)
- **Correção de Vulnerabilidade Crítica**: O protótipo legado (`ghostvpn.ts`) serializava a `sessionKey` com os shards. O VEIL Ω utiliza `ShamirShare` $k$-de-$n$ com envelopes criptográficos independentes. A chave de sessão é acordada por salto via ML-KEM e nunca transmitida no corpo dos fragmentos.

### Camada 2: Roteamento Multi-Hop e Transporte Fantasma
- **Isolamento Onion Sphinx**: Cada nó decifra apenas a sua camada de cabeçalho e obtém as instruções de encaminhamento para o nó subsequente.
- **Topologia**:
  - `Geo Mode`: Cliente -> Exit -> Internet.
  - `Veil Mode`: Cliente -> Guard -> Middle -> Exit -> Internet.
  - `Diversity Constraint`: O algoritmo de seleção proíbe a repetição de AS (Autonomous System), sub-rede IP ou operador entre Guard e Exit.

### Camada 3: Consenso Causal e Anti-Replay
- **Cabeçalho Causal**: Cada datagrama carrega um carimbo causal de Lamport, identificador de sequência e hash cumulativo (*HashChronicle* via Blake3).
- **Anti-Replay**: Janela deslizante de não-repetição; células com contadores obsoletos ou hashes clonados são descartadas silenciosamente.

### Camada 4: Execução Invisível (ANIMUS / SYMBIONT / COSMIC)
- **Computação Sob Demanda**: Serviços executados na rede através de receitas COSMIC sem submeter tráfego ou conteúdo de navegação para validação pública.
- **Proteção do Operador de Exit**: Filtro de destinos proibidos:
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918)
  - `127.0.0.0/8` (Loopback)
  - `169.254.0.0/16` (Link-local)
  - `100.64.0.0/10` (CGNAT)
  - Prevenção contra Server-Side Request Forgery (SSRF) e scanning de redes internas voluntárias.

### Camada 5: Ofuscação Temporal & Shaping (QRC)
- **Tamanho Fixo de Célula**: Todas as células no plano LIVE e MIX possuem exatamente 512 bytes. Cargas menores recebem padding estocástico autenticado.
- **Delays de Poisson no Plano MIX**: Os nós do plano MIX introduzem atrasos exponenciais independentes $\mu \sim \text{Exp}(\lambda)$ antes de reenviar pacotes em lotes embaralhados (*batch shuffle*), tornando a correlação temporal inviável para observadores passivos.

### Camada 6: Zero-Trace em RAM & Auditabilidade ZKP
- **Segurança em Memória**: Todos os buffers de chaves e dados decifrados implementam `ZeroizeOnDrop`. Não há gravação em disco rígido nem swap de dados de tráfego.
- **Pedersen Commitments Corrigidos**: Utiliza gerador $H$ independente derivado via hash-to-curve auditado (onde $\log_G(H)$ é criptograficamente intratável), garantindo a propriedade de vinculação (*binding*).
- **Defesa Anti-Sybil**: Verificação obrigatória de `HashcashProof` para registro de descritores de nós voluntários.

---

## 3. Formato dos Pacotes e Frames

### 3.1 Célula de Circuito Fixa (512 Bytes)
```
+---------------+---------------+-----------------------------------+
| Circuit ID    | Command / Type| Payload Cifrado + Padding         |
| (4 bytes)     | (1 byte)      | (491 bytes)                       |
+---------------+---------------+-----------------------------------+
| AEAD Tag (16 bytes)                                               |
+-------------------------------------------------------------------+
```

### 3.2 Comandos de Célula
- `0x01` (`CELL_CREATE`): Handshake KEM (ML-KEM-1024) para negociar segredo por salto.
- `0x02` (`CELL_CREATED`): Confirmação de KEM com ciphertext do handshake.
- `0x03` (`CELL_RELAY_DATA`): Dados encapsulados do túnel (TCP stream ou fragmento UDP).
- `0x04` (`CELL_DESTROY`): Encerramento de circuito com destruição das chaves de sessão.
- `0x05` (`CELL_PADDING`): Célula de cobertura para ofuscação de tráfego.

---

## 4. O Nó Exit Voluntário

O operador do nó Exit deve contar com proteções ativas e configuráveis:
1. **Controle de Banda e Conexões Simultâneas**: Limitação de conexões ativas por circuito e limites de taxa (token bucket).
2. **Filtragem de Portas Sensíveis**: Bloqueio opcional de portas abusivas (ex.: SMTP 25 para evitar spam).
3. **Isolamento de Redes Locais**: Bloqueio mandatário e irrestrito de IPs privados e interfaces de loopback.
4. **Resolução Remota de DNS**: O cliente nunca resolve nomes de domínio localmente; o nome é transmitido cifrado dentro do circuito e resolvido pelo nó Exit, garantindo zero vazamento de consultas DNS (*Zero DNS Leak*).
