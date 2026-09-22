# Modelo de Ameaças — Mycelium VEIL Ω

**Versão**: 0.1.0-draft  
**Data**: Setembro de 2026  
**Status**: Especificação Formal & Diretriz Arquitetural  

---

## 1. Visão Geral e Filosofia

O **Mycelium VEIL Ω** é uma infraestrutura comunitária e descentralizada de privacidade, comunicação e anonimato sobre a rede P2P Mycelium Network, fundindo as primitivas criptográficas pós-quânticas (ML-KEM-1024, ML-DSA-87), o particionamento de segredos QEL, identidades efêmeras GhostID, consenso causal, execução verificável COSMIC/Planck e os conceitos aperfeiçoados do protótipo legado `ET-COSMIC-OLD` (GhostVPN).

### 1.1 Princípio da Honestidade Criptográfica
Nenhum sistema pode prometer *anonimato absoluto*. Promessas de anonimato irrestrito ignoram vetores como ataques de canal lateral, correlação temporal fim a fim por adversários globais, fingerprinting de navegador e comprometimento de dispositivos.

O Mycelium VEIL Ω adota o princípio de **privacidade mensurável por construção**:
1. Especificar rigorosamente o que o sistema protege.
2. Definir o poder e as capacidades dos adversários modelados.
3. Declarar explicitamente as limitações intrínsecas e riscos residuais.

---

## 2. Taxonomia de Adversários

| Adversário | Poder de Observação | Capacidade Ativa | Nível de Risco |
|---|---|---|---|
| **Adv-1: Observador Local / ISP** | Observa link de acesso físico, Wi-Fi local, cabos submarinos regionais | Pode tentar DPI, bloqueio de portas, spoofing de DNS e injeção de pacotes TCP | Baixo / Médio |
| **Adv-2: Nós da Malha Maliciosos** | Um ou mais nós Guard, Middle ou Exit operados por adversários | Pode reordenar células, injetar lixo, analisar tráfego e tentar correlacionar saltos | Médio / Alto |
| **Adv-3: Observador Global Passivo (GPA)** | Monitora múltiplos ISPs, cabos intercontinentais e ASes simultaneamente | Executa análise estatística de timing, contagem de pacotes e volumes em larga escala | Crítico |
| **Adv-4: Adversário Quântico (Store-Now-Decrypt-Later)** | Grava tráfego cifrado em repouso visando decifração futura via computadores quânticos | Quebra de algoritmos clássicos baseados em fatoração e logaritmo discreto | Alto (no longo prazo) |
| **Adv-5: Operador de Ataque Sybil** | Tenta instanciar milhares de nós virtuais na DHT para dominar a seleção de rotas | Busca controlar Guard e Exit do mesmo circuito para deanomizar o usuário | Crítico |
| **Adv-6: Vetores de Endpoint / Aplicação** | Executa código no navegador ou app (cookies, WebRTC, GPS, telemetria) | Coleta dados biométricos, credenciais de conta e impressões digitais do sistema | Crítico |

---

## 3. Garantias de Segurança por Camada

### 3.1 Camada 0: Identidade Efêmera & Isolamento Físico
* **O que protege**: Desassocia a identidade permanente do nó (`gland.seed`, NodeId da DHT, chaves Ed25519 persistentes) da sessão anônima.
* **Mecanismos**:
  - Chaves de sessão efêmeras descartadas em memória com `ZeroizeOnDrop`.
  - O identificador estável derivado do hardware (ex.: `compute_device_id` da licença VOID-00) é **estritamente proibido** de trafegar nos circuitos do Veil.
  - Endereço MAC local administrado (*Locally Administered Unicast*): rotação determinística controlada por sessão ou interface virtual TUN, prevenindo quebras arbitrárias de links físicos Wi-Fi.

### 3.2 Camada 1: Fragmentação Segura (QEL)
* **O que protege**: Sharding de mensagens assíncronas via Shamir Secret Sharing $k$-de-$n$.
* **Correção Crítica vs. GhostVPN Legado**:
  - *Falha legada no ET-COSMIC-OLD*: A chave de sessão (`sessionKey`) era serializada no mesmo envelope dos fragmentos QEL, destruindo o segredo caso o pacote fosse interceptado.
  - *Solução VEIL Ω*: A reconstrução exige o quorum $k$ de shards cifrados individualmente sob chaves efêmeras autenticadas. Nenhum segredo criptográfico trafega em claro dentro dos fragmentos.

