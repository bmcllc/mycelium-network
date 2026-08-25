# Feature Specification: Depósito pareado (Cliente)

**Lane**: `cliente`  
**Feature Branch**: `007-cliente-deposit-pareado`  
**Created**: 2026-05-20  
**Status**: Implemented  
**Obsidian**: [PAGAMENTOS-LOCAIS.md](../../docs/obsidian/cliente/PAGAMENTOS-LOCAIS.md)  
**Input**: Lightning/NWC credita ledger $SOV

## Lane checklist

- [x] Branch prefix matches lane (`007-cliente-deposit-pareado`)
- [x] Moeda correcta (par local → $SOV ledger)
- [x] Sem contrato jurídico
- [x] Nota Obsidian linked

## User Scenarios & Testing

### User Story 1 - Depositar via Lightning (Priority: P1)

Utilizador indica montante em $SOV; sistema gera intent + invoice Lightning; ao confirmar pagamento, saldo µSOV aparece na conta local.

**Why this priority**: Sem depósito não há Builder nem VOID-308.

**Independent Test**: `npm run finance:payment-e2e` (secção paired deposit) ou fluxo manual em `/sabor-quantico#deposito-pareado`

**Acceptance Scenarios**:

1. **Given** VPS online, **When** `POST /deposit/paired/intent` + `POST /lightning/create` com `pairedDepositId`, **Then** intent `pending` com `amountSat` derivado de `SOV_SAT_RATE`
2. **Given** invoice confirmada (LND ou simulate-settle dev), **When** webhook/status, **Then** `deposit.status === credited` e `balanceSov` aumenta
3. **Given** `method: simulated` em dev, **When** intent, **Then** crédito imediato no ledger

### User Story 2 - NWC / wallet soberana (Priority: P2)

Mesmo fluxo Lightning com label `paired:{depositId}`; NWC paga invoice; crédito automático.

**Independent Test**: Browser `/finance/payment` + NWC configurado

## Requirements

### Functional Requirements

- **FR-001**: Sistema MUST parear depósito confirmado → `creditAccount` µSOV
- **FR-002**: Sistema MUST persistir intents em `void_pool/paired-deposits.json`
- **FR-003**: Sistema MUST rejeitar invoice com `pairedDepositId` inválido ou já liquidado
- **FR-004**: UI MUST mostrar BOLT11 (ou preview) e saldo após crédito

## Success Criteria

- **SC-001**: Depósito simulado completa em < 30 s (stack local dev)
- **SC-002**: Depósito Lightning E2E (simulate-settle) credita ledger sem intervenção manual no ledger

## Implementation

| Componente | Path |
|------------|------|
| Motor | `server/economy/pairedDeposit.js` |
| API economia | `POST/GET /api/economy/deposit/paired/*` |
| Hook Lightning | `server/server.js` — `pairedDepositId` em create/webhook/status |
| UI | `src/pages/PairedDepositPanel.tsx` |
| Cliente TS | `src/economy/sovEconomyClient.ts` |

## Assumptions

- Câmbio fixo configurável: `SOV_SAT_RATE` (default 1000 sats = 1 $SOV)
- Demo: `SOV_DEPOSIT_DEMO=1` ou `NODE_ENV=development`
- Pages: APIs no VPS via `VITE_PAGES_API_ORIGIN`
- LND: `LND_REQUEST_TIMEOUT_MS=5000`; staging `LND_FALLBACK_SIM=1`; produção LND real sem fallback
- `simulate-settle` permitido para `mode: simulation` ou `simulation_fallback`
