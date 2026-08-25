import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMLKEMKeypair } from "../crypto/pqc";

vi.mock("../storage/hcnStore", () => ({
  HCNStore: vi.fn().mockImplementation(() => ({
    storeShard: vi.fn().mockResolvedValue(undefined),
    awardKarma: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock("../network/distanceBridge", () => ({
  DistanceBridge: vi.fn().mockImplementation(() => ({
    routeShard: vi.fn().mockResolvedValue({
      channel: "TEST",
      preferred: "HCN_MESH",
      fallbackUsed: false,
      attempted: ["HCN_MESH"],
    }),
    getMetrics: vi.fn().mockReturnValue({}),
    resetMetrics: vi.fn(),
  })),
}));

vi.mock("../crypto/ghostid", () => ({
  spawnGhostId: vi.fn(async () => ({
    handle: "test@void",
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(64),
    x25519PublicKey: new Uint8Array(32),
    x25519SecretKey: new Uint8Array(32),
    entropyBits: 256,
    quantumVerified: false,
  })),
  destroyGhostId: vi.fn(),
}));

describe("VoidOrchestrator C3 by handle", () => {
  beforeEach(async () => {
    const { VoidOrchestrator } = await import("./VoidOrchestrator");
    VoidOrchestrator.getInstance().destroy();
  });

  it("usa chave registada via recipientHandle", async () => {
    const { VoidOrchestrator } = await import("./VoidOrchestrator");
    const orch = VoidOrchestrator.getInstance();

    const recipient = generateMLKEMKeypair();
    orch.registerRecipientKey("peer:test", recipient.publicKey);

    await orch.spawn();
    const result = await orch.send("hello via handle", undefined, "peer:test");

    expect("encapsulatedKey" in result).toBe(true);
    if ("encapsulatedKey" in result) {
      expect(result.encapsulatedKey.length).toBe(1568);
      expect(result.signature.length).toBeGreaterThan(0);
    }
    orch.destroy();
  });
});
