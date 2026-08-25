export function computeDatSettlement(
  dat: Record<string, unknown>,
  units: number,
): Record<string, unknown>;

export function consumeDat(body?: Record<string, unknown>): Record<string, unknown>;

export const POOLS: Array<{ id: string; protocolFeeBps: number }>;

export function poolFeeBps(poolId: string): number;
