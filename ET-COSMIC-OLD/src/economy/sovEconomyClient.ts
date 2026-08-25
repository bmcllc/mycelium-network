/**
 * Cliente VOID-710/703/704/705 — economia SOV soberana.
 */

const API = import.meta.env.VITE_ECONOMY_API ?? "/api/economy";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function defaultAccountId(): string {
  const key = "void_sov_account";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `user:${crypto.randomUUID().slice(0, 12)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export async function fetchBalance(accountId: string) {
  return api<{ balanceSov: number; balanceMicro: number; protocolBps?: number }>(
    `/balance/${encodeURIComponent(accountId)}`,
  );
}

export async function fetchHistory(accountId: string) {
  return api<{ entries: Array<{ type: string; amountMicro: number; channel?: string; at: number }> }>(
    `/history/${encodeURIComponent(accountId)}`,
  );
}

export async function publishBinaryArtifact(opts: {
  name: string;
  priceSov: number;
  platform: string;
  sha256?: string;
  sellerId: string;
}) {
  return api<{ artifactId: string; priceSov: number }>("/binaries/publish", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function listBinaryArtifacts() {
  return api<{ artifacts: Array<{ artifactId: string; name: string; priceSov: number; platform: string }> }>(
    "/binaries",
  );
}

export async function buyBinary(artifactId: string, buyerId: string) {
  return api<{ downloadUrl?: string; error?: string }>(`/binaries/${artifactId}/purchase`, {
    method: "POST",
    body: JSON.stringify({ buyerId }),
  });
}

export async function registerHostSite(ownerId: string, origin: string) {
  return api<{ siteId: string }>("/hosting/sites/register", {
    method: "POST",
    body: JSON.stringify({ ownerId, origin }),
  });
}

export async function reportHostingTraffic(siteId: string, metrics: { visitors: number; bytesServed: number }) {
  return api<{ creditedMicro: number }>(`/hosting/sites/${siteId}/traffic`, {
    method: "POST",
    body: JSON.stringify(metrics),
  });
}

export async function registerEthicalMiner(workerId: string, accountId: string) {
  return api<{ workerId: string }>("/mining/workers/register", {
    method: "POST",
    body: JSON.stringify({ workerId, accountId, consent: true }),
  });
}

export async function runEthicalWork(
  workerId: string,
  body: { accountId: string; type: string; cpuPct?: number },
) {
  return api<{ creditedMicro: number; action?: string; reason?: string }>(
    `/mining/workers/${workerId}/work`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function fetchMiningRewards() {
  return api<{ rewardsMicro: Record<string, number> }>("/mining/rewards");
}

export async function fetchPairedDepositRate() {
  return api<{ satPerSov: number; currency: string; pairedTo: string }>("/deposit/paired/rate");
}

export type PairedDepositIntent = {
  ok: boolean;
  depositId: string;
  accountId: string;
  amountSov: number;
  amountSat: number;
  status: string;
  lightningLabel?: string;
  creditedSov?: number;
  balanceSov?: number;
};

export async function createPairedDepositIntent(opts: {
  accountId: string;
  amountSov: number;
  method: "lightning" | "simulated" | "demo" | "nwc";
  reference?: string;
}) {
  return api<PairedDepositIntent>("/deposit/paired/intent", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function fetchPairedDepositStatus(depositId: string) {
  return api<{
    deposit: { status: string; amountSov: number; invoiceId: string | null };
    balance: { balanceSov: number };
  }>(`/deposit/paired/${encodeURIComponent(depositId)}`);
}

export async function confirmPairedDepositSim(depositId: string) {
  return api<{ ok: boolean; creditedSov: number; balanceSov: number }>("/deposit/paired/confirm-sim", {
    method: "POST",
    body: JSON.stringify({ depositId }),
  });
}

export function lightningApiBase(): string {
  const origin = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_PAGES_API_ORIGIN;
  if (origin) return `${origin.replace(/\/$/, "")}/api/lightning`;
  return "/api/lightning";
}

export async function createLightningInvoiceForDeposit(opts: {
  pairedDepositId: string;
  amountSat: number;
  label?: string;
}) {
  const res = await fetch(`${lightningApiBase()}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountSat: opts.amountSat,
      pairedDepositId: opts.pairedDepositId,
      label: opts.label ?? `paired:${opts.pairedDepositId}`,
    }),
  });
  if (!res.ok) throw new Error(`lightning/create → ${res.status}`);
  return res.json() as Promise<{
    id: string;
    invoice: string;
    amountSat: number;
    mode: string;
    pairedDepositId?: string;
  }>;
}

export async function simulateLightningSettle(invoiceId: string) {
  const res = await fetch(`${lightningApiBase()}/simulate-settle/${encodeURIComponent(invoiceId)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`lightning/simulate-settle → ${res.status}`);
  return res.json() as Promise<{ ok: boolean; status: string }>;
}
