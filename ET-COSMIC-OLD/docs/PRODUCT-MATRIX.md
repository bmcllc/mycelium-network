# ET-COSMIC Product Matrix

Matriz completa de SKU → Produto. Cada um dos 283 SKUs pertence a exatamente 1 produto.

## Arquitetura de Produtos

```
┌─────────────────────────────────────────────────────────────────┐
│                    FULL-ENTERPRISE (bundle)                      │
├─────────────────────────────────────────────────────────────────┤
│  PMU Gov  │  QRC Lab  │  VOID Stack  │  IMC/Isossupra          │
├───────────┼───────────┼──────────────┼──────────────────────────┤
│  Lightning│  PQC Svc  │  Sov Economy │  AQRE    │  LUSUS       │
├───────────┴───────────┴──────────────┴──────────┴──────────────┤
│                      Core SDK (base)                            │
└─────────────────────────────────────────────────────────────────┘
```

## Produtos

### 1. Core SDK (VOID-00…VOID-0D, VOID-20…VOID-21)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-00 | Core WASM | infra |
| VOID-01 | SDK TypeScript | infra |
| VOID-0A | Crypto Primitives | infra |
| VOID-0D | Storage Layer | infra |
| VOID-20 | ZKP | route |
| VOID-21 | GhostID | route |

### 2. LUSUS Engine (VOID-76…VOID-80)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-76 | Entropy Provider | infra |
| VOID-77 | Cavity-Planck | route |
| VOID-78 | Vortex Memory | route |
| VOID-79 | Thomas-Fermi | route |
| VOID-80 | LUSUS Core | route |

### 3. AQRE Engine (VOID-70…VOID-74)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-70 | LSC Engine | route |
| VOID-71 | QRC Topology | route |
| VOID-72 | Paleo | route |
| VOID-73 | Collapse Algebra | route |
| VOID-74 | Anacroclastia | route |

### 4. Sovereign Economy (VOID-520, VOID-703…VOID-710)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-520 | Marketplace | route |
| VOID-703 | Binary Bazaar | service |
| VOID-704 | Hosting Revenue | service |
| VOID-705 | Ethical Mining | service |
| VOID-710 | SOV Ledger | route |

### 5. VOID Sovereign Stack (VOID-511…VOID-512, VOID-700…VOID-702, VOID-721)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-511 | Bridge | route |
| VOID-512 | PCI | route |
| VOID-700 | Silent Mesh | service |
| VOID-701 | Mesh CDN | service |
| VOID-702 | Web Node Manager | service |
| VOID-721 | Mesh Liquidity | route |

### 6. IMC / Isossupra Compute (VOID-510…VOID-522, VOID-600)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-510 | Sensor Entropy Mesh | route |
| VOID-513 | Ising Mesh | route |
| VOID-514 | Acoustic Room | route |
| VOID-515 | Chaos Mesh | route |
| VOID-516 | TF Distributed | route |
| VOID-517 | Compute Marketplace | route |
| VOID-518 | EaaS | route |
| VOID-519 | ZK Aggregate | route |
| VOID-521 | IMC Adaptation | route |
| VOID-522 | IMC Arsenal | route |
| VOID-600 | IMC Core / Isossupra | route |

### 7. PQC-as-a-Service (VOID-22…VOID-23)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-22 | ML-KEM-1024 | route |
| VOID-23 | ML-DSA-87 + CQR-PQC | route |

### 8. Lightning / Payment Gateway (VOID-05…VOID-06, VOID-37, VOID-113)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-05 | LND Bridge | infra |
| VOID-06 | PMU Roadmap | infra |
| VOID-37 | Payment Gateway | route |
| VOID-113 | Watchtower | route |

### 9. QRC Lab (VOID-09, VOID-54…VOID-61)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-09 | Theory Archive | infra |
| VOID-54 | Bruno Theory | route |
| VOID-55 | FURC | route |
| VOID-56 | HMCO | route |
| VOID-57 | Cosmic Harmony | route |
| VOID-58 | PMU Truth | route |
| VOID-59 | PMU Roadmap | route |
| VOID-60 | Omega | route |
| VOID-61 | HGPU Compute | route |

### 10. PMU Governance (VOID-90…VOID-97, VOID-103)
| SKU | Nome | Tipo |
|-----|------|------|
| VOID-90 | DAO | route |
| VOID-91 | Anti-Sybil | route |
| VOID-92 | Double-Spend | route |
| VOID-93 | Temporal Oracle | route |
| VOID-94 | Social Recovery | route |
| VOID-95 | Consent | route |
| VOID-96 | Sovereignty | route |
| VOID-97 | Governance Bundle | bundle |
| VOID-103 | Ghost Locker | route |

