# LUSUS Engine

Subsistema **clássico** que explora falhas históricas da física clássica (UV, átomo, fotoelétrico, Debye, calor negativo, CMB, Bell) via engenharia de coerência — sem qubits.

## Módulos

| Módulo | Endpoint | Função |
|--------|----------|--------|
| `cavity_planck` | GET `/cavity` | Espectro truncado vs Rayleigh-Jeans |
| `vortex_memory` | POST/GET `/vortex` | Memória por circulação |
| `ising_machine` | POST `/ising/maxcut` | Max-Cut via osciladores |
| `thomas_fermi_solver` | GET `/thomas-fermi/h2` | H₂ aproximado |
| `adiabatic_shifter` | GET `/adiabatic/shift` | Redshift em guia |
| `grav_mimetic_cooler` | POST `/cooler/step` | Arrefecimento análogo |
| `chaos_bell` | GET `/chaos-bell` | Correlação caótica (não Bell real) |

Base: `/api/lusus`
