/**
 * Ponte ET-RNET ↔ VOID-COSMIC — Mirage + EcoNet + harmonia cósmica + LUSUS tensor.
 */

import { mirageCompute } from "../crypto/mirageCompute";
import { runCosmicHarmonyCycle, type CosmicHarmonyResult } from "../core/cosmicVoidOrchestrator";
import { EcoNetClient } from "./ecoNet";
import { HiggsGit } from "./higgsGit";
import { PhantomPipeline } from "./phantomPipeline";
import {
  contractLususTensor,
  type TensorContractRequest,
  type TensorContractResult,
} from "./voidRunnerClient";

export interface VoidRunnerBridgeOptions {
  ghostId: string;
  apiBase?: string;
}

/**
 * API unificada browser: harmonia PMU+Phantom+GhostDock+Higgs.
 * Execução nativa `void-runner` (Rust/GhostDocker) via `npm run cosmic:harmony` no Node.
 */
export class VoidRunnerBridge {
  readonly ecoNet = new EcoNetClient();
  readonly mirage = mirageCompute;
  readonly higgs: HiggsGit;

  constructor(private readonly options: VoidRunnerBridgeOptions) {
    this.higgs = new HiggsGit(`bridge-${options.ghostId}`);
  }

  /** Contração tensorial LUSUS-Q via /api/lusus/tensor/contract (Rust ou fallback JS). */
  async contractTensor(req: TensorContractRequest): Promise<TensorContractResult> {
    return contractLususTensor(req, this.options.apiBase);
  }

  async runHarmonyCycle(resolution = 64): Promise<CosmicHarmonyResult> {
    return runCosmicHarmonyCycle({
      ghostId: this.options.ghostId,
      resolution,
    });
  }

  async publishAndPipeline(
    wasm: Uint8Array,
    workerName: string,
    scarToken?: string,
  ): Promise<{ uri: string; pipeline: Awaited<ReturnType<PhantomPipeline["run"]>> }> {
    const pipeline = new PhantomPipeline(this.ecoNet);
    const pipelineOpts = {
      workerName,
      wasmBytes: wasm,
      ghostId: this.options.ghostId,
      ...(scarToken !== undefined ? { scarToken } : {}),
    };
    const result = await pipeline.run(pipelineOpts);
    return { uri: result.wasmUri, pipeline: result };
  }
}

export const voidRunnerBridge = {
  create(ghostId: string): VoidRunnerBridge {
    return new VoidRunnerBridge({ ghostId });
  },
};
