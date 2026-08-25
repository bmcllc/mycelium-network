/**
 * VOID-511 — Ising Mesh Solver (shards + agregação).
 */

import { solveIsingIsossupra } from "../isossupra/ising_solver.js";

const jobs = new Map();

export function submitIsingJob(jobId, spec) {
  const n = spec.n ?? 16;
  const shardCount = spec.shardCount ?? 4;
  const shards = [];
  for (let s = 0; s < shardCount; s++) {
    const sub = solveIsingIsossupra({
      n: Math.max(4, Math.floor(n / shardCount) + 2),
      shardCount: 1,
      iterations: spec.iterations ?? 350,
    });
    shards.push({ shardId: s, energy: sub.energy, assignment: sub.assignment });
  }
  const best = shards.reduce((a, b) => (b.energy > a.energy ? b : a));
  jobs.set(jobId, { shards, best, at: Date.now() });
  return {
    sku: "VOID-511",
    jobId,
    n,
    shardCount,
    bestEnergy: best.energy,
    shards: shards.map((s) => ({ id: s.shardId, energy: s.energy })),
    iso: "parallel_tempering_shards",
    supra: "nostr_mesh_void43",
    complements: "VOID-520",
  };
}

export function getIsingJob(jobId) {
  return jobs.get(jobId) ?? { error: "NOT_FOUND" };
}
