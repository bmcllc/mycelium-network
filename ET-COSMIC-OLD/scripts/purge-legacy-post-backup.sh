#!/usr/bin/env bash
# Remove código legado já preservado em archive/snapshot-full-* (IMC v2 only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEEP_COMPONENTS=(
  Messenger.tsx EternetDashboard.tsx ZKPLab.tsx GhostVPNPanel.tsx
  PqcDeveloperDashboard.tsx CQRPqcPanel.tsx KarmaWallet.tsx
  PaymentGatewayPanel.tsx NostrDEXPanel.tsx SovereignPoolsPanel.tsx
  DistanceBridge.tsx NostrSyncPanel.tsx AcousticHandshakePanel.tsx
  BrunoTheoryPanel.tsx CosmicHarmonyPanel.tsx IMCCorePanel.tsx
  AnacroclastiaPanel.tsx LUSUSTerminalPanel.tsx ConsentContractPanel.tsx
  SovereigntyPanel.tsx AntiSybilLab.tsx GhostLockerPanel.tsx GhostIDSetup.tsx
  ProtocolRoyaltyDisclosure.tsx NotFoundPage.tsx Sidebar.tsx BottomBar.tsx
  PanelWrapper.tsx AppErrorBoundary.tsx DevSetupBanner.tsx CategoryHubPanel.tsx
  ConsentBanner.tsx PanelTierBadge.tsx AppLanding.tsx Glossary.tsx
  SectionHeader.tsx ChatBubble.tsx
)

echo "→ Remover painéis legado em src/components/"
for f in src/components/*.tsx; do
  base=$(basename "$f")
  keep=0
  for k in "${KEEP_COMPONENTS[@]}"; do
    [[ "$base" == "$k" ]] && keep=1 && break
  done
  if [[ $keep -eq 0 ]]; then
    rm -f "$f"
    echo "  deleted $f"
  fi
done

echo "→ Remover motor Python quantum/"
rm -rf quantum/

echo "→ Remover AQRE servidor legado (LUSUS/IMC substituem)"
rm -rf server/aqre/

echo "→ Remover painel isossupra duplicado (unificado em IMC)"
rm -f src/components/IsossupraCorePanel.tsx 2>/dev/null || true

echo "→ Remover research/heptary tests legado"
rm -f src/crypto/heptaryQuantum.test.ts 2>/dev/null || true
rm -f src/research/quantumResearch.ts 2>/dev/null || true

echo "✓ Purge concluído. Corra: npm run imc:preflight && npm test"
