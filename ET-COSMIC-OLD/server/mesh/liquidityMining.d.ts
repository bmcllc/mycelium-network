export function bootstrapStatus(): Record<string, unknown>;
export function registerLiquidityProvider(body?: Record<string, unknown>): Record<string, unknown>;
export function getLiquidityProvider(providerId: string): Record<string, unknown>;
export function listLiquidityProviders(): Record<string, unknown>[];
export function applyBootstrapBonus(providerId: string, netMicro: number): { bonusMicro: number };
