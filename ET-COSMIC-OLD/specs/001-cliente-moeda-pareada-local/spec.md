# Feature Specification: Moeda pareada local (Cliente)

**Lane**: `cliente`  
**Feature Branch**: `001-cliente-moeda-pareada-local`  
**Created**: 2026-05-27  
**Status**: Partial — depósito pareado implementado (2026-05-20)  
**Obsidian**: [PAGAMENTOS-LOCAIS.md](../docs/obsidian/cliente/PAGAMENTOS-LOCAIS.md)

## User Scenarios & Testing

### User Story 1 - Pagar com par local (Priority: P1)

Utilizador deposita via Lightning/NWC/stablecoin regional; saldo aparece como $SOV pareado; mint DAT para POOL-QUANTUM.

**Independent Test**: E2E `finance:payment-e2e` + mint DAT via `/api/mesh/liquidity`.

**Acceptance Scenarios**:

1. **Given** wallet local configurada, **When** mint DAT, **Then** ledger debita µSOV + taxa bps visível
2. **Given** saldo insuficiente, **When** consume DAT, **Then** falha com erro claro (sem contrato/cobrança manual)

### User Story 2 - Landing Sabor Quântico (Priority: P2)

Utilizador vê preço estimado na calculadora e activa tier Builder via CTA.

**Independent Test**: Pages `/sabor-quantico` carrega com HTTP 200.

## Requirements

### Functional Requirements

- **FR-001**: Sistema MUST parear depósito local → crédito ledger µSOV
- **FR-002**: Sistema MUST aplicar `VITE_PROTOCOL_ROYALTY_BPS` em cada settlement
- **FR-003**: UI MUST mostrar taxas antes de confirmar DAT
- **FR-004**: Sistema MUST NOT exigir contrato ou conta enterprise para Citizen tier

## Success Criteria

- **SC-001**: Utilizador completa mint DAT em < 2 min (stack local)
- **SC-002**: Taxa protocolo visível em `/governance/sovereignty`

## Implementation (depósito pareado)

| API | Path |
|-----|------|
| Intent | `POST /api/economy/deposit/paired/intent` |
| Status | `GET /api/economy/deposit/paired/:depositId` |
| Lightning | `POST /api/lightning/create` + `pairedDepositId` |
| UI | `src/pages/PairedDepositPanel.tsx` → `#deposito-pareado` |

## Assumptions

- VPS opcional via `VITE_PAGES_API_ORIGIN`
- Par local específico configurável por região (roadmap)
- Câmbio: `SOV_SAT_RATE` (default 1000 sats = 1 $SOV)
