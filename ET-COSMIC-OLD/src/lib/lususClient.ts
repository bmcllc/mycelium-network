/**
 * Cliente HTTP LUSUS — engine clássica na fronteira do colapso.
 */

import { parseJsonResponse } from "./httpJson";

const LUSUS_BASE = import.meta.env.VITE_LUSUS_API_URL ?? "/api/lusus";

export async function fetchLususStatus() {
  const res = await fetch(`${LUSUS_BASE}/status`);
  return parseJsonResponse<{ engine: string; modules: string[]; disclaimer: string }>(res);
}

export async function runIsingMaxCut(n = 12) {
  const res = await fetch(`${LUSUS_BASE}/ising/maxcut`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n }),
  });
  return parseJsonResponse<{ assignment: number[]; energy: number; disclaimer: string }>(res);
}

export async function fetchChaosBell(seed?: number) {
  const q = seed != null ? `?seed=${seed}` : "";
  const res = await fetch(`${LUSUS_BASE}/chaos-bell${q}`);
  return parseJsonResponse<{ correlation: number; simulatedS: number; disclaimer: string }>(res);
}

export async function fetchThomasFermiH2(separation = 1.4) {
  const res = await fetch(`${LUSUS_BASE}/thomas-fermi/h2?separation=${separation}`);
  return parseJsonResponse<{ bindingEnergyEV: number; disclaimer: string }>(res);
}

export async function fetchCavityModes(modes = 24) {
  const res = await fetch(`${LUSUS_BASE}/cavity?modes=${modes}`);
  return parseJsonResponse<{ modes: unknown[]; disclaimer: string }>(res);
}
