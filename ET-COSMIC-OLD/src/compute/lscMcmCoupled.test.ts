import { describe, it, expect } from "vitest";
import { runLscMcmCoupledFrame } from "./lscMcmCoupled";

describe("lscMcmCoupled", () => {
  it("produz métricas acopladas LSC+MCM", () => {
    const r = runLscMcmCoupledFrame(64);
    expect(r.method).toBe("lsc_mcm_furc_coupled");
    expect(r.theory.furc_C_epsilon).toBeDefined();
    expect(r.C_epsilon).toBeGreaterThan(0);
    expect(r.coupledLambda).toBeGreaterThan(0);
    expect(Number.isFinite(r.couplingGain)).toBe(true);
    expect(r.coresUsed).toBe(4);
  });
});
