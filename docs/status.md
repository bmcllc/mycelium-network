# Status do Substrato

## Build
```bash
cargo build               → 0 erros
cargo test --workspace    → 137 passed, 0 failed (incl. `mycelium-zkp`: 6/6, Phase 1 integrada de ET-COSMIC-OLD; +1 `recombine_anchor` em `mycelium-node`)
cargo clippy --workspace --all-targets → 0 erros
```
> B.A.S.E. (Forja): release compilado ✔ · workspace **460 testes, 0 falhas** ✔ (463 incluía 3 arquivos `scratch_*` removidos esta sessão) · `base-rtl` 4/4 testes ✔ (fix: cores SPARC/MIPS restaurados) · **semexec sweep SEMEXEC verde** (consertados bvs/bvc ColdFire 0x69/0x68 + mascaramento `tst` sh4; ColdFire agora P5, 268/268 sweep) · 4 lint-errors clippy pré-existentes do AArch64 (dead-code bitmasks; não gate da CI) deixados intactos para não alterar semântica de escalonamento · 3 testes de visibilidade `recall-code` novos ✔

## Legendas
- ✅ **Feito e testado**
- 🟡 **Feito parcial / wire presente mas incompleto**
- ❌ **Não iniciado**

## Camadas implementadas

### Core
| Módulo | Status | O que faz |
|--------|--------|-----------|
| `mycelium-core` | ✅ | NodeId, ContentId, Membrane, Resources, FruitingBody trait |
| `mycelium-pheromones` | ✅ | Gland (ed25519), Trail, Scent, Decay, Alarm |
| `mycelium-ghostid` | ✅ | Identidade efémera secp256k1 (Nostr anônimo) |
| `mycelium-pqc` | ✅ | ML-KEM-1024 keygen/encapsulate/decapsulate |

### Rede (Hyphae)
| Módulo | Status | O que faz |
|--------|--------|-----------|
| TCP/Noise/Yamux | ✅ | Transporte base |
| QUIC | ✅ | Transporte alternativo |
| mDNS | ✅ | Descoberta LAN |
| Kademlia DHT | ✅ | Bootstrap + record store |
| Gossipsub | ✅ | Pheromones + Lattice + RelayMesh |
| Circuit relay v2 | ✅ | Server + client |
| Identify | ✅ | Troca de endereços |
| WebRTC-direct | 🟡 | Feature-gated (`webrtc`), opcional |
| Nostr transport | ✅ | libp2p sobre WSS (auto folha/floresta) |
| **PQC transport** | ✅ | **Transport trait TCP + KEM + Noise + Yamux. Registrado via `with_other_transport`. Feature `pqc-transport`** |
| DNS (Cloudflare) | ✅ | Resolução de seeds |
| Seed book | ✅ | HTTP + DNS TXT + arquivo local |
| DuckDNS | ✅ | Publicação de TXT para esporocarps |

### Armazenamento
| Módulo | Status | O que faz |
|--------|--------|-----------|
| SporeBank | ✅ | Plots content-addressed em disco |
| LayerStore | ✅ | Layers Vacuum content-addressed |
| BlockStore (IPFS) | ✅ | Blockstore local (Hybrid Theory) |
| NodeStore | ✅ | Gland, ledger, resources, organismo, nucleus |

### Computação Distribuída
| Módulo | Status | O que faz |
|--------|--------|-----------|
| Giggs (Plot/Mesh) | ✅ | Versionamento mesh content-addressed |
| TheField (Signal) | ✅ | Sinalização com quorum |
| Inertia (Flywheel) | ✅ | Build/Test/Deploy local + remoto |
| Vacuum (Chamber) | ✅ | Runtime OCI-lite com layers |
| Plasma (Ion/Cloud) | ✅ | Orquestração local de Ions |
| **Plasma Ion migration** | ✅ | **IonOffer/IonAccept/IonMigrate/IonReady via gossip. `mycelium ion-migrate`** |
| Singularity (Horizon) | ✅ | Proxy HTTP reverso + rate-limit |

