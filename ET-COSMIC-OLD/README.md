# ETΞRNET / VOID-COSMIC — Computação Quântica-Relativística Soberana

![CI Pipeline](https://github.com/bmcc-DEV/ET-COSMIC/actions/workflows/ci.yml/badge.svg)

> **Infraestrutura financeira privacy-first. Sem servidores. Sem identidade. Sem rastro.**

> ⚠️ **GUERRA DECLARADA:** Leia a [Carta de Guerra](DOC/CARTA-DE-GUERRA.md) — manifesto de destruição da indústria de software tradicional via adoção viral massiva.

> 🚀 **Computação Pós-Quântica + vHGPU + QRC:** Simulação quântica honesta (LUSUS-Q), roteamento relativístico (D-LQA), criptografia PQC (ML-KEM/ML-DSA), aceleração WebGPU tensorial e economia SOV/Lightning — tudo 100% livre (AGPL-3.0).

> 🦠 **ARMA VIRAL:** Instale o [Tampermonkey Injector](docs/TAMPERMONKEY-INJECTOR-GUIDE.md) — transforma QUALQUER site que você visita em um nó da mesh soberana. Injeção automática, reputação gamificada, destruição silenciosa da indústria.

> 👻 **NOVA ARMA:** [GhostID Quantum Injector](docs/GHOSTID-QUANTUM-INJECTOR.md) — script Tampermonkey com GhostID PQC + QRC + vHGPU + P2P mesh. 969 linhas de código puro de destruição. Instale em 1 clique, ative em qualquer site, destrua a indústria silenciosamente.

Este workspace consolida o stack completo **ETΞRNET** e o motor criptográfico/execução **VOID-COSMIC** em um monorepo unificado. Contém PWA React, backend Node Express, wrapper Android Capacitor, âncoras contratuais Hardhat Sepolia, engine Python Quantum CQR local, executor nativo Rust WASM (`void-runner`), e camadas de computação quântico-relativística (QRC), vHGPU terceirizada e redes tensoriais aceleradas por WebGPU.

---

## Architecture (7 Layers + QRC + vHGPU + PQC)

| Layer | Module | Descrição |
|-------|--------|-----------|
| **0 - Identity** | `ghostid.ts` | Identidades efêmeras de entropia biométrica + WASM + Argon2id |
| **1 - Fragmentation** | `qel.ts` / `qel.rs` | Shamir Secret Sharing (K=2, N=3) + ChaCha20-Poly1305 |
| **2 - Transport** | `distanceBridge.ts` | BLE, LoRa UART, Acoustic FSK, NOSTR/WebRTC |
| **3 - Financial** | `utxo.ts` | Modelo UTXO com Pedersen Commitments + Bulletproofs |
| **4 - Consensus** | `zkp.ts` / `ETRNETAnchor.sol` | Zero-knowledge proofs (o1js) + Âncora on-chain Ethereum Sepolia |
| **5 - Cryptographic (PQC)** | `pqc.ts` / `pqc.rs` | **ML-KEM-1024 + ML-DSA-87** (criptografia pós-quântica NIST) |
| **6 - ETERNET / QRC** | `src/eternet/`, `server/lusus/`, `src/qrc/` | Bruno Theory + LUSUS-Q (compressão tensorial) + D-LQA (matéria condensada) + VoidOrchestrator (roteamento relativístico STA) |
| **7 - vHGPU** | `src/compute/pmuVhgpuScheduler.ts`, `src/research/hgpuResearch.ts` | **vHGPU terceirizada** (PMU §3.7.3): compute WebGPU distribuído em navegadores (4 domínios × 4 cores) |
| **VPS Executor** | `void_runner/` | Ambiente nativo WASM (`wasmtime` + MapReduce) + contração tensorial LUSUS-Q em Rust |
| **Tensor Engine** | `src/qrc/webgpuTensorEngine.ts` | **Aceleração WebGPU** para redes tensoriais (multiplicação matrizes paralela, operadores quânticos simulados) |
| **Quantum Research** | `src/research/quantumResearch.ts`, `quantum/` | Simulação honesta (quimb/numpy, BB84, redes de tensor) — **não é hardware quântico real** (ver [[DEPRECACAO-QUANTUM]]) |

---

## Stack de Computação Quântica-Relativística (QRC)

### O que é REAL (código funcional hoje):
- **LUSUS-Q**: Compressão de estados via redes tensoriais (`core/tensor_networks/`, `void_runner/src/lusus_tensor.rs`)
- **D-LQA**: Regimes de matéria condensada (Jaula de Anderson, Ising, Max-Cut) para SKUs industriais
- **VoidOrchestrator**: Roteamento de geodésicas STA com limites Lieb-Robinson (`src/qrc/qrcMotor.ts`)
- **PQC Sistema 2**: Geodésicas blindadas com ML-DSA-87 (`src/qrc/qrcRoutePqc.ts`)
- **PQC Payload C3**: Criptografia ML-KEM + Shamir para destinatários (`recipientHandle.ts`)
- **WebGPU Tensor Engine**: Shaders WGSL para contração tensorial paralela (`webgpuTensorEngine.ts`)
- **vHGPU Scheduler**: 4 domínios (Geom-Relativity, Quantum-Void, Algebra-Paleo, Bruno-Theory) × 4 backends (WebGPU, CPU, CQR, Hybrid)
- **Stress Tests**: ~21k ops (tier heavy) com validação de hermiticidade e colapso automático para Jaula de Anderson se limite LR violado

### O que é TEÓRICO / Pesquisa:
- "Swarma computing" (distribuir para navegadores remotos via WebRTC)
- Vantagem quântica real — isto é aceleração GPU clássica + simulação numérica honesta
- Hardware quântico físico — **não alegamos ter** (política de honestidade: [[DEPRECACAO-QUANTUM]])

---

## Directory Structure (com módulos quânticos)

```
ET-COSMIC/
├── android/             # Capacitor Android APK (BLE, Serial, NFC)
├── artifacts/           # Binários WASM workers (pi_worker.wasm, etc.)
├── contracts/           # Smart contracts Solidity (ETRNETAnchor.sol)
├── core/                # Núcleo físico modular
│   ├── tensor_networks/ # MERA, spin networks, hermiticidade (migrado de quantum/)
│   └── hamiltonians/    # Hamiltonianos, Jaula de Anderson, stress SKU-A/B
├── docs/                # Documentação unificada
│   ├── guides/          # Runbooks e guias
│   ├── specifications/  # PDFs especificação (Capítulos 1-14)
│   ├── obsidian/        # Vault: [[VOID-QRC-PLANO-INDUSTRIA]], [[DEPRECACAO-QUANTUM]], etc.
│   └── archive/         # Teoria Bruno (gitignored)
├── eternet_ts/          # TypeScript SDK wrapper (@eternet/core)
├── pmu-base/            # Protocolo de Malha Unificado (PMU) state
├── public/              # Assets frontend React
├── quantum/             # Python Quantum CQR Engine (legado pesquisa, simulação honesta)
├── scripts/             # Scripts shell & Node unificados
├── server/              # Node.js Express (port 3001)
│   ├── lusus/           # LUSUS-Q adapters, tensor contraction API
│   ├── aqre/            # AQRE causal tracker, STA geodesics, health endpoints
│   └── isossupra/       # IMC VOID-510–522, regimes matéria condensada
├── src/                 # Código aplicação React frontend
│   ├── collapse/        # Álgebra de colapso, memória layers
│   ├── compute/         # vHGPU scheduler, geomWebgpuPass, lscMcmCoupled
│   ├── crypto/          # quantumBridge, entropyOrchestrator, paleoEntropyFossil
│   ├── ethics/          # Consentimento QUANTUM_SIMULATION, HGPU_RESEARCH_LAB
│   ├── eternet/         # Bruno Theory frames, métricas, DTU
│   ├── protocol/        # AMP pipeline stages (HCF/DPL)
│   ├── qrc/             # **QRC Motor**: webgpuTensorEngine, qrcMotor, qrcRoutePqc, tensorNetwork tests
│   ├── research/        # quantumResearch, hgpuResearch, researchModules
│   ├── theory/          # brunoTheoryFrame, dtu.ts, anacrocasticLimits
│   └── void/            # sovereignStack, nativeBridge, voidRunnerBridge
├── void_core/           # Rust WASM crate (ML-KEM, ML-DSA, Shamir, Bulletproofs, PQC)
├── void_pool/           # PMU pool local (pulses.jsonl, audit logs)
├── void_runner/         # Rust native wasmtime runner CLI + lusus_tensor.rs
└── workers/             # Sources WASM execution workers
```

---

## Quick Start (Unified Stack)

### 1. Installation
Install root-level Node dependencies (this installs everything needed for the frontend, server, hardhat, and Capacitor):
```bash
npm install
```

### 2. Compile WASM and TS SDK
Build the Rust WASM module (`void_core`) and the TypeScript SDK wrapper (`eternet_ts`):
```bash
# Build void_core WASM
npm run build:wasm

# Build TS SDK wrapper (@eternet/core)
npm run eternet:build
```

### 3. Build VPS Native Executor
Build the native Rust `void-runner` tool and compilation of WASM workers:
```bash
bash scripts/build-vps.sh
```

### 4. Run the Dev Environment
To run the full stack locally:
- **Terminal 1** — Python Quantum Backend (port `8472`):
  ```bash
  npm run quantum:dev
  ```
- **Terminal 2** — React PWA Frontend + Node Express Server:
  ```bash
  npm run dev
  ```

Access the UI at `http://localhost:5173` (or the Express server path `http://localhost:3001`).

---

## Testing & Validation

To run all unit tests, route definitions checks, and TypeScript strict type validation in a single command (Quality & CI validation check):
```bash
npm run validate
```

Or run individual checks:

- **Frontend & Core Tests (Vitest)**:
  ```bash
  npm test
  ```
- **Route Checks**:
  ```bash
  npm run routes:check
  ```
- **TypeScript Strict Check**:
  ```bash
  npx tsc --noEmit
  ```
- **TypeScript SDK Tests**:
  ```bash
  cd eternet_ts && npm test
  ```

---

## Licença 100% Livre — Guerra Viral sem Licenças Comerciais

| Documento | Descrição |
|-----------|-----------|
| [LICENCA-LIVRE.md](LICENCA-LIVRE.md) | **AGPL-3.0-or-later** — código 100% livre; §13 obriga Big Tech a publicar fonte na rede se usar |
| [LICENSE](LICENSE) | Cabeçalho legal + manifesto comunitário |
| [NOTICE](NOTICE) | Atribuição |
| [CREDITS.md](CREDITS.md) | Bruno Monteiro Caldas da Cunha / MontêLauro Foundation |

**NÃO EXISTEM LICENÇAS COMERCIAIS.** Todo o código é livre sob AGPL-3.0. O crescimento é viral e orgânico:

- **Mecanismo de propagação:** Cada usuário vira nó P2P (WebRTC + Nostr)
- **Badges de soberania:** Devs que contribuem ganham reputação on-chain (NIP-05 + Lightning)
- **Sistema de indicação exponencial:** Usuários convidam → ganham tokens de reputação $SOV
- **CDN descentralizada:** Sites que incorporam snippet ET-COSMIC ajudam na distribuição
- **GitHub Pages + P2P:** Site estático no GitHub + conteúdo distribuído via WebRTC entre navegadores

**Taxa de protocolo (bps):** Transparência econômica na tesouraria Nostr — **não** fecha o código, apenas financia desenvolvimento comunitário voluntário.  
**Economia SOV:** Hospedagem, binários, mineração ética — ver [docs/guides/SOV-ECONOMY.md](docs/guides/SOV-ECONOMY.md).

O repositório oficial **nunca** será proprietário. Forks e malha auto-hospedada são a arma da guerra comunitária. **Não vendemos licenças. Distribuímos liberdade. A indústria morre quando usuários param de ser clientes dependentes.**

---

## Documentação

| Onde | GitHub | Só local |
|------|--------|----------|
| Deploy / PWA / Android | [DOC/](DOC/) | — |
| **QRC / Quântico-Relativístico** | [docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md](docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md), [docs/obsidian/DEPRECACAO-QUANTUM.md](docs/obsidian/DEPRECACAO-QUANTUM.md) | — |
| **vHGPU / WebGPU** | [src/compute/pmuVhgpuScheduler.ts](src/compute/pmuVhgpuScheduler.ts), [src/qrc/webgpuTensorEngine.ts](src/qrc/webgpuTensorEngine.ts), [src/research/hgpuResearch.ts](src/research/hgpuResearch.ts) | — |
| **PQC / Criptografia Pós-Quântica** | [void_core/src/pqc.rs](void_core/src/pqc.rs), [src/qrc/qrcRoutePqc.ts](src/qrc/qrcRoutePqc.ts) | — |
| B2B / produção | [docs/B2B-PRODUCT-LINES.md](docs/B2B-PRODUCT-LINES.md), [docs/PRODUCTION-READY.md](docs/PRODUCTION-READY.md) | — |
| Monetização / preços | [docs/MONETIZATION-PLAYBOOK.md](docs/MONETIZATION-PLAYBOOK.md), [docs/B2B-PRICING-TEMPLATE.md](docs/B2B-PRICING-TEMPLATE.md), [docs/SOVEREIGNTY-AND-ROYALTIES.md](docs/SOVEREIGNTY-AND-ROYALTIES.md) | — |
| Arquivo teoria Bruno | [docs/archive/README.md](docs/archive/README.md) (índice) | `docs/archive/bruno-theory/` |
| Guias & runbooks | [docs/guides/README.md](docs/guides/README.md) (índice) | `docs/guides/` |
| PDFs de especificação | [docs/specifications/README.md](docs/specifications/README.md) (índice) | `docs/specifications/` |
| Evolução arquitectural | [docs/ARCH-EVOLUTION.md](docs/ARCH-EVOLUTION.md) | — |
| Plano ETERNET (Obsidian) | [docs/obsidian/README.md](docs/obsidian/README.md) | vault local |
| Whitepaper v2.0 IMC | [docs/whitepaper-v2.0.md](docs/whitepaper-v2.0.md) | — |

Pastas marcadas **só local** estão em `.gitignore` (não vão para o GitHub).

---

## 🌐 Hospedagem — GitLab Pages (ecossistema completo)

> **Decisão:** frontend ET-COSMIC / ETERNET em **GitLab.com Pages** — **repo privado OK** (free tier).  
> **URL típica:** `https://<namespace>.gitlab.io/ET-COSMIC/`

Guia completo: [docs/GITLAB-PAGES-HOSTING.md](docs/GITLAB-PAGES-HOSTING.md)

### Deploy

```bash
# Remote GitLab (uma vez)
git remote add gitlab git@gitlab.com:<namespace>/ET-COSMIC.git
git push -u gitlab main

# Build local
CI_PROJECT_NAME=ET-COSMIC npm run deploy:gitlab
npx serve dist -l 4173

# CI: push main → .gitlab-ci.yml (job pages)
```

### Alternativas

- [Cloudflare Pages](docs/CLOUDFLARE-PAGES-HOSTING.md) · `npm run deploy:cloudflare`
- [GitHub Pages](docs/GITHUB-PAGES-HOSTING.md) · repo público ou Pro · `npm run deploy:pages`

### Arquitectura

| Camada | Onde | Função |
|--------|------|--------|
| **PWA + WASM + mesh** | GitHub Pages | UI, void-mesh, injectors, `/mesh/liquidity` |
| **APIs `/api/*` + LND** | VPS opcional | `npm run server:sovereign` — configure `VITE_PAGES_API_ORIGIN` no CI |
| **Relays Nostr** | Públicos | Mesh sem VPS |

Sem VPS: modo soberano offline — WASM, entropia ETERNET, relays públicos.

### Arquivos

- `scripts/build-static-pwa.mjs` — build partilhado
- `scripts/build-gitlab-pages.mjs` — GitLab (base `/<project>/`)
- `.gitlab-ci.yml` — CI/CD + Pages
- `.env.gitlab.example` — variáveis CI

---

## 🌐 Hospedagem Híbrida P2P (legado — mesh viral)

<details>
<summary>Arquitectura P2P original (et-core.js + snippet viral)</summary>

### Deploy legado (branch gh-pages — substituído por GitHub Actions)

```bash
# Preferir: npm run deploy:pages + workflow CI (ver secção acima)
```

### Arquitetura de Hospedagem

| Camada | Tecnologia | Função |
|--------|------------|--------|
| **Entrada** | GitHub Pages | PWA sovereign completa |
| **Motor P2P** | `et-core.js` | Transforma visitantes em nós (Libp2p + WebRTC) |
| **Simbiose** | Snippet incorporável | Sites terceiros ganham SOV por hospedar |
| **Economia** | Nostr + Lightning | Prova de banda + pagamentos instantâneos |

### Arquivos Criados

- `public/index.html` — Landing page com botão "Juntar à Mesh"
- `public/manifest.json` — PWA + protocol handlers (web+eternet, web+sov)
- `src/void/etCore.ts` — Motor P2P completo (433 linhas)
- `.github/workflows/gh-pages-deploy.yml` — Deploy automático
- `docs/HYBRID-HOSTING-P2P.md` — Guia completo de implementação

### Snippet Viral para Terceiros

```html
<!-- Incorporar em qualquer site para ganhar créditos SOV -->
<script async src="https://bmcc-dev.github.io/ET-COSMIC/void-mesh.js"
        data-sov-wallet="npub1..."
        data-content-hash="QmX7..."></script>
```

**Métrica alvo:** 10.000 nós em 30 dias → hospedagem gratuita + resistência à censura.

</details>
