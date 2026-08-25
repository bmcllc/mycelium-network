/**
 * Manifesto B2B — SKU → rotas UI (white-label).
 * Catálogo: docs/B2B-PRODUCT-LINES.md · SKU_CATALOG gerado (VOID-00…VOID-329).
 */

import { SKU_BY_ID } from "./skuCatalog.generated";
import { getImcActivePaths, IMC_CORE_SKUS } from "./imcInfrastructure";

export type { SkuKind, SkuDef } from "./skuTypes";

/** Rota → SKU primário (IMC v2 adaptado — sem emulação quântica). */
export const ROUTE_PRIMARY_SKU: Record<string, string> = {
  "/dashboard": "VOID-10",
  "/messenger": "VOID-11",
  "/harvester": "VOID-12",
  "/crypto/zkp": "VOID-20",
  "/crypto/ghostid": "VOID-21",
  "/crypto/pqc": "VOID-22",
  "/crypto/cqr-pqc": "VOID-23",
  "/crypto/testament": "VOID-24",
  "/crypto/karma": "VOID-25",
  "/finance/dex": "VOID-30",
  "/finance/chimera": "VOID-31",
  "/finance/nostr-dex": "VOID-32",
  "/finance/stablecoin": "VOID-33",
  "/finance/rwa": "VOID-34",
  "/finance/pools": "VOID-35",
  "/finance/janus": "VOID-36",
  "/finance/payment": "VOID-37",
  "/finance/collapse": "VOID-38",
  "/finance/sov-economy": "VOID-710",
  "/network/distance": "VOID-40",
  "/network/parasitic": "VOID-41",
  "/network/echonet": "VOID-42",
  "/network/mesh": "VOID-43",
  "/network/acoustic": "VOID-44",
  "/network/supply-chain": "VOID-45",
  "/network/nostr-oracle": "VOID-46",
  "/network/silent-hosting": "VOID-700",
  "/network/mesh-cdn": "VOID-701",
  "/mesh/liquidity": "VOID-721",
  "/compute/mirage": "VOID-50",
  "/compute/hgpu": "VOID-51",
  "/compute/vhgpu": "VOID-52",
  "/compute/pmu-vhgpu": "VOID-53",
  "/compute/bruno-theory": "VOID-54",
  "/compute/cosmic-harmony": "VOID-57",
  "/compute/isossupra": "VOID-600",
  "/compute/void-stack": "VOID-600",
  "/compute/imc": "VOID-600",
  "/void/bridge": "VOID-511",
  "/void/pci": "VOID-512",
  "/void/mesh": "VOID-700",
  "/compute/pmu-truth": "VOID-58",
  "/compute/pmu-roadmap": "VOID-59",
  "/compute/animus": "VOID-02",
  "/compute/hydra": "VOID-02",
  "/compute/omega": "VOID-60",
  "/compute/hgpu-compute": "VOID-61",
  "/lab/lsc": "VOID-70",
  "/lab/qrc-topology": "VOID-71",
  "/lab/paleo": "VOID-72",
  "/lab/collapse-algebra": "VOID-73",
  "/lab/anacroclastia": "VOID-74",
  "/lab/lusus": "VOID-80",
  "/lab/aqre-limits": "VOID-74",
  "/lab/eaas": "VOID-521",
  "/lab/sku-cosmos": "VOID-125",
  "/governance/dao": "VOID-90",
  "/governance/anti-sybil": "VOID-91",
  "/governance/double-spend": "VOID-92",
  "/governance/temporal": "VOID-93",
  "/governance/social-recovery": "VOID-94",
  "/governance/consent": "VOID-95",
  "/governance/sovereignty": "VOID-96",
  "/vault/phopper": "VOID-100",
  "/vault/aegis": "VOID-101",
  "/vault/yield": "VOID-102",
  "/vault/ghost-locker": "VOID-103",
  "/vault/faucet": "VOID-104",
  "/terminal/active": "VOID-110",
  "/terminal/symbiont": "VOID-111",
  "/terminal/lua": "VOID-112",
  "/terminal/watchtower": "VOID-113",
  "/terminal/sphinx": "VOID-114",
  "/terminal/differential": "VOID-115",
  "/terminal/marketplace": "VOID-520",
  "/terminal/gpu-mining": "VOID-120",
  "/terminal/homotopy": "VOID-121",
  "/terminal/ghost-mailbox": "VOID-119",
  "/terminal/octree": "VOID-122",
  "/terminal/social": "VOID-123",
  "/terminal/glossary": "VOID-124",
};

