/**
 * Pricing legado EUR (propostas internas) + constantes Protocol-First $SOV.
 * Go-to-market principal: docs/PROTOCOL-FIRST-MESH.md — sem contratos jurídicos.
 */

export type PricingTier = "community" | "growth" | "enterprise" | "sovereign";

/** Tiers Protocol-First ($SOV/mês) — debito automático ledger. */
export const PROTOCOL_TIER_SOV_MONTH: Record<string, number> = {
  citizen: 50,
  builder: 250,
  enterprise: 2500,
  sovereign: 25000,
};
export const DEFAULT_PROTOCOL_BPS = 10;
export const ENTERPRISE_PROTOCOL_BPS_MIN = 15;
/** Parceiros enterprise: 15–50 bps (config protocolo, não contrato). */
export const ENTERPRISE_PROTOCOL_BPS_MAX = 50;

/** Mínimo anual de taxa de protocolo (EUR) — cláusula contratual típica enterprise. */
export const PROTOCOL_MINIMUM_EUR_YEAR = 36_000;

/** Setup / implementação (% do ACV ano 1). */
export const SETUP_FEE_PCT_ACV = 0.22;

/** Licença anual por bundle comercial (EUR). */
export const BUNDLE_LIST_EUR_YEAR: Record<string, number> = {
  "SOVEREIGN-CITIZEN": 89_000,
  "MESSENGER-ENTERPRISE": 165_000,
  "CRYPTO-LAB": 198_000,
  "FINANCE-NODE": 245_000,
  "COMPUTE-WORKER": 178_000,
  "GPU-ORCHESTRATION": 212_000,
  "RESEARCH-INSTITUTE": 320_000,
  "EDGE-INTELLIGENCE": 142_000,
  "PRIVACY-MAX": 128_000,
  "AMP-GOVERNANCE-PACK": 156_000,
  "QUANTUM-LAB-PACK": 275_000,
  "FULL-ENTERPRISE": 890_000,
  "VOID-CATALOG-FULL": 45_000,
  "WHITE-LABEL-OEM": 1_200_000,
  "CERTIFIED-PRODUCTION": 95_000,
};

/** Painéis UI (rota primária) — EUR/ano. */
export const PANEL_LIST_EUR_YEAR: Record<string, number> = {
  "/messenger": 42_000,
  "/finance/payment": 38_000,
  "/finance/dex": 35_000,
  "/finance/nostr-dex": 32_000,
  "/compute/cosmic-harmony": 48_000,
  "/compute/bruno-theory": 55_000,
  "/compute/isossupra": 120_000,
  "/governance/sovereignty": 18_000,
  "/governance/dao": 28_000,
  "/defi/phopper": 26_000,
  "/terminal/gpu-mining": 24_000,
  "/dashboard": 12_000,
};

/** Infra / runtime — EUR/ano por unidade. */
export const INFRA_LIST_EUR_YEAR: Record<string, number> = {
  "VOID-02": 24_000,
  "VOID-03": 65_000,
  "VOID-05": 42_000,
  "VOID-07": 18_000,
  "VOID-09": 120_000,
};

/** Serviços one-shot (EUR). */
export const SERVICE_LIST_EUR_ONCE: Record<string, number> = {
  "VOID-305": 28_000,
  "VOID-306": 35_000,
  "VOID-308": 85_000,
  "VOID-319": 12_000,
};

/** Licença anual por produto individual (EUR). */
export const PRODUCT_LIST_EUR_YEAR: Record<string, number> = {
  "core-sdk": 45_000,
  "lusus-engine": 120_000,
  "aqre-engine": 95_000,
  "sovereign-economy": 85_000,
  "void-stack": 165_000,
  "imc-isossupra": 120_000,
  "pqc-service": 38_000,
  "lightning-payment": 38_000,
  "qrc-lab": 178_000,
  "pmu-governance": 56_000,
};

/** Tiers Protocol-First por produto ($SOV/mês). */
export const PRODUCT_SOV_MONTH: Record<string, number> = {
  "core-sdk": 50,
  "lusus-engine": 250,
  "aqre-engine": 250,
  "sovereign-economy": 250,
  "void-stack": 2_500,
  "imc-isossupra": 2_500,
  "pqc-service": 250,
  "lightning-payment": 250,
  "qrc-lab": 2_500,
  "pmu-governance": 250,
};

/** Multiplicador por tier de contrato. */
export const TIER_MULTIPLIER: Record<PricingTier, number> = {
  community: 0,
  growth: 0.55,
  enterprise: 1,
  sovereign: 1.35,
};

export function estimateProtocolFeeEurYear(
  volumeEurYear: number,
  bps: number = DEFAULT_PROTOCOL_BPS,
  minimumEur = PROTOCOL_MINIMUM_EUR_YEAR,
): number {
  const variable = (volumeEurYear * bps) / 10_000;
  return Math.max(minimumEur, Math.round(variable));
}

export function estimateSetupFeeEur(acvYear1: number, pct = SETUP_FEE_PCT_ACV): number {
  return Math.round(acvYear1 * pct);
}
