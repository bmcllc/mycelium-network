/**
 * Nostr mesh IMC — kinds dedicados (não colidem com Animus 31222/31223).
 */

import type { Event } from "nostr-tools";

/** Pedido de shard Ising / job IMC */
export const IMC_ISING_KIND_REQUEST = 31224;
/** Resultado parcial ou final */
export const IMC_ISING_KIND_RESULT = 31225;
/** Contribuição de entropia sensorial (ephemeral) */
export const IMC_ENTROPY_KIND_CONTRIB = 31226;

export interface ImcIsingJobEvent {
  jobId: string;
  n: number;
  shardCount: number;
  shardId?: number;
  budgetSov?: number;
}

export interface ImcIsingResultEvent {
  jobId: string;
  shardId: number;
  energy: number;
  assignment?: number[];
}

export function buildIsingRequestTags(job: ImcIsingJobEvent): string[][] {
  return [
    ["t", "imc-ising"],
    ["job", job.jobId],
    ["n", String(job.n)],
    ["shards", String(job.shardCount)],
  ];
}

export function parseIsingRequest(event: Event): ImcIsingJobEvent | null {
  const jobTag = event.tags.find((t) => t[0] === "job");
  if (!jobTag?.[1]) return null;
  const nTag = event.tags.find((t) => t[0] === "n");
  const shardsTag = event.tags.find((t) => t[0] === "shards");
  return {
    jobId: jobTag[1],
    n: parseInt(nTag?.[1] ?? "16", 10),
    shardCount: parseInt(shardsTag?.[1] ?? "4", 10),
  };
}

export function parseIsingResult(event: Event): ImcIsingResultEvent | null {
  if (event.kind !== IMC_ISING_KIND_RESULT) return null;
  try {
    const data = JSON.parse(event.content) as ImcIsingResultEvent;
    return data.jobId ? data : null;
  } catch {
    return null;
  }
}