/** Bundles → SKUs incluídos (expansão recursiva). */
export const BUNDLE_INCLUDES: Record<string, readonly string[]> = {
  "VOID-ALL": ["__ALL_ROUTES__"],
  /** Catálogo completo VOID-00…VOID-329 (+ bundles comerciais) — 265 SKUs definidos. */
  "VOID-CATALOG-FULL": [...IMC_CORE_SKUS],
  "VOID-26": [
    "VOID-20",
    "VOID-21",
    "VOID-22",
    "VOID-23",
    "VOID-24",
    "VOID-25",
    "VOID-11",
    "VOID-95",
  ],
  "VOID-39": [
    "VOID-30",
    "VOID-31",
    "VOID-32",
    "VOID-33",
    "VOID-34",
    "VOID-35",
    "VOID-36",
    "VOID-37",
    "VOID-38",
    "VOID-05",
    "VOID-06",
  ],
  "VOID-46": ["VOID-40", "VOID-41", "VOID-42", "VOID-43", "VOID-44", "VOID-45"],
  "VOID-62": [
    "VOID-50",
    "VOID-51",
    "VOID-52",
    "VOID-53",
    "VOID-54",
    "VOID-55",
    "VOID-56",
    "VOID-57",
    "VOID-58",
    "VOID-59",
    "VOID-60",
    "VOID-61",
    "VOID-02",
  ],
  "VOID-81": ["VOID-76", "VOID-03", "VOID-23"],
  "VOID-97": ["VOID-90", "VOID-91", "VOID-92", "VOID-93", "VOID-94", "VOID-95", "VOID-96"],
  "VOID-159": [
    "VOID-140",
    "VOID-141",
    "VOID-142",
    "VOID-143",
    "VOID-144",
    "VOID-145",
    "VOID-146",
    "VOID-147",
    "VOID-148",
    "VOID-149",
    "VOID-150",
    "VOID-151",
    "VOID-152",
    "VOID-153",
    "VOID-154",
    "VOID-155",
    "VOID-156",
    "VOID-157",
    "VOID-158",
  ],
  "VOID-174": [
    "VOID-160",
    "VOID-161",
    "VOID-162",
    "VOID-163",
    "VOID-164",
    "VOID-95",
    "VOID-165",
    "VOID-166",
    "VOID-167",
    "VOID-168",
    "VOID-169",
    "VOID-170",
    "VOID-171",
    "VOID-172",
    "VOID-173",
  ],
  "VOID-188": ["VOID-183", "VOID-184", "VOID-12"],
  "VOID-189": ["VOID-180", "VOID-181", "VOID-182", "VOID-186"],
  "VOID-199": ["VOID-190", "VOID-191", "VOID-03", "VOID-05"],
  "VOID-205": ["VOID-200", "VOID-201", "VOID-202", "VOID-203", "VOID-204", "VOID-141"],
  "VOID-219": ["VOID-211", "VOID-212", "VOID-213", "VOID-43"],
  "VOID-244": ["VOID-230", "VOID-231", "VOID-232", "VOID-233", "VOID-234", "VOID-112"],
  "VOID-263": [
    "VOID-250",
    "VOID-251",
    "VOID-252",
    "VOID-253",
    "VOID-254",
    "VOID-255",
    "VOID-256",
    "VOID-09",
    "VOID-54",
  ],
  "VOID-264": ["VOID-252", "VOID-168", "VOID-20"],
  "VOID-279": [
    "VOID-270",
    "VOID-271",
    "VOID-272",
    "VOID-273",
    "VOID-274",
    "VOID-275",
    "VOID-276",
    "VOID-277",
    "VOID-278",
  ],
  "VOID-294": ["VOID-280", "VOID-281", "VOID-282", "VOID-283"],
  "VOID-295": ["VOID-284", "VOID-285", "VOID-286", "VOID-06"],
  "VOID-296": ["VOID-287", "VOID-07", "VOID-08"],
  "VOID-299": [
    "VOID-280",
    "VOID-281",
    "VOID-282",
    "VOID-283",
    "VOID-284",
    "VOID-285",
    "VOID-286",
    "VOID-287",
    "VOID-288",
    "VOID-289",
    "VOID-290",
    "VOID-291",
    "VOID-292",
    "VOID-293",
    "VOID-297",
    "VOID-298",
    "VOID-198",
  ],
  "VOID-328": ["VOID-11", "VOID-21", "VOID-95", "VOID-10"],
  "VOID-327": ["VOID-10", "VOID-13", "VOID-96"],
  "VOID-329": ["VOID-320", "VOID-321", "VOID-325", "VOID-326"],
  // Bundles comerciais (secção 25)
  "SOVEREIGN-CITIZEN": ["VOID-08", "VOID-10", "VOID-11", "VOID-21", "VOID-95", "VOID-57"],
  "CRYPTO-LAB": ["VOID-00", "VOID-01", "VOID-20", "VOID-22", "VOID-23", "VOID-91", "VOID-92", "VOID-159"],
  "ENTROPY-APPLIANCE": ["VOID-03", "VOID-76", "VOID-81", "VOID-05"],
  "FINANCE-NODE": ["VOID-05", "VOID-37", "VOID-39"],
  "COMPUTE-WORKER": ["VOID-02", "VOID-58", "VOID-52", "VOID-53", "VOID-62"],
  "GPU-ORCHESTRATION": ["VOID-54", "VOID-52", "VOID-53", "VOID-61", "VOID-51"],
  "RESEARCH-INSTITUTE": ["VOID-09", "VOID-54", "VOID-70", "VOID-71", "VOID-72", "VOID-73", "VOID-74", "VOID-80", "VOID-263"],
  "EDGE-INTELLIGENCE": ["VOID-12", "VOID-100", "VOID-110", "VOID-189"],
  "PRIVACY-MAX": ["VOID-114", "VOID-115", "VOID-119", "VOID-121", "VOID-41"],
  "MESSENGER-ENTERPRISE": ["VOID-328", "VOID-174"],
  "AMP-GOVERNANCE-PACK": ["VOID-174", "VOID-97"],
  "PERFIL-B-HOME": ["VOID-199", "VOID-08"],
  "CERTIFIED-PRODUCTION": ["VOID-294", "VOID-296"],
  "QUANTUM-LAB-PACK": ["VOID-244", "VOID-81"],
  "VPS-OPERATOR-PACK": ["VOID-299", "VOID-198"],
  "WHITE-LABEL-OEM": ["VOID-329", "VOID-305", "VOID-08"],
  "ANIMUS-OS-PREVIEW": ["VOID-130", "VOID-131", "VOID-132", "VOID-133", "VOID-57"],
  "FULL-ENTERPRISE": ["VOID-ALL"],
  "VOID-319": ["VOID-CATALOG-FULL"],
};

