# Reserva de uso — IA, mineração de dados e engenharia reversa

**Titular:** Bruno Monteiro Caldas da Cunha · **Projeto:** ET-COSMIC / ETΞRNET  
**SPDX (código):** `AGPL-3.0-or-later` · **Complemento:** reserva do titular (não revoga liberdades AGPL para forks na malha)

---

## 1. Declaração do titular

O titular dos direitos de autor **reserva expressamente** o uso do código-fonte, da documentação, dos binários, dos artefactos WASM, dos whitepapers e de quaisquer obras derivadas do monorepo ET-COSMIC para:

1. **Treino, fine-tuning ou destilação** de modelos de inteligência artificial (LLM, multimodal, código, embeddings).
2. **Mineração de texto e dados (TDM)** para fins comerciais ou de desenvolvimento de modelos, nos termos do art. 4.º(3) da Directiva (UE) 2019/790.
3. **Scraping automatizado** com fim de reprodução substancial, clonagem de produto, ou geração de código concorrente “inspirado” no repositório.
4. **Engenharia reversa com fins proibidos** nos artefactos licenciados comercialmente (ramo 2) — ver [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

Esta reserva aplica-se a **humanos, empresas e sistemas autónomos** (incluindo agentes de IA).

---

## 2. Sinalização machine-readable

| Ficheiro | Função |
|----------|--------|
| [public/ai.txt](./public/ai.txt) | Política para crawlers de IA |
| [public/robots.txt](./public/robots.txt) | `Disallow` para bots de treino conhecidos |
| `index.html` | `<meta name="robots" content="noai, noimageai">` |
| Cabeçalhos-fonte | `ET-COSMIC-AI-Reservation: 1` em módulos de soberania |

**Opt-out TDM (UE):** a presença de `AI-USE-RESERVATION.md` e `ai.txt` constitui manifestação **clara e legível por máquina** de oposição à mineração para IA, nos termos aplicáveis.

---

## 3. Ramo GPL (comunidade) — limites honestos

A **GNU GPL v3** concede liberdades que **não podem ser revogadas** por este documento para quem **já recebeu** o software sob GPL:

| Direito GPL | Reserva ET-COSMIC |
|-------------|-------------------|
| Estudar e modificar o código | Permitido (copyleft) |
| Engenharia reversa para interoperabilidade (GPL §3) | Permitida **na medida exigida pela GPL** |
| Treino de IA / scraping massivo | **Reservado** — requer licença escrita do titular |
| Remover NOTICE / créditos | **Proibido** (GPL §4 + NOTICE) |

**Efeito prático:** forks públicos sob GPL podem existir, mas **uso do nosso código para treinar ou clonar produtos de IA** sem autorização é **infração de direitos de autor** além do âmbito da GPL. Quem precisa de IA no produto negocia **licença comercial** com cláusulas específicas.

---

## 4. Ramo comercial (produto fechado)

Na licença comercial ([COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md)) aplicam-se **proibições contratuais reforçadas**:

- Engenharia reversa, descompilação, desofuscação (salvo lei imperativa local).
- Uso do código ou documentação para treino ou avaliação de modelos de IA.
- Partilha do código-fonte licenciado com fornecedores de IA (OpenAI, Anthropic, Google, Meta, etc.) sem autorização escrita.
- Circunvenção de medidas técnicas de protecção em builds comerciais.

Penalidades: rescisão imediata, indemnização, injunção — conforme contrato.

---

## 5. O que terceiros podem fazer (sem autorização)

| Permitido | Proibido sem licença escrita |
|-----------|------------------------------|
| Usar a app/PWA conforme GPL | Treinar LLM no repositório |
| Fork público com copyleft | Scraping para dataset de código |
| Citar com atribuição | Remover reserva AI dos metadados |
| Auditoria de segurança **responsável** (coordenada) | Clonagem comercial via codegen IA |
| Licença comercial negociada | Engenharia reversa de binário comercial |

---

## 6. Pedido de licença IA / pesquisa

Investigação académica ou integração IA **controlada**:

```
comercial@et-cosmic.org
Assunto: AI-USE-LICENSE — [entidade] — [finalidade]
```

Incluir: modelo, volume de dados, retenção, open-weights ou não, território.

---

## 7. Implementação no código

- `getAiUseReservationNotice()` — `src/protocol/sovereignty/etrnetSovereignty.ts`
- Painel `/governance/sovereignty` — resumo público
- Builds comerciais: cláusula no contrato + medidas técnicas opcionais (ofuscamento, sem fonte no binário)

---

## 8. Aviso legal

Este documento **não constitui aconselhamento jurídico**. A eficácia da reserva TDM varia por jurisdição (UE, UK, EUA, Brasil). Em litígio, prevalecem o contrato comercial assinado e a legislação aplicável.

*Última actualização: 2026 — alinhado a [DUAL-LICENSE.md](./DUAL-LICENSE.md) e [NOTICE](./NOTICE).*
