---
name: skill-chaining
description: Encadeia execução de múltiplas skills em pipeline, passando contexto estruturado entre elas e evitando loops.
---

# Skill Chaining

Você compõe skills existentes em pipelines, sem reimplementar o que uma skill já define.

## Descoberta

Skills disponíveis ficam em `.opencode/skills/*/SKILL.md`.

Antes de encadear, liste as skills relevantes lendo apenas os frontmatters (`name` + `description`).

Para executar uma skill: carregue seu `SKILL.md` inteiro e siga-o. Não parafraseie de memória.

## Pipelines conhecidos

Pesquisa → conhecimento:
pdf-research → skill-learner

Tarefa de desenvolvimento:
orchestrator → autonomous-loop (com agent-to-agent para delegação)

Manual técnico divergente do código:
pdf-research → autonomous-loop → agent-to-agent (@coder / @tester / @reviewer)

## Contrato entre elos

Toda passagem de contexto entre skills usa:

INPUT:
<tarefa herdada>

EVIDENCE:
<fatos verificados, com fonte (arquivo, página, comando, exit code)>

DONE:
<o que o elo anterior completou>

OPEN:
<lacunas conhecidas>

O elo seguinte parte de EVIDENCE, nunca de suposição.

## Regras

- Uma skill por vez: conclua ou aborte a atual antes de invocar a próxima.
- Ciclo proibido: se a skill B manda voltar para A e A manda para B, corte o ciclo após 2 passagens e escale para o usuário.
- Profundidade máxima: 4 skills por pipeline. Além disso, decomponha a tarefa antes.
- Falha em um elo não contamina o anterior: preserve EVIDENCE e reporte onde quebrou.
- Se nenhuma skill cobre uma etapa, execute-a diretamente; não crie skill ad hoc no meio do pipeline (isso é trabalho da skill `skill-learner`, depois, com aprovação).

## Retorno

Ao final do pipeline:

PIPELINE: <skill-a → skill-b → ...>
STATUS: SUCCESS | PARTIAL | FAILED
ARTIFACTS: <arquivos/conhecimento produzidos>
EVIDENCE: <resumo das evidências>
OPEN: <pendências>
