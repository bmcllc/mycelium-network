import { beforeEach, describe, expect, it } from "vitest";
import { consentContract, resetConsentContractForTests } from "../ethics/consentContract";
import { runHgpuResearchPass } from "./hgpuResearch";
import { runZkMerkleResearch } from "./zkStarkResearch";

describe("research modules (consent-gated)", () => {
  beforeEach(() => {
    resetConsentContractForTests();
  });

  it("HGPU exige consentimento", async () => {
    await expect(runHgpuResearchPass(32)).rejects.toThrow(/CGF_DCC_DENIED/);
    await consentContract.sign(["HGPU_RESEARCH_LAB", "WEBGPU_COMPUTE"]);
    const m = await runHgpuResearchPass(32);
    expect(m.disclaimer).toContain("vHGPU terceirizada");
  });

  it("ZK research exige consentimento", async () => {
    await expect(runZkMerkleResearch([], [])).rejects.toThrow(/CGF_DCC_DENIED/);
    await consentContract.sign(["ZK_STARK_RESEARCH"]);
    const r = await runZkMerkleResearch(["u1"], []);
    expect(r.starkRecursive).toBe(true);
    expect(r.disclaimer).toContain("RecursiveSTARK");
  });
});
