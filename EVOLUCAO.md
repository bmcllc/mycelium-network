# Mycelium Network — Evolução incremental descentralizada

## Contrato arquitetural

A rede nativa **não** depende de um gateway HTTP, domínio, VPS, servidor de bootstrap, relay ou PeerId único. Seeds e relays são substituíveis; os gateways HTTP são instâncias voluntárias do mesmo software, não autoridades sobre identidades, conteúdo ou execução. A disponibilidade depende de recursos e réplicas efetivamente online — descentralização não implica disponibilidade automática.

### Escopo real deste pacote

O arquivo fornecido contém somente `crates/`; **não** contém o `Cargo.toml` raiz, `mycelium-cli`, `mycelium-store`, scripts originais nem documentação principal citada no README. Este pacote acrescenta correções verificáveis por inspeção estática e testes Rust, mas os testes **não foram executados** neste ambiente porque não há Cargo/Rustc nem workspace completo. Não interpretar a existência de teste como prova de execução.

## Etapa E0 — correções feitas neste pacote

- `giggs`: critério centralizado `Plot::is_public`. Mensagens antigas sem etiqueta permanecem públicas. Qualquer etiqueta que não seja `[public]` é tratada como restrita. Isto não fornece criptografia.
- `mycelium-sporebank`: `public_spore_print` e `absorb_public` para evitar propagação/armazenamento de Plots restritos recebidos em claro.
- `mycelium-node`: `sow`, `SeedCode`, absorção via gossip, ressincronização com vizinhos e entrada DHT só divulgam conteúdo público. `signal` e deploy negam Plot restrito até haver proteção criptográfica. Um `RepoAnnounce` de conteúdo restrito não é emitido no caminho `SeedCode`.
- `mycelium-node`: respostas DHT de Plot devem corresponder ao ContentId da chave; layers devem corresponder ao ContentId antes de gravar. Migração rejeita nome discordante, layers fora do manifesto, bytes com hash errado e layers de tamanho excessivo.
- `vacuum`: `LayerStore::get` recusa conteúdo corrompido no disco.
- `singularity`: remove autenticação falsa por `Bearer <NodeId>`; HTTP `/plots` serve apenas público; `/layers` retorna 404 até existir ACL de layers. O transporte P2P de layers permanece em uso.
- `singularity`: seleção ordenada de múltiplas órbitas; GET/HEAD sem corpo podem tentar até três réplicas em erros de transporte ou respostas 502/503/504. POST/PUT não são reexecutados automaticamente.
- `mycelium-node`: heartbeats indexados por `(Ion, NodeId)`, com expiração que remove a rota daquele Ion no Event Horizon, sem remover outros Ions saudáveis do mesmo nó.
- Testes adicionados/alterados: visibilidade, integridade de layer, HTTP público/privado, ordenação, isolamento de expiração por Ion e fallback real de leitura com backend simulado indisponível.

### Mudanças de comportamento intencionais

- `private`, `community`, `reserved` e `archived` permanecem **locais**, sem publicação em claro; não há compartilhamento restrito ainda.
- Plots restritos deixam de ser acessíveis por `/plots` mesmo passando NodeId no `Authorization`; não há autenticação HTTP criptográfica implementada neste pacote.
- `/layers/{id}` responde 404 mesmo para layers públicas até que exista manifesto assinado/capability de publicação para distinguir público de privado.
- Dados privados replicados por versões anteriores podem continuar em nós terceiros: este pacote **não** apaga cópias passadas.
- O fallback HTTP funciona apenas quando há upstream alternativo já alcançável; não cria um túnel através de CGNAT.

## Etapa E1 — publicação e retenção realmente distribuídas

1. Manifesto imutável de Plot com hashes de cada layer, versão e autor verificável.
2. Política de pinning voluntário com alvo de réplicas `R>=3` e recibos assinados de custódia; não contar DHT providers como cópias comprovadas.
3. Reconciliação periódica anti-entropy entre pares; detectar peers offline e repinar cópias sem exigir o publicador.
4. Limites por peer e quota de armazenamento com garbage collection respeitando pins; métricas `desired/verified/available`.
5. Aceitação: nó A publica; B, C e D recebem bytes e comprovam hashes; A é desligado; B e C mantêm acesso sem consultar A.

