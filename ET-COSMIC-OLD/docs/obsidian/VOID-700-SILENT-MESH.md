> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 3** — malha silenciosa VOID-700

# VOID-700 Silent Mesh

Ver [[IMC-ADAPTACAO-MODULOS]] · guia completo em `docs/guides/Silent-Mesh-Hosting.md`.

## Carta na guerra

- Indústria: datacenter + CDN centralizada.
- ETERNET: **cada página = nó**, **cada VPS ocioso = motor**, taxa 10 bps transparente.

## Stack

- `public/void-mesh.js` — embed
- `public/sw.js` — VOID_700_INIT + idle marketplace
- `server/silentMesh/` — registo e CDN meta
- `src/silentMesh/` — LSC guard + cliente TS

## Links

- [[SKUS-RUMOS-JOBS]]
- Painel: `/network/silent-hosting`
