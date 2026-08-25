import type { AccessTierId, LiquidityPoolId } from "./datTypes";

export interface LiquidityPoolDef {
  id: LiquidityPoolId;
  label: string;
  resources: string;
  providers: string;
  consumers: string;
  protocolFeeBps: number;
  basePriceMicroPerUnit: number;
}

export const LIQUIDITY_POOLS: readonly LiquidityPoolDef[] = [
  {
    id: "POOL-COMPUTE",
    label: "Compute",
    resources: "CPU / GPU / WASM workers",
    providers: "Datacenters ociosos, miners éticos VOID-705",
    consumers: "Startups, labs de pesquisa",
    protocolFeeBps: 250,
    basePriceMicroPerUnit: 1000,
  },
  {
    id: "POOL-STORAGE",
    label: "Storage",
    resources: "Anderson localization shards",
    providers: "Nós com disco livre (Silent Mesh)",
    consumers: "Healthtech, fintech",
    protocolFeeBps: 180,
    basePriceMicroPerUnit: 200,
  },
  {
    id: "POOL-AI",
    label: "AI inference",
    resources: "Sovereign AI mesh",
    providers: "GPUs descentralizadas",
    consumers: "Dados sensíveis on-prem",
    protocolFeeBps: 320,
    basePriceMicroPerUnit: 5000,
  },
  {
    id: "POOL-QUANTUM",
    label: "Sabor «Quântico»",
    resources: "Tensor compression LUSUS-Q / QRC",
    providers: "Labs clássicos honestos",
    consumers: "Pharma, finance (simulação)",
    protocolFeeBps: 450,
    basePriceMicroPerUnit: 8000,
  },
  {
    id: "POOL-IDENTITY",
    label: "Identity",
    resources: "GhostID ephemeral",
    providers: "Validadores reputados",
    consumers: "Apps anti-vigilância",
    protocolFeeBps: 120,
    basePriceMicroPerUnit: 500,
  },
] as const;

export interface AccessTierDef {
  id: AccessTierId;
  label: string;
  benefit: string;
  /** $SOV/mês (micro unidades internas = SOV × 1e6). */
  monthlySov: number;
  rateLimitPerHour: number | null;
}

export const ACCESS_TIERS: readonly AccessTierDef[] = [
  { id: "citizen", label: "Citizen", benefit: "Acesso básico", monthlySov: 50, rateLimitPerHour: 100 },
  { id: "builder", label: "Builder", benefit: "Priority queue", monthlySov: 250, rateLimitPerHour: 1000 },
  { id: "enterprise", label: "Enterprise", benefit: "Pools dedicadas · SLA code-based", monthlySov: 2500, rateLimitPerHour: null },
  { id: "sovereign", label: "Sovereign", benefit: "Air-gapped · AMM custom", monthlySov: 25000, rateLimitPerHour: null },
] as const;

export function getPoolById(id: LiquidityPoolId): LiquidityPoolDef | undefined {
  return LIQUIDITY_POOLS.find((p) => p.id === id);
}
