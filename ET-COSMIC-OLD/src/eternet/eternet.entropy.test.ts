import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateEternetEntropy, eternetToQuantumEntropy } from "./entropy";

vi.mock("../lib/lususClient", () => ({
  fetchChaosBell: vi.fn().mockResolvedValue({
    correlation: 0.42,
    chaos: { S: 2.1, violatesBell: true },
    disclaimer: "mock",
  }),
}));

describe("eternet entropy", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ETERNET_ENGINE", "hybrid");
  });

  it("gera hex estável com sources bruno + lusus", async () => {
    const e = await generateEternetEntropy(256);
    expect(e.entropy_hex).toHaveLength(64);
    expect(e.quantum_verified).toBe(false);
    expect(e.simulation).toBe(true);
    expect(e.sources).toContain("bruno_theory");
    expect(e.sources).toContain("lusus_chaos_bell");
    expect(e.sources).toContain("device_csprng");
  });

  it("adapta para QuantumEntropy sem quantum_verified", () => {
    const q = eternetToQuantumEntropy({
      entropy_hex: "ab".repeat(32),
      sha3_256: "cd".repeat(32),
      bits: 256,
      source: "eternet",
      sources: ["device_csprng"],
      n_measurements: 1,
      method: "eternet_hybrid",
      simulation: true,
      quantum_verified: false,
      disclaimer: "test",
    });
    expect(q.quantum_verified).toBe(false);
    expect(q.simulation).toBe(true);
    expect(q.source).toBe("eternet");
  });
});
