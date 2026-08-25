> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 1** — purge IMC v2 (sem restaurar `quantum/`)

# Purge legado (pós-backup)

Executado: `npm run imc:purge`

## Removido do repo activo

- ~70 painéis React (DEX, Heptary, Mining, Harvester, etc.)
- Diretório `quantum/` (Python CQR) — **não restaurar**; motores em `core/` + `server/lusus/` + `server/aqre/`
- `IsossupraCorePanel` (unificado em IMC)

## Histórico

Snapshots completos: `archive/snapshot-full-*` (após `npm run imc:backup`).

> **Decisão VOID-QRC:** restauração de `quantum/` foi **descartada**. O plano industrial usa `core/` modular.

## Rotas novas (coerentes com hubs)

| Antes | Agora |
|-------|-------|
| `/quantum/lusus` | `/lab/lusus` |
| `/quantum/anacroclastia` | `/lab/anacroclastia` |
| `/defi/ghost-locker` | `/vault/ghost-locker` |
| `/compute/isossupra` | *(removido — só `/compute/imc`)* |
