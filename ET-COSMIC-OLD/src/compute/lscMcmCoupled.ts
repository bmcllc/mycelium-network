/**
 * LSC ↔ MCM acoplado — um frame PMU (Cap.8 + Cap.9).
 *
 * λ do colapso modula C_ε; G(C_ε) devolve stress ao MCM (segundo acúmulo).
 */

import { createInitialState, getCollapseAlgebra } from "../collapse/collapseAlgebra";
import { LSCEngine } from "../lsc/lscEngine";
import { brunoTheoryMetrics, runBrunoTheoryFrame } from "../theory/brunoTheoryFrame";
import { PMU_VHGPU_MIN_CORES } from "./pmuDomains";

export interface LscMcmCoupledResult {
  C_epsilon: number;
  K_eff: number;
  P_current: number;
  collapseLambda: number;
  coupledLambda: number;
  gSaturation: number;
  couplingGain: number;
  memoryLayers: number;
  coresUsed: number;
  method: string;
  theory: Record<string, number | string>;
}

/**
 * Frame acoplado LSC+MCM (4 cores lógicos).
 */
export function runLscMcmCoupledFrame(resolution = 64): LscMcmCoupledResult {
  const algebra = getCollapseAlgebra();
  let mcm = createInitialState(32);
  const stress = 0.05 * (resolution % 10);
  mcm = algebra.accumulate(mcm, stress);

  const lsc = LSCEngine.getInstance();
  let cEpsilon = Math.min(0.85, 0.15 + mcm.lambda * 0.5 + (resolution % 50) / 100);
  const gSaturation = lsc.law2Saturation(cEpsilon);
  cEpsilon = Math.min(0.99, cEpsilon * (0.5 + 0.5 * gSaturation));

  lsc.law3Holofriction(cEpsilon);
  const pCurrent = lsc.law1MaximumPower(0.5 + resolution / 200, 1.0, cEpsilon);

  mcm = algebra.accumulate(mcm, (1 - gSaturation) * 0.03);
  const coupledLambda = mcm.lambda;
  const couplingGain = 1 - gSaturation;

  const theoryFrame = runBrunoTheoryFrame(resolution, "pmu:lsc_mcm");
  cEpsilon = Math.min(0.99, (cEpsilon + theoryFrame.furc.C_epsilon) / 2);

  return {
    C_epsilon: cEpsilon,
    K_eff: lsc.getState().K_eff,
    P_current: pCurrent,
    collapseLambda: mcm.lambda,
    coupledLambda,
    gSaturation,
    couplingGain,
    memoryLayers: 5,
    coresUsed: PMU_VHGPU_MIN_CORES,
    method: "lsc_mcm_furc_coupled",
    theory: brunoTheoryMetrics(theoryFrame),
  };
}