---

## SKUs Não Alocados (incluídos em bundles mas sem produto próprio)

Estes SKUs são vendidos como parte de bundles comerciais ou são infraestrutura auxiliar:

| SKU Range | Tipo | Descrição |
|-----------|------|-----------|
| VOID-02…VOID-03 | infra | Compute Worker, Entropy Appliance |
| VOID-07…VOID-08 | infra | Messenger Infra, Dashboard Shell |
| VOID-10…VOID-12 | route | Dashboard, Messenger, Harvester |
| VOID-13…VOID-18 | route | Onboarding, Badges, Social |
| VOID-24…VOID-25 | route | Testament, Karma |
| VOID-26 | bundle | Crypto Identity Bundle |
| VOID-30…VOID-36, VOID-38…VOID-39 | route/bundle | DEX, Chimera, Stablecoin, RWA, Pools, Janus, Finance Bundle |
| VOID-40…VOID-46 | route/bundle | Distance Bridge, Parasitic, EcoNet, Mesh, Acoustic, Supply Chain |
| VOID-50…VOID-53 | route | Mirage, HGPU, vHGPU, PMU-vHGPU |
| VOID-100…VOID-104 | route | Phantom Shopper, Aegis, Yield, Ghost Locker, Faucet |
| VOID-110…VOID-125 | route | Terminal: Active, Symbiont, Lua, Sphinx, Differential, GPU Mining, Homotopy, etc. |
| VOID-130…VOID-133 | service | Animus OS Preview |
| VOID-140…VOID-159 | service/bundle | Crypto Atomic modules |
| VOID-160…VOID-174 | service/bundle | AMP Protocol & Ethics |
| VOID-180…VOID-199 | service/bundle | Harvesters, VPS, GhostDock |
| VOID-200…VOID-205 | service/bundle | Storage, CRDT, Messaging |
| VOID-210…VOID-219 | service/bundle | Network Drivers |
| VOID-230…VOID-244 | service/bundle | Quantum Plugins |
| VOID-250…VOID-264 | service/bundle | Research, Omega, ZK |
| VOID-270…VOID-279 | service/bundle | Finance Engines |
| VOID-280…VOID-299 | service/bundle | Ops, CI, Certification |
| VOID-300…VOID-329 | service/bundle | Managed Services, White-label |

**Estratégia:** SKUs não alocados são vendidos via bundles comerciais (SOVEREIGN-CITIZEN, CRYPTO-LAB, FINANCE-NODE, etc.) ou como painéis individuais via `PANEL_LIST_EUR_YEAR`.

---

## Dependências entre Produtos

```
Core SDK ─────────────────────────────────────────┐
  ├─ PQC Service                                   │
  ├─ Lightning Payment                             │
  ├─ Sovereign Economy                             │
  ├─ PMU Governance                                │
  │                                                │
  └─ LUSUS Engine ──────────────────────────┐      │
       ├─ AQRE Engine                        │      │
       ├─ IMC/Isossupra                      │      │
       └─ QRC Lab                            │      │
                                             │      │
  VOID Stack ────────────────────────────────┘──────┘
```

## Bundles Comerciais → Produtos

| Bundle | Produtos Incluídos | EUR/Ano |
|--------|-------------------|---------|
| SOVEREIGN-CITIZEN | Core SDK + PMU Gov + QRC Lab (partial) | 89,000 |
| CRYPTO-LAB | Core SDK + PQC Service + PMU Gov (partial) | 198,000 |
| FINANCE-NODE | Core SDK + Lightning Payment | 245,000 |
| COMPUTE-WORKER | Core SDK + QRC Lab (partial) | 178,000 |
| GPU-ORCHESTRATION | QRC Lab + IMC/Isossupra (partial) | 212,000 |
| RESEARCH-INSTITUTE | AQRE + QRC Lab + LUSUS | 320,000 |
| PRIVACY-MAX | Core SDK (crypto modules) | 128,000 |
| MESSENGER-ENTERPRISE | Core SDK + PMU Gov (partial) | 165,000 |
| AMP-GOVERNANCE-PACK | PMU Gov (full) | 156,000 |
| QUANTUM-LAB-PACK | LUSUS + AQRE (partial) | 275,000 |
| FULL-ENTERPRISE | Todos os 10 produtos | 890,000 |
| WHITE-LABEL-OEM | Todos + white-label | 1,200,000 |
