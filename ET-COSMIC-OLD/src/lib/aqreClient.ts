/**
 * Cliente HTTP AQRE — emulador anacróclasta.
 */

import { parseJsonResponse } from "./httpJson";

const AQRE_BASE = import.meta.env.VITE_AQRE_API_URL ?? "/api/aqre";

export interface LscReading {
  cEpsilon: number;
  P: number;
  P_max: number;
  G: number;
  K_eff: number;
  allowed: boolean;
  status: string;
  message?: string | null;
}

export interface AqreRunResult {
  ok: boolean;
  task?: string;
  reading?: LscReading;
  result?: unknown;
  error?: string;
  disclaimer?: string;
}

export async function fetchAqreStatus() {
  const res = await fetch(`${AQRE_BASE}/status`);
  return parseJsonResponse<{ engine: string; disclaimer: string; limits: Record<string, unknown> }>(res);
}

export async function fetchAqreLimits() {
  const res = await fetch(`${AQRE_BASE}/limits`);
  return parseJsonResponse<{ classification: Record<string, unknown> }>(res);
}

/** Regista LSC; devolve leitura mesmo em 429 (limite excedido). */
export async function recordLsc(cEpsilon: number, pCurrent: number): Promise<LscReading> {
  const res = await fetch(`${AQRE_BASE}/lsc/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ C_epsilon: cEpsilon, P_current: pCurrent }),
  });
  return parseJsonResponse<LscReading>(res);
}

export async function runAqreTask(
  task: string,
  params: { cEpsilon?: number; pCurrent?: number; [k: string]: unknown } = {},
): Promise<AqreRunResult> {
  const res = await fetch(`${AQRE_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, ...params }),
  });
  return parseJsonResponse<AqreRunResult>(res);
}
