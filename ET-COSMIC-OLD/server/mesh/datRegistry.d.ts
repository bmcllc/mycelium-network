export function registerDat(dat: Record<string, unknown>): Record<string, unknown>;
export function getDat(datId: string): Record<string, unknown>;
export function markDatConsumed(datId: string, units: number): Record<string, unknown>;
export function listDats(limit?: number): Record<string, unknown>[];
