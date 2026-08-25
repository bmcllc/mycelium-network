> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 4** — catálogo SKU Cosmos IMC v2

# Adaptação de módulos — IMC v2 (sem emulação quântica)

## Princípio

- **Manter** a maioria dos painéis e SKUs precursores.
- **Reframe** sob malha + sensores + trabalho útil (VOID-510–522, VOID-600).
- **Não** expor `/quantum/*` nem motor Python `quantum/` no produto activo.

## Mapa de rotas

| Legado | IMC adaptado |
|--------|----------------|
| `/quantum/qrng` | `/lab/eaas` (VOID-521) |
| `/quantum/lusus` | `/lab/lusus` |
| `/quantum/heptary` | *(removido)* → `/lab/anacroclastia` |
| `/defi/*` | `/vault/*` |
| `/terminal/mining` | `/terminal/marketplace` (VOID-520) |

Redirects automáticos em `App.tsx` via `LEGACY_PATH_REDIRECTS`.

## Build

- **Extended (default):** `VITE_IMC_V2=1` — ~65 rotas adaptadas.
- **Slim (demo):** `VITE_IMC_V2=1 VITE_IMC_SLIM=1` — 22 rotas núcleo.

## Restaurar painéis do snapshot

```bash
npm run imc:restore-panels
```

Não restaura `quantum/` — backup em `archive/snapshot-full-*`.
