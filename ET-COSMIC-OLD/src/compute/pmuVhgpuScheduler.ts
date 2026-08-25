/**
 * PMU vHGPU Scheduler — 4 domínios × 4 cores mínimos
 *
 * Roteia frames de compute para handlers locais (WebGPU/CPU) ou motor CQR Python.
 * Integra pipeline AMP (estágio HCF/DPL) antes de cada frame.
 */

import { assertPipelineStage } from "../protocol/amp/ampPipeline";
import { createInitialState, getCollapseAlgebra } from "../collapse/collapseAlgebra";
import { isServerAvailable } from "../crypto/quantumBridge";
import { fetchOmegaEntropy } from "../crypto/entropyOrchestrator";
import { fossilizeEntropyToAnchorFast } from "../paleo/paleoEntropyFossil";
import { runGeomWebgpuPass } from "./geomWebgpuPass";
import { runLscMcmCoupledFrame } from "./lscMcmCoupled";
import { brunoTheoryMetrics, runBrunoTheoryFrame } from "../theory/brunoTheoryFrame";
import {
  PMU_VHGPU_MIN_CORES,
  type PmuVhgpuDomainId,
  getPmuDomain,
} from "./pmuDomains";

export type VhgpuBackend = "webgpu" | "cpu_fallback" | "cqr_circuit" | "hybrid" | "hybrid_anu";

export interface PmuVhgpuFrameResult {
  domain: PmuVhgpuDomainId;
  coresUsed: number;
  backend: VhgpuBackend;
  method: string;
  pmuSection: string;
  metrics: Record<string, number | string | boolean | null>;
  durationMs: number;
}

async function runGeomRelativity(resolution: number): Promise<Record<string, number | string | boolean>> {
  const pass = await runGeomWebgpuPass(resolution, PMU_VHGPU_MIN_CORES);
  return {
    webgpuUsed: pass.webgpuUsed,
    gpuIterations: pass.gpuIterations,
    geomIterations: pass.geomIterations,
    hashPrefix: pass.hashPrefix,
    topologyHash: pass.topologyHash,
    spectralBands: pass.spectralBands,
    method: pass.method,
  };
}

async function runQuantumVoid(_resolution: number): Promise<Record<string, number | string | boolean>> {
  const online = await isServerAvailable();
  const hybrid = await fetchOmegaEntropy(256);
  return {
    cqrOnline: online,
    entropySha3: hybrid.sha3_256.slice(0, 32),
    method: hybrid.cqr?.method ?? "omega_pmu_paleo_hybrid",
    entropyTier: hybrid.tier,
    sources: hybrid.sources.join("+"),
    paleoFossil: hybrid.paleoFossil?.fossilRootHash?.slice(0, 16) ?? "",
    chshS: hybrid.cqr?.chsh_audit?.S_value ?? 0,
    chshViolated: hybrid.chshViolated ?? false,
    quantumVerified: hybrid.quantumVerified,
    simulation: hybrid.simulation,
    anuClient: hybrid.anuBytes !== null,
  };
}

async function runAlgebraPaleo(resolution: number): Promise<Record<string, number | string | boolean>> {
  const algebra = getCollapseAlgebra();
  let state = createInitialState(32);
  state = algebra.accumulate(state, 0.05 * (resolution % 10));

  const omega = await fetchOmegaEntropy(256);
  const { record } = fossilizeEntropyToAnchorFast(omega.material);

  return {
    collapseLambda: state.lambda,
    memoryLayers: 5,
    fossilHash: record.fossilRootHash.slice(0, 16),
    skeletonId: record.skeletonId,
    paleoVerified: record.verified,
    entropyTier: omega.tier,
    method: "mcm_paleo_omega_fossil",
  };
}

async function runLscMcm(resolution: number): Promise<Record<string, number | string | boolean>> {
  const coupled = runLscMcmCoupledFrame(resolution);
  return {
    C_epsilon: coupled.C_epsilon,
    K_eff: coupled.K_eff,
    P_current: coupled.P_current,
    collapseLambda: coupled.collapseLambda,
    coupledLambda: coupled.coupledLambda,
    gSaturation: coupled.gSaturation,
    couplingGain: coupled.couplingGain,
    memoryLayers: coupled.memoryLayers,
    method: coupled.method,
    ...coupled.theory,
  };
}

const HANDLERS: Record<
  PmuVhgpuDomainId,
  (resolution: number) => Promise<Record<string, number | string | boolean>>
> = {
  geom_relativity: runGeomRelativity,
  quantum_void: runQuantumVoid,
  algebra_paleo: runAlgebraPaleo,
  lsc_mcm: runLscMcm,
};

/**
 * Executa um frame num domínio PMU (4 cores lógicos).
 * Respeita estágio AMP (HCF ou DPL conforme domínio).
 */
export async function runPmuVhgpuFrame(
  domainId: PmuVhgpuDomainId,
  resolution = 64,
): Promise<PmuVhgpuFrameResult> {
  const spec = getPmuDomain(domainId);
  assertPipelineStage(spec.ampStage);

  const t0 = performance.now();
  const metrics = await HANDLERS[domainId](resolution);
  const theory = brunoTheoryMetrics(runBrunoTheoryFrame(resolution, `pmu:${domainId}`));
  const durationMs = performance.now() - t0;

  let backend: VhgpuBackend = "cpu_fallback";
  if (domainId === "quantum_void") {
    if (metrics.entropyTier === "omega") backend = "hybrid";
    else if (metrics.quantumVerified === true) backend = "hybrid_anu";
    else if (metrics.cqrOnline === true) backend = "cqr_circuit";
    else backend = "hybrid";
  } else if (domainId === "geom_relativity" && metrics.webgpuUsed === true) {
    backend = "webgpu";
  } else if (domainId === "geom_relativity") {
    backend = "cpu_fallback";
  }

  return {
    domain: domainId,
    coresUsed: PMU_VHGPU_MIN_CORES,
    backend,
    method: String(metrics.method ?? `${domainId}_tick`),
    pmuSection: spec.pmuSection,
    metrics: { ...metrics, ...theory },
    durationMs,
  };
}

/** Executa os 4 domínios em paralelo (ajuda vHGPU completa). */
export async function runPmuVhgpuAllDomains(resolution = 64): Promise<PmuVhgpuFrameResult[]> {
  const ids: PmuVhgpuDomainId[] = [
    "geom_relativity",
    "quantum_void",
    "algebra_paleo",
    "lsc_mcm",
  ];
  return Promise.all(ids.map((id) => runPmuVhgpuFrame(id, resolution)));
}
