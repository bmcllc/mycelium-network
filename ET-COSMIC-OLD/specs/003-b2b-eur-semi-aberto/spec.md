# Feature Specification: B2B EUR semi-aberto

**Lane**: `b2b`  
**Feature Branch**: `003-b2b-eur-semi-aberto`  
**Created**: 2026-05-27  
**Status**: Baseline  
**Obsidian**: [b2b/EUR-SEMI-ABERTO.md](../docs/obsidian/b2b/EUR-SEMI-ABERTO.md)

## User Scenarios & Testing

### User Story 1 - Enterprise evalua SKU público (Priority: P1)

CTO lê catálogo SKU + APIs públicas; decide entre tier $SOV (preferido) ou licença EUR.

**Independent Test**: `npm run b2b:list` + docs `commercialPricing.ts`.

**Acceptance Scenarios**:

1. **Given** metadados SKU públicos, **When** build `VITE_B2B_SKUS=X`, **Then** artefacto gerado sem expor segredos no repo
2. **Given** cliente aceita AGPL, **When** onboarding, **Then** **não** exigir contrato EUR

### User Story 2 - Migração EUR → Protocol-First (Priority: P2)

Cliente enterprise migra de licença anual para tier Enterprise $SOV + DAT.

**Independent Test**: comparativo documentado em Obsidian b2b/.

## Requirements

- **FR-001**: Catálogo SKU MUST stay documented in repo (semi-aberto)
- **FR-002**: Licença comercial MUST NOT block Protocol-First GTM
- **FR-003**: Builds B2B MUST use `VITE_B2B_SKUS` — never default Pages shell

## Success Criteria

- **SC-001**: 100% SKUs listáveis via `b2b:list`
- **SC-002**: Roadmap Protocol-First priorizado sobre propostas EUR em MODELO-NEGOCIO

## Assumptions

- EUR pricing internal reference only — not primary sales motion
