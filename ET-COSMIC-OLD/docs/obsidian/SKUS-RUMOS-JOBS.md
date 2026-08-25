> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Transversal** — backlog jobs críticos

# Rumos SKU — visão Jobs (IMC v2)

## Regra de ouro

**Uma dor crítica → um motor → uma experiência.** O resto foi para `archive/snapshot-full-*`.

## Precursores → futuro

Ver `src/b2b/imcSkuLineage.ts` — VOID-76→521, VOID-120→520, etc.

## Problemas raros que atacamos

| ID | Severidade | Insight Jobs |
|----|------------|--------------|
| SYBIL-SENSOR | critical | Não vendemos “blockchain” — vendemos *imprevisibilidade física distribuída*. |
| MITM-ROOM | severe | A sala é o HSM; não precisa de chip Secure Element de €800. |
| IDLE-HASH | critical | Matamos o mining vergonhoso; o CPU faz ciência que alguém paga. |
| ENTROPY-STARVATION | severe | GhostID nunca mais mente “quântico” — só IMC honesto. |
| RARE-SPLIT-BRAIN | rare | ZK aggregation quando o validador central morre. |
| OPT-INTRACTABLE | severe | Logística em segundos na malha, não em horas no SAP. |

## O que não fazemos (e não pedimos desculpa)

- Computação universal quântica
- 200 painéis de demo
- FPGA obrigatório

## Próximo “one more thing”

GhostID renova semente via VOID-512 (sala) + VOID-513 (caos) a cada ciclo — forward secrecy física.
