/**
 * PMU Compute Orchestrator — Figura 2 + vHGPU §3.7.3
 *
 * Encadeia estágio AMP (HCF/DPL) com scheduler de 4 domínios.
 */

import { assertPipelineStage } from "./ampPipeline";
import {
  runPmuVhgpuAllDomains,
  runPmuVhgpuFrame,
  type PmuVhgpuFrameResult,
} from "../../compute/pmuVhgpuScheduler";
import type { PmuVhgpuDomainId } from "../../compute/pmuDomains";

export interface PmuComputeBundle {
  pipeline: "CGF→…→HCF";
  frames: PmuVhgpuFrameResult[];
  totalCores: number;
  completedAt: number;
}

/** Um frame num domínio após CGF/HCF. */
export async function runPmuDomainCompute(
  domainId: PmuVhgpuDomainId,
  resolution = 64,
): Promise<PmuVhgpuFrameResult> {
  assertPipelineStage("CGF");
  return runPmuVhgpuFrame(domainId, resolution);
}

/** Ciclo completo de ajuda vHGPU: 4 domínios × 4 cores. */
export async function runPmuFullVhgpuCycle(resolution = 64): Promise<PmuComputeBundle> {
  assertPipelineStage("CGF");
  assertPipelineStage("HCF");
  const frames = await runPmuVhgpuAllDomains(resolution);
  return {
    pipeline: "CGF→…→HCF",
    frames,
    totalCores: frames.reduce((s, f) => s + f.coresUsed, 0),
    completedAt: Date.now(),
  };
}
