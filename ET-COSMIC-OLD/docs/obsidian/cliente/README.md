# Faixa Cliente — pagamentos & experiência pública

> **Moeda:** par local descentralizado pareado a $SOV · **Contrato:** nenhum · **Código:** shell público AGPL

## Proposta de valor

- Pagar só pelo que consome (DAT pay-per-use)
- Taxas protocolo transparentes (bps + pool)
- **Sabor Quântico™** — simulação clássica auditável
- Onboarding 15 min via GitLab Pages

## Stack

| Componente | Path / URL |
|------------|------------|
| Landing | `/sabor-quantico` |
| Liquidity Mesh | `/mesh/liquidity` |
| DAT settlement | `server/mesh/datSettlement.js` |
| Pools | `src/protocol/liquidity/pools.ts` |

## Documentos

- [[VOID-308-PITCH]] — pitch 1 página (100 $SOV, compliance)
- [[PAGAMENTOS-LOCAIS]] — moeda pareada, taxas, fluxo DAT
- [[MODELO-NEGOCIO]] — visão comercial Protocol-First
- [[SOV-ECONOMY]] — ledger µSOV (lado consumidor)
- [[VOID-700-SILENT-MESH]] — propagação browser
- [GITLAB-PAGES-HOSTING.md](../GITLAB-PAGES-HOSTING.md)

## Spec-Kit

```bash
npm run spec:cliente -- --short-name <slug> "descrição"
```

Specs: `specs/NNN-cliente-*`

## Tags

`#cliente` `#dat` `#sabor-quantico`
