/** Selectores ETRNETAnchor (ethers id). */

export const ANCHOR_SELECTORS = {
  proposeRoot: "0x2b7cd637",
  finalizeRoot: "0x22888f63",
  getState: "0x1865c57d",
} as const;

export function encodeProposeRootCalldata(rootHex: string): string {
  const root = rootHex.replace(/^0x/i, "").padStart(64, "0");
  return ANCHOR_SELECTORS.proposeRoot + root;
}

export function encodeGetStateCalldata(): string {
  return ANCHOR_SELECTORS.getState;
}

export function encodeFinalizeRootCalldata(): string {
  return ANCHOR_SELECTORS.finalizeRoot;
}

/** Decodifica retorno ABI de getState() — 5 slots de 32 bytes. */
export function decodeGetStateResult(hex: string): {
  currentRoot: string;
  lastUpdate: bigint;
  updateCount: bigint;
  pendingRoot: string;
  pendingTimestamp: bigint;
} {
  const data = hex.replace(/^0x/i, "");
  const words: string[] = [];
  for (let i = 0; i < 5; i++) {
    words.push(data.slice(i * 64, (i + 1) * 64));
  }
  return {
    currentRoot: `0x${words[0]}`,
    lastUpdate: BigInt(`0x${words[1]}`),
    updateCount: BigInt(`0x${words[2]}`),
    pendingRoot: `0x${words[3]}`,
    pendingTimestamp: BigInt(`0x${words[4]}`),
  };
}
