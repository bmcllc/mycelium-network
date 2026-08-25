/**
 * Cliente browser/Node — execução GhostDocker Rust via motor quântico (void-runner).
 */

import { getQuantumApiBase } from "../crypto/quantumBridge";
import { cqrFetchInit } from "../lib/remoteCqrConfig";
import {
  isLocalCqrBase,
  localCqrExecute,
  localCqrRunnerStatus,
} from "../lib/localCqrEngine";

export interface VoidRunnerStatus {
  available: boolean;
  void_runner_bin: string | null;
  pi_wasm: string | null;
  void_root: string;
}

export interface VoidRunnerExecuteResult {
  success: boolean;
  backend: string;
  sandbox_method?: string;
  output?: unknown;
  wasm_uri?: string;
  error?: string;
  status?: VoidRunnerStatus;
  host_entropy_prefix?: string;
}

export interface CosmicHarmonyServerPayload {
  protocol: string;
  manifest: {
    ghost_id: string;
    harmony_root: string;
    truth_level?: string;
    paleo_fossil?: string;
    void_runner?: { available?: boolean; executed?: boolean; backend?: string };
  };
  void_runner?: VoidRunnerExecuteResult;
  harmony_root_hash?: string;
  entropy?: { sha3_256?: string; entropy_hex?: string; tier?: string };
  audit?: unknown;
}

export interface TensorContractMatrix {
  data: number[];
  rows: number;
  cols: number;
}

export interface TensorContractMpsCore {
  data: number[];
  shape: [number, number, number];
}

export type TensorContractRequest =
  | { mode: "matrix"; a: TensorContractMatrix; b: TensorContractMatrix }
  | { mode: "mps_chain"; cores: TensorContractMpsCore[] };

export interface TensorContractResult {
  backend: string;
  rows: number;
  cols: number;
  data: number[];
  norm: number;
  elapsed_us: number;
}

export async function fetchVoidRunnerStatus(): Promise<VoidRunnerStatus | null> {
  const base = getQuantumApiBase();
  if (!base) return null;
  if (isLocalCqrBase(base)) return localCqrRunnerStatus();
  try {
    const res = await fetch(
      `${base}/cosmic/void/runner/status`,
      cqrFetchInit({ signal: AbortSignal.timeout(8_000) }, base),
    );
    if (!res.ok) return null;
    return (await res.json()) as VoidRunnerStatus;
  } catch {
    return null;
  }
}

/** POST /cosmic/void/execute — WASM real em RAM (servidor spawna void-runner). */
export async function executeVoidRunnerRemote(opts: {
  hostEntropyHex: string;
  funcName?: string;
  iterations?: number;
  shards?: number;
  mode?: "run" | "map-reduce";
}): Promise<VoidRunnerExecuteResult> {
  const base = getQuantumApiBase();
  if (!base) {
    return {
      success: false,
      backend: "ghost_docker_rust",
      error: "Motor quântico offline (QUANTUM_API)",
    };
  }
  if (isLocalCqrBase(base)) {
    const localOpts: Parameters<typeof localCqrExecute>[0] = {
      hostEntropyHex: opts.hostEntropyHex,
    };
    if (opts.iterations !== undefined) localOpts.iterations = opts.iterations;
    if (opts.shards !== undefined) localOpts.shards = opts.shards;
    return localCqrExecute(localOpts);
  }

  const params = new URLSearchParams({
    host_entropy_hex: opts.hostEntropyHex.replace(/^0x/i, ""),
    func_name: opts.funcName ?? "calculate_pi",
    iterations: String(opts.iterations ?? 1_000_000),
    shards: String(opts.shards ?? 4),
    mode: opts.mode ?? "map-reduce",
  });

  const res = await fetch(
    `${base}/cosmic/void/execute?${params}`,
    cqrFetchInit({ method: "POST", signal: AbortSignal.timeout(120_000) }, base),
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      backend: "ghost_docker_rust",
      error: text.slice(0, 300) || `HTTP ${res.status}`,
    };
  }

  return (await res.json()) as VoidRunnerExecuteResult;
}

/** Harmonia servidor alinhada (manifesto + void-runner já executado). */
export async function fetchCosmicHarmonyServer(
  resolution = 64,
  bits = 2048,
): Promise<CosmicHarmonyServerPayload | null> {
  const base = getQuantumApiBase();
  if (!base || isLocalCqrBase(base)) return null;
  try {
    const res = await fetch(
      `${base}/cosmic/void/harmony?resolution=${resolution}&bits=${bits}`,
      cqrFetchInit({ method: "POST", signal: AbortSignal.timeout(180_000) }, base),
    );
    if (!res.ok) return null;
    return (await res.json()) as CosmicHarmonyServerPayload;
  } catch {
    return null;
  }
}

const DEFAULT_LUSUS_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, "")
    : "http://127.0.0.1:3001";

/** POST /api/lusus/tensor/contract — contração LUSUS-Q (void-runner ou fallback). */
export async function contractLususTensor(
  req: TensorContractRequest,
  apiBase = DEFAULT_LUSUS_BASE,
): Promise<TensorContractResult> {
  const res = await fetch(`${apiBase}/api/lusus/tensor/contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
  return (await res.json()) as TensorContractResult;
}
