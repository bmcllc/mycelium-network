# PMU Base — fundação compartilhada (ET-RNET + VOID-COSMIC_VPS)

Módulos portáveis para **realismo verificável** da emulação quântica:

- Pool soberano em disco (`void_pool/`)
- Auditoria Ω (STS leve + relatório JSON)
- Níveis de verdade L0–L4 (TypeScript)

## Uso em ET-RNET

```bash
npm run quantum:dev
npm run pmu:audit          # relatório em void_pool/reports/
```

UI: `/compute/pmu-truth`

## Uso em VOID-COSMIC_VPS

```bash
bash scripts/setup-pmu-link.sh   # symlinks quantum + pmu-base
export ET_RNET_ROOT=../ET-RNET   # ou caminho absoluto
npm run pmu:audit                # na raiz VOID-COSMIC_VPS
```

Motor Python: mesmo `quantum/server.py` via symlink ou `ET_RNET_ROOT`.

## Variáveis

| Variável | Default |
|----------|---------|
| `ET_RNET_ROOT` | pai de `pmu-base/` |
| `VOID_POOL_DIR` | `$ET_RNET_ROOT/void_pool` |
| `QUANTUM_API` | `http://127.0.0.1:8472` |

Copie `pmu.env.example` → `pmu.env` (ET-RNET ou VOID). O `quantum/start.sh` carrega automaticamente.

## UI

- `/compute/pmu-truth` — painel Verdade Ω (proxy Vite `/pmu` → :8472)
- `/compute/pmu-vhgpu` — link **VERDADE Ω →**
