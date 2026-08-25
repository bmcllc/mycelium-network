> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](./obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 4** — whitepaper markdown

# Whitepaper v2.0 — A Evolução Isossupramulada

**ETERNET: Onde a física clássica se torna a arma definitiva contra a dependência quântica**  
*MontêLauro Foundation / Bruno Monteiro Caldas da Cunha — 21 de maio de 2026*

> Versão canónica do repositório. PDF: `npm run whitepaper:build` (após integrar em `whitepaper.tex`).

Ver também: [docs/obsidian/WHITEPAPER-V2.md](./obsidian/WHITEPAPER-V2.md) · [IMC-INFRASTRUCTURE.md](./obsidian/IMC-INFRASTRUCTURE.md)

---

## Resumo

A ETERNET expande seu arcabouço para além da simulação quântica honesta. Este documento apresenta a **Isossupramulação**: paridade com o fenómeno físico (**iso‑**) e transcendência das limitações materiais (**supra‑**) via malha descentralizada e filosofia anacróclasta.

Substituímos FPGA, QRNG de laboratório e periféricos dedicados por **sensores nativos de smartphones** e pela **malha ETERNET**. Monetização: mercado de computação, entropia como serviço, agregação ZK — taxas transparentes (10 bps) para tesouro Nostr. Código AGPL totalmente livre; soberania do nó absoluta.

---

## 1. Introdução

Desde o whitepaper v1.2: PWA, GhostID, PQC, CQR simulado. O risco do dogma quântico motiva o **Isossupramulated Mesh Computer (IMC)** — cada nó é laboratório clássico; a malha amplifica o gêmeo digital.

## 2. Filosofia

### 2.1 Anacroclastia

Coerência > potência bruta; ruído térmico e cavidade acústica > PRNG artificial; hardware já está nos bolsos.

### 2.2 Isossupramulação

| | Significado |
|---|------------|
| **Iso** | Mesmas EDPs, invariâncias, conservação |
| **Supra** | Sharding mesh, MERA, homotopia, LSC |

## 3. Substrato universal (sensores)

| Recurso | Fenómeno | SKU |
|---------|----------|-----|
| Microfone / speaker | IR da sala, ruído | VOID-510, VOID-512 |
| Câmera | Shot noise | VOID-510 |
| Accel / gyro | Browniano | VOID-510 |
| CPU/GPU WASM | Ising, TF | VOID-511, VOID-514 |
| Mesh WebRTC | Caos sincronizado | VOID-513 |

## 4. Arquitetura IMC

Orquestrador **VOID-600**. Motores **VOID-510–514**. Receita **VOID-520–522**.

## 5. Motores

Detalhe em implementação: `server/imc/`, `src/imc/`.

## 6. Monetização

| SKU | Serviço |
|-----|---------|
| VOID-520 | Compute Marketplace |
| VOID-521 | Entropy-as-a-Service |
| VOID-522 | ZK Proof Aggregation |

## 7. Catálogo (resumo)

VOID-510 … VOID-514, VOID-520 … VOID-522, VOID-600.

## 8. Roadmap

| Fase | Meta |
|------|------|
| Imediato | 510–514 + 600 beta |
| Curto | 520, 521 |
| Médio | 522, Chaos-Bell em GhostID |
| Longo | TF WebGL, otimização financeira |

## 9. VOID-700 — Propagação Silenciosa

A malha auto-hospeda-se: **cada site** com `void-mesh.js` torna visitantes em nós (Service Worker + limites LSC 5%/50MB); **cada VPS** com `void-node` contribui 3%/64MB via Nostr, sem portas abertas. VOID-701 distribui sites estáticos; VOID-702 gere ganhos e consentimento. Os motores 520–522 executam sobre esta infraestrutura.

> *A hospedagem não é um lugar. É um estado de espírito da rede.*

Ver [Silent-Mesh-Hosting.md](./guides/Silent-Mesh-Hosting.md).

## 10. Economia $SOV (VOID-710)

Moeda pela malha: **VOID-704** paga donos de sites por tráfego; **VOID-703** vende binários/software; **VOID-705** paga mineração ética (arsenal IMC, sem hash vazio). Ledger µSOV, taxa 10 bps transparente. Painel: `/finance/sov-economy`.

## 11. Conclusão

> *O dinheiro se torna invisível. O controle se torna impossível. E a física esquecida se torna a arma definitiva.*

---

*Implementação: `VITE_IMC_V2=1` · VOID-700: `/network/silent-hosting` · backup: `npm run imc:backup`*
