import { describe, it, expect, vi, beforeEach } from "vitest";
import { PMU_VHGPU_DOMAINS, PMU_VHGPU_MIN_CORES } from "./pmuDomains";

vi.mock("../protocol/amp/ampPipeline", () => ({
  assertPipelineStage: vi.fn(),
}));

vi.mock("../crypto/entropyOrchestrator", () => ({
  fetchOmegaEntropy: vi.fn().mockResolvedValue({
    material: new Uint8Array(64).fill(0xaa),
    sha3_256: "abc",
    tier: "omega",
    sources: ["circuit_bell_z", "anu_vacuum_client", "paleo_fossil"],
    quantumVerified: true,
    simulation: false,
    chshViolated: true,
    cqr: { chsh_audit: { S_value: 2.82 }, method: "omega_pmu_paleo_hybrid" },
    anuBytes: new Uint8Array(32),
    paleoFossil: {
      skeletonId: "fossil_test",
      fossilRootHash: "deadbeef",
      invariants: [],
      verified: true,
    },
  }),
}));

vi.mock("./geomWebgpuPass", () => ({
  runGeomWebgpuPass: vi.fn().mockResolvedValue({
    webgpuUsed: true,
    gpuIterations: 4096,
    geomIterations: 16,
    hashPrefix: "00abcdef",
    topologyHash: "topo1234",
    spectralBands: 64,
    method: "webgpu_spectral_poh",
  }),
}));

vi.mock("../collapse/collapseAlgebra", () => ({
  getCollapseAlgebra: vi.fn().mockReturnValue({
    accumulate: vi.fn((s: { lambda: number }) => ({ ...s, lambda: s.lambda + 0.1 })),
  }),
  createInitialState: vi.fn().mockReturnValue({ lambda: 0.05 }),
}));

vi.mock("../lsc/lscEngine", () => ({
  LSCEngine: {
    getInstance: vi.fn().mockReturnValue({
      law1MaximumPower: vi.fn(),
      law2Saturation: vi.fn(),
      law3Holofriction: vi.fn(),
      getState: vi.fn().mockReturnValue({ C_epsilon: 0.4, K_eff: 0.61, P_current: 0.5 }),
    }),
  },
}));

vi.mock("../crypto/quantumBridge", () => ({
  isServerAvailable: vi.fn().mockResolvedValue(true),
}));

import { runPmuVhgpuFrame, runPmuVhgpuAllDomains } from "./pmuVhgpuScheduler";

describe("pmuVhgpuScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("define 4 domínios com 4 cores mínimos", () => {
    expect(PMU_VHGPU_DOMAINS).toHaveLength(4);
    for (const d of PMU_VHGPU_DOMAINS) {
      expect(d.minCores).toBe(PMU_VHGPU_MIN_CORES);
    }
  });

  it("quantum_void usa backend hybrid em tier omega", async () => {
    const frame = await runPmuVhgpuFrame("quantum_void", 64);
    expect(frame.backend).toBe("hybrid");
    expect(frame.metrics.quantumVerified).toBe(true);
    expect(frame.metrics.entropyTier).toBe("omega");
  });

  it("geom_relativity usa webgpu quando pass retorna webgpuUsed", async () => {
    const frame = await runPmuVhgpuFrame("geom_relativity", 64);
    expect(frame.backend).toBe("webgpu");
    expect(frame.metrics.webgpuUsed).toBe(true);
  });

  it("runPmuVhgpuAllDomains retorna 4 frames", async () => {
    const frames = await runPmuVhgpuAllDomains(32);
    expect(frames).toHaveLength(4);
  });

  it("lsc_mcm usa acoplamento LSC↔MCM", async () => {
    const frame = await runPmuVhgpuFrame("lsc_mcm", 64);
    expect(frame.method).toBe("lsc_mcm_furc_coupled");
    expect(frame.metrics.couplingGain).toBeDefined();
  });
});
