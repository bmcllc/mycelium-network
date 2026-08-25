/**
 * Cliente Protocol-First Liquidity Mesh (VOID-721).
 */

const API = import.meta.env.VITE_MESH_LIQUIDITY_API ?? "/api/mesh/liquidity";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
    const detail = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(detail || `${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMeshHealth() {
  return api<{ status: string; features: string[] }>("/health");
}

export async function fetchPmuAuditPrice() {
  return api<{
    sku: string;
    priceSov: number;
    priceMicro: number;
    poolId: string;
  }>("/vas/pmu-audit/price");
}

export type PmuAuditCheckoutResult = {
  ok: boolean;
  sku: string;
  dat: { datId: string };
  settlement: {
    grossMicro: number;
    netMicro: number;
    protocolFeeMicro: number;
    poolFeeMicro: number;
  };
  report: {
    report_id: string;
    generated_at: string;
    truth_level_id: string;
    settlement: { grossSov: number };
    report_path?: string | null;
  };
  balanceSov: number;
};

export async function checkoutPmuAuditApi(opts: {
  consumerId: string;
  demoTopUp?: boolean;
}) {
  return api<PmuAuditCheckoutResult>("/vas/pmu-audit/checkout", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function mintDatApi(opts: {
  resourceId: string;
  poolId: string;
  reputationScore?: number;
  tier?: string;
}) {
  return api<{ dat: { datId: string; paymentStreamMicro: number; poolId: string } }>("/dat/mint", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function consumeDatApi(opts: {
  datId: string;
  consumerId: string;
  providerId: string;
  units?: number;
}) {
  return api<{
    grossMicro: number;
    netMicro: number;
    bootstrapBonusMicro: number;
    balanceConsumer: number;
  }>("/dat/consume", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function registerProviderApi(opts: {
  accountId: string;
  poolId: string;
  providerId?: string;
}) {
  return api<{ provider: { providerId: string; bootstrapEligible: boolean } }>(
    "/providers/register",
    { method: "POST", body: JSON.stringify(opts) },
  );
}

export async function fetchBootstrapStatus() {
  return api<{
    phaseActive: boolean;
    slotsRemaining: number;
    bonusMultiplier: number;
    registeredProviders: number;
  }>("/mining/bootstrap");
}

export async function commitSlaApi(opts: {
  providerId: string;
  accountId: string;
  stakeMicro: number;
  poolId: string;
}) {
  return api<{ commitment: { commitmentId: string } }>("/sla/commit", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function submitSlaProofApi(opts: {
  commitmentId: string;
  providerId: string;
  ok?: boolean;
}) {
  return api<{ proof: { proofId: string } }>("/sla/proof", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function evaluateSlaApi(commitmentId: string) {
  return api<{ fulfilled: boolean; uptimePct: number; slashedMicro: number }>(
    "/sla/evaluate",
    { method: "POST", body: JSON.stringify({ commitmentId }) },
  );
}

export async function fetchBuilderTierPrice() {
  return api<{
    tier: string;
    monthlySov: number;
    monthlyMicro: number;
    rateLimitPerHour: number;
    renewalDays: number;
  }>("/vas/tier/builder/price");
}

export type TierSubscribeResult = {
  ok: boolean;
  tier: string;
  monthlySov: number;
  renewsAt: number;
  renewsAtIso: string;
  balanceSov: number;
  rateLimitPerHour: number;
};

export async function subscribeBuilderTierApi(opts: {
  accountId: string;
  tier?: string;
  demoTopUp?: boolean;
}) {
  return api<TierSubscribeResult>("/vas/tier/subscribe", {
    method: "POST",
    body: JSON.stringify({ tier: "builder", ...opts }),
  });
}

export async function fetchTierStatus(accountId: string) {
  return api<{
    accountId: string;
    tier: string | null;
    active: boolean;
    renewsAt: number | null;
    monthlySov?: number;
    rateLimitPerHour?: number;
    lastRenewalError?: string | null;
    renewalFailedAt?: number | null;
  }>(`/vas/tier/status/${encodeURIComponent(accountId)}`);
}
