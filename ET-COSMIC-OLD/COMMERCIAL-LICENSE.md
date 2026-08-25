# Licença comercial ET-COSMIC (ramo 2 da licença dupla)

O monorepo **ET-COSMIC** é **sempre** oferecido à comunidade sob **GPL-3.0-or-later** (ramo 1).  
Este documento descreve apenas o **ramo comercial** da [licença dupla](./DUAL-LICENSE.md).

Empresas que integram componentes (ex.: `@eternet/core`, Payment Gateway, Nostr DEX,
módulos WASM) em produtos **fechados** sem publicar código-fonte devem obter contrato
com o titular dos direitos.

## Quando precisa de licença comercial

| Cenário | GPL-3.0-or-later (gratuita) | Comercial |
|---------|------------------------------|-----------|
| Fork público com código aberto | Sim | Não |
| Serviço SaaS sem distribuir binários* | Consultar jurídico | Opcional |
| App móvel / desktop proprietário com SDK embutido | Não (sem fonte) | Sim |
| Appliance hardware com firmware fechado | Não | Sim |
| White-label sem atribuição GPL | Não | Sim |
| Remover copyleft do upstream oficial | **Proibido** | N/A |

\* Avalie com advogado; o projeto usa GPL-3.0 (não AGPL).

## Proibições contratuais (licença comercial assinada)

Salvo lei imperativa local, o licenciado **não pode**:

1. **Engenharia reversa**, descompilar, desmontar ou desofuscar binários/artefactos licenciados.
2. Usar código, documentação ou metadados para **treino, fine-tuning ou avaliação** de modelos de IA.
3. Permitir que **terceiros de IA** (cloud LLM, copilots empresariais) ingiram o código licenciado sem autorização escrita.
4. **Scraping automatizado** ou mineração de dados para reproduzir o produto ou concorrente substancial.
5. **Contornar** medidas técnicas de protecção aplicadas aos entregáveis comerciais.
6. Remover ou alterar `AI-USE-RESERVATION.md`, `public/ai.txt` ou avisos de reserva nos metadados.

Violação: rescisão, indemnização, injunção — conforme contrato.

Ver também: [AI-USE-RESERVATION.md](./AI-USE-RESERVATION.md).

## O que a licença comercial pode incluir

- Sublicenciamento proprietário de módulos contratados (`@eternet/core`, APIs seleccionadas)
- Suporte prioritário e SLA (negociável)
- Isenção de copyleft **apenas** nos artefactos licenciados no contrato
- Participação em roadmap enterprise
- Negociação de taxa de protocolo (bps reduzido ou isenção)

## O que NÃO a licença comercial faz

- **Não** privatiza o repositório público ET-COSMIC
- **Não** impede forks GPL da comunidade
- **Não** remove obrigação de NOTICE nos derivados que permanecem sob GPL

## Royalties de protocolo (paralelo)

Mesmo com licença comercial, pode aplicar-se **taxa de protocolo** em transações
(ver [NOTICE](./NOTICE) e `src/protocol/sovereignty/`). Valores negociáveis em contrato.

## Contacto

**Titular:** Bruno Monteiro Caldas da Cunha  
**Projeto:** MontêLauro Foundation (em constituição)

```
comercial@et-cosmic.org
```

Até e-mail institucional activo: issue no repositório com etiqueta `commercial-license`.

---

*Não constitui aconselhamento jurídico. Ver também [DUAL-LICENSE.md](./DUAL-LICENSE.md) e [CREDITS.md](./CREDITS.md).*
