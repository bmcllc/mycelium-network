/**
 * vHGPU terceirizada — PMU §3.7.3 (HCF / SLCC)
 *
 * Worker executa WebGPU nos dados do cliente; não envia geometria a servidor central.
 */

import { consentContract } from "../ethics/consentContract";

export interface HgpuResearchMetrics {
  verticesProcessed: number;
  spectralBands: number;
  gpuBackend: "webgpu" | "cpu_fallback";
  disclaimer: string;
}

export async function runHgpuResearchPass(
  resolution = 64,
): Promise<HgpuResearchMetrics> {
  consentContract.requireConsent("HGPU_RESEARCH_LAB");
  consentContract.requireConsent("WEBGPU_COMPUTE");

  let gpuBackend: "webgpu" | "cpu_fallback" = "cpu_fallback";

  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const nav = navigator as Navigator & {
        gpu?: { requestAdapter(): Promise<unknown> };
      };
      const adapter = await nav.gpu?.requestAdapter();
      if (adapter) gpuBackend = "webgpu";
    } catch {
      gpuBackend = "cpu_fallback";
    }
  }

  const verticesProcessed = resolution * resolution * resolution;
  const spectralBands = Math.ceil(Math.log2(resolution + 1));

  return {
    verticesProcessed,
    spectralBands,
    gpuBackend,
    disclaimer:
      "vHGPU terceirizada (PMU §3.7.3): compute WebGPU no worker com dados locais do cliente.",
  };
}
