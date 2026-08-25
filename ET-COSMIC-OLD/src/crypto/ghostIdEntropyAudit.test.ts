import { describe, it, expect, beforeEach } from "vitest";
import {
  recordGhostIdEntropyAudit,
  getGhostIdEntropyAudit,
  clearGhostIdEntropyAudit,
} from "./ghostIdEntropyAudit";

describe("ghostIdEntropyAudit", () => {
  beforeEach(() => {
    clearGhostIdEntropyAudit();
  });

  it("regista fonte e method no spawn", () => {
    recordGhostIdEntropyAudit({
      stage: "spawn_entropy",
      source: "eternet",
      method: "eternet_hybrid",
      sources: ["device_csprng", "bruno_theory"],
      quantumVerified: false,
      simulation: true,
    });
    const log = getGhostIdEntropyAudit();
    expect(log).toHaveLength(1);
    expect(log[0]?.source).toBe("eternet");
    expect(log[0]?.method).toBe("eternet_hybrid");
    expect(log[0]?.simulation).toBe(true);
  });
});
