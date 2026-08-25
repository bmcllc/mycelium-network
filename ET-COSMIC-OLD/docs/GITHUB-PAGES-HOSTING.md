# GitHub Pages — hospedagem do ecossistema (alternativa)

> **Hospedagem principal:** [GITLAB-PAGES-HOSTING.md](./GITLAB-PAGES-HOSTING.md) (GitLab.com, repo privado OK).

> Frontend ET-COSMIC / ETERNET em GitHub Pages (se disponível).  
> URL canónica: **https://bmcc-dev.github.io/ET-COSMIC/**

---

## O que corre em Pages (100 % estático)

| Componente | Path |
|------------|------|
| PWA React (IMC v2 / sovereign) | `/` · `/mesh/liquidity` · `/lab/lusus` · … |
| WASM `void_core` | bundled em `assets/` |
| Mesh embed | `/void-mesh.js` |
| Tampermonkey | `/injectors/et-tampermonkey-injector.user.js` |
| Manifest + SW | `/manifest.json` · `/sw.js` |
| Docs públicos | `/LICENCA-LIVRE.md`, `/NOTICE`, … |

## O que **não** corre em Pages (VPS opcional)

GitHub Pages **não executa Node/LND**. APIs soberanas (`/api/*`) ficam num **VPS** ou local:

```bash
npm run server:sovereign   # Node :3001
```

Configure no build Pages (secret ou `.env.pages`):

```bash
VITE_PAGES_API_ORIGIN=https://seu-vps.example.com
```

Sem VPS: o browser usa **modo soberano offline** — WASM, entropia ETERNET, Nostr relays públicos.

---

## Build local

```bash
npm run deploy:pages
npx serve dist -l 4173
# Abrir http://localhost:4173/ET-COSMIC/  (base path local)
```

## CI / deploy automático

Push em `main` → workflow `.github/workflows/gh-pages-deploy.yml`:

1. `npm run build:wasm`
2. `npm run deploy:pages`
3. Artefacto `dist/` → GitHub Pages

Settings → Pages → Source: **GitHub Actions**.

---

## Arquitectura Protocol-First + Pages

```mermaid
flowchart LR
  subgraph pages [GitHub Pages]
    PWA[PWA sovereign]
    MESH[void-mesh.js]
    DAT_UI[/mesh/liquidity]
  end
  subgraph optional [VPS opcional]
    API[Node server :3001]
    LND[LND Lightning]
  end
  User((Utilizador)) --> PWA
  PWA -->|fetch| API
  PWA -->|Nostr| Relay[Relays públicos]
  MESH --> User
```

**Filosofia:** Pages = distribuição viral zero-custo; VPS = liquidez/API quando escala.

---

## Referências

- [PROTOCOL-FIRST-MESH.md](./PROTOCOL-FIRST-MESH.md)
- [obsidian/MODELO-NEGOCIO.md](./obsidian/MODELO-NEGOCIO.md)
- `scripts/build-github-pages.mjs`
