> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 1** — núcleo LUSUS-Q

# LUSUS — As 7 falhas clássicas

> *Latim: ilusão, jogo, truque* — subsistema de **sabor «Quântico»**: coerência clássica para tarefas que o hype atribuiria a qubits.

## Tabela resumo

| # | Falha clássica | Ponte LUSUS (módulo) |
|---|----------------|----------------------|
| 1 | Catástrofe UV (corpo negro) | `cavity_planck` — modos discretos, espectro truncado |
| 2 | Átomo instável | `vortex_memory` — vórtices topológicos estáveis |
| 3 | Efeito fotoelétrico | (metamaterial — roadmap) |
| 4 | Calor específico sólidos | `ising_machine` — Coherent Ising / Max-Cut |
| 5 | Calor específico negativo | `grav_mimetic_cooler` |
| 6 | CMB / expansão | `adiabatic_shifter` — redshift controlado |
| 7 | Bell / não-localidade | `chaos_bell` — correlação por semente compartilhada |

## API (servidor)

Base: `/api/lusus`

- `GET /health`, `/status`
- `GET /cavity?modes=24`
- `POST /ising/maxcut`
- `GET /thomas-fermi/h2`
- `GET /adiabatic/shift`
- `POST /cooler/step`
- `GET /chaos-bell?seed=`
- `GET /chaos-bell/chsh?mode=chaos|lhv`

**Disclaimer obrigatório:** não viola leis da física; viola o *hype* quântico.

## Integração ETERNET

A entropia soberana mistura:

1. Frame hash **Bruno Theory** (`runBrunoTheorySimulation`)
2. Par caótico **LUSUS** (`chaos-bell`)
3. `crypto.getRandomValues` + SHA3-512 HKDF

Ver `src/eternet/entropy.ts`.

## UI

Painel existente: `/quantum/lusus` (`LUSUSTerminalPanel.tsx`).  
**Fase 3:** mover rota para `/compute/lusus` e etiquetar “Clássico avançado”, não “Quântico”.
