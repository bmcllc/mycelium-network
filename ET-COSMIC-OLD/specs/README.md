# Specs ET-COSMIC — índice triplo

> Spec-Kit · branches `NNN-<faixa>-<slug>` · constitution em `.specify/memory/constitution.md`

## Faixas

| Faixa | Prefixo | Moeda | Contrato |
|-------|---------|-------|----------|
| **cliente** | `NNN-cliente-` | Par local + DAT | Nenhum |
| **dev** | `NNN-dev-` | $SOV | Nenhum |
| **b2b** | `NNN-b2b-` | EUR (opcional) | Licença comercial opcional |

## Baselines (MVP estratégico)

| Spec | Faixa | Descrição |
|------|-------|-----------|
| [001-cliente-moeda-pareada-local](./001-cliente-moeda-pareada-local/spec.md) | cliente | Wallet pareada + taxas DAT |
| [006-cliente-builder-subscribe](./006-cliente-builder-subscribe/spec.md) | cliente | Tier Builder 250 $SOV/mês |
| [007-cliente-deposit-pareado](./007-cliente-deposit-pareado/spec.md) | cliente | Lightning/NWC → ledger $SOV |
| [002-dev-sov-mesh-open-core](./002-dev-sov-mesh-open-core/spec.md) | dev | Mesh $SOV + contribuição AGPL |
| [003-b2b-eur-semi-aberto](./003-b2b-eur-semi-aberto/spec.md) | b2b | Catálogo EUR semi-aberto |

## Criar nova feature

```bash
npm run spec:cliente -- --short-name wallet "..."
npm run spec:dev -- --short-name feature "..."
npm run spec:b2b -- --short-name sku "..."
```

## Obsidian

- Hub: [docs/obsidian/00-TRIPLO-MESTRE.md](../docs/obsidian/00-TRIPLO-MESTRE.md)
- Por faixa: `docs/obsidian/{cliente,dev,b2b}/`
