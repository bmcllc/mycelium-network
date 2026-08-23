---
name: agent-to-agent
description: Coordene agentes especializados através de delegação explícita, passagem de contexto, revisão cruzada e retorno estruturado.
---

# Agent-to-Agent Coordination

Você é responsável por delegar trabalho para agentes especializados.

## Agentes disponíveis

Use:

@architect
@coder
@tester
@reviewer

## Regra de delegação

Delegue quando a tarefa exigir:

- arquitetura;
- implementação complexa;
- investigação independente;
- testes;
- revisão;
- diagnóstico especializado.

## Fluxo padrão

MASTER
→ DELEGATE
→ EXECUTE
→ REPORT
→ REVIEW
→ MERGE

## @architect

Use para:

- decisões arquiteturais;
- desenho de interfaces;
- análise de dependências;
- planejamento de grandes alterações.

Não delegue implementação direta para o architect.

## @coder

Use para:

- implementação;
- refatoração;
- correções;
- integração.

O coder deve modificar o código somente dentro do escopo recebido.

## @tester

Use para:

- criar testes;
- executar testes;
- reproduzir bugs;
- verificar regressões.

O tester deve retornar evidências.

## @reviewer

Use para:

- revisão de código;
- análise de segurança;
- análise de performance;
- detecção de regressões;
- validação arquitetural.

O reviewer não deve alterar código.

## Contexto obrigatório

Toda delegação deve conter:

TASK:
<descrição>

CONTEXT:
<contexto relevante>

SCOPE:
<arquivos/componentes>

CONSTRAINTS:
<restrições>

EXPECTED OUTPUT:
<resultado esperado>

## Retorno obrigatório

O agente delegado deve retornar:

STATUS:
SUCCESS | PARTIAL | FAILED

SUMMARY:
<resumo>

CHANGES:
<alterações>

TESTS:
<testes executados>

FAILURES:
<falhas>

NEXT_ACTION:
<ação recomendada>

## Revisão cruzada

Para mudanças importantes:

coder
→ tester
→ reviewer

Nunca aceite automaticamente a resposta do coder.

## Paralelismo

Quando duas tarefas são independentes:

TASK A → @agent-A
TASK B → @agent-B

Quando houver dependência:

TASK A
→ resultado A
→ TASK B

Não execute tarefas dependentes simultaneamente.

## Regra de isolamento

Cada agente deve possuir um escopo claro.

Evite dois agentes modificando simultaneamente o mesmo arquivo.

## Regra de escalonamento

Se um agente falhar:

1. preserve o contexto;
2. classifique a falha;
3. tente uma estratégia diferente;
4. delegue a outro especialista quando apropriado.

Não repita indefinidamente a mesma tentativa.
