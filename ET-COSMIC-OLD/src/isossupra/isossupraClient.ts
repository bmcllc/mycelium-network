/**
 * Cliente HTTP Isossupramulação — VOID-500–600
 */

import { parseJsonResponse } from "../lib/httpJson";

const BASE = import.meta.env.VITE_ISOSSUPRA_API_URL ?? "/api/isossupra";

export interface IsossupraStatus {
  sku: string;
  engine: string;
  engines: Array<{ sku: string; id: string; label: string }>;
  disclaimer: string;
}

export async function fetchIsossupraStatus(): Promise<IsossupraStatus> {
  const res = await fetch(`${BASE}/status`);
  return parseJsonResponse(res);
}

export async function runIsossupraEngine<T = Record<string, unknown>>(
  engineId: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}/run/${engineId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return parseJsonResponse<T>(res);
}

export async function runIsossupraPipeline(opts?: {
  bits?: number;
  seed?: number;
  room?: string;
}) {
  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts ?? {}),
  });
  return parseJsonResponse(res);
}
