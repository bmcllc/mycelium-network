export type SkuKind = "route" | "infra" | "bundle" | "service" | "ux";

export interface SkuDef {
  id: string;
  name: string;
  kind: SkuKind;
  paths?: readonly string[];
  includes?: readonly string[];
}
