import type { RouteDef } from "../router";
import { getEnabledRoutePaths, getB2bBuildLabel, isB2bFilterActive } from "./skuManifest";

export function filterRoutesByB2bSkus(allRoutes: readonly RouteDef[]): RouteDef[] {
  const enabled = getEnabledRoutePaths();
  if (!enabled) return [...allRoutes];
  return allRoutes.filter((r) => enabled.has(r.path));
}

export function getB2bRouteFilterMeta(): {
  active: boolean;
  label: string;
  routeCount: number;
  totalCount: number;
} {
  const active = isB2bFilterActive();
  return {
    active,
    label: getB2bBuildLabel(),
    routeCount: 0,
    totalCount: 0,
  };
}

export function buildB2bRouteMeta(totalCount: number, routeCount: number) {
  return {
    active: isB2bFilterActive(),
    label: getB2bBuildLabel(),
    routeCount,
    totalCount,
  };
}
