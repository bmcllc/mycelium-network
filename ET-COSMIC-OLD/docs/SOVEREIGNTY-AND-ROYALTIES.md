> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 4** — royalties

# Soberania, royalties e monetização — ET-COSMIC

> Versão **pública** (GitHub). Cópia operacional estendida: `docs/guides/Sovereignty-and-Royalties.md` (só local).

## Documentos legais

| Ficheiro | Função |
|----------|--------|
| [LICENSE](../LICENSE) | GPL-3.0-or-later (ramo 1) |
| [DUAL-LICENSE.md](../DUAL-LICENSE.md) | Licença dupla (comunitário + comercial) |
| [NOTICE](../NOTICE) | Atribuição e anti-privatização |
| [CREDITS.md](../CREDITS.md) | Créditos obrigatórios |
| [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) | Ramo comercial (produto fechado) |
| [AI-USE-RESERVATION.md](../AI-USE-RESERVATION.md) | Reserva IA / TDM / anti-clonagem |

## Receita (não confundir com GPL)

| Fonte | O que é | Onde está |
|-------|---------|-----------|
| **Licença comercial** | ACV anual por bundle/SKU | [MONETIZATION-PLAYBOOK.md](./MONETIZATION-PLAYBOOK.md) |
| **Taxa de protocolo** | bps sobre GMV (transparente na UI) | `src/protocol/sovereignty/protocolRoyalty.ts` |
| **Setup / serviços** | 22% ACV + VOID-305/306/308 | `src/b2b/commercialPricing.ts` |
| **Simulador** | Proposta ano 1 | `npm run b2b:revenue -- <SKU>` |

Predefinição código: **10 bps**; enterprise contrato: **15–50 bps**, mínimo **€36 000/ano**.

## Créditos e fundação

- UI: `Powered by ET-COSMIC · MontêLauro Foundation / Bruno Monteiro Caldas da Cunha`
- Painel: `/governance/sovereignty`
- Código: `src/protocol/sovereignty/etrnetSovereignty.ts`

## Variáveis de produção

```bash
VITE_ETRNET_TREASURY_NPUB=npub1...
VITE_PROTOCOL_ROYALTY_BPS=10    # enterprise: 25–50 em contrato
VITE_REQUIRE_ATTRIBUTION=true
VITE_B2B_SKUS=SOVEREIGN-CITIZEN # build comercial
```

## Referências

- [B2B-PRODUCT-LINES.md](./B2B-PRODUCT-LINES.md) — catálogo + **§27 preços**
- [B2B-PRICING-TEMPLATE.md](./B2B-PRICING-TEMPLATE.md) — folha de proposta
- [PRODUCTION-READY.md](./PRODUCTION-READY.md) — deploy
