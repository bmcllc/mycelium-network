/**
 * DTU — Dinâmica Topológica Unificada (QUG + morfogênese, FURC 3.0).
 */

import { buildQCGFromMaterial } from "../lib/moduleRealityBackend";
import type { QuantumCausalGraph } from "../lsc/lscEngine";
import type { FurcState } from "./furc";

export interface DtuOperators {
  Psi_col: number;
  Omega_cobordism: number;
  v_phase: number;
  K_eff_melt: number;
  N_tau: number;
  coherence_write: number;
  qcg_nodes: number;
  qcg_edges: number;
  morphogenesis_rate: number;
  cobordism_flux: number;
}

export interface DtuMorphogenesisResult {
  operators: DtuOperators;
  qcg: QuantumCausalGraph;
  /** Protocolo morfogênese: N passos de refinamento topológico. */
  refinementSteps: number;
  finalCoherence: number;
}

function qcgCoherence(qcg: QuantumCausalGraph): number {
  if (qcg.nodes.length === 0) return 0;
  const phases = qcg.nodes.map((n) => Math.cos(n.coherencePhase));
  const strengths = qcg.edges.map((e) => e.causalStrength);
  const phaseMean = phases.reduce((a, b) => a + b, 0) / phases.length;
  const edgeMean =
    strengths.length > 0 ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0.5;
  return Math.min(1, (phaseMean + 1) / 2 * edgeMean);
}

/** Morfogênese: reforça arestas onde Ψ_col e coerência FURC excedem limiar. */
export function runDtuMorphogenesis(
  material: Uint8Array,
  furc: FurcState,
  resolution: number,
  steps = 12,
): DtuMorphogenesisResult {
  const u = (i: number) => (material[i % material.length] ?? 0) / 255;
  const nodeCount = Math.max(8, Math.min(32, 8 + (resolution % 24)));
  let qcg = buildQCGFromMaterial(material, nodeCount);
  const Psi_col = Math.min(1, furc.C_epsilon * (1 - furc.N));
  const threshold = 0.35 + u(21) * 0.25;

  for (let s = 0; s < steps; s++) {
    const coh = qcgCoherence(qcg);
    if (coh < threshold) break;
    qcg = {
      ...qcg,
      edges: qcg.edges.map((e, i) => ({
        ...e,
        causalStrength: Math.min(
          1,
          e.causalStrength + Psi_col * 0.04 * (1 + Math.sin(s + i) * 0.1),
        ),
      })),
    };
  }

  const finalCoherence = qcgCoherence(qcg);
  const edges = Math.max(8, resolution);
  const N_tau = edges * (0.4 + u(20) * 0.5) * (1 + finalCoherence * 0.2);
  const coherence_write = Math.min(0.99, furc.C_epsilon + finalCoherence * 0.08);
  const K_eff_melt = Math.max(0.01, (1 - furc.C_epsilon) * (1 + u(22))) * (2 - finalCoherence);
  const morphogenesis_rate =
    (furc.m_dot / 1e6) * (1 / Math.max(1 - furc.C_epsilon, 1e-6)) * Psi_col;
  const cobordism_flux = u(23) * finalCoherence * furc.P_ef;

  const operators: DtuOperators = {
    Psi_col,
    Omega_cobordism: u(21) * finalCoherence,
    v_phase: 1 + finalCoherence * 0.15,
    K_eff_melt,
    N_tau,
    coherence_write,
    qcg_nodes: qcg.nodes.length,
    qcg_edges: qcg.edges.length,
    morphogenesis_rate,
    cobordism_flux,
  };

  return {
    operators,
    qcg,
    refinementSteps: steps,
    finalCoherence,
  };
}

/** Compat one-shot. */
export function computeDtu(material: Uint8Array, furc: FurcState, resolution: number): DtuOperators {
  return runDtuMorphogenesis(material, furc, resolution).operators;
}
