import { parseJsonResponse } from "../lib/httpJson";
import { collectSensorEntropy } from "./sensorEntropy";

const BASE = import.meta.env.VITE_IMC_API_URL ?? "/api/imc";

export async function fetchImcStatus() {
  const res = await fetch(`${BASE}/status`);
  return parseJsonResponse(res);
}

export async function postImcAction<T = Record<string, unknown>>(
  action: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}/action/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return parseJsonResponse<T>(res);
}

export async function submitSensorEntropyMesh(nodeId: string, bits = 256) {
  const streams = await collectSensorEntropy();
  const res = await fetch(`${BASE}/entropy/mesh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, streams, bits }),
  });
  return parseJsonResponse(res);
}

export async function postMarketplaceJob(type: "ising" | "thomas-fermi", extra?: Record<string, unknown>) {
  const res = await fetch(`${BASE}/marketplace/job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, budgetSov: 1000, ...extra }),
  });
  return parseJsonResponse(res);
}

export async function purchaseEntropyService(bits = 512, nodeId?: string) {
  const streams = nodeId ? await collectSensorEntropy() : undefined;
  const res = await fetch(`${BASE}/entropy/service`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bits, nodeId: nodeId ?? `node-${Date.now()}`, streams }),
  });
  return parseJsonResponse(res);
}