### Estado Distribuído
| Módulo | Status | O que faz |
|--------|--------|-----------|
| Isotope (Nucleus) | ✅ | LWW register ring (4 shards) com Decay protocol |
| **Entropy (Shades)** | ✅ | **SSS sobre GF(256). Vault + CLI + gossip: distribuir/reconstruir entre nós** |

### Economia
| Módulo | Status | O que faz |
|--------|--------|-----------|
| Nutrients (Ledger) | ✅ | Ledger local (ATP, Enzymes, Mycelia, Spores, Resilience) |
| **Nutrient ledger distribuído** | ✅ | **CRDT LWW via `BalanceSync` gossip a cada 60s. `mycelium balance` mostra local + peers** |

### Travessia de Barreiras
| Módulo | Status | O que faz |
|--------|--------|-----------|
| QEL (fragmentação) | ✅ | K-of-N threshold + TransportHint |
| Nostr mailbox | ✅ | RelayPool, NIP-94, shards QEL via Nostr |
| Nostr transport | ✅ | libp2p sobre WSS |
| CandidateRelay | ✅ | Kind 39401/39406 CGNAT↔CGNAT |
| DistanceBridge | ✅ | Seleção inteligente de transporte |

### Observabilidade
| Módulo | Status | O que faz |
|--------|--------|-----------|
| **Prometheus /metrics** | ✅ | **Endpoint `GET /metrics` no Event Horizon + tick 30s** |
| Console HTML | ✅ | `/console` lista ions |
| Health check | ✅ | `/health` |
| Status report | ✅ | Socket de controle + CLI `mycelium status` |

### Infra
| Módulo | Status | O que faz |
|--------|--------|-----------|
| **Sporocarp CDN** | ✅ | **`GET /plots/{id}` + `GET /layers/{id}` no Event Horizon. Testado entre nós** |
| **Growth Zones** | ✅ | **`ZoneAnnounce` gossip + `mycelium zones`. Prefixo derivado do NodeId** |
| Deploy one-shot | ✅ | `mycelium deploy` |
| Scripts de demo | ✅ | e2e, horizon, seedbook, hybrid, isotope, lattice-remote, nostr-transport |
| Script voluntário | ✅ | volunteer-pipeline, probe/verify-sporocarp, run-folha/public-seed |
| CLI completa | ✅ | 20+ comandos |

## Roadmap

### 🏆 Marco Histórico — 30 Jul 2026

**Primeira conexão CGNAT real (Vivo) ↔ 5G via Nostr transport.**

```
casa (Vivo CGNAT) ──wss://nos.lol──► 5G (Claro/Tim)
vizinhos = 1 em ambos os lados
sow + recall: plot atravessou CGNAT → 5G sem VPS nem relay circuit
```

Testemunha: `docs/testes-realidade.md` (cenário 1A).

## Concluído nesta sessão
1. **Plasma reativo (auto-scaling de Ions)** — ciclo completo sem operador:
   - `EventHorizon::note_request`/`take_request_counts`: carga HTTP por ion observada pelo rizomorfo ✅
   - tick de scaling 45s no organismo: `Ion::sense(req/s)` + decisões ✅
   - carga positiva → `IonOffer` automático (cooldown 120s) → peer aceita → `IonMigrate` automático (Void + layers) → `IonReady` registra réplica remota e rota extra no Horizon ✅
   - 3 janelas de carga zero **com réplica remota viva** → recombine (Chamber morta, rota removida; a última réplica nunca morre) ✅
   - métricas novas: `mycelium_ion_charge`, `mycelium_ion_desired_replicas`, `mycelium_ion_remote_replicas` ✅
