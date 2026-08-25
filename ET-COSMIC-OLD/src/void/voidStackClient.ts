/**
 * Cliente unificado VOID Sovereign Stack → POST /api/void
 */
import { parseJsonResponse } from "../lib/httpJson";

const VOID_API = import.meta.env.VITE_VOID_API_URL ?? "/api/void";

export type VoidService =
  | "bridge.solve"
  | "bridge.savings"
  | "pci.handshake"
  | "pci.respond"
  | "mesh.register"
  | "mesh.task.next"
  | "mesh.task.submit";

export async function voidStackCall<T = Record<string, unknown>>(
  service: VoidService,
  payload?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(VOID_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, payload: payload ?? {} }),
  });
  return parseJsonResponse<T>(res);
}

export async function fetchVoidStackStatus() {
  const res = await fetch(`${VOID_API}/status`);
  return parseJsonResponse(res);
}

export async function solveBridgeIsing(body: Record<string, unknown>) {
  return voidStackCall("bridge.solve", { ising: body });
}

export async function pciHandshake(peerId: string) {
  return voidStackCall("pci.handshake", { peerId });
}

export async function pciRespond(
  sessionId: string,
  response: { latencyMs: number; jitterProfile?: number[]; response?: string },
) {
  return voidStackCall("pci.respond", { sessionId, ...response });
}

export async function meshRegister(body: {
  ghostId: string;
  capabilities?: string[];
  lscLimits?: Record<string, number>;
}) {
  return voidStackCall("mesh.register", body);
}

/** Re-export compute legado (alias imc) */
export {
  fetchImcStatus as fetchVoidComputeLegacyStatus,
  postImcAction,
  postMarketplaceJob,
  purchaseEntropyService,
  submitSensorEntropyMesh,
} from "../imc/imcClient";
