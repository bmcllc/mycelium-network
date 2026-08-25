import { describe, expect, it } from "vitest";
import { planQrcRoute } from "./qrcMotor";
import { resolveStaGeodesic, lookupTrajectoryLut } from "./trajectoryLut.generated";
import { evaluateLiebRobinson, staSin2Geodesic } from "./staGeodesic";

describe("staGeodesic", () => {
  it("sin² em [0,1]", () => {
    expect(staSin2Geodesic(0)).toBe(0);
    expect(staSin2Geodesic(1)).toBeCloseTo(1, 5);
    expect(staSin2Geodesic(0.5)).toBeGreaterThan(0);
  });

  it("LUT hit distância standard", () => {
    expect(lookupTrajectoryLut(1.0)?.usedLut).toBe(true);
    expect(resolveStaGeodesic(1.0).sin2).toBeCloseTo(1, 5);
  });
});

describe("qrcMotor / STAUmpire", () => {
  it("plano inclui geodésica e canal preferido", () => {
    const plan = planQrcRoute({ shardIndex: 0, commitment: "abc123" });
    expect(plan.geodesic.sin2).toBeGreaterThanOrEqual(0);
    expect(plan.preferredChannel).toBeTruthy();
    expect(plan.channelOrder.length).toBe(4);
  });

  it("LR violado → anderson_cage + HCN_MESH primeiro", () => {
    const lr = evaluateLiebRobinson(5, 1);
    expect(lr.safetyState).toBe("anderson_cage");
    const plan = planQrcRoute({ shardIndex: 9, commitment: "zz" });
    if (plan.andersonCollapse) {
      expect(plan.preferredChannel).toBe("HCN_MESH");
    }
  });
});