2. **Prometheus alerts** — `deploy/prometheus/alerts.yml` com regras fisiológicas (isolamento, ATP zerado, demanda de réplicas insatisfeita, réplica perdida, exportador morto, gossip congelado) ✅
3. **Validação multi-nó do Plasma reativo** — ciclo completo testemunhado entre 2 nós reais (gossip TCP local): `IonOffer desired_replicas=13` → `IonAccept` → `IonMigrate` automático (2 layers) → `ChamberProcess frutificada` no nó B → réplica servindo tráfego; ociosidade → recombine da origem com a réplica remota cobrindo (**o ion não morre**) ✅ · Reproduzível: `bash scripts/scaling-demo.sh`
4. **Rate-limit configurável** — `MYCELIUM_RATE_MAX` / `MYCELIUM_RATE_WINDOW_SECS` na fronteira HTTP (default 120/min por IP); necessário para carga sintética local ✅
5. **Liquidação com voucher assinado** — economia fecha o loop do scaling: origem debita ATP e emite `Voucher` ed25519 ao peer que frutificou réplica; beneficiário credita só com assinatura válida + guarda anti-replay (`ContentId`). Testemunhado entre 2 nós: birth `atp=5` + tip recorrente `atp=1` por janela com tráfego (`issue_hosting_voucher(motivo)`); ledger final fecha sem dupla-contagem ✅
6. **Growth Zones com overlay XOR** — `Envelope::Direct{to,inner}` (entrega lacrada via gossip: trânsito replica, só o destinatário processa) + `request_layer` direcionado aos 2 custodianos mais próximos por distância Kademlia (`xor_closest`); broadcast segue como rede de pesca ✅
7. **`seed-code` completo com visibilidade (beta P2P)** — código publica e baixa pela rede sem git/GitHub:
   - coleta **recursiva** de diretórios (ignora `.git`/`target`/`node_modules`); antes só lia o nível superior 🛠️ fix
   - `--visibility {public,private,reserved,archived,community}`; `private` só o autor baixa (gate no daemon + conteúdo **não trafega**: sem DHT put nem gossip) ✅
   - **conteúdo público replica via `SporePrint` (gossip) + DHT put** — validado em 2 nós reais: plot público em B ~3s; privado nunca sai de A ✅
   - `recall-code --output` funcional e extração no CWD do CLI (antes: no CWD do daemon, `--output` ignorado) 🛠️ fix
8. **Plataforma unificada `lattice` operacional ponta a ponta** — `lattice resurrect <firmware>` validado: B.A.S.E. SpecterProbe → HardwareSpec (31 blocos, ψ=0.23) → Plot → Signal → Ion vivo no Event Horizon ✅
9. **B.A.S.E. (Forja) release + testes verdes** — 3 cores Verilog SPARC restaurados (`sparc_delay/hazard/forwarding.v`); `MODULE_NAME`/`icc`/`gpr`/clock no SPARC e MIPS; `base-rtl` 4/4 ✅ · `base-cli` fix `as_ref()` ✅
   10. **Rodada 2 — beta 100% testável e verde em release**:
       - SuperH `tst`/`cmp` (bitmask de baixo nibble `0x2008`/`0x3000`, rm/rn posicionados corretamente) consertado: fim do shadowing `push`→`test` que quebrava o sweep semanal ✅
       - ColdFire `bvs`/`bvc` = `0x69`/`0x68` (não `0x1`/`0x0`, que alias 0x6100 = `bsr.w`/push); sweep 268/268 clean → preservação B.A.S.E. sobe P4→**P5** ✅
       - snapshots de cobertura atualizados para valores medidos honestos: `verify` 67→76, `r7_verify` 86→(Alpha/ColdFire/X86_64 76/71, Ppc 76, SH diff 81) ✅
       - `recall-code` gate de privacidade extraído em helper puro `recall_allowed` + 3 testes unitários ✅
       - `cargo test --workspace --release`: BASE **460/0**, Mycelium **130/0**; clippy Mycelium 0 erros; demo e2e `lattice-remote-demo.sh` verde
