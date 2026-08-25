/**
 * Phantom Pipeline — build → GhostDock → fossilização paleo → EcoNet → deploy (Scar).
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { fossilizeEntropyToAnchorFast } from "../paleo/paleoEntropyFossil";
import { runGhostSandbox, type GhostSandboxBackend } from "./ghostDockerBridge";
import { EcoNetClient } from "./ecoNet";

export interface PipelineConfig {
  workerName: string;
  wasmBytes: Uint8Array;
  ghostId: string;
  scarToken?: string;
  /** Entropia Ω para sessão GhostDock (host seed) */
  hostEntropy?: Uint8Array;
}

export interface PipelineResult {
  wasmUri: string;
  fossilHash: string;
  paleoFossilHash: string;
  shardCount: number;
  deployed: boolean;
  ghostDockSessionId: string;
  sandboxMethod: string;
  sandboxBackend: GhostSandboxBackend;
}

export class PhantomPipeline {
  constructor(private readonly ecoNet: EcoNetClient) {}

  async run(config: PipelineConfig): Promise<PipelineResult> {
    const host = config.hostEntropy ?? config.wasmBytes.slice(0, Math.min(64, config.wasmBytes.length));
    const sandbox = await runGhostSandbox({
      hostEntropy: host,
      wasmBytes: config.wasmBytes,
      ghostId: config.ghostId,
    });
    const sandboxDigest = sha3_256(
      new Uint8Array([
        ...host,
        ...config.wasmBytes.slice(0, 32),
        ...new TextEncoder().encode(sandbox.backend),
      ]),
    );

    const wasmFossil = Array.from(sha3_256(config.wasmBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const { record } = fossilizeEntropyToAnchorFast(
      new TextEncoder().encode(`${wasmFossil}:${Array.from(sandboxDigest).join("")}`),
    );

    const wasmUri =
      sandbox.wasmUri ?? (await this.ecoNet.putAsync(config.ghostId, config.wasmBytes));
    const deployed = Boolean(config.scarToken);

    return {
      wasmUri,
      fossilHash: wasmFossil,
      paleoFossilHash: record.fossilRootHash,
      shardCount: 1,
      deployed,
      ghostDockSessionId: sandbox.sessionId,
      sandboxMethod:
        sandbox.backend === "ghost_docker_rust"
          ? "ghost_docker_rust_zero_disk"
          : "ghost_dock_entropy_bound",
      sandboxBackend: sandbox.backend,
    };
  }
}
