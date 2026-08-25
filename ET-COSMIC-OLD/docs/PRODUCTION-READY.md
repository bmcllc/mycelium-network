> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 4** — gate produção

# ETΞRNET — Estado de produção

**Status:** pronto para deploy (Perfil A soberano + catálogo B2B).

## Documentação comercial (PDF)

```bash
npm run docs:ready    # masterSkuList.json (283) + master-sku-list.pdf + whitepaper v1.2
```

| PDF | Origem |
|-----|--------|
| `whitepaper.pdf` / `public/whitepaper.pdf` | `whitepaper.tex` v1.2 |
| `docs/master-sku-list.pdf` | `src/b2b/masterSkuList.json` |

## Gate único

```bash
npm run production:go
# ou catálogo completo UI:
npm run production:go:enterprise
# com Docker + relay + CQR antes do preflight:
START_STACK=1 npm run production:go
```

Inclui: `b2b:production-ready` → testes → `tsc` → `production:preflight` → build `SOVEREIGN-CITIZEN`.

## Checklist verificado

| Item | Comando | Estado |
|------|---------|--------|
| 283 SKUs + 72 rotas UI | `npm run b2b:production-ready` | ✓ |
| PDF catálogo + whitepaper | `npm run docs:ready` | ✓ |
| Testes | `npm test` | ✓ |
| TypeScript | `npx tsc --noEmit` | ✓ |
| Pré-voo | `npm run production:preflight` | ✓ (avisos opcionais: stack offline, relay) |
| Build B2B | `npm run build:b2b -- SOVEREIGN-CITIZEN` | ✓ |
| Simulador receita | `npm run b2b:revenue -- FULL-ENTERPRISE --volume-eur=50e6 --bps=25` | ✓ |
| Build enterprise | `npm run build:b2b:full-enterprise` | ✓ |
| Arquivo teoria | `docs/archive/bruno-theory/` | ✓ |
| Sync teoria | `npm run archive:sync-theory` | manual (`THEORY_ARCHIVE_SRC`) |

## Deploy rápido (Perfil A — LAN)

```bash
npm run production:go
npm run pwa:serve:sovereign          # http://0.0.0.0:4173
# ou APK:
bash scripts/android-build-b2b.sh SOVEREIGN-CITIZEN
```

## Stack Real+ (opcional)

```bash
npm run stack:up:full
npm run stack:status
npm run relay:health
NODE_ENV=production node server/server.js
```

## SKUs B2B recomendados

| SKU | Uso |
|-----|-----|
| `SOVEREIGN-CITIZEN` | PWA/APK cidadão soberano (default `production:go`) |
| `MESSENGER-ENTERPRISE` | Messenger + crypto |
| `FULL-ENTERPRISE` | 72 painéis UI |
| `VOID-CATALOG-FULL` | Metadados 283 SKUs + UI enterprise |
| `VOID-54` | Teoria Bruno (bundle mínimo) |

## Monetização

| Doc | Uso |
|-----|-----|
| [MONETIZATION-PLAYBOOK.md](./MONETIZATION-PLAYBOOK.md) | Estratégia e camadas de receita |
| [B2B-PRODUCT-LINES.md](./B2B-PRODUCT-LINES.md) §27 | Lista de preços EUR |
| [B2B-PRICING-TEMPLATE.md](./B2B-PRICING-TEMPLATE.md) | Proposta comercial |
| `npm run b2b:revenue -- <SKU>` | Simulador ano 1 |

## Referências

- [B2B-PRODUCT-LINES.md](./B2B-PRODUCT-LINES.md)
- [DOC/DEPLOY-PRODUCTION.md](../DOC/DEPLOY-PRODUCTION.md)
- [DOC/FILOSOFIA-DEPLOY.md](../DOC/FILOSOFIA-DEPLOY.md)