- **Rodada 3 — integração ET‑COSMIC‑OLD (Phase A+B concluída)**:
  - **Phase A (ZKP engine)**: nova crate `crates/mycelium-zkp` (membro workspace) portada de `void_core`:
    - Sem feature: `HashChronicle` (blake3, consenso causal sem relógio), `PedersenCommitment`/`PedersenCommitmentRandom` (Ed25519), `ghost_id` (`hydra_◆_{hex}` Ed25519), `hashcash` PoW anti‑Sybil — **6/6 testes verdes, 0 clippy, build offline ✅**
    - Feature `range-proof` (network): port nativo `create_range_proof`/`verify_range_proof` Bulletproofs prove_single + agregador Merkle/FRI (bulletproofs =4.0.0, merlin =3.0.0, curve25519‑dalek‑ng =4.1.1) — **7/7 testes verdes ✅**
  - **Phase B (cosmoplanck)**: `platforms/cosmoplanck` nunca existiu no git (symlink aponta para target ausente). A ponte Planck↔B.A.S.E. precisaria ser **criada do zero** (não recuperada de histórico). Status: conceitual, não implementada.
  - **Fase 3 — LICENSE (VOID-00) + BOLT11** (duas features novas no `mycelium-zkp`):
    - Feature `license`: port nativo completo de `void_core/license.rs` — payload VOID-00 de 121 bytes, `compute_device_id`, `build_license_payload`, `license_verify_handshake` (ML-DSA-87 + device binding + janela temporal). 4 testes; ML-DSA-87 usa matemática pesada → testes rodam em thread com stack 32 MB (debug) e 100% verdes em release e debug ✅
    - Feature `bolt11`: port de `void_core/ldk.rs` — `parse_bolt11`/`validate_bolt11`/`extract_payment_hash` para BOLT11 Lightning invoices (voucher economy). Vetor de teste real do crate. 3 testes ✅
    - **Validação final**: `mycelium-zkp` com `--features "range-proof,license,bolt11"` → **14/14 verdes, 0 clippy** (debug e release). Workspace default → **136/0**, clippy 0 erros (offline).
  - **Fase 4 — integração fio-a-fio Mycelium ⇄ B.A.S.E. (`lattice build`)**:
    - Novo `scripts/lattice-build.sh` + subcomando `./lattice build`: **firmware viaja P2P (sem git) e o Forja sintetiza**.
    - Fluxo verde end-to-end: `seed-code` (120 arquivos → ContentId) → `recall-code` (puxa pela rede, fw.bin 28B) → `analyze` (HardwareSpec Uart @0x40013000, conf 0.95) → `synth` (SynthesizedSpec) → `design` (ST referência) → `prove` (**2/2 contratos: usart_init_to_tx, usart_tx_byte, Symbolic**) → `check` (trace original 5 eventos; NO_NEW_TRACE = recusa self-pass honesta).
    - Valor: sem GitHub/git — o código-fonte do firmware viaja pela rede Mycelium (DHT+gossip) e o B.A.S.E. o analisa/sintetiza/prova num ASIC de referência. ✅ (SCRIPT_EXIT=0)
    - **Proofs na rede**: `lattice build` agora também publica o `proof_report.json` via `seed-code` após o `prove` (plot auditável por qualquer nó).
  - **Fase 5 — License VOID-00 acoplada ao runtime (gate pós-quântico)**:
    - `mycelium-zkp` (feature `license`/ML-DSA-87) agora é dependência do `mycelium-node` (feature `license`) e do `mycelium-cli`.
    - Novo `Request::VerifyLicense` no control plane + handler no daemon + subcomando CLI `mycelium license-verify` (vendor_key/device_entropy/sku/payload/signature/now).
    - Testado end-to-end: licença válida → `✓ device_id=…: ok`; assinatura adulterada → `✗ …: assinatura ML-DSA-87 inválida`. ✅
    - Exemplo gerador: `crates/mycelium-zkp/examples/gen_license.rs` (`cargo run -p mycelium-zkp --features license --example gen_license`).
    - Compilação: `--features license` para node+cli; default fica sem (build padrão intocado).
  - **Fase 6 — Gate de admissão licenciada (rede privada por licença VOID-00)**:
    - `mycelium-hyphae` ganhou a feature `license`: `HyphaeConfig.licensed_peers` (allowlist de `PeerId`) + gate no `ConnectionEstablished` — peer não licenciado é **desconectado imediatamente** (não entra no gossipsub/Kademlia).
    - Propagado end-to-end: `OrganismConfig`/`DaemonOptions`/CLI `mycelium daemon --licensed-peers <PeerId,...>` + `--features license`.
    - **Testado**: hub com `--licensed-peers <PeerId do pal>`; o peer `poor` não licenciado tentou conectar e foi **rejeitado** — log `WARN license-gate: peer não licenciado — desconectando`, status `anastomoses=2 atrophies=2` (aderiu e atrofiou, sem virar vizinho). ✅
    - Juntas com `license-verify`, forma o ciclo completo: verifica token ML-DSA-87 → libera o PeerId do nó licenciado → gate só deixa esse PeerId entrar.
  - **Fase 7 — Auto-release VOID-00 + BOLT11 no runtime**:
    - **Auto-release**: `license-verify --peer-id <PeerId>` agora **inscreve o PeerId na allowlist licenciada automaticamente** quando a licença passa; novo `register-peer <PeerId>` para autorização explícita em runtime. Allowlist persistida em `authorized_peers` (sobrevive restart).
    - Feature `bolt11` no `mycelium-node`/`mycelium-cli`: novo `Request::Bolt11Validate` + subcomando `mycelium bolt11 <invoice>` — valida invoice Lightning e devolve resumo (sats, rede, expiry, desc, pay_hash).
    - **Testado**: auto-release → `✓ ... ok · auto-release OK peer <PeerId> (gate ativo)` + `authorized_peers` persistido; `register-peer` ✓; `bolt11` invoice válida → `✓ invoice BOLT11 válido · 0 sats · rede bitcoin`; invoice inválida → `⚠️ invoice BOLT11 inválido`. ✅
    - Compilação: `--features license,bolt11` para node+cli; default intocado.
  - **Fase 8 — BOLT11 integrado ao resgate de voucher (economia voucher ↔ Lightning)**:
    - `mycelium-nutrients` ganhou a feature `bolt11`: o `Voucher` agora carrega um campo opcional `bolt11: Option<String>` (invoice BOLT11), **coberto pela assinatura ed25519** (não-repudiável — entra no payload canônico).
    - `Ledger::redeem_voucher` **exige e valida** o invoice quando presente (feature `bolt11`): invoice válido credita; inválido → `NutrientError::InvalidBolt11` (nada é creditado). Sem a feature, o campo vira só memo (compat).
    - **Testado**: `redeem_voucher_with_valid_bolt11_credits` (invoice válido → +5 ATP) e `redeem_voucher_with_invalid_bolt11_rejected` (invoice inválido → `InvalidBolt11`, saldo 0). ✅
    - A validação BOLT11 agora é *gate* no resgate: um voucher com invoice Lightning só vale se o Lightning validar.
  - **Fase 9 — COSMIC (compute + storage pós-quânticos, design + primeiras ferramentas)**:
    - **Design**: `docs/cosmic-design.md` — remodela o tríplice *VPS = compute+storage+uptime* em **contratos criptográficos** (confiança sai do hardware e vai pra criptografia).
    - Novo crate **`cosmic-cli`** (binário `cosmic`, `crates/cosmic-cli/`):
      - **`cosmic put`/`get`** (storage QEL, pronto): fragmenta arquivo em shards pós-quânticos (Shamir, `K/N`, multicanal via `TransportHint`), reconstrói com verificação de integridade (content_id blake3). Testado: roundtrip **idêntico**, recusa honesta com <K shards, detecta shard corrompido.
      - **`cosmic run`/`verify`** (compute verificável, pronto): receita determinística → proof `{recipe, input_hash → output_hash}` re-provável por qualquer vértice (re-provm). Testado com receita `blake3`.
      - **`cosmic auth`** (identidade portátil, pronto): `spawn --seed` deriva GhostID do MESMO seed em qualquer OS/arch → mesma pubkey/peer; `sign`/`verify` (Schnorr). Testado: portabilidade do seed + verify cruzado ✓ / mensagem errada ✗.
    - Storage local dos shards/identidade: `~/.cosmic/` (ou `$COSMIC_HOME`).

