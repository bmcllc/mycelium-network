export {
  ROUTE_PRIMARY_SKU,
  BUNDLE_INCLUDES,
  normalizeSkuId,
  resolveSkuIds,
  isB2bFilterActive,
  getActiveSkuIds,
  getEnabledRoutePaths,
  getB2bBuildLabel,
  assertRouteCoverage,
  listSkusForPath,
  isKnownCatalogSku,
  resolveEnabledPathsFromSkuInput,
  type SkuDef,
  type SkuKind,
} from "./skuManifest";

export { filterRoutesByB2bSkus, buildB2bRouteMeta } from "./filterRoutes";
export { ROUTE_CATALOG } from "./routeCatalog";
export { buildRoutes, type RouteDef } from "./buildRoutes";
export { PANEL_COMPONENT_MAP } from "./componentMap";
export { getB2bSingleEntry, isB2bSlimShell } from "./buildFlags";
export { SKU_CATALOG, MASTER_SKU_IDS, SKU_BY_ID } from "./skuCatalog.generated";
export {
  BUNDLE_LIST_EUR_YEAR,
  PRODUCT_LIST_EUR_YEAR,
  PRODUCT_SOV_MONTH,
  estimateProtocolFeeEurYear,
  estimateSetupFeeEur,
  DEFAULT_PROTOCOL_BPS,
  PROTOCOL_MINIMUM_EUR_YEAR,
} from "./commercialPricing";

export {
  PRODUCTS,
  PRODUCT_IDS,
  getProduct,
  resolveProductSkus,
  resolveProductRoutes,
  buildSkuEnvForProduct,
  getDirectProductForSku,
  type ProductDef,
} from "./productDefinitions";
