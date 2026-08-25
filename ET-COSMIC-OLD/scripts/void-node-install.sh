#!/usr/bin/env bash
# VOID-700 — instalador do daemon VPS (simulado: registo na API ETERNET).
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ETERNET void-node — Silent Mesh Hosting (VOID-700)      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Limites: CPU máx 3%, RAM máx 64 MB. Sem portas abertas — só relays Nostr."
echo "Trabalho útil: VOID-520 Marketplace (Ising, Thomas-Fermi)."
echo ""
read -r -p "Continuar instalação? [s/N] " ans
[[ "${ans,,}" == "s" || "${ans,,}" == "sim" || "${ans,,}" == "y" ]] || exit 0

API="${ETRNET_API:-http://127.0.0.1:3001}"
NODE_ID="vps-$(hostname | sha256sum | cut -c1-16)"

payload=$(cat <<EOF
{"mode":"vps","nodeId":"$NODE_ID","consent":{"compute":true,"entropy":false,"cdn":true}}
EOF
)

if command -v curl >/dev/null 2>&1; then
  curl -sf -X POST "$API/api/silent-mesh/nodes/register" \
    -H "Content-Type: application/json" \
    -d "$payload" && echo "" || echo "⚠ API offline — guarde nodeId: $NODE_ID"
else
  echo "nodeId: $NODE_ID (registar quando API estiver online)"
fi

UNIT_DIR="${HOME}/.config/systemd/user"
mkdir -p "$UNIT_DIR"
cat > "$UNIT_DIR/etrnet-void-node.service" <<UNIT
[Unit]
Description=ETERNET void-node (VOID-700)
After=network-online.target

[Service]
Type=simple
ExecStart=/bin/sh -c 'while true; do sleep 300; curl -sf -X POST "$API/api/silent-mesh/nodes/$NODE_ID/heartbeat" -H "Content-Type: application/json" -d "{\\"cpuPct\\":1}" || true; done'
CPUQuota=3%
MemoryMax=64M
Restart=on-failure

[Install]
WantedBy=default.target
UNIT

echo ""
echo "✓ Unidade systemd: $UNIT_DIR/etrnet-void-node.service"
echo "  systemctl --user enable --now etrnet-void-node.service"
echo "✓ GhostID derivado do hardware no primeiro registo completo (VOID-521)."
