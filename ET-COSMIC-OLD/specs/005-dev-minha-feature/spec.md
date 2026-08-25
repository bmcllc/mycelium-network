# Feature Specification: [FEATURE NAME]

**Lane**: `cliente` | `dev` | `b2b` *(obrigatório)*  
**Feature Branch**: `[###-<faixa>-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Obsidian**: `docs/obsidian/<faixa>/`  
**Input**: User description: "$ARGUMENTS"

## Lane checklist

- [ ] Branch prefix matches lane (`NNN-cliente-`, `NNN-dev-`, `NNN-b2b-`)
- [ ] Moeda correcta (par local / $SOV / EUR)
- [ ] Sem contrato jurídico unless lane `b2b` + licença explícita
- [ ] Nota Obsidian linked

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable metric]

## Assumptions

- [Assumption about lane, moeda, código semi-aberto]
