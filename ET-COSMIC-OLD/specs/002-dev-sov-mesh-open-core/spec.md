# Feature Specification: Mesh $SOV open core (Dev)

**Lane**: `dev`  
**Feature Branch**: `002-dev-sov-mesh-open-core`  
**Created**: 2026-05-27  
**Status**: Baseline  
**Obsidian**: [dev/README.md](../docs/obsidian/dev/README.md)

## User Scenarios & Testing

### User Story 1 - Contribuidor fork AGPL (Priority: P1)

Dev clona repo, corre `npm run dev` + `server:sovereign`, contribui patch em `src/protocol/liquidity/`.

**Independent Test**: `npm run validate` verde.

**Acceptance Scenarios**:

1. **Given** fork público, **When** PR merge, **Then** código permanece AGPL
2. **Given** provedor registado, **When** liquidity mining activo, **Then** bonus 2× nos primeiros slots

### User Story 2 - Spec-Kit feature dev (Priority: P2)

Dev cria spec com `npm run spec:dev`, implementa via `/speckit-implement`.

**Independent Test**: pasta `specs/NNN-dev-*` com spec/plan/tasks.

## Requirements

- **FR-001**: Monorepo MUST remain AGPL-3.0-or-later for protocol code
- **FR-002**: DAT settlement MUST debit/credit ledger automatically
- **FR-003**: Spec-Kit workflow MUST tag lane `dev` in branch name

## Success Criteria

- **SC-001**: `npm run core:test` + liquidity integration tests pass
- **SC-002**: Documentação Obsidian dev/ sincronizada com specs/

## Assumptions

- GitLab Pages shell separado do dev full IMC (`--mode pages` vs `sovereign`)
