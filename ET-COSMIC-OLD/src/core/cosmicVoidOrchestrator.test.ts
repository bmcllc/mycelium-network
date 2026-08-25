import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../protocol/amp/ampPipeline", () => ({
  assertPipelineStage: vi.fn(),
}));

vi.mock("../ethics/consentContract", () => ({
  consentContract: { requireConsent: vi.fn() },
}));

vi.mock("../protocol/amp/pmuOmegaPipeline", () => ({
  runPmuOmegaCycle: vi.fn().mockResolvedValue({
    pipeline: "Ω",
    frames: [],
    entropy: {
      tier: "omega",
      sha3_256: "aa".repeat(32),
      material: new Uint8Array(64).fill(1),
      quantumVerified: true,
      paleoFossil: { fossilRootHash: "fossil" + "0".repeat(56) },
    },
    audit: null,
    pqc: { kemAlgorithm: "ML-KEM", dsaAlgorithm: "ML-DSA", kemPublicKeyBytes: 1, dsaPublicKeyBytes: 1 },
    totalCores: 16,
    completedAt: Date.now(),
    pmuComplete: true,
  }),
}));

vi.mock("../pmu/pmuAuditClient", () => ({
  fetchPmuAuditFull: vi.fn().mockResolvedValue({
    truth_level: 2,
    truth_level_id: "L2",
    entropy: { sha3_256: "bb".repeat(32), simulation: false, quantum_verified: true, sources: [], source_breakdown: [] },
    sts_light: { passed: true, skipped: false, tests: [], suite: "sts", byte_length: 256 },
    disclaimer: "",
    generated_at: Date.now(),
    void_pool: { before: { pulses: 0, chain_tip: "", pool_dir: "" }, after: { pulses: 1, chain_tip: "x" } },
  }),
}));

vi.mock("../crypto/quantumBridge", () => ({
  isServerAvailable: vi.fn().mockResolvedValue(false),
  resetQuantumProbe: vi.fn(),
}));

vi.mock("../vps/voidRunnerClient", () => ({
  executeVoidRunnerRemote: vi.fn().mockResolvedValue(null),
  fetchCosmicHarmonyServer: vi.fn().mockResolvedValue(null),
}));

vi.mock("../harvesters/phantomHarvestHarmony", () => ({
  runPhantomHarvestHarmonyStep: vi.fn().mockResolvedValue({
    ran: false,
    imported: 0,
    skippedReason: "test",
  }),
}));

vi.mock("../pmu/pmuGovernanceMesh", () => ({
  publishPmuMeshManifest: vi.fn().mockResolvedValue({ published: true, eventId: "ev1" }),
  buildPmuAnchorPayload: vi.fn().mockReturnValue({ protocol: "PMU_ANCHOR_COMMIT", audit_sha3: "x", truth_level_id: "L2", generated_at: 1 }),
  hasAnchorContract: vi.fn().mockReturnValue(false),
}));

vi.mock("../pmu/pmuAnchorClient", () => ({
  commitAuditToAnchor: vi.fn(),
  computeAnchorRootFromPayload: vi.fn().mockReturnValue("0x" + "ab".repeat(32)),
  fetchAnchorState: vi.fn(),
}));

vi.mock("./VoidOrchestrator", () => ({
  voidOrchestrator: { getIdentity: vi.fn().mockReturnValue(null) },
}));

vi.mock("../vps/ghostDockerBridge", () => ({
  runGhostSandbox: vi.fn().mockResolvedValue({
    backend: "ghost_dock_ts",
    sandboxId: "test",
    sessionId: "test_session",
    output: {},
    voidRunner: null,
  }),
}));

import { runCosmicHarmonyCycle, resetCosmicHarmonySingletons } from "./cosmicVoidOrchestrator";

describe("cosmicVoidOrchestrator", () => {
  beforeEach(() => {
    resetCosmicHarmonySingletons();
    vi.clearAllMocks();
  });

  it("harmonia retorna pipeline completo", async () => {
    const r = await runCosmicHarmonyCycle({ ghostId: "test-ghost" });
    expect(r.pipeline).toContain("GhostDock");
    expect(r.higgs.scar.authorizedDeploy).toBe(true);
    expect(r.phantom.deployed).toBe(true);
    expect(r.harmonyRootHash.length).toBe(64);
  });

  it("dois ciclos seguidos sem reinstalar estado", async () => {
    const a = await runCosmicHarmonyCycle({ ghostId: "test-ghost" });
    const b = await runCosmicHarmonyCycle({ ghostId: "test-ghost" });
    expect(a.harmonyRootHash.length).toBe(64);
    expect(b.harmonyRootHash.length).toBe(64);
  });
});
