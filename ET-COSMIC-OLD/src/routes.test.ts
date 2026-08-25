import { describe, it, expect } from "vitest";
import { parse } from "regexparam";
import {
  getActiveCategoryHubRoutes,
  isPanelCategoryActive,
  routes,
  buildAllRoutesForTest,
} from "./router";
import { getPanelTier, isHardwareV2Panel, V1_PRODUCTION_PATHS } from "./panelTiers";

const allRoutes = buildAllRoutesForTest();

/** Garante que cada path de router.tsx é alcançável (wouter + regexparam). */
describe("router.tsx — cobertura de paths", () => {
  it("paths únicos (catálogo completo)", () => {
    const paths = allRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("paths únicos (build filtrado)", () => {
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("todos começam com /", () => {
    for (const r of allRoutes) {
      expect(r.path.startsWith("/")).toBe(true);
      expect(r.path.includes("//")).toBe(false);
    }
  });

  it("cada rota faz match explícito (não depender de /:rest* de um segmento)", () => {
    for (const r of allRoutes) {
      const { pattern } = parse(r.path);
      expect(pattern.exec(r.path)?.[0], r.path).toBe(r.path);
    }
  });

  it("rotas multi-segmento não usam matcher de um só segmento", () => {
    const broken = parse("/:rest*");
    const multi = allRoutes.filter((r) => r.path.split("/").filter(Boolean).length >= 2);
    expect(multi.length).toBeGreaterThan(0);
    for (const r of multi) {
      expect(broken.pattern.exec(r.path), r.path).toBeNull();
    }
  });
});

describe("hubs por área", () => {
  const hubs = getActiveCategoryHubRoutes();

  it("um hub por área do painel (IMC adaptado)", () => {
    expect(hubs.map((h) => h.categoryId)).toEqual([
      "home",
      "crypto",
      "finance",
      "network",
      "compute",
      "lab",
      "vault",
      "governance",
      "terminal",
    ]);
  });

  it("paths de hub únicos e sem conflito com painéis", () => {
    const hubPaths = hubs.map((h) => h.path);
    const panelPaths = new Set(allRoutes.map((r) => r.path));
    expect(new Set(hubPaths).size).toBe(hubPaths.length);
    for (const p of hubPaths) {
      expect(panelPaths.has(p)).toBe(false);
    }
  });

  it("cada hub faz match explícito", () => {
    for (const hub of hubs) {
      const { pattern } = parse(hub.path);
      expect(pattern.exec(hub.path)?.[0], hub.path).toBe(hub.path);
    }
  });

  it("isPanelCategoryActive cobre hub e filhos", () => {
    expect(isPanelCategoryActive("crypto", "/crypto/zkp")).toBe(true);
    expect(isPanelCategoryActive("crypto", "/crypto/zkp")).toBe(true);
    expect(isPanelCategoryActive("crypto", "/finance")).toBe(false);
    expect(isPanelCategoryActive("home", "/messenger")).toBe(true);
    expect(isPanelCategoryActive("home", "/dashboard")).toBe(true);
    expect(isPanelCategoryActive("lab", "/lab/anacroclastia")).toBe(true);
    expect(isPanelCategoryActive("vault", "/vault/ghost-locker")).toBe(true);
  });

  it("lab: LUSUS + anacroclastia", () => {
    expect(allRoutes.some((r) => r.path === "/lab/lusus")).toBe(true);
    expect(routes.some((r) => r.path === "/lab/lusus")).toBe(true);
  });
});

describe("panelTiers — classificação v1", () => {
  it("cada rota tem tier definido", () => {
    for (const r of allRoutes) {
      const tier = getPanelTier(r.path, r.category);
      expect(["production", "real_plus"]).toContain(tier);
    }
  });

  it("paths v1 são Real ou Real+", () => {
    for (const path of V1_PRODUCTION_PATHS) {
      const tier = getPanelTier(path);
      expect(["production", "real_plus"]).toContain(tier);
    }
  });

  it("marketplace é Real+", () => {
    expect(getPanelTier("/terminal/marketplace", "terminal")).toBe("real_plus");
  });

  it("hardware BLE/LoRa marcado como v2", () => {
    expect(isHardwareV2Panel("/network/distance")).toBe(true);
    expect(isHardwareV2Panel("/network/mesh")).toBe(false);
  });
});