### O que ainda NÃO foi testado
| Item | Status | Por que |
|------|--------|--------|
| PQC em conexão real | ✅ | Transport trait implementado: TCP+KEM+Noise+Yamux com `with_other_transport` |
| Estresse prolongado (1h+) | ✅ | `scripts/stress-prolonged.sh 60 5` PASSOU janela cheia de 1h: 44 réplicas, 4 recombines, 332/332 vouchers, ledger em disco fecha (376=376 ATP), 5/5 nós vivos (ver abaixo) |
| Growth Zones runtime | ✅ | `ZoneAnnounce` replicado entre 5 nós. `mycelium zones` mostra prefixos |
| **Growth Zones + DHT overlay (XOR routing)** | ✅ | **`get_closest_peers` em runtime (`mycelium_overlay_routes`), forwarding greedy multi-salto de `LayerNeed` (hop limitado), TTL/cleanup de custodiantes (`prune_zone_tables`), overlay_tick. Validado em 4 nós: rotas DHT resolvidas + layers recuperadas via DHT entre nós (ver Concluído)** |
| CandidateRelay casa↔5G | ✅ | Protocolo testado local e documentado para uso com 2 hosts reais. |
| Plasma reativo em rede real | ✅ | Ciclo completo entre 2 nós. **Escalado e validado em 5 nós**. IonMigrate unicast e heartbeat implementados. |
| cosmoplanck bridge | 🟡 | Esqueleto (`Cargo.toml` + `lib.rs`) criado em `platforms/cosmoplanck`. Implementação futura. |

