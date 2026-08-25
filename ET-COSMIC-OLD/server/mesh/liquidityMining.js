/**
 * Liquidity mining bootstrap — registo de provedores + bonus.
 */
import crypto from "crypto";
import { creditAccount } from "../economy/sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "../economy/economyPersistence.js";

const BOOTSTRAP = {
  maxProviders: parseInt(process.env.LIQUIDITY_BOOTSTRAP_MAX ?? "30", 10),
  bonusMultiplier: parseFloat(process.env.LIQUIDITY_BOOTSTRAP_MULTIPLIER ?? "2"),
  bonusCapMicro: parseInt(process.env.LIQUIDITY_BOOTSTRAP_CAP_MICRO ?? "500000", 10),
  phaseDurationMs: parseInt(process.env.LIQUIDITY_BOOTSTRAP_MS ?? String(90 * 86400000), 10),
};

const miningStore = createPersistedStore("mesh-liquidity-providers.json", { idField: "providerId" });
registerEconomyFlusher(miningStore.flush);

let phaseStartedAt = miningStore.map.get("__meta")?.phaseStartedAt ?? Date.now();

function ensureMeta() {
  if (!miningStore.map.has("__meta")) {
    miningStore.map.set("__meta", { phaseStartedAt });
    miningStore.schedule();
  }
  return miningStore.map.get("__meta");
}

export function bootstrapStatus() {
  ensureMeta();
  const meta = miningStore.map.get("__meta");
  const providers = [...miningStore.map.values()].filter((p) => p.providerId !== "__meta");
  const now = Date.now();
  const active = now - meta.phaseStartedAt < BOOTSTRAP.phaseDurationMs;
  return {
    sku: "VOID-721",
    phaseActive: active,
    phaseStartedAt: meta.phaseStartedAt,
    phaseEndsAt: meta.phaseStartedAt + BOOTSTRAP.phaseDurationMs,
    maxProviders: BOOTSTRAP.maxProviders,
    registeredProviders: providers.length,
    slotsRemaining: Math.max(0, BOOTSTRAP.maxProviders - providers.length),
    bonusMultiplier: BOOTSTRAP.bonusMultiplier,
    bonusCapMicro: BOOTSTRAP.bonusCapMicro,
  };
}

function computeBootstrapBonus(netMicro, providerBonusMicroSoFar) {
  const capRemaining = BOOTSTRAP.bonusCapMicro - providerBonusMicroSoFar;
  if (capRemaining <= 0) return 0;
  const bonus = netMicro * (BOOTSTRAP.bonusMultiplier - 1);
  return Math.min(Math.floor(bonus), capRemaining);
}

export function registerLiquidityProvider(body = {}) {
  ensureMeta();
  const status = bootstrapStatus();
  const providerId = body.providerId ?? `lp-${crypto.randomBytes(6).toString("hex")}`;
  if (miningStore.map.has(providerId)) {
    return miningStore.map.get(providerId);
  }
  const bootstrapEligible = status.phaseActive && status.slotsRemaining > 0;
  const record = {
    sku: "VOID-721",
    providerId,
    accountId: body.accountId ?? `provider:${providerId}`,
    poolId: body.poolId ?? "POOL-COMPUTE",
    bootstrapEligible,
    registeredAt: Date.now(),
    earnedMicro: 0,
    bonusMicro: 0,
  };
  miningStore.map.set(providerId, record);
  miningStore.schedule();
  return record;
}

export function getLiquidityProvider(providerId) {
  const p = miningStore.map.get(providerId);
  if (!p || providerId === "__meta") return { error: "PROVIDER_NOT_FOUND" };
  return p;
}

export function listLiquidityProviders() {
  return [...miningStore.map.values()].filter((p) => p.providerId !== "__meta");
}

/** Credita bonus bootstrap após settlement DAT. */
export function applyBootstrapBonus(providerId, netMicro) {
  const provider = getLiquidityProvider(providerId);
  if (provider.error) return { bonusMicro: 0 };
  if (!provider.bootstrapEligible) return { bonusMicro: 0 };

  const status = bootstrapStatus();
  if (!status.phaseActive) return { bonusMicro: 0 };

  const bonusMicro = computeBootstrapBonus(netMicro, provider.bonusMicro);
  if (bonusMicro <= 0) return { bonusMicro: 0 };

  creditAccount(provider.accountId, bonusMicro, {
    channel: "liquidity_mining",
    providerId,
    bootstrap: true,
  });
  provider.bonusMicro += bonusMicro;
  provider.earnedMicro += netMicro;
  miningStore.schedule();

  return { bonusMicro, accountId: provider.accountId };
}

export { BOOTSTRAP };
