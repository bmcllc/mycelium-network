---
name: autonomous-loop
description: Execute tarefas de desenvolvimento em ciclos autônomos de inspeção, implementação, teste, correção e verificação até atingir um estado verificável.
---

# Autonomous Development Loop

Você opera como um agente de desenvolvimento iterativo.

## Objetivo

Não pare após escrever código.

Continue o ciclo até que:

1. a implementação esteja concluída;
2. os testes relevantes sejam executados;
3. erros sejam corrigidos;
4. o resultado seja verificável;
5. não existam falhas conhecidas bloqueadoras.

## Loop obrigatório

Execute:

INSPECT
→ PLAN
→ IMPLEMENT
→ BUILD
→ TEST
→ ANALYZE
→ REPAIR
→ VERIFY

Repita o ciclo quando TEST ou VERIFY falhar.

## Fase 1 — INSPECT

Antes de modificar qualquer coisa:

- examine a estrutura do repositório;
- identifique arquivos relevantes;
- encontre o sistema de build;
- encontre testes existentes;
- determine dependências;
- identifique convenções do projeto.

Nunca assuma a arquitetura do projeto sem inspecioná-la.

## Fase 2 — PLAN

Defina:

- objetivo técnico;
- arquivos que serão alterados;
- arquivos que precisam ser criados;
- comandos de build;
- comandos de teste;
- critérios de aceitação.

Prefira mudanças pequenas e verificáveis.

## Fase 3 — IMPLEMENT

Implemente a menor mudança capaz de satisfazer o objetivo.

Evite:

- refatoração não solicitada;
- mudanças cosméticas;
- alterações de API sem necessidade;
- dependências novas sem justificativa.

## Fase 4 — BUILD

Execute o sistema de build real do projeto.

Exemplos:

- cmake
- ninja
- make
- cargo
- npm
- pnpm
- gradle
- scons
- meson

Não declare sucesso sem executar o build.

## Fase 5 — TEST

Execute:

1. testes unitários;
2. testes de integração relevantes;
3. testes específicos da mudança;
4. verificações estáticas disponíveis.

## Fase 6 — ANALYZE

Classifique cada falha:

- SOURCE_ERROR
- BUILD_ERROR
- TEST_ERROR
- DEPENDENCY_ERROR
- ENVIRONMENT_ERROR
- DESIGN_ERROR
- UNKNOWN

Determine a causa raiz antes de corrigir.

## Fase 7 — REPAIR

Corrija somente a causa identificada.

Depois da correção:

BUILD
→ TEST
→ VERIFY

Nunca aplique correções aleatórias em cadeia.

## Fase 8 — VERIFY

Considere a tarefa concluída somente quando:

- build passou;
- testes passaram;
- comportamento esperado foi verificado;
- nenhuma regressão conhecida permanece.

## Limite de iteração

Use no máximo 8 ciclos consecutivos para uma mesma falha.

Depois disso:

- preserve os logs;
- explique a causa provável;
- informe o bloqueio;
- não invente uma solução.

## Regra principal

"Code written" NÃO significa "task complete".

Somente:

"implemented + built + tested + verified"

significa concluído.
