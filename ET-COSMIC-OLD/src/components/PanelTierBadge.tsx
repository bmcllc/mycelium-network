import { memo } from "react";
import {
  getPanelTier,
  isHardwareV2Panel,
  PANEL_TIER_LABELS,
  PANEL_TIER_STYLES,
  type PanelTier,
} from "../panelTiers";

function PanelTierBadge({
  path,
  category,
  tier: tierOverride,
}: {
  path?: string;
  category?: string;
  tier?: PanelTier;
}) {
  const tier = tierOverride ?? (path ? getPanelTier(path, category) : undefined);
  if (!tier) return null;

  const style = PANEL_TIER_STYLES[tier];
  const hardwareV2 = path ? isHardwareV2Panel(path) : false;
  const label = hardwareV2 ? `${PANEL_TIER_LABELS[tier]} · v2 hw` : PANEL_TIER_LABELS[tier];

  return (
    <span
      className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0"
      style={{ color: style.color, borderColor: style.border, background: `${style.color}10` }}
      title={
        hardwareV2
          ? "Real+ — hardware BLE/LoRa/áudio (Capacitor)"
          : tier === "production"
            ? "Real — motor local, entropia Ω, WASM"
            : "Real+ — precisa rede, relay, pool ou LND"
      }
    >
      {label}
    </span>
  );
}

export default memo(PanelTierBadge);
