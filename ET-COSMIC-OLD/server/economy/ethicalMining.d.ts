export function registerMiner(
  workerId: string,
  body: Record<string, unknown>,
): { workerId: string };

export function submitEthicalWork(
  workerId: string,
  body: Record<string, unknown>,
): { creditedMicro?: number; destructiveHash?: boolean; action?: string };

export function listMiners(): unknown[];
export function getMiningRewards(): unknown;
