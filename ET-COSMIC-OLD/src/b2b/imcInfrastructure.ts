/**
 * Infraestrutura IMC v2.0 — malha clássica + sensores (sem motor Python quântico).
 */
import { IMC_ADAPTED_ROUTE_CATALOG } from "./imcAdaptedRouteCatalog";

export const IMC_CORE_SKUS = [
  "VOID-00",
  "VOID-01",
  "VOID-02",
  "VOID-03",
  "VOID-04",
  "VOID-05",
  "VOID-06",
  "VOID-07",
  "VOID-08",
  "VOID-09",
  "VOID-10",
  "VOID-11",
  "VOID-20",
  "VOID-21",
  "VOID-22",
  "VOID-23",
  "VOID-25",
  "VOID-32",
  "VOID-35",
  "VOID-37",
  "VOID-40",
  "VOID-43",
  "VOID-44",
  "VOID-54",
  "VOID-57",
  "VOID-74",
  "VOID-80",
  "VOID-91",
  "VOID-95",
  "VOID-96",
  "VOID-103",
  "VOID-132",
  "VOID-140",
  "VOID-158",
  "VOID-284",
  "VOID-500",
  "VOID-501",
  "VOID-502",
  "VOID-503",
  "VOID-504",
  "VOID-505",
  "VOID-506",
  "VOID-510",
  "VOID-511",
  "VOID-512",
  "VOID-513",
  "VOID-514",
  "VOID-520",
  "VOID-521",
  "VOID-522",
  "VOID-600",
  "VOID-700",
  "VOID-701",
  "VOID-702",
  "VOID-180",
  "VOID-703",
  "VOID-704",
  "VOID-705",
  "VOID-710",
] as const;

/** Demo / whitepaper — só núcleo (22 rotas). */
export const IMC_SLIM_PATHS = [
  "/messenger",
  "/dashboard",
  "/crypto/ghostid",
  "/crypto/zkp",
  "/crypto/pqc",
  "/crypto/cqr-pqc",
  "/crypto/karma",
  "/finance/payment",
  "/finance/nostr-dex",
  "/finance/pools",
  "/network/mesh",
  "/network/distance",
  "/network/acoustic",
  "/network/silent-hosting",
  "/network/mesh-cdn",
  "/compute/cosmic-harmony",
  "/compute/bruno-theory",
  "/compute/void-stack",
  "/lab/anacroclastia",
  "/lab/lusus",
  "/governance/consent",
  "/governance/sovereignty",
  "/governance/anti-sybil",
  "/vault/ghost-locker",
] as const;

/** Build IMC completo — todos os módulos adaptados. */
export const IMC_EXTENDED_PATHS = IMC_ADAPTED_ROUTE_CATALOG.map((r) => r.path);

/** @deprecated alias — default = extended */
export const IMC_ENABLED_PATHS = IMC_EXTENDED_PATHS;

export type ImcEnabledPath = (typeof IMC_EXTENDED_PATHS)[number];

export function isImcV2Build(): boolean {
  return import.meta.env.VITE_IMC_V2 === "true" || import.meta.env.VITE_IMC_V2 === "1";
}

export function isImcSlimBuild(): boolean {
  return import.meta.env.VITE_IMC_SLIM === "true" || import.meta.env.VITE_IMC_SLIM === "1";
}

export function getImcActivePaths(): readonly string[] {
  return isImcSlimBuild() ? IMC_SLIM_PATHS : IMC_EXTENDED_PATHS;
}
