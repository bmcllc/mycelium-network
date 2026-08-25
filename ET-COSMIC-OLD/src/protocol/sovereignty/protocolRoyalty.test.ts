import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  computeProtocolRoyalty,
  dexNotionalToSat,
  formatTransparentProtocolFee,
  fiatToSatEstimate,
} from "./protocolRoyalty";

describe("protocolRoyalty", () => {
  const env = { ...import.meta.env };

  beforeEach(() => {
    vi.stubEnv("VITE_PROTOCOL_ROYALTY_BPS", "10");
    vi.stubEnv("VITE_ETRNET_TREASURY_NPUB", "npub1example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.assign(import.meta.env, env);
  });

  it("aplica 10 bps com mínimo 1 sat", () => {
    const r = computeProtocolRoyalty(50_000, "payment");
    expect(r.feeSat).toBe(50);
    expect(r.netSat).toBe(49_950);
    expect(r.enabled).toBe(true);
  });

  it("desliga taxa sem tesouraria", () => {
    vi.stubEnv("VITE_ETRNET_TREASURY_NPUB", "");
    const r = computeProtocolRoyalty(10_000, "dex");
    expect(r.feeSat).toBe(0);
    expect(r.enabled).toBe(false);
  });

  it("dexNotionalToSat", () => {
    expect(dexNotionalToSat(2, 100)).toBe(200_000);
  });

  it("formatTransparentProtocolFee menciona MontêLauro Foundation", () => {
    const r = computeProtocolRoyalty(100_000, "payment");
    const line = formatTransparentProtocolFee(r);
    expect(line).toContain("MontêLauro Foundation");
    expect(line).toContain("100 sat");
  });

  it("fiatToSatEstimate", () => {
    const sat = fiatToSatEstimate("100", "USD", { brl: 400_000, usd: 80_000, eur: 75_000 });
    expect(sat).toBeGreaterThan(100_000);
  });
});
