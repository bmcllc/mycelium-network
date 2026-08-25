import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../eternet/config", () => ({
  isEternetEntropyEnabled: vi.fn(() => false),
}));

vi.mock("../b2b/imcInfrastructure", () => ({
  isImcV2Build: vi.fn(() => false),
}));

vi.mock("./quantumBridge", () => {
  const ent = {
    entropy_hex: "aa".repeat(64),
    sha3_256: "server-sha3",
    bits: 256,
    source: "circuit_bell_z",
    n_measurements: 128,
    sources: ["circuit_bell_z", "anu_vacuum"],
    quantum_verified: true,
    simulation: false,
    chsh_audit: { S_value: 2.82, chsh_violated: true },
  };
  return {
    generateQuantumEntropy: vi.fn().mockResolvedValue(ent),
    generateQuantumEntropyWithFallback: vi.fn().mockResolvedValue(ent),
  };
});

import { fetchHybridEntropy, fetchOmegaEntropy, fetchAnuEntropyBytes } from "./entropyOrchestrator";

vi.mock("../paleo/paleoEntropyFossil", () => ({
  bindEntropyWithPaleoFossil: vi.fn(async (material: Uint8Array) => ({
    material,
    fossil: {
      skeletonId: "fossil_mock",
      fossilRootHash: "mockhash",
      invariants: [],
      verified: true,
    },
  })),
}));

describe("entropyOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: Array.from({ length: 32 }, (_, i) => i) }),
      }),
    );
  });

  it("fetchAnuEntropyBytes via proxy", async () => {
    const bytes = await fetchAnuEntropyBytes(32);
    expect(bytes?.length).toBe(32);
  });

  it("fetchHybridEntropy tier hybrid quando ANU e CQR ok", async () => {
    const h = await fetchHybridEntropy(256);
    expect(h.tier).toBe("hybrid");
    expect(h.quantumVerified).toBe(true);
    expect(h.sources.length).toBeGreaterThan(0);
  });

  it("fetchOmegaEntropy tier omega com fóssil paleo", async () => {
    const o = await fetchOmegaEntropy(256);
    expect(o.tier).toBe("omega");
    expect(o.paleoFossil?.verified).toBe(true);
    expect(o.quantumVerified).toBe(true);
  });
});
