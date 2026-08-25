/**
 * Frame unificado — FURC + HMCO + DTU + PDC + Colapso + RCP (arquivo teoria).
 */

import { runBrunoTheorySimulation } from "./brunoTheoryEngine";
import type { BrunoTheoryFrame } from "./brunoTheoryTypes";

export type { BrunoTheoryFrame, BrunoTheorySimulationMeta } from "./brunoTheoryTypes";

export function runBrunoTheoryFrame(
  resolution = 64,
  seed = "etrnet:bruno-theory",
  steps = 24,
): BrunoTheoryFrame {
  return runBrunoTheorySimulation({ resolution, seed, steps }).frame;
}

/** Métricas planas para PMU / Harmonia / logs. */
export function brunoTheoryMetrics(frame: BrunoTheoryFrame): Record<string, number | string> {
  const sim = frame.simulation;
  return {
    theory: frame.version,
    furc_C_epsilon: frame.furc.C_epsilon,
    furc_P_max: frame.furc.P_max,
    furc_m_dot: frame.furc.m_dot,
    furc_N: frame.furc.N,
    furc_rho: frame.furc.rho,
    furc_time: frame.furc.time,
    hmco_kappa: frame.hmco.kappa,
    hmco_Sigma_ent: frame.hmco.Sigma_ent,
    hmco_grad_pred: frame.hmco.grad_pred,
    hmco_prefetch: frame.hmco.prefetch_mode,
    hmco_C_cache: frame.hmco.C_cache,
    hmco_Phi: frame.hmco.Phi,
    hmco_page_faults: frame.hmco.page_faults,
    dtu_N_tau: frame.dtu.N_tau,
    dtu_K_eff: frame.dtu.K_eff_melt,
    dtu_Psi_col: frame.dtu.Psi_col,
    dtu_qcg_nodes: frame.dtu.qcg_nodes,
    dtu_morphogenesis_rate: frame.dtu.morphogenesis_rate,
    pdc_ecs_matches: frame.pdc.ecsMatches,
    pdc_morton: frame.pdc.mortonIndex,
    pdc_morton3d: frame.pdc.morton3d,
    pdc_voxels: frame.pdc.voxelCount,
    pdc_arena_slots: frame.pdc.arenaSlotsUsed,
    collapse_omega: frame.collapse.omega,
    collapse_chi: frame.collapse.chi_boost,
    collapse_stress: frame.collapse.stress_from_projection,
    collapse_edge_stress: frame.collapse.edge_stress_max,
    rcp_splat: frame.rcp.splatDensity,
    rcp_homotopy: frame.rcp.homotopyPreserved ? 1 : 0,
    rcp_energy: frame.rcp.energy,
    sim_steps: sim?.steps ?? 0,
    sim_furc_ticks: sim?.furcHistoryLen ?? 0,
    sim_hmco_ticks: sim?.hmcoTraceLen ?? 0,
    sim_rcp_frames: sim?.rcpFrames ?? 0,
    sim_dtu_coherence: sim?.dtuCoherence ?? 0,
  };
}