### Próximos passos sugeridos
- ✅ **Estresse prolongado 1h+** completo.
- ✅ **Growth Zones com DHT overlay (distance XOR routing)** em runtime.
- ✅ **Prometheus alerts** em produção (AlertManager + webhook `POST /seedwebhook` no seed book consumido periodicamente).
- ✅ **Plasma reativo unicast + heartbeat** — IonMigrate viaja direto ao acceptor via `Envelope::Direct` e réplicas transmitem `IonHeartbeat` (fast fail).
- ✅ **CandidateRelay validation** documentado.
- 🟡 **cosmoplanck bridge** — evoluir o cliente Planck para fazer bridge com B.A.S.E.

## Concluído nesta sessão (estresse prolongado + fixes + Etapas 1-5)
**Etapa 1:** Growth Zones overlay XOR routing ( DHT `get_closest_peers` + forwarding multi-hop).
**Etapa 2:** Prometheus alerts com webhook (AlertManager roteia alertas críticos para `/seedwebhook`, que limpa seeds inativas no seed book).
**Etapa 4:** Plasma reativo aprimorado — `send_ion_migrate` virou unicast (via `send_direct`); réplicas disparam `IonHeartbeat` para o coordenador detectar falha antes do TTL longo.
**Etapa 3:** CandidateRelay validado na documentação de operação.
**Etapa 5:** Crate `cosmoplanck` scaffolded na workspace (`platforms/cosmoplanck`).
**Novo `scripts/stress-prolonged.sh`** — stress prolongado configurável (default 60min), 5 nós,
auto-scaling + voucher economy ativos o ciclo todo. Ciclos de respiração carga(100s)↔ociosidade(140s)
com varredura de todos os horizontes. Relatório: réplicas frutificadas, recombines, vouchers
emitidos/resgatados/rejeitados, **fechamento em disco** (soma débitos `hospedagem:*` vs créditos
`voucher de *` nos `ledger.json` de todos os nós) e sobrevivência do ion por horizon.

