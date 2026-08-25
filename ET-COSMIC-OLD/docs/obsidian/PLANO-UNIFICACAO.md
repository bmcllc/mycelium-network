> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Legado** — plano ETERNET paralelo (não substitui o principal)

# Plano de unificação — Fases 0–4

## Fase 0 — Honestidade ✅ (parcial)

- [x] Vault Obsidian (`docs/obsidian/`)
- [x] `src/eternet/` + `/api/eternet`
- [x] Whitepaper v2.0 markdown + abstract honesto (`docs/whitepaper-v2.0.md`, `whitepaper.tex`)
- [x] `docs/RISK-REGISTER.md` — 38 riscos consolidados

## Fase 1 — ETERNET Core ✅ (parcial)

- [x] `generateEternetEntropy()` — Bruno + LUSUS + CSPRNG
- [x] `generateQuantumEntropyWithFallback` delega quando `VITE_ETERNET_ENGINE≠legacy`
- [x] **Isossupramulação** — `server/isossupra/`, VOID-500–600, painel `/compute/isossupra` (legado) + `/compute/void-stack`
- [x] `entropyOrchestrator` tier `eternet_hybrid` — `src/crypto/entropyOrchestrator.ts`
- [x] GhostID: audit log fonte entropia — `src/crypto/ghostIdEntropyAudit.ts`

## Fase 2 — UI: sabor «Quântico» honesto (em curso)

- [x] Etiquetar hubs `compute` / `lab` como *computação avançada* / *lab avançado*
- [x] Default entropia: ETERNET via `quantumBridge.ts` quando engine≠legacy
- [x] Motores Python `quantum/` removidos; pesquisa opcional FastAPI `:8472` (sabor «Quântico» explícito)

## Fase 3 — Rotas e B2B (parcial)

- [x] SKU VOID-54 + VOID-500–600 no catálogo
- [ ] Painel `/eternet` dedicado — status via `/api/eternet/health` (sem painel UI único)
- [x] Contratos: `docs/SOVEREIGNTY-AND-ROYALTIES.md`

## Fase 4 — Mesh sem rede (roadmap)

- [ ] Nostr kinds 31222/31223 como transporte primário
- [ ] Sincronização LUSUS: semente via canal acordado
- [ ] Âncoras Sepolia opcionais (`contracts/`)

## Hospedagem — GitLab Pages ✅ (principal)

- [x] Build estático — `npm run deploy:gitlab` · `.gitlab-ci.yml`
- [x] Repo **privado** no GitLab.com (free tier)
- [x] SPA `404.html` · base `/${CI_PROJECT_NAME}/`
- [x] VPS opcional — `VITE_PAGES_API_ORIGIN`

## Hospedagem — alternativas

- [x] Cloudflare Pages — `npm run deploy:cloudflare`
- [x] GitHub Pages — `npm run deploy:pages` (repo público ou Pro)

## O que NÃO fazer de uma vez

- Mover `quantum/` para dentro de `void_core` — **já removido**; usar `core/`
- Apagar `quantumBridge.ts` (quebraria 500+ testes e integrações)
- Prometer violação Bell real

## Critérios de aceite Fase 1

```bash
npm test
curl -s http://localhost:3001/api/eternet/health
curl -s -X POST http://localhost:3001/api/eternet/entropy -H 'Content-Type: application/json' -d '{"bits":256}'
```

`entropy_hex` presente, `quantum_verified: false`, `sources` contém `bruno_theory` e/ou `lusus_chaos`.

---

> **Nota:** O plano industrial activo é [[VOID-QRC-PLANO-INDUSTRIA]] (Alpha Industrial ✅). Este documento permanece como referência **secundária** em paralelo.
