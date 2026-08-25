/**
 * AQRE Orchestrator — loop principal; impõe P_max, Cε, G, K_eff antes de tarefas.
 */

import { evaluateLsc } from "./lscCore.js";
import { recordLscReading } from "./lsc_monitor.js";
import { createSpinNetwork, boltzmannAmplitude } from "./spin_network.js";
import { runCausalTracker } from "./causal_tracker.js";
import { operatorCollapse, pushMemory, getMemoryState } from "./memory_collapse.js";
import { sampleChiField } from "./chi_field.js";
import { runSdfSimulation } from "./sdf_engine.js";

export const AQRE_DISCLAIMER =
  "Anacroclastic Quantum-Relativistic Emulator (AQRE): simulador clássico de sistemas coerentes com memória. Nunca executa computação quântica real.";

export function getStatus() {
  return {
    engine: "AQRE",
    version: "1.0.0",
    disclaimer: AQRE_DISCLAIMER,
    limits: {
      maxSpinNodes: 20,
      maxHeptitsRecommended: 4,
      classicalEntropyOnly: true,
      researchEndpointsPrefix: "/api/aqre/research/",
    },
    indicators: { P: null, C_epsilon: null, G: null, K_eff: null },
  };
}

export function runTask(task, params = {}) {
  const reading = recordLscReading({
    cEpsilon: params.cEpsilon ?? 0.2,
    pCurrent: params.pCurrent ?? 0.1,
  });

  if (!reading.allowed) {
    return { ok: false, status: 429, reading, error: "LSC_LIMIT_EXCEEDED" };
  }

  let result;
  switch (task) {
    case "spin_network":
      result = createSpinNetwork(params.nodeCount ?? 8);
      result.boltzmann = boltzmannAmplitude(result);
      break;
    case "causal_tracker":
      result = runCausalTracker(params.size ?? 8, params.steps ?? 16);
      break;
    case "memory_collapse":
      if (params.value != null) pushMemory(params.value);
      result = {
        memory: getMemoryState(),
        collapse: operatorCollapse(params.threshold ?? 1),
      };
      break;
    case "chi_field":
      result = sampleChiField(params.gridSize ?? 16, params.seed);
      break;
    case "sdf":
      result = runSdfSimulation({
        resolution: params.resolution ?? 32,
        steps: params.steps ?? 4,
        dt: params.dt ?? 0.05,
        shape: params.shape ?? "circle",
        velocityType: params.velocityType ?? "vortex",
        strength: params.strength ?? 1.0,
      });
      break;
    default:
      return { ok: false, error: "UNKNOWN_TASK", allowedTasks: ["spin_network", "causal_tracker", "memory_collapse", "chi_field", "sdf"] };
  }

  return {
    ok: true,
    task,
    reading,
    indicators: {
      P: reading.P,
      C_epsilon: reading.cEpsilon,
      G: reading.G,
      K_eff: reading.K_eff,
    },
    result,
    disclaimer: AQRE_DISCLAIMER,
  };
}

export function evaluateIndicators(params) {
  return evaluateLsc(params);
}
