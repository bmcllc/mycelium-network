/**
 * VOID-500 — Ising Solver Engine (Coherent Ising Machine, isossupramulado).
 * Iso: dinâmica OPO acoplada (Langevin discretizado + passo RK adaptativo simplificado).
 * Supra: partição do grafo em shards (simula nós mesh).
 */

import { solveMaxCut, randomGraph } from "../lusus/ising_machine.js";

const MAX_N = parseInt(process.env.ISOSSUPRA_MAX_ISING_N ?? "128", 10);

/** Passo RK4 para um oscilador acoplado (validação numérica iso). */
export function rk4OpoStep(x, J, i, p, coupling, dt) {
  const f = (xi) => {
    let sum = 0;
    for (let j = 0; j < x.length; j++) {
      if (j !== i) sum += J[i][j] * x[j];
    }
    return (p - 1 - xi * xi) * xi + coupling * sum;
  };
  const k1 = f(x[i]);
  const k2 = f(x[i] + 0.5 * dt * k1);
  const k3 = f(x[i] + 0.5 * dt * k2);
  const k4 = f(x[i] + dt * k3);
  return x[i] + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

export function partitionGraph(n, edges, shardCount) {
  const shards = Array.from({ length: shardCount }, () => ({ nodes: [], edges: [] }));
  for (let i = 0; i < n; i++) shards[i % shardCount].nodes.push(i);
  for (const e of edges) {
    const [u, v] = e;
    shards[u % shardCount].edges.push(e);
  }
  return shards.map((s, id) => ({ shardId: id, ...s }));
}

export function solveIsingIsossupra(opts = {}) {
  const n = Math.min(MAX_N, Math.max(4, parseInt(opts.n ?? "16", 10)));
  const edges = opts.edges ?? randomGraph(n);
  const iterations = parseInt(opts.iterations ?? "400", 10);
  const shardCount = Math.max(1, Math.min(32, parseInt(opts.shardCount ?? process.env.ISOSSUPRA_SHARD_COUNT ?? "4", 10)));

  const local = solveMaxCut(n, edges, iterations);
  const shards = partitionGraph(n, edges, shardCount);

  return {
    sku: "VOID-500",
    engine: "Ising Solver Engine",
    iso: {
      method: "coupled_opo_langevin",
      integrator: "euler+pump_ramp",
      rk4_sample_available: true,
    },
    supra: {
      shardCount,
      shards: shards.map((s) => ({ id: s.shardId, nodes: s.nodes.length, edges: s.edges.length })),
      note: "Cada shard pode executar em nó mesh (VOID-43); agregação por menor energia global.",
    },
    n,
    assignment: local.assignment,
    energy: local.energy,
    iterations: local.iterations ?? iterations,
    usefulWork: true,
    replaces: "VOID-120 idle PoW (roadmap)",
    disclaimer:
      "Ising clássico — compete com annealers em Max-Cut/NP-hard restrito; não é computação quântica universal.",
  };
}