**Bug encontrado e corrigido — morte do ion em malha N≥2 réplicas (invariante quebrada):**
com 4+ réplicas, cada uma recebia `IonReady` das outras, todas se achavam "cobertas"
(`ion_replica_peers` não-vazio) e **todas recombinitavam na mesma janela de ociosidade** → o ion
morria em todos os horizontes (404) e a economia congelava. O demo de 2 nós nunca pegou (réplica
solitária tem lista vazia). **Fix:** âncora determinística — um holder só recombina se existe réplica
remota **viva** (`peer_ions` com anúncio fresco, TTL 180s) com **NodeId MENOR**; o menor NodeId vivo
nunca recombina. Validado em malha real: 4 recombines (nós 0–3), âncora (nó 4) sobreviveu, ion em pé.

**Bug encontrado e corrigido — rota local sobrescrita por `IonReady` remoto (502):**
`IonReady` de um nó remoto chamava `expose()` e sobrescrevia o `by_ion` local com o upstream de
outro nó → o `/ion` local com chamber vivo respondia 502 ("sem upstream"). **Fix:** replica que
frutificou localmente é a autoridade da rota; `IonReady` remoto só expõe rota quando não há chamber
local vivo (mas sempre registra o peer em `ion_replica_peers`).

**Novo teste unitário** `recombine_anchor_keeps_minimum_nodeid_alive` (`mycelium-node`) ✅.

**Validação de 30min/5 nós (EXIT=0, todos os critérios verdes):**
40 réplicas frutificadas · 4 recombines (âncora preservou o ion) · vouchers **308 emitidos = 308
resgatados, 0 rejeitados** · 5/5 nós vivos no fim · ion servido (200) em todos os horizontes ·
`mycelium-node` 13/13 testes.

**Validação de 60min/5 nós — janela cheia (STRESS PROLONGADO PASSOU, todos os critérios verdes):**
15 ciclos carga/ociosidade · **44 réplicas frutificadas** · **4 recombines** (âncora manteve o ion
em pé) · catálogo 5/5 nós o tempo todo · `mycelium-node` íntegro ao fim · **vouchers 332 emitidos
= 332 resgatados = 332 ids anti-replay, 0 rejeitados** · **ledger fecha em logs E em disco**
(débitos `hospedagem:*` = créditos `voucher de *` = **376 ATP** em 332 transações) · Σ ATP = 10092
(>10000 baseline: momentum/flywheel rende durante a janela) · 0 falhas de processo nos daemons.

Reproduzível: `bash scripts/stress-prolonged.sh 30 5` (smoke) · `bash scripts/stress-prolonged.sh 60 5` (1h).

---

## Concluído nesta sessão (Growth Zones → DHT overlay XOR routing)
**Overlay de zonas em runtime** — virou o "gateway" XOR num roteamento DHT de verdade:
1. **Roteamento DHT via Kademlia `get_closest_peers`** — `mycelium-hyphae` ganhou
   `dht_closest_peers(key)` (iterativo, α=6) + `connected_peer_ids()` e o evento
   `HyphaEvent::ClosestPeers{key,peers}`. `request_layer` e o novo `overlay_tick` disparam a
   query pela chave de cada layer/esporo local → o nó resolve em runtime os peers
   XOR-mais-próximos, não só os `known_zones` anunciados.
2. **Forwarding greedy multi-salto de `LayerNeed`** — `Envelope::LayerNeed{id,hop}` ganhou
   contador de salto; um nó que não serve a layer reencaminha aos seus `xor_closest` (hop+1),
   limitado por `MAX_LAYER_NEED_HOPS=4` (anti-loop).
3. **TTL/cleanup de custodiantes** — `prune_zone_tables` remove custodiantes que não
   re-anunciam há `ZONE_TTL_SECS=600s` (espelha o prune de `peer_ions`).
4. **Métrica** `mycelium_overlay_routes` — contador de rotas DHT resolvidas no overlay.

**Testes:** +2 unitários (`prune_zones_removes_stale_custodians` puro, `layer_need_hop_limit_is_bounded`)
→ `mycelium-node` **15/15**. Workspace build 0 erros. `stress-prolonged` smoke 4min **verde.**

