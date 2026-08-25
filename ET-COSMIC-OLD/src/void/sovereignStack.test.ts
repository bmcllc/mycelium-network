import { describe, expect, it } from "vitest";
import {
  VOID_PRODUCTS,
  VOID_SOVEREIGN_LICENSE,
  productBySku,
} from "./sovereignStack";

describe("VOID Sovereign Stack", () => {
  it("expõe três produtos", () => {
    expect(VOID_PRODUCTS.map((p) => p.id)).toEqual([
      "VOID-BRIDGE",
      "VOID-PCI",
      "VOID-MESH",
    ]);
  });

  it("licença AGPL", () => {
    expect(VOID_SOVEREIGN_LICENSE).toBe("AGPL-3.0-or-later");
  });

  it("mapeia SKUs para produtos", () => {
    expect(productBySku("VOID-700")?.id).toBe("VOID-MESH");
    expect(productBySku("VOID-511")?.id).toBe("VOID-BRIDGE");
    expect(productBySku("VOID-512")?.id).toBe("VOID-PCI");
  });
});
