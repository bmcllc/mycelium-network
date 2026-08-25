/**
 * Refrigerador gravitomimético — calor específico negativo em sistema N-corpo.
 * Integra órbitas gravitacionais 2D com Euler-Cromer e aplica damping (extração de energia).
 * Demonstra que extrair energia → órbitas mais apertadas → velocidades maiores → T cinética sobe.
 */

function initParticles(N, rMax = 2.0) {
  const particles = [];
  for (let i = 0; i < N; i++) {
    const angle = (2 * Math.PI * i) / N;
    const r = rMax * (0.5 + 0.5 * Math.random());
    const vCirc = Math.sqrt(1.0 / r); // Velocidade circular kepleriana (GM=1)
    particles.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      vx: -vCirc * Math.sin(angle),
      vy:  vCirc * Math.cos(angle),
    });
  }
  return particles;
}

function kineticEnergy(particles) {
  let K = 0;
  for (const p of particles) {
    K += 0.5 * (p.vx * p.vx + p.vy * p.vy);
  }
  return K;
}

function potentialEnergy(particles) {
  let U = 0;
  const GM = 1.0;
  for (const p of particles) {
    const r = Math.sqrt(p.x * p.x + p.y * p.y);
    U -= GM / (r + 0.05); // Softened central potential
  }
  return U;
}

export function stepCooler(T_kinetic_input, E_injected, N_masses = 6) {
  const N = Math.min(20, Math.max(3, N_masses));
  const particles = initParticles(N);

  // Calibra velocidades para a temperatura cinética fornecida
  const K0 = kineticEnergy(particles);
  const scale = Math.sqrt(Math.max(0.01, T_kinetic_input) / (K0 + 1e-9));
  for (const p of particles) {
    p.vx *= scale;
    p.vy *= scale;
  }

  const dt = 0.01;
  const dampingRate = Math.max(0, Math.min(0.5, E_injected / 1000)); // Controla intensidade do damping
  const integrationSteps = 200;
  const trajectory = [];

  const K_before = kineticEnergy(particles);
  const U_before = potentialEnergy(particles);
  const E_before = K_before + U_before;

  for (let step = 0; step < integrationSteps; step++) {
    const GM = 1.0;

    // Euler-Cromer: update velocity first, then position
    for (const p of particles) {
      const r = Math.sqrt(p.x * p.x + p.y * p.y) + 0.05;
      const r3 = r * r * r;
      // Gravitational acceleration towards center
      const ax = -GM * p.x / r3;
      const ay = -GM * p.y / r3;

      // Apply damping (energy extraction via friction)
      p.vx += ax * dt - dampingRate * p.vx * dt;
      p.vy += ay * dt - dampingRate * p.vy * dt;

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (step % 20 === 0) {
      trajectory.push({
        step,
        kineticEnergy: kineticEnergy(particles),
        potentialEnergy: potentialEnergy(particles),
        totalEnergy: kineticEnergy(particles) + potentialEnergy(particles),
      });
    }
  }

  const K_after = kineticEnergy(particles);
  const U_after = potentialEnergy(particles);
  const E_after = K_after + U_after;

  const deltaE = E_after - E_before;
  const deltaK = K_after - K_before;

  return {
    T_kinetic_before: K_before,
    T_kinetic_after: K_after,
    E_total_before: E_before,
    E_total_after: E_after,
    deltaE,
    deltaK,
    negativeHeatCapacity: deltaE < 0 && deltaK > 0,
    negativeHeatCapacityAnalog: true,
    trajectory,
    particles: particles.map((p, i) => ({
      id: i,
      x: p.x,
      y: p.y,
      r: Math.sqrt(p.x * p.x + p.y * p.y),
    })),
    note: deltaE < 0 && deltaK > 0
      ? "Calor específico negativo confirmado: ΔE < 0 mas ΔK > 0 — partículas caíram em órbitas mais apertadas e aceleraram."
      : "Integração executada com damping. Verifique que a extração de energia suficiente produz ΔK > 0.",
    disclaimer: "Simulação N-corpo gravitacional Euler-Cromer com potencial suavizado (softened). Análogo clássico de calor negativo em sistemas autogravitantes.",
  };
}
