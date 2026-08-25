import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { ROUTE_CATALOG, type RouteCatalogEntry } from "./routeCatalog";
import { B2B_PANEL_LOADERS } from "virtual:b2b-panel-loaders";

export interface RouteDef extends RouteCatalogEntry {
  component: LazyExoticComponent<ComponentType>;
}

/** Constrói rotas com lazy() apenas para paths activos (build B2B tree-shakeable). */
export function buildRoutes(enabledPaths: ReadonlySet<string> | null): RouteDef[] {
  const entries =
    enabledPaths === null
      ? ROUTE_CATALOG
      : ROUTE_CATALOG.filter((e) => enabledPaths.has(e.path));

  return entries.map((meta) => {
    const loader = B2B_PANEL_LOADERS[meta.path];
    if (!loader) {
      throw new Error(`B2B loaders: rota sem import dinâmico: ${meta.path}`);
    }
    return { ...meta, component: lazy(loader) };
  });
}
