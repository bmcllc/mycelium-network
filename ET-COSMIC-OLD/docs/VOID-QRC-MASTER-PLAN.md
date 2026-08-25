# VØID-QRC — Entrada rápida

> **Documento principal (leia primeiro):**  
> **[obsidian/VOID-QRC-PLANO-INDUSTRIA.md](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md)**

---

## Estado — Alpha Industrial ✅ (2026-05-20)

Todas as fases P0–P3 do plano principal estão **fechadas**.

| Comando | Função |
|---------|--------|
| `npm run release:sovereign` | validate · core:test · license · build · tag |
| `npm run build:sovereign` | PWA `dist/` modo soberano |
| `npm run finance:payment:full` | fluxo pagamentos (Vitest + HTTP opcional) |
| `npm run license:setup license.json` | VOID-00 enforce comercial |

```bash
npm run stack:up && npm run finance:setup && npm run server:sovereign && npm run dev
```
