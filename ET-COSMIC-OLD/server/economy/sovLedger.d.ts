export function creditAccount(
  accountId: string,
  amountMicro: number,
  meta?: Record<string, unknown>,
): { accountId: string; balanceMicro: number; creditedMicro: number };

export function getBalance(accountId: string): {
  accountId: string;
  balanceMicro: number;
  balanceSov: number;
  error?: string;
};

export function applyProtocolFee(grossMicro: number): {
  feeMicro: number;
  netMicro: number;
  protocolBps: number;
};

export function transferWithFee(
  fromId: string,
  toId: string,
  grossMicro: number,
  channel: string,
): Record<string, unknown>;

export function flushSovLedger(): void;

export function economyStatus(): Record<string, unknown>;
