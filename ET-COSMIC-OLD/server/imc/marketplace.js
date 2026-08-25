/**
 * VOID-520 — Compute Marketplace (trabalho útil, taxa 10 bps).
 */

import { submitIsingJob } from "./ising_mesh.js";
import { solveThomasDistributed } from "./thomas_distributed.js";

const PROTOCOL_BPS = parseInt(process.env.VITE_PROTOCOL_ROYALTY_BPS ?? "10", 10);
const jobs = new Map();

export function postMarketplaceJob(spec) {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let result;
  if (spec.type === "ising") result = submitIsingJob(jobId, spec);
  else if (spec.type === "thomas-fermi") result = solveThomasDistributed(spec.molecule ?? "H2");
  else return { error: "UNSUPPORTED_JOB", types: ["ising", "thomas-fermi"] };

  const grossSov = spec.budgetSov ?? 1000;
  const fee = Math.floor((grossSov * PROTOCOL_BPS) / 10000);
  const payout = grossSov - fee;
  jobs.set(jobId, { spec, result, fee, payout, at: Date.now() });
  return {
    sku: "VOID-520",
    jobId,
    type: spec.type,
    grossSov,
    protocolFeeSov: fee,
    protocolBps: PROTOCOL_BPS,
    workerPayoutSov: payout,
    treasuryNote: "MontêLauro Foundation / Nostr npub configurável",
    result,
    usefulWork: true,
    replaces: "VOID-120 idle mining",
  };
}

export function getMarketplaceJob(jobId) {
  return jobs.get(jobId) ?? { error: "NOT_FOUND" };
}
