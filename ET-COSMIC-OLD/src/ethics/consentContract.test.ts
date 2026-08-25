import { beforeEach, describe, expect, it } from "vitest";
import {
  ConsentContract,
  CONSENT_CONTRACT_VERSION,
  CORE_V1_MAX_LEVEL,
  resetConsentContractForTests,
} from "./consentContract";
import { consentReceiptStore } from "../protocol/amp/consentReceiptStore";

describe("ConsentContract", () => {
  beforeEach(() => {
    resetConsentContractForTests();
  });

  it("nega escopo antes da assinatura", () => {
    const cc = ConsentContract.getInstance();
    expect(cc.hasConsent("BIOMETRIC_ENTROPY")).toBe(false);
    expect(() => cc.requireConsent("BIOMETRIC_ENTROPY")).toThrow(/CGF_DCC_DENIED/);
  });

  it("assina e valida escopos concedidos", async () => {
    const cc = ConsentContract.getInstance();
    const record = await cc.sign(["BIOMETRIC_ENTROPY", "BLE_CARRIER"]);
    expect(record.version).toBe(CONSENT_CONTRACT_VERSION);
    expect(record.signatureHex).toHaveLength(64);
    expect(cc.hasConsent("BIOMETRIC_ENTROPY")).toBe(true);
    expect(cc.hasConsent("WEBGPU_COMPUTE")).toBe(false);
  });

  it("revoga escopos parciais", async () => {
    const cc = ConsentContract.getInstance();
    await cc.sign(["BIOMETRIC_ENTROPY", "BLE_CARRIER"]);
    await cc.revokeScopes(["BLE_CARRIER"]);
    expect(cc.hasConsent("BIOMETRIC_ENTROPY")).toBe(true);
    expect(cc.hasConsent("BLE_CARRIER")).toBe(false);
  });

  it("revoga tudo", async () => {
    const cc = ConsentContract.getInstance();
    await cc.sign(["QUANTUM_SIMULATION"]);
    await cc.revokeAll();
    expect(cc.getRecord()).toBeNull();
  });

  it("signPreset Núcleo v1 concede legacy_import (nível 8+)", async () => {
    const cc = ConsentContract.getInstance();
    await cc.signPreset(CORE_V1_MAX_LEVEL);
    expect(consentReceiptStore.getMaxLevel()).toBeGreaterThanOrEqual(8);
    expect(cc.hasConsent("LEGACY_IMPORT")).toBe(true);
    expect(cc.hasConsent("BIOMETRIC_ENTROPY")).toBe(true);
  });
});
