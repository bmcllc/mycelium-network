/**
 * Coherent Ising Machine (simulação) — otimização combinatória clássica.
 * Emula o comportamento físico de uma rede de osciladores paramétricos ópticos (OPO) acoplados.
 */

export function maxCutEnergy(assignment, edges) {
  let cut = 0;
  for (const [i, j, w] of edges) {
    if (assignment[i] !== assignment[j]) cut += w;
  }
  return cut;
}

export function solveMaxCut(n, edges, iterations = 300) {
  // Inicializa amplitudes com ruído (flutuações de vácuo)
  let x = Array(n).fill(0).map(() => (Math.random() * 0.1 - 0.05));
  
  // Monta a matriz de acoplamento J
  const J = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [u, v, w] of edges) {
    if (u < n && v < n) {
      J[u][v] = w;
      J[v][u] = w;
    }
  }

  const dt = 0.03;
  const coupling = 0.2;
  const trajectory = [];

  for (let step = 0; step < iterations; step++) {
    // Rampa do parâmetro de bombeamento (pump) p de 0.2 a 1.5
    const p = 0.2 + (1.3 * step) / iterations;
    const nextX = [...x];

    for (let i = 0; i < n; i++) {
      let sumCoupling = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          sumCoupling += J[i][j] * x[j];
        }
      }
      
      // Dinâmica de OPO acoplado: dx_i/dt = (p - 1 - x_i^2)*x_i + coupling * sum(J_ij * x_j)
      const dx = ((p - 1 - x[i] * x[i]) * x[i] + coupling * sumCoupling) * dt;
      nextX[i] = x[i] + dx;
    }

    x = nextX;
    
    // Registra trajetórias em intervalos para auditoria/visualização
    if (step % Math.max(1, Math.floor(iterations / 10)) === 0) {
      trajectory.push({ step, p, amplitudes: [...x] });
    }
  }

  // Atribuição de spin baseada nos sinais das amplitudes OPO
  const assignment = x.map((val) => (val >= 0 ? 1 : -1));
  const finalE = maxCutEnergy(assignment, edges);

  return {
    assignment,
    energy: finalE,
    iterations,
    trajectory,
    disclaimer: "Osciladores acoplados clássicos emulando bifurcação OPO (CIM) — compete com computação quântica adiabática.",
  };
}

export function randomGraph(n, p = 0.4) {
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < p) edges.push([i, j, 1]);
    }
  }
  return edges;
}
