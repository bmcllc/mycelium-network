/**
 * Subscrição de tiers VAS — débito mensal $SOV no ledger (Builder 250 SOV/mês).
 */
import { createPersistedStore } from "../economy/economyPersistence.js";
import {
  creditAccount,
  debitAccount,
  getBalance,
  microToSov,
  sovToMicro,
} from "../economy/sovLedger.js";

const TREASURY_TIERS = "treasury:tiers";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const TIER_CATALOG = {
  citizen: { monthlySov: 50, rateLimitPerHour: 100 },
  builder: { monthlySov: 250, rateLimitPerHour: 1000 },
  enterprise: { monthlySov: 2500, rateLimitPerHour: null },
  sovereign: { monthlySov: 25000, rateLimitPerHour: null },
};

const store = createPersistedStore("tier-subscriptions.json", { idField: "accountId" });
const { map: subscriptions, schedule: schedulePersist } = store;

function demoTopUpAllowed() {
  return (
    process.env.SOV_VAS_DEMO === "1" ||
    process.env.NODE_ENV === "development" ||
    process.env.VITEST === "true"
  );
}

export function builderTierPrice() {
  const t = TIER_CATALOG.builder;
  return {
    tier: "builder",
    monthlySov: t.monthlySov,
    monthlyMicro: sovToMicro(t.monthlySov),
    rateLimitPerHour: t.rateLimitPerHour,
    renewalDays: 30,
    model: "ledger-debit-auto",
  };
}

function chargeTierCycle(accountId, sub) {
  const catalog = TIER_CATALOG[sub.tier];
  if (!catalog) return { error: "UNKNOWN_TIER", tier: sub.tier };

  const monthlyMicro = sovToMicro(catalog.monthlySov);
  const debit = debitAccount(accountId, monthlyMicro, {
    channel: "tier_renewal",
    tier: sub.tier,
    to: TREASURY_TIERS,
  });

  if (debit.error) {
    sub.lastRenewalError = debit.error;
    sub.renewalFailedAt = Date.now();
    schedulePersist();
    return {
      error: debit.error,
      tier: sub.tier,
      monthlySov: catalog.monthlySov,
      balance: getBalance(accountId),
      hint:
        debit.error === "INSUFFICIENT_SOV"
          ? "Renovação falhou — deposite $SOV para manter o tier activo"
          : undefined,
    };
  }

  creditAccount(TREASURY_TIERS, monthlyMicro, {
    channel: "tier_renewal",
    tier: sub.tier,
    from: accountId,
  });

  const now = Date.now();
  sub.renewsAt = now + MONTH_MS;
  sub.lastRenewalAt = now;
  sub.lastDebitMicro = monthlyMicro;
  delete sub.lastRenewalError;
  delete sub.renewalFailedAt;
  schedulePersist();

  const balance = getBalance(accountId);
  return {
    ok: true,
    renewed: true,
    tier: sub.tier,
    renewsAt: sub.renewsAt,
    debitedMicro: monthlyMicro,
    balanceSov: balance.balanceSov,
    balance,
  };
}

/** Renova uma subscrição vencida (débito mensal). */
export function renewSubscription(accountId) {
  const id = String(accountId || "");
  if (!id) return { error: "accountId required" };
  const sub = subscriptions.get(id);
  if (!sub) return { error: "NO_SUBSCRIPTION" };
  if (sub.renewsAt > Date.now()) {
    return { ok: true, skipped: true, reason: "not_due", renewsAt: sub.renewsAt };
  }
  return chargeTierCycle(id, sub);
}

/** Cron / startup — processa todas as subscrições vencidas. */
export function processDueRenewals() {
  const results = [];
  for (const [accountId, sub] of subscriptions) {
    if (sub.renewsAt <= Date.now()) {
      results.push({ accountId, ...renewSubscription(accountId) });
    }
  }
  return {
    processed: results.length,
    renewed: results.filter((r) => r.ok && r.renewed).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}

export function getTierStatus(accountId, opts = {}) {
  const id = String(accountId || "");
  if (!id) return { error: "accountId required" };

  const attemptRenewal = opts.attemptRenewal !== false;
  const sub = subscriptions.get(id);
  if (sub && attemptRenewal && sub.renewsAt <= Date.now()) {
    renewSubscription(id);
  }

  const current = subscriptions.get(id);
  if (!current) {
    return { accountId: id, tier: null, active: false, renewsAt: null };
  }
  const active = current.renewsAt > Date.now();
  return {
    accountId: id,
    tier: current.tier,
    active,
    renewsAt: current.renewsAt,
    subscribedAt: current.subscribedAt,
    rateLimitPerHour: current.rateLimitPerHour,
    monthlySov: current.monthlySov,
    lastRenewalError: current.lastRenewalError ?? null,
    renewalFailedAt: current.renewalFailedAt ?? null,
    balance: getBalance(id),
  };
}

/**
 * @param {{ accountId?: string; tier?: string; demoTopUp?: boolean }} body
 */
export function subscribeTier(body = {}) {
  const accountId = body.accountId ? String(body.accountId) : "";
  const tier = body.tier ? String(body.tier) : "builder";
  if (!accountId) return { error: "accountId required" };

  const catalog = TIER_CATALOG[tier];
  if (!catalog) return { error: "UNKNOWN_TIER", tier, supported: Object.keys(TIER_CATALOG) };

  const existing = subscriptions.get(accountId);
  if (existing && existing.renewsAt > Date.now()) {
    return {
      error: "ALREADY_ACTIVE",
      tier: existing.tier,
      renewsAt: existing.renewsAt,
      balance: getBalance(accountId),
    };
  }

  const monthlyMicro = sovToMicro(catalog.monthlySov);

  if (body.demoTopUp && demoTopUpAllowed()) {
    creditAccount(accountId, monthlyMicro, { channel: "tier_demo", tier });
  }

  const debit = debitAccount(accountId, monthlyMicro, {
    channel: "tier_subscription",
    tier,
    to: TREASURY_TIERS,
  });

  if (debit.error) {
    return {
      error: debit.error,
      tier,
      monthlySov: catalog.monthlySov,
      monthlyMicro,
      balance: getBalance(accountId),
      hint:
        debit.error === "INSUFFICIENT_SOV"
          ? "Deposite $SOV (depósito pareado) ou active SOV_VAS_DEMO=1 em staging"
          : undefined,
    };
  }

  creditAccount(TREASURY_TIERS, monthlyMicro, {
    channel: "tier_subscription",
    tier,
    from: accountId,
  });

  const now = Date.now();
  const renewsAt = now + MONTH_MS;
  subscriptions.set(accountId, {
    accountId,
    tier,
    monthlySov: catalog.monthlySov,
    rateLimitPerHour: catalog.rateLimitPerHour,
    subscribedAt: now,
    renewsAt,
    lastDebitMicro: monthlyMicro,
  });
  schedulePersist();

  const balance = getBalance(accountId);
  return {
    ok: true,
    tier,
    monthlySov: catalog.monthlySov,
    rateLimitPerHour: catalog.rateLimitPerHour,
    renewsAt,
    renewsAtIso: new Date(renewsAt).toISOString(),
    debitedMicro: monthlyMicro,
    balanceSov: balance.balanceSov,
    balance,
  };
}
