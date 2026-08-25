# AQRE — Anacroclastic Quantum-Relativistic Emulator

Simulador **clássico** de sistemas coerentes com memória, limites LSC e geometria.

## Princípios

1. **Nunca** alega computação quântica real.
2. Recusa tarefas que excedam limites LSC (HTTP **429**).
3. Expõe indicadores físicos: `P`, `Cε`, `G`, `K_eff`.
4. Extensões especulativas apenas em `/api/aqre/research/*`.
5. Entropia apenas PRNG/CSPRNG — declarada como clássica.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/aqre/health` | Saúde |
| GET | `/api/aqre/status` | Status e limites |
| GET | `/api/aqre/limits` | Classificação anacróclasta |
| POST | `/api/aqre/lsc/record` | Registro LSC |
| POST | `/api/aqre/run` | Executar tarefa (`spin_network`, `causal_tracker`, …) |
| GET | `/api/aqre/research/chi` | Campo χ (pesquisa) |

## Tarefas `POST /run`

- `spin_network` — grafo ≤20 nós
- `causal_tracker` — Ising + mistura causal estatística
- `memory_collapse` — operadores MCM a,r,c
- `chi_field` — vorticidade clássica
- `sdf_stub` — placeholder SDF WASM