/** SKUs infra/UX que activam rotas relacionadas (sem painel próprio). */
const INFRA_ROUTE_ALIASES: Record<string, readonly string[]> = {
  "VOID-02": ["/compute/animus", "/compute/hydra"],
  "VOID-03": ["/lab/eaas", "/crypto/cqr-pqc"],
  "VOID-76": ["/lab/eaas"],
  "VOID-521": ["/lab/eaas", "/crypto/ghostid"],
  "VOID-520": ["/terminal/marketplace", "/network/silent-hosting"],
  "VOID-700": ["/network/silent-hosting"],
  "VOID-701": ["/network/mesh-cdn"],
  "VOID-702": ["/network/silent-hosting"],
  "VOID-703": ["/finance/sov-economy"],
  "VOID-704": ["/finance/sov-economy", "/network/silent-hosting"],
  "VOID-705": ["/finance/sov-economy", "/terminal/marketplace"],
  "VOID-710": ["/finance/sov-economy"],
  "VOID-511": ["/network/mesh", "/network/supply-chain"],
  "VOID-05": ["/finance/payment", "/network/mesh", "/governance/dao"],
  "VOID-06": ["/compute/pmu-roadmap"],
  "VOID-07": ["/messenger"],
  "VOID-08": ["/dashboard", "/messenger"],
  "VOID-09": ["/compute/bruno-theory"],
  "VOID-130": ["/dashboard"],
  "VOID-131": ["/dashboard"],
  "VOID-132": ["/compute/cosmic-harmony", "/compute/bruno-theory"],
  "VOID-133": ["/dashboard", "/compute/cosmic-harmony"],
  "VOID-320": ["/dashboard"],
  "VOID-321": ["/dashboard"],
};

const ALL_ROUTE_SKU_IDS = [...new Set(Object.values(ROUTE_PRIMARY_SKU))];
const ALL_PANEL_PATHS = new Set(Object.keys(ROUTE_PRIMARY_SKU));

