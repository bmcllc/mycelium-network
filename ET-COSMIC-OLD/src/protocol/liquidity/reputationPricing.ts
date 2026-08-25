import type { LiquidityPoolId } from "./datTypes";
import { getPoolById } from "./pools";

export interface ReputationPricingInput {
  poolId: LiquidityPoolId;
  reputationScore: number;
  demandFactor?: number;
  units?: number;
}

export interface ReputationPricingResult {
  baseMicro: number;
  reputationMultiplier: number;
  demandFactor: number;
  unitPriceMicro: number;
  totalMicro: number;
}

/** reputationScore 0–100 → multiplicador 0.8 (novato) a 1.5 (enterprise comprovado). */
export function reputationMultiplier(reputationScore: number): number {
  const clamped = Math.max(0, Math.min(100, reputationScore));
  return 0.8 + (clamped / 100) * 0.7;
}

/** demandFactor 1.0 normal · até 3.0 pico. */
export function computeReputationPrice(input: ReputationPricingInput): ReputationPricingResult {
  const pool = getPoolById(input.poolId);
  const baseMicro = pool?.basePriceMicroPerUnit ?? 1000;
  const rep = reputationMultiplier(input.reputationScore);
  const demand = Math.max(0.5, Math.min(3, input.demandFactor ?? 1));
  const unitPriceMicro = Math.ceil(baseMicro * rep * demand);
  const units = Math.max(1, input.units ?? 1);
  return {
    baseMicro,
    reputationMultiplier: rep,
    demandFactor: demand,
    unitPriceMicro,
    totalMicro: unitPriceMicro * units,
  };
}
