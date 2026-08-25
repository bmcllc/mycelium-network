import { beforeEach, describe, expect, it, vi } from "vitest";
import { LATTICE_LEVEL } from "./consentLattice";
import { consentReceiptStore } from "./consentReceiptStore";
import { BLE_MAX_AD_BYTES, AMP_KNOWN_LIMITATIONS } from "./knownLimitations";
import { RecursiveSTARK } from "./recursiveStark";
import { getLightningBackend } from "./ldkWasmBridge";
import { resetConsentContractForTests } from "../../ethics/consentContract";

describe("AMP / PMU (atualizado)", () => {
  beforeEach(() => {
    resetConsentContractForTests();
  });

  it("limitações §7 não listam STARK/HGPU como ausentes", () => {
    const components = AMP_KNOWN_LIMITATIONS.map((l) => l.component);
    expect(components).not.toContain("zk-STARK");
    expect(components).toContain("Lightning");
    expect(AMP_KNOWN_LIMITATIONS.find((l) => l.component === "Lightning")?.mitigation).toContain(
      "LDK-WASM",
    );
  });

  it("RecursiveSTARK compõe e verifica cadeia", async () => {
    const p1 = await RecursiveSTARK.compose(new Uint8Array(64).fill(1), 64);
    expect(RecursiveSTARK.verify(p1, null)).toBe(true);
    const p2 = await RecursiveSTARK.compose(new Uint8Array(64).fill(2), 64);
    expect(RecursiveSTARK.verify(p2, p1)).toBe(true);
  });

  it("BLE permanece 26 bytes", () => {
    expect(BLE_MAX_AD_BYTES).toBe(26);
  });

  it("getLightningBackend sem env retorna unconfigured", () => {
    vi.stubEnv("VITE_NWC_SECRET", "");
    vi.stubEnv("VITE_LND_REST_URL", "");
    vi.stubEnv("VITE_LND_MACAROON_HEX", "");
    expect(getLightningBackend()).toBe("unconfigured");
  });

  it("SLCC exige consentimento de compute e pagamento", async () => {
    const { slccChannel } = await import("./slcc");
    await expect(slccChannel.requestFrame(new Uint8Array(64))).rejects.toThrow(/CGF_DCC_DENIED/);
    await consentReceiptStore.sign(LATTICE_LEVEL.ECONOMIC_ATTENTION, [
      "HGPU_RESEARCH_LAB",
      "WEBGPU_COMPUTE",
      "ZK_STARK_RESEARCH",
      "LDK_LND_REMOTE",
    ]);
    const frame = await slccChannel.requestFrame(new Uint8Array(64).fill(3), 64);
    expect(frame.microPaymentHash).toHaveLength(64);
    slccChannel.resetChain();
  });
});