## Etapa E2 — serviços vivos e estado

1. Diferenciar serviços estáticos reproduzíveis, dinâmicos sem estado e dinâmicos com estado.
2. Snapshot do Isotope, log de operações e recuperação após restart; documentar resolução de conflitos (LWW pode perder atualizações concorrentes).
3. Migração `IonOffer -> IonAccept -> IonMigrate -> IonReady` com envelope autenticado, nonce, expiração e vínculo ao PeerId do remetente; só aceitar peers autorizados conforme política do publisher.
4. Roteamento por PeerId e tunnel, nunca usar `127.0.0.1` de outra máquina; healthchecks do processo e teste de failover real.
5. Aceitação: desligar A após confirmar B/C prontos; GET permanece disponível e alterações de estado persistem após novo restart.

## Etapa E3 — CGNAT e autonomia de rendezvous

1. Prioridade de transporte: conexão direta QUIC/TCP quando possível; hole punching verificado; circuit relay v2; Nostr/QEL outbound WSS como opção.
2. Multiplicidade de relays independentes com rotação automática; nenhuma URL fixa como condição de boot.
3. Seed book local + DHT + pares conhecidos persistentes; catálogos HTTP e DNS apenas opções de descoberta.
4. Testes em duas conexões CGNAT reais, com queda do relay principal e reestabelecimento via outro relay. Simular CGNAT numa LAN não basta.

## Etapa E4 — acesso universal opcional

1. Event Horizon em todo nó para acesso nativo local.
2. Encaminhamento HTTP sobre fluxo P2P autenticado até a Chamber remota; evitar confiar em URL arbitrária recebida por gossip.
3. Gateways HTTP voluntários e intercambiáveis, HTTPS, limites de tráfego/CPU e proteção SSRF. Navegadores comuns precisam de um ponto HTTP(S) alcançável; os usuários nativos da malha não.
4. O gateway pode cair sem afetar conteúdo, DHT ou execução: outro gateway resolve o mesmo Ion.

## Etapa E5 — confiança e segurança antes de abrir a rede

1. Ed25519: autenticar anúncios, heartbeats, migrações e controles com identidade vinculada ao peer efetivo; proibir claims de NodeId forjados.
2. Criptografia ponta a ponta e capabilities verificáveis para conteúdos restritos, inclusive layers, caches, index e backups; distribuição de chaves descentralizada.
3. Isolamento fail-closed para scripts remotos, sandbox de builds e limites reais de cgroups; testes de path traversal incluindo symlinks/TOCTOU.
4. Limites por origem autenticada, políticas de admissão, quotas de tráfego e mitigação de execução ou armazenamento abusivos.
5. Auditar os caminhos históricos para não publicar plaintext inadvertidamente.

## Etapa E6 — critérios para afirmar 'hospedagem descentralizada'

- [ ] 3+ nós em máquinas diferentes; repositórios e scripts do workspace completo presentes.
- [ ] Nenhuma dependência obrigatória de URL fixa para bootstrap após peering inicial.
- [ ] Conteúdo replicado com prova de posse e persistência.
- [ ] Publicador offline e serviço disponível por 2+ réplicas.
- [ ] Perda de um relay não interrompe malha por período maior que reconexão configurada.
- [ ] Dois gateways independentes servem o mesmo Ion; nenhum é necessário ao protocolo nativo.
- [ ] Teste com internet residencial CGNAT, usando tráfego de saída e relays voluntários.
- [ ] Código de terceiros isolado sob quotas reais; testes adversariais bem-sucedidos.
- [ ] Logs e medições de uptime, latência p95, tempo de recuperação e disponibilidade de réplicas.

## Comandos de validação ao reintegrar ao workspace original

```bash
cargo fmt --all -- --check
cargo test -p giggs -p mycelium-sporebank -p vacuum -p singularity -p mycelium-node
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
./scripts/e2e-demo.sh
./scripts/horizon-demo.sh
./scripts/seedbook-demo.sh
./scripts/hybrid-demo.sh
```

Os scripts do README são **externos ao pacote enviado**; os caminhos acima só funcionam quando você integrar os crates ao repositório completo. Os testes HTTP incluídos usam sockets loopback e não substituem os testes multi-host, multi-relay e CGNAT.
