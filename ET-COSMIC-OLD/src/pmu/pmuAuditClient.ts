/**
 * Cliente de auditoria PMU — /pmu/audit/*
 */

import type { PmuAuditReport } from "./pmuAuditTypes";
import { getQuantumApiBase } from "../crypto/quantumBridge";
import { isLocalCqrBase } from "../lib/localCqrEngine";

function base(): string {
  const b = getQuantumApiBase();
  if (!b || isLocalCqrBase(b)) return "";
  return b.replace(/\/$/, "");
}

async function pmuFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const root = base();
  if (!root) {
    throw new Error("PMU audit indisponível em modo CQR no dispositivo (use motor Python ou rede B)");
  }
  const url = `${root}${path}`;
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`PMU audit ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function fetchPmuAuditFull(bits = 2048): Promise<PmuAuditReport> {
  return pmuFetch<PmuAuditReport>(`/pmu/audit/full?bits=${bits}`);
}

/** Ciclo Ω no servidor (4 domínios + audit + pool). */
export async function fetchPmuOmegaCycle(resolution = 64, bits = 2048): Promise<{
  protocol: string;
  complete: boolean;
  audit: PmuAuditReport;
  total_cores: number;
}> {
  return pmuFetch(`/pmu/omega/cycle?resolution=${resolution}&bits=${bits}`, {
    method: "POST",
  });
}

export async function fetchPmuPoolStatus(): Promise<{
  pool_dir: string;
  pulses: number;
  chain_tip: string;
}> {
  return pmuFetch("/pmu/pool/status");
}

export async function fetchEntropyProviders(): Promise<{
  recommendation: string;
  providers: { id: string; type: string; cost: string }[];
}> {
  return pmuFetch("/quantum/entropy/providers");
}

export type { PmuAuditReport };
