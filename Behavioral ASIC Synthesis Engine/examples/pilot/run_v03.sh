#!/usr/bin/env bash
# Path to v0.3 — demo script (S5).
# Deliberadamente delega ao smoke v0.2+S1 para zero regressão.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "==> B.A.S.E. v0.3 demo (playbook: base-vault/13 - Path to v0.3/13.20 - Forensic Playbook.md)"
echo "    Capstone UART + contratos + design; PCB draft NOT FABRICABLE; HIL fora deste script."
exec "$ROOT/run.sh" "$@"
