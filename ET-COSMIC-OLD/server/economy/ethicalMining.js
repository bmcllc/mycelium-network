/**
 * VOID-705 — Mineração ética: arsenal IMC — sem hash vazio.
 */

import { postMarketplaceJob } from "../imc/marketplace.js";
import { creditAccount, applyProtocolFee } from "./sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "./economyPersistence.js";

const miningStore = createPersistedStore("sov-miners.json", { idField: "workerId" });
registerEconomyFlusher(miningStore.flush);

const REWARDS_MICRO = {
  ising: 80,
  "thomas-fermi": 120,
  cdn_serve: 15,
  entropy: 25,
  hosting_relay: 10,
};

export function registerMiner(workerId, body = {}) {
  const id = workerId ?? `miner-${Date.now().toString(36)}`;
  const record = {
    sku: "VOID-705",
    workerId: id,
    nodeId: body.nodeId ?? null,
    limits: body.limits ?? { cpuPctMax: 5, ramMbMax: 50 },
    consent: Boolean(body.consent ?? true),
    stats: { jobs: 0, earnedMicro: 0, throttled: 0 },
    registeredAt: Date.now(),
  };
  miningStore.map.set(id, record);
  miningStore.schedule();
  return record;
}

export function submitEthicalWork(workerId, body = {}) {
  const w = miningStore.map.get(workerId);
  if (!w) return { error: "WORKER_NOT_FOUND" };
  if (!w.consent) return { error: "CONSENT_REQUIRED" };

  const cpuPct = body.cpuPct ?? 0;
  if (cpuPct > w.limits.cpuPctMax) {
    w.stats.throttled += 1;
    miningStore.schedule();
    return {
      sku: "VOID-705",
      workerId,
      action: "throttle",
      reason: "LSC_CPU",
      message: "Arsenal pausado — hardware protegido",
    };
  }

  const workType = body.type ?? "ising";
  let result = { ok: true };
  if (workType === "ising" || workType === "thomas-fermi") {
    const job = postMarketplaceJob({
      type: workType === "thomas-fermi" ? "thomas-fermi" : "ising",
      n: body.n ?? 8,
      molecule: body.molecule,
      budgetSov: 0,
    });
    result = job;
  }

  const gross = REWARDS_MICRO[workType] ?? REWARDS_MICRO.ising;
  const { feeMicro, netMicro } = applyProtocolFee(gross);
  const accountId = body.accountId ?? `miner:${workerId}`;
  creditAccount(accountId, netMicro, { channel: "mining", workType, usefulWork: true });
  w.stats.jobs += 1;
  w.stats.earnedMicro += netMicro;
  miningStore.schedule();

  return {
    sku: "VOID-705",
    workerId,
    accountId,
    workType,
    usefulWork: true,
    destructiveHash: false,
    grossMicro: gross,
    feeMicro,
    creditedMicro: netMicro,
    arsenal: "IMC VOID-510–522",
    result,
  };
}

export function listMiners() {
  return [...miningStore.map.values()];
}

export function getMiningRewards() {
  return { sku: "VOID-705", rewardsMicro: REWARDS_MICRO, disclaimer: "Sem PoW vazio. Só trabalho útil." };
}

export function flushEthicalMining() {
  miningStore.flush();
}
