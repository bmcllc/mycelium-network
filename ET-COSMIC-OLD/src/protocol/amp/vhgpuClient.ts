/**
 * vHGPUClient — PMU §3.7.3 (vHGPU terceirizada)
 *
 * Worker executa compute por domínio PMU (4×4 cores mínimos).
 */

import { consentContract } from "../../ethics/consentContract";
import { runHgpuResearchPass, type HgpuResearchMetrics } from "../../research/hgpuResearch";
import {
  runPmuVhgpuFrame,
  runPmuVhgpuAllDomains,
  type PmuVhgpuFrameResult,
} from "../../compute/pmuVhgpuScheduler";
import type { PmuVhgpuDomainId } from "../../compute/pmuDomains";
import { runPmuFullVhgpuCycle, type PmuComputeBundle } from "./pmuComputeOrchestrator";
import { runPmuOmegaCycle, type PmuOmegaResult } from "./pmuOmegaPipeline";

export interface VhgpuFrameResult {
  metrics: HgpuResearchMetrics;
  backend: "webgpu" | "cpu_fallback";
}

export interface VhgpuPmuFrameResult extends PmuVhgpuFrameResult {
  /** Métricas legadas HGPU research (opcional) */
  research?: HgpuResearchMetrics;
}

export const vHGPUClient = {
  /**
   * Processa um quadro de compute verificável (HCF) nos dados locais do cliente.
   */
  async runFrame(resolution = 64): Promise<VhgpuFrameResult> {
    consentContract.requireConsent("HGPU_RESEARCH_LAB");
    consentContract.requireConsent("WEBGPU_COMPUTE");
    const metrics = await runHgpuResearchPass(resolution);
    return { metrics, backend: metrics.gpuBackend };
  },

  /**
   * Frame PMU num domínio (geom / quantum / paleo / lsc).
   */
  async runPmuDomain(
    domainId: PmuVhgpuDomainId,
    resolution = 64,
  ): Promise<VhgpuPmuFrameResult> {
    consentContract.requireConsent("HGPU_RESEARCH_LAB");
    consentContract.requireConsent("WEBGPU_COMPUTE");
    const frame = await runPmuVhgpuFrame(domainId, resolution);
    return frame;
  },

  /** Ciclo completo: 4 domínios × 4 cores (ajuda vHGPU PMU). */
  async runPmuCycle(resolution = 64): Promise<PmuComputeBundle> {
    consentContract.requireConsent("HGPU_RESEARCH_LAB");
    consentContract.requireConsent("WEBGPU_COMPUTE");
    return runPmuFullVhgpuCycle(resolution);
  },

  /** Todos os domínios em paralelo. */
  async runAllPmuDomains(resolution = 64): Promise<PmuVhgpuFrameResult[]> {
    consentContract.requireConsent("HGPU_RESEARCH_LAB");
    consentContract.requireConsent("WEBGPU_COMPUTE");
    return runPmuVhgpuAllDomains(resolution);
  },

  /** PMU Ω — 4 domínios + entropia CQR+ANU+paleo + chaves PQC. */
  async runOmega(resolution = 64): Promise<PmuOmegaResult> {
    consentContract.requireConsent("HGPU_RESEARCH_LAB");
    consentContract.requireConsent("WEBGPU_COMPUTE");
    return runPmuOmegaCycle(resolution);
  },
};

export type { PmuOmegaResult };
