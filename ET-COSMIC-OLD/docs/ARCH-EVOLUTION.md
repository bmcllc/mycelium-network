# Architecture Evolution Guide — ET-COSMIC

> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 2–3** — monorepo e camadas

This document serves as the guide for the architecture of the unified **ET-COSMIC** workspace. It outlines the transition from separate repositories into a single unified monorepo, describes the layout of the components, explains execution flows, and provides integration guidance.

---

## 1. Context of the Merger

Previously, the project was split into:
1. **`ET-RNET`**: The frontend-focused repository containing the React PWA, Express server, Capacitor project, Solidity contracts, and Python quantum backend.
2. **`VOID-COSMIC_VPS`**: The execution-focused repository containing the native Rust WASM executor (`void-runner`), the TypeScript SDK wrapper (`eternet_ts`), and the cryptographic library (`void_core`).

This split introduced significant friction:
- **Duplicate Codebase (`void_core`)**: Both repositories contained a copy of `void_core`. The version in `VOID-COSMIC_VPS` was more advanced, incorporating Post-Quantum Cryptography (PQC), Shamir-sharded fragmentation (QEL), and Anti-Sybil Proof-of-Work mechanisms.
- **Broken Pathing**: Relative paths and cross-directory symbolic links (e.g. `pmu-base` and `quantum`) broke easily when repositories were shifted.
- **Developer Overhead**: Multiple server environments, different Node modules, and fragmented build sequences.

### The Solution: Unified ET-COSMIC Monorepo
By merging all elements into the workspace root `/home/bruno/Documentos/ET-COSMIC`, we have achieved:
- A single source of truth for the Rust WASM package (`void_core`).
- Direct root-level folders, rendering symlinks completely obsolete.
- A centralized dependency chain (`package.json`) and a single Rust workspace (`Cargo.toml`).
- Consolidated documentation: deploy em [`DOC/`](../DOC/), B2B em [`docs/`](../docs/). **Arquivo teoria**, **guias** e **PDFs de especificação** são **só locais** (`.gitignore`) — ver índices em [`docs/archive/README.md`](./archive/README.md), [`docs/guides/README.md`](./guides/README.md), [`docs/specifications/README.md`](./specifications/README.md).
- B2B product catalog (all modules mapped, no exclusions): [`B2B-PRODUCT-LINES.md`](./B2B-PRODUCT-LINES.md).
- B2B white-label builds: `VITE_B2B_SKUS` → `skuManifest.ts` + `virtual:b2b-panel-loaders` (painéis) + `__B2B_SLIM_SHELL__` (exclui marketing/NativeBridge do entry). Build 1 painel (`VOID-54`): main chunk ~244 kB (gzip ~76 kB). CLI: `b2b:list`, `b2b:check`, `build:b2b:*`.

---

## 2. Core Modules and Layers

The unified codebase is structured around a 7-layer architecture plus a computational runtime:

```
┌────────────────────────────────────────────────────────┐
│             LAYER 7: React PWA / Android UI            │
│                 (src/, android/, server/)              │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│           LAYER 6: TS SDK / Protocol Wrapper           │
│                 (eternet_ts/ @eternet/core)            │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌───────────────────────────┼────────────────────────────┐
│                           │                            │
▼                           ▼                            ▼
┌─────────────────┐ ┌───────────────┐ ┌──────────────────┐
│ Rust WASM Core  │ │ WASM Runner   │ │ Python CQR       │
│  (void_core/)   │ │(void_runner/) │ │ (quantum/)       │
└─────────────────┘ └───────────────┘ └──────────────────┘
```

### Key Components

1. **WASM Core (`void_core`)**: Written in Rust, compiles to WASM for browser and Node execution. Contains high-performance crypto:
   - ML-KEM-1024 / ML-DSA-87 (post-quantum key exchange and signing).
   - ChaCha20-Poly1305 + Shamir Secret Sharing (QEL fragmentation).
   - Bulletproofs range proofs and Pedersen commitments (UTXO confidential transactions).
   - Blake3 and SHA3 hashing algorithms.

2. **WASM Executor (`void_runner`)**: Native Rust CLI compiled for the host. Loads WASM binaries (like `pi_worker.wasm`) into a secure `wasmtime` environment to execute zero-knowledge or heavy-computation tasks. Supports MapReduce splitting.

3. **TS SDK (`eternet_ts`)**: Wraps the compiled WASM core and exposes high-level modules for the React App and third-party tools like `RE-trolab`. Distributed as `@eternet/core`.

4. **Quantum Backend (`quantum`)** — *legado / pesquisa*: simulação tensorial (`quimb`), BB84; **não** é hardware quântico. Em produção soberana, preferir **ETERNET** (`src/eternet/`, `server/eternet/`).

5. **ETERNET Core (`src/eternet/`)**: entropia e orquestração unificada — **Bruno Theory** (`src/theory/`) + **LUSUS** (`server/lusus/`, clássico avançado) + CSPRNG. Ver vault Obsidian: [`docs/obsidian/`](./obsidian/README.md).

6. **Solidity Contracts (`contracts`)**: Implements `ETRNETAnchor.sol` to record commitments (hashes) on Ethereum-compatible networks (defaulting to Sepolia), securing state transitions of the local PMU state.

### 2.1 ETERNET stack (2026)

```
UI → src/eternet → Bruno Theory + lususClient + void_core
              ↘ server/eternet + server/lusus (edge)
```

`VITE_ETERNET_ENGINE=legacy` restaura a cadeia CQR/Python antiga em `generateQuantumEntropyWithFallback`.

---

## 3. Key Workflows

### Execution Flow (Remote Computational Workloads)

When a client submits a task (e.g. MapReduce Pi calculation) to the network:
1. **Client** publishes a task request via **NOSTR** (Kind `31222`).
2. An **Animus Worker** (`VoidAnimusWorker`) receives the event.
3. The worker downloads the WASM code and calls the native **`void-runner`** binary.
4. **`void-runner`** executes the WASM workload in a secure sandbox, using the local host's cryptographic entropy.
5. The result is returned to the worker, which publishes the result back to **NOSTR** (Kind `31223`).
6. The client picks up the result event and resolves the task.

### Auditor Flow (PMU State Verification)

1. The quantum engine and local nodes write state pulses (`pulses.jsonl`) to `/void_pool/`.
2. The auditor (`scripts/pmu-audit.mjs`) reads the logs, verifies the chronological hashes, and checks alignment with the state stored on Sepolia via the `ETRNETAnchor` smart contract.

---

## 4. Integration Guidelines for RE-trolab

For the code server and emulators in `RE-trolab` to consume the updated TS SDK `@eternet/core`:
- Update the path reference in `RE-trolab/package.json` to point directly to the new unified path:
  ```json
  "@eternet/core": "file:/home/bruno/Documentos/ET-COSMIC/eternet_ts"
  ```
- Re-run `npm install` inside the `RE-trolab` directory.
- The compiled WASM module and typescript build output can be built using:
  ```bash
  cd /home/bruno/Documentos/ET-COSMIC
  npm run build:wasm
  npm run eternet:build
  ```
