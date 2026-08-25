> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Transversal** — nomenclatura honesta (obrigatório)

# Sabor «Quântico» — não é quântico

> **Regra de ouro:** o ecossistema **não executa computação quântica real**. O que existe é **sabor «Quântico»** — vocabulário, metáforas e UX inspirados em QI (tensor, colapso, geodésica, Bell…) sobre **motores 100 % clássicos**.

Isto **não** confunde com **PQC** (ML-KEM, ML-DSA): criptografia pós-quântica é real e independente do «sabor».

## Estado actual (honesto)

| Componente | Realidade |
|------------|-----------|
| Motores «quânticos» (ex-`quantum/`) | **Clássicos** — hoje em `core/` + `server/lusus/` + `server/aqre/` |
| `quantumBridge.ts` | Nome legado; delega a `generateEternetEntropy()` quando `VITE_ETERNET_ENGINE≠legacy` |
| AQRE / LUSUS / QRC | Simulação coerente + limites anacróclastas — **sabor «Quântico»**, não qubits |
| Whitepaper | v2.0 IMC — abstract honesto (“without quantum hardware”) |

## Política de linguagem

1. **UI/docs:** preferir *computação avançada*, *coerência clássica*, *sabor «Quântico»* — nunca *quântico real*.
2. **Produção:** `VITE_ETERNET_ENGINE=hybrid` (default) — entropia ETERNET (Bruno + LUSUS + dispositivo).
3. **Pesquisa:** FastAPI `:8472` opcional (`/quantum/entropy`, …) com banner `simulation: true`.
4. **GhostID:** `generateEternetEntropy` via fallback chain (`src/eternet/entropy.ts`).

## Migração de nomenclatura

| Antigo (hype) | Novo (honesto) |
|---------------|----------------|
| Quantum Harmonia | ETERNET Harmonia |
| CQR «real» | CQR legado / pesquisa (sabor «Quântico») |
| Entropia quântica | Entropia ETERNET (Bruno+LUSUS+device) |
| Menu «Quântico» | Hubs `compute` / `lab` — *computação avançada* |
| IMC v2 / Isossupra UI | **VOID Sovereign Stack** (BRIDGE·PCI·MESH) |
| `/compute/imc` | `/compute/void-stack` (alias legado) |
| `/quantum/lusus` | `/lab/lusus` |

## Código legado (nomes, não física)

- `generateQuantumEntropy()` — API legada; material clássico
- `quantumBridge.ts` — 500+ testes; renomear mentalmente para *sabor «Quântico» bridge*
- Plugins Lua PMU — histórico em git/archive

## Checklist whitepaper v1.3 → v2.0

- [x] `get_h_generator()` ≠ IETF G — `void_core/src/lib.rs`
- [x] Rotação 30 min — **roadmap**; implementado MAC 5s (`ghostvpn.ts`); whitepaper.tex honesto
- [x] Secção LUSUS + Bruno Theory — `docs/whitepaper-v2.0.md`, `src/eternet/`
- [x] Abstract sem “true quantum computing” — `whitepaper.tex` v2.0 IMC
