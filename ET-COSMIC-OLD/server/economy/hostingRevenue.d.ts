export function registerHostingSite(body: Record<string, unknown>): { siteId: string };

export function recordHostingTraffic(
  siteId: string,
  body: Record<string, unknown>,
): { creditedMicro: number };

export function listHostingSites(): unknown[];
export function getHostingRates(): unknown;
