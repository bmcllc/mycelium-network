import type { LiquidityPoolId, LiquidityProvider } from "./datTypes";

/** Bootstrap — primeiros provedores recebem bonus em DAT settlement. */
export const LIQUIDITY_MINING_BOOTSTRAP = {
  maxProviders: 30,
  bonusMultiplier: 2,
  bonusCapMicro: 500_000,
  /** 90 dias desde deploy — override via env no servidor. */
  phaseDurationMs: 90 * 86_400_000,
} as const;

export function isBootstrapPhaseActive(
  phaseStartedAt: number,
  now = Date.now(),
): boolean {
  return now - phaseStartedAt < LIQUIDITY_MINING_BOOTSTRAP.phaseDurationMs;
}

export function isBootstrapSlotAvailable(providerCount: number): boolean {
  return providerCount < LIQUIDITY_MINING_BOOTSTRAP.maxProviders;
}

/** Bonus adicional sobre netMicro (multiplier 2× → +100% do net, até cap). */
export function computeBootstrapBonus(
  netMicro: number,
  providerBonusMicroSoFar: number,
): number {
  const capRemaining =
    LIQUIDITY_MINING_BOOTSTRAP.bonusCapMicro - providerBonusMicroSoFar;
  if (capRemaining <= 0) return 0;
  const bonus =
    netMicro * (LIQUIDITY_MINING_BOOTSTRAP.bonusMultiplier - 1);
  return Math.min(Math.floor(bonus), capRemaining);
}

export function createLiquidityProvider(opts: {
  providerId: string;
  accountId: string;
  poolId: LiquidityPoolId;
  bootstrapEligible: boolean;
}): LiquidityProvider {
  return {
    providerId: opts.providerId,
    accountId: opts.accountId,
    poolId: opts.poolId,
    bootstrapEligible: opts.bootstrapEligible,
    registeredAt: Date.now(),
    earnedMicro: 0,
    bonusMicro: 0,
  };
}
