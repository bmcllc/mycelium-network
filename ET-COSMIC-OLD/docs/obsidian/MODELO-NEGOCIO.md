> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Monetização** — protocol-first

# Modelo de negócio: Protocol-First B2B Liquidity Mesh

> **Filosofia:** Sem contratos, sem jurídico, sem vendas. Apenas código + incentivos económicos + prova criptográfica de valor.

Documento completo: [PROTOCOL-FIRST-MESH.md](../PROTOCOL-FIRST-MESH.md)

---

## Conceito central

**Assinatura = prova de trabalho útil (DAT)**

1. Cliente paga por **acesso a recursos** (compute, storage, bandwidth, inferência)
2. Pagamento **distribuído automaticamente** na mesh via protocolo $SOV
3. Renovação **automática** enquanto houver uso válido on-chain / ledger
4. **Zero SLA jurídico** — SLA code-based + reputação + slash

## Camadas de receita (sem papel)

| Camada | Mecanismo | Código |
|--------|-----------|--------|
| Taxa protocolo | `VITE_PROTOCOL_ROYALTY_BPS` → tesouraria Nostr | `protocolRoyalty.ts` |
| Liquidity pools | AMM por recurso (compute, storage, AI, sabor «Quântico», identity) | `src/protocol/liquidity/` |
| Tiers auto | Citizen / Builder / Enterprise / Sovereign — debit $SOV/mês | `pools.ts` · painel `/mesh/liquidity` |
| DAT settlement | Pay-per-use automático → ledger VOID-710 | `server/mesh/datSettlement.js` |
| SLA code-based | Stake + heartbeats + slash/bonus | `server/mesh/slaContract.js` |
| Liquidity mining | Bootstrap 2× primeiros 30 provedores | `server/mesh/liquidityMining.js` |
| VAS on-demand | VOID-305…329 — clica, paga µSOV, recebe | `server/economy/` |

## Open core

- **AGPL-3.0-or-later** — fork livre, sempre
- Comercial **opcional** só quem recusa copyleft em produto fechado ([COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md)) — **não** é o go-to-market principal

## O que não vender como real

- Hardware quântico (sabor «Quântico» = clássico) — [[DEPRECACAO-QUANTUM]]
- QKD comercial sem laboratório
- Violação Bell física

## Referências

- [GITLAB-PAGES-HOSTING.md](../GITLAB-PAGES-HOSTING.md) — PWA + mesh (principal)
- [CLOUDFLARE-PAGES-HOSTING.md](../CLOUDFLARE-PAGES-HOSTING.md) — alternativa
- [GITHUB-PAGES-HOSTING.md](../GITHUB-PAGES-HOSTING.md) — alternativa GitHub Pages
- [SOV-ECONOMY.md](./SOV-ECONOMY.md)
- [RISK-REGISTER.md](../RISK-REGISTER.md)
- Painel: `/mesh/liquidity` · API: `/api/mesh/liquidity` (VPS opcional)
