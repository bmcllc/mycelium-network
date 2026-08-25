import { assertRouteCoverage, getEnabledRoutePaths } from "./b2b/skuManifest";
import { buildB2bRouteMeta } from "./b2b/filterRoutes";
import { ROUTE_CATALOG } from "./b2b/routeCatalog";
import { buildRoutes, type RouteDef } from "./b2b/buildRoutes";

export type { RouteDef };

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const categories: CategoryDef[] = [
  { id: "home", label: "Início", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", color: "#b6ff3a", description: "Messenger, Dashboard e Ferramentas" },
  { id: "crypto", label: "Crypto", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", color: "#f59e0b", description: "ZKP, GhostID, PQC, Criptografia" },
  { id: "finance", label: "Finance", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "#10b981", description: "DEX, Exchange, Stablecoin, DeFi" },
  { id: "network", label: "Network", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9", color: "#3b82f6", description: "Distance Bridge, LoRa, EcoNet, Mesh" },
  { id: "compute", label: "Computação avançada", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "#8b5cf6", description: "VOID Stack, IMC, Harmonia — sabor «Quântico» clássico" },
  { id: "lab", label: "Lab avançado", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#06b6d4", description: "LUSUS, LSC, EaaS, limites anacróclastas honestos" },
  { id: "vault", label: "Vault", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", color: "#f97316", description: "Locker, Aegis, Yield, Faucet" },
  { id: "governance", label: "Governança", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "#ef4444", description: "DAO, Anti-Sybil, Segurança" },
  { id: "terminal", label: "Terminal", icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#6b7280", description: "Marketplace, Lua, Watchtower" },
];

export const categoryColorMap: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.color])
);

/** Metadados de todas as rotas (sem componentes lazy). */
export { ROUTE_CATALOG as routeCatalog };

/** Áreas com hub de listagem (ex.: /crypto → todos os módulos Crypto). */
export const PANEL_CATEGORY_IDS = [
  "home",
  "crypto",
  "finance",
  "network",
  "compute",
  "lab",
  "vault",
  "governance",
  "terminal",
] as const;

export type PanelCategoryId = (typeof PANEL_CATEGORY_IDS)[number];

export function getCategoryHubPath(categoryId: string): string {
  return `/${categoryId}`;
}

export function getCategoryHubRoutes(): { path: string; categoryId: PanelCategoryId }[] {
  return PANEL_CATEGORY_IDS.map((id) => ({
    path: getCategoryHubPath(id),
    categoryId: id,
  }));
}

/** Hubs com pelo menos um painel activo no build actual. */
export function getActiveCategoryHubRoutes(): { path: string; categoryId: PanelCategoryId }[] {
  return getCategoryHubRoutes().filter((hub) => getRoutesByCategory(hub.categoryId).length > 0);
}

assertRouteCoverage(ROUTE_CATALOG.map((r) => r.path));

/** Rotas expostas no build (lazy só para painéis activos). */
export const routes = buildRoutes(getEnabledRoutePaths());

export const b2bRouteMeta = buildB2bRouteMeta(ROUTE_CATALOG.length, routes.length);

/** Catálogo completo com lazy — usar em testes, não no bundle B2B filtrado. */
export function buildAllRoutesForTest(): RouteDef[] {
  return buildRoutes(null);
}

export function getRoutesByCategory(category: string): RouteDef[] {
  return routes.filter((r) => r.category === category);
}

export function getCategoryById(id: string): CategoryDef | undefined {
  return categories.find((c) => c.id === id);
}

/** Hub ou qualquer painel da área (ex.: /crypto e /crypto/zkp). */
export function isPanelCategoryActive(categoryId: PanelCategoryId, pathname: string): boolean {
  if (pathname === getCategoryHubPath(categoryId)) return true;
  if (categoryId === "home") {
    return getRoutesByCategory("home").some((r) => r.path === pathname);
  }
  return pathname.startsWith(`${getCategoryHubPath(categoryId)}/`);
}
