> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 4** — catálogo SKU Cosmos

# SKU Cosmos — Ecossistema IMC v2

Mapa visual e catálogo adaptado de **todos os SKUs VOID** para a era IMC (sem emulação quântica, sem rotas `/quantum/*`).

## Onde ver

| Recurso | Caminho |
|---------|---------|
| **Painel UI** | `/lab/sku-cosmos` (VOID-125) |
| **Código adaptação** | `src/b2b/imcSkuAdaptation.ts` |
| **Gerador catálogo** | `scripts/generate-sku-catalog.mjs` + `scripts/imc-sku-adaptation-data.mjs` |
| **Catálogo gerado** | `src/b2b/skuCatalog.generated.ts` |

## Cinco camadas

1. **Fundação** — VOID-00–0F (WASM, gateway, relay)
2. **Corpo (Malha)** — VOID-40–49, 700–702 (Nostr, Silent Mesh, CDN)
3. **Arsenal IMC** — VOID-510–522, 600 (motores clássicos honestos)
4. **Economia SOV** — VOID-520, 703–710 (marketplace, binários, hosting, mineração ética)
5. **Superfície UI** — painéis crypto/finance/vault/terminal/lab

## Adaptação automática

- Rotas legadas → `PATH_MIGRATION` (`/quantum/lsc` → `/lab/lsc`, etc.)
- Nomes: Quantum → Lab, QRNG → EaaS, Mining → Marketplace
- Campo `legacyPath` no catálogo gerado quando a rota mudou
- Precursores com `successor` (ex. VOID-76 → VOID-521)

## Comandos

```bash
npm run b2b:generate-catalog   # regenera skuCatalog.generated.ts
VITE_IMC_V2=1 npm run dev      # build extended com SKU Cosmos
```

## Licença

AGPL-3.0-or-later — catálogo e painel são parte do ecossistema comunitário ET-COSMIC.
