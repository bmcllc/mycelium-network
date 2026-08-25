# Feature Specification: Builder Subscribe (Cliente)

**Lane**: `cliente`  
**Feature Branch**: `006-cliente-builder-subscribe`  
**Created**: 2026-05-20  
**Status**: Implemented  
**Obsidian**: [SPRINT-30D-LUCRO.md](../../docs/obsidian/cliente/SPRINT-30D-LUCRO.md)

## User Scenarios & Testing

### User Story 1 - Activar Builder na landing (Priority: P1)

Utilizador com saldo $SOV clica «Subscrever Builder» em `/sabor-quantico#builder-subscribe`; o VPS debita 250 $SOV e activa rate limit 1000 req/h por 30 dias.

**Independent Test**: `POST /api/mesh/liquidity/vas/tier/subscribe` + `GET .../vas/tier/status/:accountId`

**Acceptance Scenarios**:

1. **Given** saldo ≥ 250 $SOV, **When** subscribe, **Then** `active: true` e `renewsAt` +30d
2. **Given** saldo insuficiente, **When** subscribe, **Then** HTTP 402 `INSUFFICIENT_SOV` com hint de depósito pareado
3. **Given** subscrição activa, **When** subscribe de novo, **Then** `ALREADY_ACTIVE`

### User Story 2 - Renovação mensal (Priority: P1)

Cron ou poll renova tiers vencidos com novo débito ledger.

**Independent Test**: `npm run tier:renew` ou `POST /api/mesh/liquidity/vas/tier/renew-due`

## Requirements

### Functional Requirements

- **FR-001**: Sistema MUST debitar 250 $SOV/mês no ledger ao subscrever Builder
- **FR-002**: Sistema MUST registar `renewsAt` e estado `active`
- **FR-003**: Sistema MUST renovar automaticamente (cron `tier:renew` ou `SOV_TIER_AUTO_RENEW` no server)
- **FR-004**: UI MUST mostrar saldo, estado activo e erros de renovação na landing

## Success Criteria

- **SC-001**: Subscrição completa em < 2 min com VPS + depósito pareado
- **SC-002**: Renovação falha com saldo zero → `lastRenewalError` visível no status

## Implementation

| Componente | Path |
|------------|------|
| Ledger + persistência | `server/mesh/tierSubscriptions.js` |
| API | `POST /vas/tier/subscribe`, `GET /vas/tier/status/:id`, `POST /vas/tier/renew-due` |
| UI | `src/pages/BuilderSubscribeCheckout.tsx` |
| Cron | `scripts/tier-renewal-cron.mjs`, `npm run tier:renew` |

## Assumptions

- Demo: `SOV_VAS_DEMO=1` ou `NODE_ENV=development` credita antes do débito
- Cron protegido opcional: `SOV_TIER_CRON_SECRET` + header `X-SOV-Cron`