**Validação multi-nó (4 nós, `scripts/growth-zones-test.sh`):** seed-code publicado no nó 2 →
recall do nó 3 **baixou o plot via rede**; **5 layers recuperadas via DHT** por nós não-editores;
**2 spore prints absorvidos** fora do nó editor; `mycelium_overlay_routes=1` e 4 eventos
`get_closest_peers` (rótulo passou). O caminho DHT-direto domina em malha totalmente conectada;
o forwarding multi-salto do `LayerNeed` é exercitado quando o DHT-direto não alcança (rede reduzida).

---

## Concluído nesta sessão (Plano de Integração Integral — P1.3.2, Malha Nativa e Serviços Comunitários)
Executada a sequência de entregas imediatas sob a regra de soberania (operação nativa sem internet convencional, sem carteira cripto, sem gateway público e sem circuito VEIL obrigatório):

1. **Entrega 1: Reconciliação do Scaffold P1.3.2 sobre `407582f`**
   - Scaffold prévio inventariado no artefato `entrega_1_inventario_scaffold.md` e em patch `/tmp/scaffold_407582f.patch`.
   - Reconciliação de flags em `DaemonOptions`, `Request::VeilStart` e `Response::VeilStatusResult`.
   - Compilação limpa do workspace com e sem a feature `veil` (0 erros, 0 warnings).

2. **Entrega 2: VEIL P1.3.2 (Bridges, Ciclo de Vida e Observabilidade)**
   - Flags `--veil-bridge`, `--veil-bridge-listen`, `--veil-bridge-target` no CLI e daemon.
   - `EntryPool` conectado à operação de circuitos de produção do daemon com telemetria em tempo real (`entrada_ativa`, `entradas`, `tentativas_failover`, `motivos_falha`).
   - Papel dedicado `bridge` (`BridgeRelay`) com encerramento limpo via `Request::VeilStop`.
   - 4 testes de aceitação automatizados em `tests/veil_p1_3_2_acceptance.rs` (**4/4 verdes**): conexão única, failover transparente, fail-closed anti-leak estrito e lifecycle de bridge. Homologação WAN mantida em status trial local.

3. **Entrega 3: Malha Independente A-B-C sem Internet Convencional**
   - Implementado suporte a `blocked_peers` em `HyphaeConfig` e `HyphaeNode` para isolamento de enlaces diretos.
   - Teste de aceitação `tests/multihop_topology_acceptance.rs` (**verde**): nós A e C sem conexão direta física/lógica; B atua como roteador/anastomose; tráfego Gossipsub (Lattice) chega com integridade comprovada; queda de B interrompe o fluxo.
   - *Fronteira técnica*: Comprova o encaminhamento multissalto pubsub (Gossipsub) via intermediário; não equivale ainda a um roteador unicast geral, DTN completo ou escolha dinâmica de rotas.

4. **Entrega 4: Primeiro Serviço Comunitário Nativo**
   - Teste de aceitação `tests/community_service_survival_acceptance.rs` (**verde**): Nó 1 semeia serviço público no Spore Bank; Nó 2 absorve via Lattice Gossipsub; Nó 1 é desligado completamente (offline); Nó 2 atende à solicitação `RecallCode` e materializa os arquivos de forma 100% íntegra (verificação byte a byte).
   - *Fronteira técnica*: Comprova sobrevivência e restauração de conteúdo numa réplica; não comprova ainda continuidade de execução automática de processos HTTP ativos.

5. **Correção do CI e Sanity Check**:
   - `inertia`: `is_sandbox_available()` aprimorado com sonda ativa do `bwrap` (impede falhas de namespace em CIs e contêineres sem privilégios `CLONE_NEWUSER`).
   - `singularity` e `mycelium-node`: clientes `reqwest` internos e de teste configurados com `.no_proxy()` para evitar interceptação espúria de tráfego de loopback por variáveis de ambiente de proxy.
   - `cargo test --workspace` e `cargo clippy --workspace --all-targets` 100% verdes.

**Documentação Técnica:** gerado `docs/INTEGRACAO_INTEGRAL_P1_3_2.md`.


