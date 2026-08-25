import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./entropyOrchestrator", () => ({
  deriveHybridSeed: vi.fn(async (_domain: string, len: number) => new Uint8Array(len).fill(0x42)),
  fetchOmegaEntropy: vi.fn().mockResolvedValue({
    material: new Uint8Array(64).fill(0xaa),
    sha3_256: "cqr-test-sha3",
    tier: "omega",
    sources: ["circuit_bell_z", "anu_vacuum", "paleo_fossil"],
    quantumVerified: true,
    simulation: false,
    chshViolated: true,
    cqr: {
      sha3_256: "cqr-test-sha3",
      method: "omega_pmu_paleo_hybrid",
      chsh_audit: { S_value: 2.82, chsh_violated: true },
    },
    anuBytes: new Uint8Array(32),
    paleoFossil: {
      skeletonId: "fossil_test",
      fossilRootHash: "abc123",
      invariants: [],
      verified: true,
    },
  }),
}));

vi.mock("./quantumBridge", () => ({
  isServerAvailable: vi.fn().mockResolvedValue(true),
  generateQuantumEntropy: vi.fn(),
}));

import {
  deriveCqrSeed,
  generateMLKEMKeypairFromCQR,
  hybridEncryptCQR,
  hybridDecryptCQR,
  runCqrPqcSelfTest,
  getCqrPqcStatus,
} from "./cqrPqc";

describe("cqrPqc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deriveCqrSeed produz comprimento pedido", async () => {
    const seed = await deriveCqrSeed("test-domain", 64);
    expect(seed.length).toBe(64);
  });

  it("ML-KEM keygen com seed híbrida tem tamanhos NIST", async () => {
    const kem = await generateMLKEMKeypairFromCQR();
    expect(kem.publicKey.length).toBe(1568);
  });

  it("híbrido CQR: encrypt/decrypt round-trip", async () => {
    const kem = await generateMLKEMKeypairFromCQR();
    const msg = new TextEncoder().encode("void-cqr-pqc");
    const enc = await hybridEncryptCQR(kem.publicKey, msg);
    const dec = hybridDecryptCQR(
      kem.privateKey,
      enc.encapsulatedKey,
      enc.ciphertext,
      enc.nonce,
      enc.tag,
    );
    expect(new TextDecoder().decode(dec)).toBe("void-cqr-pqc");
  });

  it("self-test completa com sucesso", async () => {
    const result = await runCqrPqcSelfTest();
    expect(result.ok).toBe(true);
  });

  it("status reporta Ω verificado", async () => {
    const status = await getCqrPqcStatus();
    expect(status.quantumVerified).toBe(true);
    expect(status.entropyTier).toBe("omega");
  });
});
