---
lane: cliente
product: VOID-308
price: 100 SOV
tags:
  - pitch
  - compliance
  - vas
---

# VOID-308 — Auditoria PMU on-chain (pitch 1 página)

> **Para:** pharma, fintech, labs com dados sensíveis · **Preço:** 100 $SOV por job · **Tempo:** 1 clique na landing

## O problema

Auditorias de simulação e pipelines de dados custam semanas de email, contrato e fatura. O CFO não confia em «caixa preta» nem em promessas de qubit.

## A nossa resposta

**VOID-308** entrega um relatório JSON auditável no mesmo fluxo em que pagas o serviço:

1. Mint **DAT** (acesso pay-per-use, zero contrato)
2. Settlement automático em **$SOV** (taxa protocolo em bps — visível)
3. Relatório `pmu-audit-*.json` com digest, truth level e trilha de settlement

**Sabor Quântico™** = simulação tensor **clássica** honesta (LUSUS-Q / QRC em CPU/GPU). Sem hardware quântico vendido como milagre.

## O que o cliente recebe

| Entrega | Detalhe |
|---------|---------|
| Relatório JSON | `void_pool/reports/pmu-audit-*.json` no VPS |
| Prova de pagamento | Settlement DAT + saldo ledger |
| Compliance | Truth level L2 (stub); STS completo no motor quantum VPS (roadmap) |
| Download | Botão na landing após checkout |

## Preço e upsell

| SKU | Preço | Quando |
|-----|-------|--------|
| **VOID-308** | 100 $SOV / auditoria | Primeiro contacto — prova de valor |
| **Builder** | 250 $SOV / mês | Fila prioritária + 1000 req/h após 1ª auditoria |
| **POOL-QUANTUM** | 4,5% + uso | Volume contínuo de jobs |

## Pitch 30 segundos

> *«Auditoria PMU on-chain em 100 $SOV — sem contrato, sem fatura manual. Pagas, recebes JSON e hash de settlement. Se precisares de fila prioritária, Builder 250 $SOV/mês.»*

## Demo live

- Landing: https://et-cosmic-6f2463.gitlab.io/sabor-quantico#void-308
- API: `POST /api/mesh/liquidity/vas/pmu-audit/checkout`
- Requisito: VPS `npm run server:sovereign` + `VITE_PAGES_API_ORIGIN` no CI

## Objeções frequentes

| Objeção | Resposta honesta |
|---------|------------------|
| «É quântico real?» | Não — simulação clássica reproduzível; documentado em AGPL e whitepaper. |
| «E o GDPR?» | Dados no teu VPS / conta; relatório sem PII por defeito no stub. |
| «Preciso de contrato?» | Não para Citizen/Builder — só DAT + saldo $SOV. |

## CTA

1. Abrir `/sabor-quantico#void-308`
2. Depositar $SOV (`#deposito-pareado`) ou modo demo staging
3. Pagar auditoria → descarregar JSON
4. Upsell Builder na mesma página

## Ver também

- [[SPRINT-30D-LUCRO]]
- [[PAGAMENTOS-LOCAIS]]
- `specs/006-cliente-builder-subscribe/spec.md`
