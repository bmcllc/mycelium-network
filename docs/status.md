# Status do Substrato

## Build
```bash
cargo build               → 0 warnings, 0 erros
cargo test                → 112 passed (default features)
cargo test --all-features → 115 passed (com pqc-transport)
```

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

### O que ainda NÃO foi testado
| Item | Status | Por que |
|------|--------|--------|
| PQC em conexão real | ✅ | Transport trait implementado: TCP+KEM+Noise+Yamux com `with_other_transport` |
| Estresse prolongado (1h+) | ❌ | Só ~5min com 3 nós. Rode: `bash scripts/stress-test.sh 60 5` |
| Growth Zones runtime | ✅ | `ZoneAnnounce` replicado entre 5 nós. `mycelium zones` mostra prefixos |
| CandidateRelay casa↔5G | 🟡 | Protocolo testado local. Entre redes reais não rodou |
| Plasma reativo em rede real | ✅ | Ciclo completo entre 2 nós (scripts/scaling-demo.sh). Falta escalar para >2 nós e redes distintas |

### Próximos passos sugeridos
- **Estresse prolongado** (1h+, 5 nós) com auto-scaling + vouchers ativos
- **Growth Zones** com DHT overlay (distance XOR routing)
- **Prometheus alerts** em produção (alertmanager + webhook do seed book)
