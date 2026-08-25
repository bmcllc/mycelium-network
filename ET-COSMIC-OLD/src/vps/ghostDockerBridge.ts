/**
 * GhostDocker unificado — Rust (void-runner no motor) com fallback GhostDock TS no browser.
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { GhostDockOrchestrator } from "../core/ghostDock";
import { isCosmicSovereignLocal } from "../lib/cosmicSovereignMode";
import {
  executeVoidRunnerRemote,
  fetchVoidRunnerStatus,
  type VoidRunnerExecuteResult,
} from "./voidRunnerClient";

export type GhostSandboxBackend = "ghost_docker_rust" | "ghost_dock_ts";

export interface GhostSandboxResult {
  backend: GhostSandboxBackend;
  sandboxId: string;
  sessionId: string;
  output?: unknown;
  wasmUri?: string;
  voidRunner?: VoidRunnerExecuteResult | null;
}

export interface GhostSandboxOptions {
  hostEntropy: Uint8Array;
  wasmBytes?: Uint8Array;
  ghostId?: string;
  iterations?: number;
  shards?: number;
  /** Se false, não tenta void-runner remoto */
  preferRust?: boolean;
}

function hostEntropyHex(host: Uint8Array): string {
  return Array.from(host)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Executa sandbox: void-runner remoto primeiro, GhostDock TS se offline. */
export async function runGhostSandbox(
  options: GhostSandboxOptions,
): Promise<GhostSandboxResult> {
  const host = options.hostEntropy.slice(0, 64);
  const hex = hostEntropyHex(host);

  const preferRust = options.preferRust !== false && !isCosmicSovereignLocal();
  if (preferRust) {
    const status = await fetchVoidRunnerStatus();
    if (status?.available) {
      const vr = await executeVoidRunnerRemote({
        hostEntropyHex: hex,
        iterations: options.iterations ?? 500_000,
        shards: options.shards ?? 4,
        mode: "map-reduce",
      });
      if (vr.success) {
        return {
          backend: "ghost_docker_rust",
          sandboxId: `rust_${vr.host_entropy_prefix ?? "ok"}`,
          sessionId: `void_runner_${Date.now()}`,
          output: vr.output,
          ...(vr.wasm_uri !== undefined ? { wasmUri: vr.wasm_uri } : {}),
          voidRunner: vr,
        };
      }
    }
  }

  const dock = new GhostDockOrchestrator();
  const profile = dock.registerProfile({
    name: "ghost-bridge-ts",
    encryptedWorkspace: true,
    networkMode: "deny_all",
    maxRuntimeMs: 120_000,
    allowedHosts: [],
  });
  const session = dock.startSession(profile.id);
  const wasm = options.wasmBytes ?? host;
  const digest = sha3_256(new Uint8Array([...host, ...wasm.slice(0, 32)]));
  dock.stopSession(session.sessionId, "ghost_dock_ts_fallback");

  return {
    backend: "ghost_dock_ts",
    sandboxId: `ts_${Array.from(digest.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`,
    sessionId: session.sessionId,
    output: { digest: Array.from(digest).join("") },
    voidRunner: null,
  };
}
