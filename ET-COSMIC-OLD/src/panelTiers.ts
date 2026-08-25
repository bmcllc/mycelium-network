/**
 * Classificação v2 — Real (produção) vs Real+ (precisa rede/servidor/hardware).
 * Sem tier "simulado": fallbacks CSPRNG são rotulados no motor, não no badge.
 */

export type PanelTier = "production" | "real_plus";

/** @deprecated Alias para migração */
export type LegacyPanelTier = PanelTier | "lab" | "simulated";

export const PANEL_TIER_LABELS: Record<PanelTier, string> = {
  production: "Real",
  real_plus: "Real+",
};

export const PANEL_TIER_STYLES: Record<PanelTier, { color: string; border: string }> = {
  production: { color: "#b6ff3a", border: "#b6ff3a40" },
  real_plus: { color: "#6cf0ff", border: "#6cf0ff40" },
};

/** Módulos que exigem rede, LND, relay, pool remoto ou hardware v2. */
const REAL_PLUS_PATHS = new Set<string>([
  "/harvester",
  "/finance/payment",
  "/finance/nostr-dex",
  "/finance/chimera",
  "/finance/pools",
  "/finance/dex",
  "/finance/stablecoin",
  "/finance/rwa",
  "/finance/janus",
  "/network/mesh",
  "/network/distance",
  "/network/parasitic",
  "/network/acoustic",
  "/network/nostr-oracle",
  "/network/silent-hosting",
  "/network/mesh-cdn",
  "/lab/lusus",
  "/lab/eaas",
  "/terminal/marketplace",
  "/terminal/gpu-mining",
  "/terminal/lua",
  "/terminal/watchtower",
  "/terminal/symbiont",
  "/governance/dao",
  "/vault/phopper",
  "/vault/faucet",
]);

/** Todos os outros paths → Real (motor local / WASM / Ω). */
export function getPanelTier(path: string, _category?: string): PanelTier {
  if (REAL_PLUS_PATHS.has(path)) return "real_plus";
  return "production";
}

/** Transporte físico (BLE/LoRa/áudio) — Capacitor. */
export const HARDWARE_V2_PATHS = new Set([
  "/network/distance",
  "/network/acoustic",
  "/network/parasitic",
]);

export function isHardwareV2Panel(path: string): boolean {
  return HARDWARE_V2_PATHS.has(path);
}

/** Núcleo prometido na landing — todos Real ou Real+. */
export const V1_PRODUCTION_PATHS = [
  "/messenger",
  "/dashboard",
  "/crypto/ghostid",
  "/crypto/zkp",
  "/crypto/pqc",
  "/crypto/cqr-pqc",
  "/finance/payment",
  "/finance/nostr-dex",
  "/finance/chimera",
  "/finance/pools",
  "/network/mesh",
  "/compute/cosmic-harmony",
  "/compute/bruno-theory",
  "/compute/isossupra",
  "/compute/imc",
  "/compute/pmu-roadmap",
  "/governance/consent",
  "/governance/dao",
  "/governance/anti-sybil",
] as const;
