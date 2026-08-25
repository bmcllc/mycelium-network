import type { AccessTierId, DynamicAccessToken, LiquidityPoolId, ZKProofStub } from "./datTypes";
import { computeReputationPrice } from "./reputationPricing";
import { getPoolById } from "./pools";

let datSeq = 0;

export function mintDat(opts: {
  resourceId: string;
  poolId: LiquidityPoolId;
  reputationScore: number;
  tier: AccessTierId;
  proof?: Partial<ZKProofStub>;
  expiryBlocks?: number;
  currentBlock?: number;
}): DynamicAccessToken {
  const pricing = computeReputationPrice({
    poolId: opts.poolId,
    reputationScore: opts.reputationScore,
    units: 1,
  });
  const block = opts.currentBlock ?? Math.floor(Date.now() / 60000);
  datSeq += 1;
  const datId = `dat-${opts.poolId}-${Date.now().toString(36)}-${datSeq}`;
  return {
    datId,
    resourceId: opts.resourceId,
    poolId: opts.poolId,
    proofOfWork: {
      scheme: opts.proof?.scheme ?? "stub",
      digestHex: opts.proof?.digestHex ?? `dat-${opts.poolId}-${datSeq}`,
      verified: opts.proof?.verified ?? false,
    },
    paymentStreamMicro: pricing.unitPriceMicro,
    expiryBlock: block + (opts.expiryBlocks ?? 1440),
    reputationScore: opts.reputationScore,
    tier: opts.tier,
    issuedAt: Date.now(),
  };
}

export function estimateDatProtocolFee(dat: DynamicAccessToken, units = 1): number {
  const pool = getPoolById(dat.poolId);
  const bps = pool?.protocolFeeBps ?? 250;
  const gross = dat.paymentStreamMicro * units;
  return Math.ceil((gross * bps) / 10_000);
}