### 3.3 Camada 2: Roteamento em Camadas (Onion Routing) & Multi-Canal
* **O que protege**: Separação estrita de conhecimento de rota por salto:
  - **Guard**: Conhece o IP real do cliente, mas ignora o destino final e os dados.
  - **Middle**: Conhece apenas o salto anterior e o próximo salto; desconhece origem e destino.
  - **Exit**: Conhece o destino final e entrega à Internet, mas desconhece a origem real.
* **Mecanismos**: Criptografia em camadas estilo Sphinx com segredos híbridos (ML-KEM-1024 + AEAD ChaCha20-Poly1305 / AES-256-GCM).

### 3.4 Camada 3: Consenso Causal e Anti-Replay
* **O que protege**: Injeção e reordenação maliciosa de células.
* **Mecanismos**:
  - Header causal com relógio de Lamport, número de sequência monotônico e tag de encadeamento causal (*HashChronicle* via Blake3).
  - Células fora de ordem ou duplicadas são rejeitadas silenciosamente na terminação do túnel.

### 3.5 Camada 4: Execução Invisível (ANIMUS / SYMBIONT / COSMIC)
* **O que protege**: Isolamento de tarefas computacionais distribuídas.
* **Mecanismos**:
  - Verificação de resultados via receitas determinísticas COSMIC sem submeter dados de navegação privados a nós de execução pública.
  - Execução restrita e isolamento estrito contra SSRF no nó Exit (bloqueio de subredes RFC 1918, RFC 3927, CGNAT e loopback).

### 3.6 Camada 5: Ofuscação Temporal & Shaping (QRC)
* **O que protege**: Análise passiva de tráfego baseada em tamanho e ritmo.
* **Mecanismos**:
  - Células padronizadas em tamanho uniforme (ex.: 512 bytes fixos), com padding pseudo-aleatório criptográfico.
  - No plano **MIX**: Fila estocástica de Poisson (modelo Loopix) com atrasos intencionais e injeção de tráfego artificial (*cover traffic*).

### 3.7 Camada 6: Zero-Trace & Auditabilidade ZK
* **O que protege**: Ausência de persistência de metadados em disco.
* **Mecanismos**:
  - Estado do túnel 100% volátil em memória (RAM-only).
  - *Pedersen Commitments* auditados: gerador $H$ derivado via hash-to-curve independente (com logaritmo discreto desconhecido em relação à base $G$), eliminando a vulnerabilidade onde $H = k \cdot G$.
  - Provas anti-Sybil via *HashcashProof* que vinculam criptograficamente o trabalho realizado ao recurso e ao nonce.

---

## 4. Modos de Operação e Trade-Offs

| Modo | Saltos | Criptografia | Latência | Nível de Proteção | Caso de Uso |
|---|---|---|---|---|---|
| **Geo Mode** | 1 salto (Exit) | ML-KEM + AEAD | Mínima (< 30ms) | Conectividade cifrada e geolocalização aparente. O Exit conhece seu IP real! | Streaming, downloads de alta velocidade |
| **Veil Mode (LIVE)** | 3 saltos (Guard-Middle-Exit) | Onion PQC 3 camadas | Baixa (60-180ms) | Anonimato robusto contra nós intermediários e observadores locais | Navegação web interativa, SOCKS5, mensagens |
| **Mix Mode (MIX)** | Multi-hop com delays | Onion PQC + Poisson Mix | Alta (segundos a minutos) | Resistência elevada contra adversários globais passivos (GPA) | Mensagens ultrasseguras, transferências assíncronas |

---

## 5. Limitações Inegociáveis e Riscos Residuais

1. **Correlação Temporal Fim a Fim (End-to-End Correlation)**:
   No plano LIVE (interativo), um observador capaz de inspecionar a entrada no Guard e a saída no Exit pode correlacionar volumes e intervalos temporais com precisão estatística.
2. **Identificação por Camadas de Aplicação**:
   O Veil não protege contra:
   - Login em contas de usuário associadas à sua identidade civil (ex.: Google, Apple, bancos).
   - Impressão digital de navegadores (fingerprinting canvas, fontes, WebGL).
   - Consultas de geolocalização por hardware (GPS, triangulação Wi-Fi/GSM).
3. **Resistência Sybil Limitada pelo Tamanho da Rede**:
   Uma rede com poucos nós voluntários é vulnerável a agentes estatais ou adversários com grandes recursos de infraestrutura. A expansão e diversidade geográfica dos operadores comunitários é requisito primário para o anonimato efetivo.
4. **Kill Switch Obrigatório**:
   Qualquer degradação de conectividade ou rompimento de circuito deve resultar em bloqueio imediato do tráfego (*fail-closed*), impedindo vazamentos pela interface de rede não tunelada.
