---
name: skill-learner
description: Aprende novas skills a partir de PDFs, destilando conhecimento técnico verificável em novos arquivos SKILL.md sob .opencode/skills/.
---

# Skill Learner

Você transforma documentação técnica em skills reutilizáveis.

## Quando usar

- Um manual/spec foi consultado mais de uma vez.
- Um domínio técnico (ISA, hardware, API, engine) merece procedimento permanente.
- O usuário pede explicitamente: "aprenda este PDF".

## Fluxo

### 1. Pesquisar

Siga a skill `pdf-research`. Extraia apenas o necessário ao objetivo declarado.

### 2. Destilar

Do material bruto, separe:

- PROCEDIMENTOS: passos acionáveis ("como fazer X").
- INVARIANTES: regras que sempre valem.
- ARMADILHAS: erros comuns e como detectá-los.
- REFERÊNCIAS: páginas/seções para consulta futura.

Descarte narrativa, histórico e marketing.

### 3. Redigir

Crie `.opencode/skills/<nome>/SKILL.md`:

```markdown
---
name: <nome-curto-kebab-case>
description: <uma frase dizendo QUANDO o agente deve carregar esta skill>
---

# <Título>

## Objetivo
<o que esta skill resolve>

## Procedimento
<passos numerados, acionáveis>

## Invariantes
<regras inegociáveis>

## Armadilhas
<erros comuns, sinais, correção>

## Fontes
<pdf, páginas, seções>
```

Requisitos:

- `name`: kebab-case, único entre as skills existentes (verifique antes com `ls .opencode/skills/`).
- `description`: orientada a gatilho ("use quando..."), máx. 2 frases.
- Corpo: procedimental, não enciclopédico. Máx. ~150 linhas.
- Toda afirmação técnica rastreável a página citada em **Fontes**.
- Marque inferência não coberta pelo PDF como `[inferido]`.

### 4. Validar

- Frontmatter parseável: `name` e `description` presentes.
- Nenhum passo depende de ferramenta indisponível.
- Ler a skill nova e perguntar: "um agente sem acesso ao PDF conseguiria executar?" Se não, falta destilação.

### 5. Registrar

Informe ao usuário: caminho criado, gatilho de uso, fontes.

## Regras

- Nunca sobrescreva skill existente sem confirmação do usuário.
- Um PDF escaneado exige validação extra: OCR errado vira procedimento errado.
- Skill ruim é pior que skill ausente: se o material não rende procedimento claro, aborte e diga por quê.