export function normalizeSkuId(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const u = t.toUpperCase();
  if (u === "FULL-ENTERPRISE" || u === "ALL" || u === "*") return "VOID-ALL";
  if (u === "VOID-00-329" || u === "VOID-00329") return "VOID-CATALOG-FULL";
  if (u === "VOID-ALL" || u === "VOID-CATALOG-FULL") return u;
  if (u.startsWith("VOID-")) return u;
  if (/^[0-9]{1,3}[A-F]?$/i.test(t)) return `VOID-${t.toUpperCase()}`;
  return u;
}

function parseSkusFromBuildEnv(): string[] {
  let raw: string | undefined;
  if (typeof __B2B_SKUS__ !== "undefined") {
    raw = String(__B2B_SKUS__);
  } else {
    raw = import.meta.env.VITE_B2B_SKUS;
  }
  if (!raw || raw === "[]") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
  } catch {
    /* csv fallback abaixo */
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Expande bundles recursivamente. */
export function resolveSkuIds(input: string | readonly string[]): Set<string> {
  const queue = (typeof input === "string" ? input.split(",") : [...input])
    .map(normalizeSkuId)
    .filter(Boolean);
  const out = new Set<string>();

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (out.has(id)) continue;

    if (id === "VOID-ALL") {
      for (const routeSku of ALL_ROUTE_SKU_IDS) out.add(routeSku);
      continue;
    }

    if (id === "VOID-CATALOG-FULL") {
      for (const sku of Object.values(ROUTE_PRIMARY_SKU)) out.add(sku);
      for (const child of IMC_CORE_SKUS) out.add(child);
      continue;
    }

    out.add(id);

    const bundle = BUNDLE_INCLUDES[id];
    if (bundle) {
      for (const child of bundle) {
        if (child === "__ALL_ROUTES__") {
          for (const routeSku of ALL_ROUTE_SKU_IDS) out.add(routeSku);
        } else {
          queue.push(normalizeSkuId(child));
        }
      }
    }
  }

  return out;
}

export function isB2bFilterActive(): boolean {
  return parseSkusFromBuildEnv().length > 0;
}

export function getActiveSkuIds(): Set<string> {
  return resolveSkuIds(parseSkusFromBuildEnv());
}

/** `null` = sem filtro (todas as rotas). */
export function resolveEnabledPathsFromSkuInput(input: readonly string[]): Set<string> | null {
  const skus = input.map((s) => s.trim()).filter(Boolean);
  if (skus.length === 0) return null;

  const ids = resolveSkuIds(skus);
  const paths = new Set<string>();

  for (const [path, sku] of Object.entries(ROUTE_PRIMARY_SKU)) {
    if (ids.has(sku)) paths.add(path);
  }

  for (const id of ids) {
    const catalogPath = SKU_BY_ID[id]?.path;
    if (catalogPath && ALL_PANEL_PATHS.has(catalogPath)) paths.add(catalogPath);

    const extra = INFRA_ROUTE_ALIASES[id];
    if (extra) {
      for (const p of extra) {
        if (ALL_PANEL_PATHS.has(p)) paths.add(p);
      }
    }
  }

  return paths;
}

declare const __IMC_V2__: boolean;

export function getEnabledRoutePaths(): Set<string> | null {
  if (typeof __IMC_V2__ !== "undefined" && __IMC_V2__ === true) {
    return new Set(getImcActivePaths());
  }
  return resolveEnabledPathsFromSkuInput(parseSkusFromBuildEnv());
}

export function getB2bBuildLabel(): string {
  const skus = parseSkusFromBuildEnv();
  if (skus.length === 0) return "full";
  const norm = skus.map(normalizeSkuId);
  if (norm.includes("VOID-CATALOG-FULL") || norm.includes("VOID-ALL")) return "VOID-CATALOG-FULL";
  if (skus.length <= 4) return norm.join(", ");
  return `${skus.length} SKUs`;
}

/** Valida que todas as rotas do router têm SKU primário. */
export function assertRouteCoverage(allPaths: readonly string[]): void {
  const missing = allPaths.filter((p) => !ROUTE_PRIMARY_SKU[p]);
  if (missing.length > 0) {
    throw new Error(`B2B manifest: rotas sem SKU: ${missing.join(", ")}`);
  }
}

export function listSkusForPath(path: string): string[] {
  const primary = ROUTE_PRIMARY_SKU[path];
  return primary ? [primary] : [];
}

/** SKUs registados no catálogo (VOID-00…VOID-329 namespace). */
export function isKnownCatalogSku(id: string): boolean {
  return id in SKU_BY_ID || id in BUNDLE_INCLUDES || id === "VOID-ALL";
}
