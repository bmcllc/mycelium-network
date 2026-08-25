---
lane: cliente
priority: P0
tags:
  - sprint
  - lucro-curto
  - sabor-quantico
---

# Sprint 30 dias — máximo lucro, mínimo atrito

> **Regra:** zero contrato · zero vendas consultivas · só DAT + tier + VAS clicável.

## Ranking receita (curto prazo)

| # | Produto | Ticket | Velocidade | Margem tua | Por quê |
|---|---------|--------|------------|------------|---------|
| **1** | **VOID-308** auditoria PMU | 100 $SOV/job | ⚡ 1 clique | ~100% | Compliance vende sozinho a pharma/fintech |
| **2** | **Tier Builder** | 250 $SOV/mês | ⚡ 15 min | recorrente | CTA já na landing `/sabor-quantico` |
| **3** | **POOL-QUANTUM** DAT | 4,5% + bps | médio | escala | Maior taxa protocolo — cada job paga |
| **4** | **Tier Enterprise** | 2 500 $SOV/mês | lento | alto | Só depois de 3 Builders activos |
| **5** | B2B EUR | €89k–890k | 🐌 meses | alto | **Não agora** — canal secundário |

**Conclusão:** lead com **Sabor Quântico + VOID-308 + Builder**. B2B fica na gaveta.

---

## Semana 1 — dinheiro ligado (infra)

- [ ] VPS `npm run server:sovereign` online 24/7
- [ ] GitLab CI: `VITE_PAGES_API_ORIGIN=https://teu-vps:3001` (variável CI — ver `.gitlab-ci.yml`)
- [ ] Tesouraria Nostr configurada (`VITE_ETRNET_TREASURY_NPUB`)
- [ ] Testar mint/consume DAT POOL-QUANTUM end-to-end
- [ ] Partilhar link: `https://et-cosmic-6f2463.gitlab.io/sabor-quantico`

## Semana 2 — oferta premium (VOID-308)

- [x] Checkout landing `/sabor-quantico#void-308` (mint DAT + consume + JSON)
- [x] Pitch 1 página: [[VOID-308-PITCH]] (100 $SOV, sem contrato)
- [ ] Target: 1 lab pharma OU 1 fintech local (dados sensíveis)
- [ ] Entrega: relatório `void_pool/reports/pmu-audit-*.json` + hash
- [ ] Upsell: Builder 250 $SOV/mês para fila prioritária

## Semana 3 — volume (provedores)

- [ ] Recrutar **3 provedores** liquidity mining (bonus 2× bootstrap)
- [ ] GPUs ociosas · universidade · datacenter pequeno
- [ ] Cada settlement DAT → **4,5% POOL-QUANTUM** para tesouraria

## Semana 4 — escalar o que funcionou

- [ ] Duplicar pitch VOID-308 se fechou 1 deal
- [ ] Citizen → Builder: rate limit 100→1000 req/h
- [ ] Documentar case study honesto no Obsidian (sem hype quântico)

---

## Pitch de 30 segundos

> *«Simulação tensor soberana, auditável, pay-per-use. Sem contrato AWS de 3 anos. Auditoria PMU 100 $SOV. Builder 250 $SOV/mês — activas em 15 minutos.»*

---

## Comandos do dia

```bash
npm run server:sovereign          # VPS
npm run deploy:gitlab             # landing live
npm run finance:payment-e2e       # validar pagamentos
npm run cliente:lane-e2e          # depósito pareado + Builder + VOID-308 price
npm run spec:cliente -- --short-name void308-checkout "Checkout VOID-308"
npm run tier:renew                 # cron renovação tiers (systemd)
```

## Métricas alvo (30 dias)

| Métrica | Meta mínima | Meta stretch |
|---------|-------------|--------------|
| Builders pagantes | 2 | 5 |
| Auditorias VOID-308 | 3 | 10 |
| GMV POOL-QUANTUM ($SOV) | 500 | 5 000 |
| Provedores bootstrap | 3 | 10 |

## Ver também

- [[PAGAMENTOS-LOCAIS]]
- [[../MODELO-NEGOCIO]]
- [PROTOCOL-FIRST-MESH.md](../../PROTOCOL-FIRST-MESH.md)
- Landing: `/sabor-quantico`
