#!/usr/bin/env bash
# lattice.install — Fase 1: planta um nó do Ecossistema Lattice numa máquina.
#
#   curl -sSL <url>/scripts/install-lattice.sh | bash
#   ./scripts/install-lattice.sh                 # folha (CGNAT/casa) — default
#   sudo ./scripts/install-lattice.sh --sporocarp [--announce-ip IP]
#
# Escolhe a membrana pela prova, nunca por promessa:
#   • sem proof de inbound  → FOLHA (Hybrid Theory: Nostr/QEL/GhostID auto)
#   • com MYCELIUM_REACHABLE=1 (gate verify-sporocarp.sh) → ESPOROCARPO systemd
# Docs: docs/volunteer-sporocarp.md · docs/matriz_transporte_nat.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="folha"
SEED_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sporocarp) MODE="sporocarp"; shift ;;
    --announce-ip|--announce-ip6) SEED_ARGS+=("$1" "$2"); shift 2 ;;
    *) echo "uso: $0 [--sporocarp] [--announce-ip IP] [--announce-ip6 IP6]" >&2; exit 1 ;;
  esac
done

say() { printf '\033[32m[🌱]\033[0m %s\n' "$*"; }

# 1) Binário — compila se não existir (curl|sh em máquina fresca).
BIN="$ROOT/target/release/mycelium"
if [[ ! -x "$BIN" ]]; then
  say "binário ausente — compilando (cargo build -p mycelium-cli --release)…"
  if ! command -v cargo >/dev/null 2>&1; then
    # Fallback: toolchain rustup sem shim no PATH (~/.cargo/bin vazio).
    TC="$(ls -d "$HOME"/.rustup/toolchains/*/bin 2>/dev/null | sort | tail -1 || true)"
    [[ -x "$TC/cargo" ]] && export PATH="$TC:$PATH"
  fi
  command -v cargo >/dev/null || { echo "ERRO: cargo ausente — instale https://rustup.rs" >&2; exit 1; }
  (cd "$ROOT" && cargo build -p mycelium-cli --release)
fi

# 2) Membrana.
if [[ "$MODE" == "sporocarp" ]]; then
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "ERRO: --sporocarp exige root (systemd). Rode: sudo $0 --sporocarp" >&2
    exit 1
  fi
  # Gate intacto: install-seed.sh recusa sem MYCELIUM_REACHABLE=1 pós-verificação.
  exec "$ROOT/scripts/install-seed.sh" "${SEED_ARGS[@]}"
fi

# 3) Folha: sobe organismo (reuse run-folha.sh — sem announce, sem --sporocarp).
"$ROOT/scripts/run-folha.sh"

# 3b) Descoberta sem servidor: seed book via DNS TXT (DuckDNS) + catálogo default.
if [[ -n "${MYCELIUM_DNS_SEED:-}" ]]; then
  say "buscando seeds no DNS TXT ${MYCELIUM_DNS_SEED}…"
  "$BIN" --home "${MYCELIUM_HOME:-$HOME/.local/share/mycelium}" seeds fetch --dns "$MYCELIUM_DNS_SEED" || true
else
  "$BIN" --home "${MYCELIUM_HOME:-$HOME/.local/share/mycelium}" seeds fetch --dns || true
fi

# 4) Gamificação — mostra o que o nó ganhou por estar vivo.
sleep 1
say "saldo do ledger (nutrientes por contribuir):"
"$BIN" --home "${MYCELIUM_HOME:-$HOME/.local/share/mycelium}" balance 2>/dev/null \
  || say "balance indisponível ainda (daemon aquecendo)"

cat <<'EOF'

Próximos passos:
  lattice status                      estado vivo (membrana, vizinhos, ions)
  lattice sow --message oi --hybrid   semeia Plot (QEL+Nostr+blockstore)
  lattice resurrect <fw.bin>          Forja: analisa binário → Ion no Horizon
  lattice base analyze <fw.bin>       só a análise SpecterProbe

Folha atrás de CGNAT? Vizinhos chegam via Nostr transport (outbound WSS).
Tem VPS e quer ser esporocarpo?  docs/volunteer-sporocarp.md (gate de prova).
EOF
