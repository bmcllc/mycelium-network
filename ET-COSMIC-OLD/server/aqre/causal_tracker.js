/**
 * Interruptor causal — mistura estatística de ordens (não superposição coerente real).
 */

import { liebRobinsonLimit } from "./lieb_robinson.js";

export function isingStep(lattice, beta = 0.5, J = 1) {
  const L = lattice.length;
  const next = lattice.map((row) => [...row]);
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L; j++) {
      const neighbors =
        lattice[(i + 1) % L][j] +
        lattice[(i - 1 + L) % L][j] +
        lattice[i][(j + 1) % L] +
        lattice[i][(j - 1 + L) % L];
      const s = lattice[i][j];
      const dE = 2 * J * s * neighbors;
      const p = Math.exp(-beta * dE);
      if (Math.random() < p) next[i][j] = -s;
    }
  }
  const magnetization =
    next.flat().reduce((a, v) => a + v, 0) / (L * L);
  return { lattice: next, magnetization, orderParameter: Math.abs(magnetization) };
}

export function causalMixture(orders) {
  const weights = orders.map(() => 1 / orders.length);
  return {
    orders,
    weights,
    label: "statistical_mixture",
    disclaimer:
      "Simulação estatística de ordem causal indefinida — não interruptor quântico coerente.",
  };
}

export function runCausalTracker(size = 8, steps = 20, opts = {}) {
  const J = opts.J ?? 1;
  const beta = opts.beta ?? 0.5;
  const vLR = liebRobinsonLimit(J);
  let lattice = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (Math.random() > 0.5 ? 1 : -1)),
  );
  const history = [];
  let maxSpreadRate = 0;
  for (let t = 0; t < steps; t++) {
    const step = isingStep(lattice, beta, J);
    lattice = step.lattice;
    const prev = history[history.length - 1]?.orderParameter ?? 0;
    const spreadRate = Math.abs(step.orderParameter - prev) * size;
    maxSpreadRate = Math.max(maxSpreadRate, spreadRate);
    history.push({
      t,
      magnetization: step.magnetization,
      orderParameter: step.orderParameter,
      spreadRate,
    });
  }
  const lrViolation = maxSpreadRate > vLR || Boolean(opts.forceSpread);
  const mixture = causalMixture(["A→B→C", "C→B→A", "B→A→C"]);
  return {
    size,
    steps,
    J,
    history,
    finalOrder: history[history.length - 1]?.orderParameter ?? 0,
    causalMixture: mixture,
    liebRobinson: {
      vLR,
      maxSpreadRate,
      violated: lrViolation,
      safetyState: lrViolation ? "anderson_cage" : "normal",
    },
  };
}
