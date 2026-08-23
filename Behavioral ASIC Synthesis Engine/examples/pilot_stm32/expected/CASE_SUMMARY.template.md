# Pilot STM32 CASE_SUMMARY — template (stable fields)

| Check | Expected |
|-------|----------|
| Fixtures SHA256 | OK |
| Design CPU | STM32F103C8 (prefer ST) |
| Contracts | ≥70% (wedge USART: 2/2) |
| Capstone page | 0x40013000 (USART1 regs @ 0x40013800) |
| Event-graph golden | matches `expected/event_graph.{dot,mmd}` |
| Prove golden | matches `expected/proof_report.golden.json` |
| Host smoke | n/a (USART wedge; RP host gate separately) |

W1 dual SPI: `run_w1_spi.sh` (SPI2 @ 0x40003800).
