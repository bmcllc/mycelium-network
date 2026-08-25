/**
 * Motor CQR no dispositivo — Harmonia offline (Capacitor / PWA soberano).
 * Substitui Python :8472 por entropia local + GhostDock + void_core WASM.
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { runGhostSandbox, type GhostSandboxResult } from "../vps/ghostDockerBridge";
import type { VoidRunnerExecuteResult, VoidRunnerStatus } from "../vps/voidRunnerClient";

export const LOCAL_CQR_BASE = "void-local-cqr://device";

export function isLocalCqrBase(base: string): boolean {
  return base === LOCAL_CQR_BASE || base.startsWith("void-local-cqr://");
}

async function deviceEntropyHex(): Promise<string> {
  try {
    const { VoidAnimus } = await import("../plugins/voidAnimus");
    if (VoidAnimus) {
      const d = await VoidAnimus.getDeviceEntropy();
      if (d?.entropy) {
        const h = sha3_256(new TextEncoder().encode(d.entropy));
        return Array.from(h)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    }
  } catch {
    /* web / plugin ausente */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(sha3_256(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function localCqrHealth(): Promise<{
  status: string;
  engine: Record<string, unknown>;
}> {
  return {
    status: "ok",
    engine: {
      engine: "CQR-Device",
      version: "1.0.0-sovereign",
      location: "on_device",
      hybrid_entropy: true,
      status: "operational",
      note: "Python CQR substituído por motor local (GhostDock + WASM)",
    },
  };
}

export async function localCqrRunnerStatus(): Promise<VoidRunnerStatus> {
  let wasm = false;
  try {
    await import("void_core");
    wasm = true;
  } catch {
    wasm = false;
  }
  return {
    available: true,
    void_runner_bin: wasm ? "void_core_wasm" : "ghost_dock_ts",
    pi_wasm: wasm ? "void_core/pkg" : null,
    void_root: "device",
  };
}

export async function localCqrExecute(opts: {
  hostEntropyHex: string;
  iterations?: number;
  shards?: number;
}): Promise<VoidRunnerExecuteResult> {
  let hex = opts.hostEntropyHex.replace(/^0x/i, "");
  if (hex.length < 16) hex = await deviceEntropyHex();
  const host = hexToBytes(hex.padEnd(128, "0").slice(0, 128));
  const sandbox: GhostSandboxResult = await runGhostSandbox({
    hostEntropy: host,
    preferRust: false,
    iterations: opts.iterations ?? 500_000,
    shards: opts.shards ?? 4,
  });
  if (sandbox.backend === "ghost_docker_rust" && sandbox.output) {
    return {
      success: true,
      backend: "cqr_device",
      sandbox_method: sandbox.voidRunner?.sandbox_method ?? "device",
      output: sandbox.output,
      host_entropy_prefix: hex.slice(0, 32),
    };
  }
  return {
    success: true,
    backend: "cqr_device",
    sandbox_method: "ghost_dock_device",
    output: sandbox.output ?? { digest: "device_bound" },
    host_entropy_prefix: hex.slice(0, 32),
  };
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}
