import { describe, expect, it } from "vitest";
import { generateMLDSAKeypair } from "../crypto/pqc";
import { planQrcRoute } from "./qrcMotor";
import { sealQrcRoute, verifyQrcRoute, verifyQrcRouteSeal } from "./qrcRoutePqc";

describe("qrcRoutePqc", () => {
  it("sela e verifica geodésica com ML-DSA-87", () => {
    const dsa = generateMLDSAKeypair();
    const plan = planQrcRoute({ shardIndex: 1, commitment: "deadbeef" });
    const sealed = sealQrcRoute(
      "deadbeef",
      1,
      plan,
      dsa.privateKey,
      dsa.publicKey,
    );
    expect(sealed.routeDigest).toHaveLength(64);
    expect(verifyQrcRoute(sealed, plan)).toBe(true);
  });

  it("rejeita adulteração de canal", () => {
    const dsa = generateMLDSAKeypair();
    const plan = planQrcRoute({ shardIndex: 0, commitment: "abc" });
    const sealed = sealQrcRoute("abc", 0, plan, dsa.privateKey, dsa.publicKey);
    const tampered = { ...plan, preferredChannel: "BLE" as const };
    expect(verifyQrcRoute(sealed, tampered)).toBe(false);
  });

  it("verifyQrcRouteSeal reconstrói plano", () => {
    const dsa = generateMLDSAKeypair();
    const plan = planQrcRoute({ shardIndex: 2, commitment: "feed" });
    const sealed = sealQrcRoute("feed", 2, plan, dsa.privateKey, dsa.publicKey);
    expect(verifyQrcRouteSeal(sealed)).toBe(true);
  });
});
