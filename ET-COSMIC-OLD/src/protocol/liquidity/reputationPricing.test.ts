import { describe, it, expect } from "vitest";
import { computeReputationPrice, reputationMultiplier } from "./reputationPricing";
import { mintDat } from "./datEngine";

describe("reputationPricing", () => {
  it("reputationMultiplier 0→0.8, 100→1.5", () => {
    expect(reputationMultiplier(0)).toBeCloseTo(0.8, 5);
    expect(reputationMultiplier(100)).toBeCloseTo(1.5, 5);
  });

  it("computeReputationPrice escala com unidades", () => {
    const q = computeReputationPrice({
      poolId: "POOL-COMPUTE",
      reputationScore: 50,
      units: 5,
    });
    expect(q.totalMicro).toBe(q.unitPriceMicro * 5);
  });
});

describe("datEngine", () => {
  it("mintDat inclui pool e paymentStream", () => {
    const dat = mintDat({
      resourceId: "r1",
      poolId: "POOL-IDENTITY",
      reputationScore: 80,
      tier: "builder",
    });
    expect(dat.poolId).toBe("POOL-IDENTITY");
    expect(dat.datId).toMatch(/^dat-POOL-IDENTITY-/);
    expect(dat.paymentStreamMicro).toBeGreaterThan(0);
    expect(dat.proofOfWork.scheme).toBe("stub");
  });
});
