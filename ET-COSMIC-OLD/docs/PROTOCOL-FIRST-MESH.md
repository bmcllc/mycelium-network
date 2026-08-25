# Modelo de Negócio: **Protocol-First B2B Liquidity Mesh**

> **Filosofia:** Sem contratos, sem jurídico, sem vendas. Apenas código + incentivos económicos + prova criptográfica de valor.

**Estado no repo (2026-05):** MVP em `src/protocol/liquidity/`, painel `/mesh/liquidity`, API `/api/mesh/liquidity`. Smart contracts on-chain = roadmap.

**Hospedagem:** frontend em **GitLab Pages** (repo privado OK) — [GITLAB-PAGES-HOSTING.md](./GITLAB-PAGES-HOSTING.md). Alternativas: [Cloudflare](./CLOUDFLARE-PAGES-HOSTING.md) · [GitHub](./GITHUB-PAGES-HOSTING.md). APIs VPS via `VITE_PAGES_API_ORIGIN`.

---

## Conceito central: assinatura como prova de trabalho útil

Em vez de licenças anuais com contratos jurídicos:

1. Cliente paga por **acesso a recursos** (compute, storage, bandwidth, inferência)
2. Pagamento **distribuído automaticamente** para provedores da mesh
3. **Renovação automática** enquanto houver prova de uso válido
4. **Sem papel, sem negociação, sem SLA jurídico** — código + cryptoeconomia $SOV

---

## Mecanismo

### 1. DAT — Dynamic Access Token

Implementação TypeScript: `src/protocol/liquidity/datTypes.ts`

- `resourceId` — ex. `wasm-worker-001`
- `proofOfWork` — prova PMU / ML-DSA (stub → ZK roadmap)
- `paymentStreamMicro` — pay-per-use em µSOV
- `expiryBlock` — expira sem uso
- `reputationScore` — 0–100 → multiplicador de preço

### 2. Liquidity pools

| Pool | Recursos | Taxa protocolo |
|------|----------|----------------|
| `POOL-COMPUTE` | CPU/GPU/WASM | 2.5% |
| `POOL-STORAGE` | Anderson shards | 1.8% |
| `POOL-AI` | Inferência soberana | 3.2% |
| `POOL-QUANTUM` | LUSUS-Q / QRC (sabor «Quântico») | 4.5% |
| `POOL-IDENTITY` | GhostID efémero | 1.2% |

### 3. Preço por reputação (AMM)

```
preço_final = preço_base × multiplicador_reputação × fator_demanda
```

- Novato: 0.8× · Enterprise comprovado: 1.5× · Pico demanda: até 3.0×

---

## Monetização

### Camada 1 — Taxa protocolo

- `VITE_PROTOCOL_ROYALTY_BPS` (ex. 25 bps)
- Tesouraria: `VITE_ETRNET_TREASURY_NPUB`
- UI: `/governance/sovereignty`

### Camada 2 — Tiers auto-executáveis ($SOV/mês)

| Tier | SOV/mês | Rate limit |
|------|---------|------------|
| Citizen | 50 | 100 req/h |
| Builder | 250 | 1000 req/h |
| Enterprise | 2500 | ilimitado |
| Sovereign | 25000 | ilimitado + air-gap |

Saldo insuficiente → **downgrade automático**. Sem cobrança manual.

### Camada 3 — VAS on-demand

| SKU | Preço | Entrega |
|-----|-------|---------|
| VOID-305 | 0.5 SOV/min compute | Pipeline CI |
| VOID-306 | 25 SOV/build | APK MDM |
| VOID-308 | 100 SOV/audit | Relatório PMU |
| VOID-329 | 5000 SOV/deploy | OEM stack |

---

## Go-to-market

1. **Liquidity mining** — primeiros provedores, bonus rewards
2. **Developer-led** — GPL grátis → escala paga automática
3. **Enterprise gravity** — preço AMM + privacidade + compliance PMU on-chain

---

## Segurança sem contrato

- **SLA code-based** — `server/mesh/slaContract.js` · stake + heartbeats + slash automático
- **Disputas** — estilo Kleros / DAO (roadmap)
- **Reputation slash** — mau provedor perde stake + pools premium

---

## MVP técnico (feito / próximo)

- [x] Tipos DAT + pools + pricing (`src/protocol/liquidity/`)
- [x] Painel `/mesh/liquidity`
- [x] API `/api/mesh/liquidity`
- [x] Débito automático DAT → ledger SOV (`server/mesh/datSettlement.js`)
- [x] SLA code-based (`server/mesh/slaContract.js` · `src/protocol/liquidity/slaContract.ts`)
- [x] Liquidity mining bootstrap (`server/mesh/liquidityMining.js`)
- [ ] 3 pools piloto on-chain / Nostr

---

## Filosofia

> **Contratos são bugs do sistema económico. Código bem escrito é a feature.**

---

**Código:**

- `src/protocol/sovereignty/protocolRoyalty.ts`
- `src/protocol/liquidity/`
- `src/b2b/commercialPricing.ts` — referência legado EUR (interno)
- `docs/obsidian/SOV-ECONOMY.md`

**Obsidian:** [MODELO-NEGOCIO.md](./obsidian/MODELO-NEGOCIO.md)
