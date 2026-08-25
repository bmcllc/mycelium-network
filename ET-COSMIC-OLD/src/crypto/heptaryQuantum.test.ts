import { describe, it, expect, vi } from "vitest";

vi.mock("./quantumBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./quantumBridge")>();
  return {
    ...actual,
  };
});

import { runHeptaryQuantumSimulation } from "./quantumBridge";

describe("HeptaryQuantum Bridge", () => {
  it("executa simulação heptary (CQR remoto ou fallback offline Ω)", async () => {
    const result = await runHeptaryQuantumSimulation(3, 64);
    expect(result).not.toBeNull();
    expect(["Heptary_vHGPU_Offline", "Heptary_vHGPU_Emulated"]).toContain(result?.engine);
    expect(result?.n_heptits).toBe(3);
    expect(result?.state_dimension).toBe(343);
    expect(result?.audit.bell_inequality_violated).toBe(true);
    expect(result?.audit.cglmp_S7_value).toBeGreaterThanOrEqual(2.5);
  });
});
