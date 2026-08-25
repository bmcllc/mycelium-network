> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 4** — template preços

# Template de preços B2B — ET-COSMIC

> Preencher por SKU ou bundle antes de proposta comercial. Valores em **EUR**.  
> Lista canónica: `src/b2b/commercialPricing.ts` · Simulador: `npm run b2b:revenue -- <SKU>`  
> Estratégia: [MONETIZATION-PLAYBOOK.md](./MONETIZATION-PLAYBOOK.md) · Catálogo: [B2B-PRODUCT-LINES.md](./B2B-PRODUCT-LINES.md)

---

## 1. Identificação do cliente

| Campo | Valor |
|-------|-------|
| Cliente / entidade | |
| Contacto | |
| Modelo de entrega | ☐ PWA white-label ☐ APK ☐ Docker appliance ☐ SDK ☐ Suporte |
| SKUs / bundle | ex. `SOVEREIGN-CITIZEN`, `FULL-ENTERPRISE` |
| Tier | ☐ growth (×0,55) ☐ enterprise (×1) ☐ sovereign (×1,35) |
| Rotas UI (`npm run b2b:list -- …`) | |

---

## 2. Tabela de preços (lista interna 2026)

### Bundles comerciais (licença anual)

| Bundle | Lista / ano | Proposta cliente | Desconto |
|--------|-------------|------------------|----------|
| SOVEREIGN-CITIZEN | €89 000 | | |
| MESSENGER-ENTERPRISE | €165 000 | | |
| FINANCE-NODE | €245 000 | | |
| FULL-ENTERPRISE | €890 000 | | |
| RESEARCH-INSTITUTE | €320 000 | | |
| WHITE-LABEL-OEM | €1 200 000 | | |
| VOID-CATALOG-FULL | €45 000 | | |

### Taxa de protocolo (paralelo — GPL transparente)

| Volume GMV / ano (EUR) | bps contrato | Receita protocolo / ano |
|------------------------|--------------|-------------------------|
| | 10 (comunidade) / 25–50 (enterprise) | `npm run b2b:revenue -- … --volume-eur=` |

Mínimo enterprise: **€36 000/ano** (ver `PROTOCOL_MINIMUM_EUR_YEAR`).

### Setup ano 1

| Item | Lista | Proposta |
|------|-------|----------|
| Implementação (22% ACV) | auto | |
| VOID-305 PWA build CI | €28 000 | |
| VOID-306 Android MDM | €35 000 | |
| VOID-308 Research archive | €85 000 | |

### Painéis atómicos (referência)

| Rota | SKU | Lista / ano |
|------|-----|-------------|
| /messenger | VOID-11 | €42 000 |
| /finance/payment | VOID-37 | €38 000 |
| /compute/cosmic-harmony | VOID-57 | €48 000 |
| /compute/bruno-theory | VOID-54 | €55 000 |

---

## 3. Simulação rápida

```bash
npm run b2b:revenue -- SOVEREIGN-CITIZEN
npm run b2b:revenue -- FULL-ENTERPRISE --volume-eur=50000000 --bps=25 --tier=sovereign
npm run b2b:revenue -- FINANCE-NODE --volume-eur=100000000 --bps=30
```

---

## 4. Implementação técnica (checklist)

- [ ] `VITE_B2B_SKUS` definido no build
- [ ] `npm run b2b:list -- <SKU>` validado
- [ ] `npm run production:go` ou `build:b2b`
- [ ] `VITE_ETRNET_TREASURY_NPUB` + `VITE_PROTOCOL_ROYALTY_BPS` em produção
- [ ] Contrato comercial assinado (produto fechado) — [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md)

---

## 5. Termos (rascunho)

| Item | Texto sugerido |
|------|----------------|
| Licença comunidade | GPL-3.0-or-later — forks públicos |
| Licença comercial | Ramo 2 — [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) |
| Taxa protocolo | Transparente em UI; bps + mínimo anual em anexo |
| Duração | 12 meses; renovação automática; aviso 30 dias |
| Suporte | Horas incluídas: ___ / ano |

---

## 6. Histórico de propostas

| Data | Cliente | SKUs | Ano 1 (EUR) | Estado |
|------|---------|------|-------------|--------|
| | | | | ☐ enviada ☐ aceite ☐ perdida |

---

*Não commitar valores reais de clientes em repositório público.*
