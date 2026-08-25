/**
 * PMU Ω Pipeline — do CGF ao fim: 4 domínios vHGPU + entropia Ω + PQC-ready material.
 *
 * Paleocomputação: fossiliza entropia em invariantes imutáveis (Cap.10/12).
 */

import { assertPipelineStage } from "./ampPipeline";
import { runPmuVhgpuAllDomains, type PmuVhgpuFrameResult } from "../../compute/pmuVhgpuScheduler";
import { fetchOmegaEntropy, type HybridEntropyResult } from "../../crypto/entropyOrchestrator";
import { generateMLKEMKeypairFromCQR, generateMLDSAKeypairFromCQR } from "../../crypto/cqrPqc";
import { fetchPmuAuditFull, type PmuAuditReport } from "../../pmu/pmuAuditClient";
import { isServerAvailable } from "../../crypto/quantumBridge";

export interface PmuOmegaResult {
  pipeline: "CGF→EIM→ASM→DPL→HCF→MTS→Ω";
  frames: PmuVhgpuFrameResult[];
  entropy: HybridEntropyResult;
  audit: PmuAuditReport | null;
  pqc: {
    kemAlgorithm: string;
    dsaAlgorithm: string;
    kemPublicKeyBytes: number;
    dsaPublicKeyBytes: number;
  };
  totalCores: number;
  completedAt: number;
  pmuComplete: true;
}

/**
 * Ciclo Ω completo — usar após consentimento Núcleo v1 (nível 10).
 */
export async function runPmuOmegaCycle(resolution = 64): Promise<PmuOmegaResult> {
  assertPipelineStage("CGF");
  assertPipelineStage("HCF");
  assertPipelineStage("DPL");

  const [frames, entropy, kem, dsa, audit] = await Promise.all([
    runPmuVhgpuAllDomains(resolution),
    fetchOmegaEntropy(512),
    generateMLKEMKeypairFromCQR(),
    generateMLDSAKeypairFromCQR(),
    (async (): Promise<PmuAuditReport | null> => {
      if (!(await isServerAvailable())) return null;
      try {
        return await fetchPmuAuditFull(2048);
      } catch {
        return null;
      }
    })(),
  ]);

  return {
    pipeline: "CGF→EIM→ASM→DPL→HCF→MTS→Ω",
    frames,
    entropy,
    audit,
    pqc: {
      kemAlgorithm: kem.algorithm,
      dsaAlgorithm: dsa.algorithm,
      kemPublicKeyBytes: kem.publicKey.length,
      dsaPublicKeyBytes: dsa.publicKey.length,
    },
    totalCores: frames.reduce((s, f) => s + f.coresUsed, 0),
    completedAt: Date.now(),
    pmuComplete: true,
  };
}
