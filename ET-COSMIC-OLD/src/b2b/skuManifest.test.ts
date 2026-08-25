import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ROUTE_PRIMARY_SKU,
  normalizeSkuId,
  resolveSkuIds,
  getEnabledRoutePaths,
  assertRouteCoverage,
  BUNDLE_INCLUDES,
} from "./skuManifest";
import { SKU_CATALOG } from "./skuCatalog.generated";
import { IMC_CORE_SKUS } from "./imcInfrastructure";
import { filterRoutesByB2bSkus } from "./filterRoutes";
import { ROUTE_CATALOG } from "./routeCatalog";
import { buildRoutes } from "./buildRoutes";

const ALL_ROUTE_PATHS = Object.keys(ROUTE_PRIMARY_SKU);

describe("b2b skuManifest", () => {
  it("cobre todas as rotas do router", () => {
    assertRouteCoverage(ROUTE_CATALOG.map((r) => r.path));
    expect(Object.keys(ROUTE_PRIMARY_SKU).length).toBe(ROUTE_CATALOG.length);
  });

  it("normaliza IDs de SKU", () => {
    expect(normalizeSkuId("void-11")).toBe("VOID-11");
    expect(normalizeSkuId("11")).toBe("VOID-11");
    expect(normalizeSkuId("ALL")).toBe("VOID-ALL");
    expect(normalizeSkuId("SOVEREIGN-CITIZEN")).toBe("SOVEREIGN-CITIZEN");
  });

  it("expande bundle SOVEREIGN-CITIZEN", () => {
    const ids = resolveSkuIds(["SOVEREIGN-CITIZEN"]);
    expect(ids.has("VOID-11")).toBe(true);
    expect(ids.has("VOID-57")).toBe(true);
    expect(ids.has("VOID-95")).toBe(true);
  });

  it("expande FULL-ENTERPRISE para todos os SKUs de rota", () => {
    const ids = resolveSkuIds(["FULL-ENTERPRISE"]);
    const routeSkus = new Set(Object.values(ROUTE_PRIMARY_SKU));
    for (const sku of routeSkus) {
      expect(ids.has(sku)).toBe(true);
    }
  });

  it("VOID-CATALOG-FULL expande núcleo IMC + todas as rotas adaptadas", () => {
    expect(normalizeSkuId("VOID-00-329")).toBe("VOID-CATALOG-FULL");
    const ids = resolveSkuIds(["VOID-CATALOG-FULL"]);
    expect(ids.size).toBeGreaterThanOrEqual(IMC_CORE_SKUS.length);
    for (const id of IMC_CORE_SKUS) {
      expect(ids.has(id)).toBe(true);
    }
    for (const sku of Object.values(ROUTE_PRIMARY_SKU)) {
      expect(ids.has(sku)).toBe(true);
    }
    expect(SKU_CATALOG.length).toBeGreaterThanOrEqual(40);
  });

  it("VOID-CATALOG-FULL activa todas as rotas IMC", () => {
    vi.stubGlobal("__B2B_SKUS__", JSON.stringify(["VOID-CATALOG-FULL"]));
    const paths = getEnabledRoutePaths();
    expect(paths?.size).toBe(ALL_ROUTE_PATHS.length);
    for (const p of ALL_ROUTE_PATHS) {
      expect(paths?.has(p)).toBe(true);
    }
  });

  it("MESSENGER-ENTERPRISE inclui messenger e consent", () => {
    const ids = resolveSkuIds(["MESSENGER-ENTERPRISE"]);
    expect(ids.has("VOID-11")).toBe(true);
    expect(ids.has("VOID-95")).toBe(true);
  });

  it("todos os bundles referenciam SKUs resolvíveis", () => {
    const routeSkus = new Set(Object.values(ROUTE_PRIMARY_SKU));
    const bundleIds = new Set(Object.keys(BUNDLE_INCLUDES));

    function isResolvable(id: string): boolean {
      if (id === "__ALL_ROUTES__" || id === "VOID-ALL") return true;
      if (routeSkus.has(id) || bundleIds.has(id)) return true;
      if (/^VOID-[0-9]{1,3}[A-F]?$/.test(id)) return true;
      return /^[A-Z][A-Z0-9-]+$/.test(id);
    }

    for (const [bundle, children] of Object.entries(BUNDLE_INCLUDES)) {
      for (const child of children) {
        expect(isResolvable(child), `${bundle} → ${child}`).toBe(true);
      }
    }
  });
});

describe("b2b filterRoutes (env simulado)", () => {
  const allRoutes = buildRoutes(null);

  beforeEach(() => {
    vi.stubGlobal("__B2B_SKUS__", "[]");
    vi.stubGlobal("__IMC_V2__", false);
  });

  it("sem SKUs no env → todas as rotas", () => {
    vi.stubGlobal("__B2B_SKUS__", "[]");
    const filtered = filterRoutesByB2bSkus(allRoutes);
    expect(filtered.length).toBe(allRoutes.length);
    expect(getEnabledRoutePaths()).toBeNull();
  });

  it("filtra por SKU único VOID-54", () => {
    vi.stubGlobal("__B2B_SKUS__", JSON.stringify(["VOID-54"]));
    const paths = getEnabledRoutePaths();
    expect(paths?.has("/compute/bruno-theory")).toBe(true);
    expect(paths?.has("/messenger")).toBe(false);
    const filtered = filterRoutesByB2bSkus(allRoutes);
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.path).toBe("/compute/bruno-theory");
  });

  it("filtra por bundle SOVEREIGN-CITIZEN", () => {
    vi.stubGlobal("__B2B_SKUS__", JSON.stringify(["SOVEREIGN-CITIZEN"]));
    const filtered = filterRoutesByB2bSkus(allRoutes);
    const paths = new Set(filtered.map((r) => r.path));
    expect(paths.has("/messenger")).toBe(true);
    expect(paths.has("/compute/cosmic-harmony")).toBe(true);
    expect(paths.has("/harvester")).toBe(false);
  });
});
