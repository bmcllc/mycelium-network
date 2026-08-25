/**
 * Rota /finance/payment registada no catálogo IMC.
 */
import { describe, expect, it } from "vitest";
import { IMC_ADAPTED_COMPONENT_MAP } from "../b2b/imcAdaptedComponentMap";
import { ROUTE_CATALOG } from "../b2b/imcRouteCatalog";

describe("/finance/payment route", () => {
  it("está no catálogo IMC e mapeia PaymentGatewayPanel", () => {
    const route = ROUTE_CATALOG.find((r) => r.path === "/finance/payment");
    expect(route?.label).toBeTruthy();
    expect(IMC_ADAPTED_COMPONENT_MAP["/finance/payment"]).toBe("PaymentGatewayPanel");
  });
});
