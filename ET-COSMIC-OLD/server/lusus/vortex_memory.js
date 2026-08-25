/**
 * Memória de vórtices — torção topológica como estado ligado clássico.
 * Implementa dinâmica real de vórtices pontuais em 2D usando RK4.
 */

const vortices = new Map();

export function storeVortex(id, circulation, position = [0, 0]) {
  vortices.set(id, { circulation, position, t: Date.now(), stable: Math.abs(circulation) > 1e-6 });
  return { id, stored: true, count: vortices.size };
}

export function readVortex(id) {
  const v = vortices.get(id);
  if (!v) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, ...v, note: "Persistência enquanto circulação conservada (Helmholtz)." };
}

export function listVortices() {
  return Array.from(vortices.entries()).map(([id, v]) => ({ id, ...v }));
}

function getVelocities(vortexList) {
  const velocities = vortexList.map(() => ({ vx: 0, vy: 0 }));
  for (let i = 0; i < vortexList.length; i++) {
    const v_i = vortexList[i];
    for (let j = 0; j < vortexList.length; j++) {
      if (i === j) continue;
      const v_j = vortexList[j];
      const dx = v_i.position[0] - v_j.position[0];
      const dy = v_i.position[1] - v_j.position[1];
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-8) continue;
      const factor = v_j.circulation / (2 * Math.PI * r2);
      velocities[i].vx -= factor * dy;
      velocities[i].vy += factor * dx;
    }
  }
  return velocities;
}

export function calculateHamiltonian() {
  const list = listVortices();
  let H = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const dx = list[i].position[0] - list[j].position[0];
      const dy = list[i].position[1] - list[j].position[1];
      const r2 = dx * dx + dy * dy;
      H -= list[i].circulation * list[j].circulation * Math.log(r2 + 1e-9);
    }
  }
  return H / (4 * Math.PI);
}

export function calculateAngularMomentum() {
  const list = listVortices();
  let J = 0;
  for (let i = 0; i < list.length; i++) {
    const [x, y] = list[i].position;
    J += list[i].circulation * (x * x + y * y);
  }
  return J;
}

export function stepVortexDynamics(dt = 0.05) {
  const list = listVortices();
  if (list.length < 2) {
    return { ok: true, message: "Poucos vórtices para interagir", list };
  }

  // RK4 Integration
  const v1 = getVelocities(list);

  const list2 = list.map((item, idx) => ({
    ...item,
    position: [item.position[0] + 0.5 * dt * v1[idx].vx, item.position[1] + 0.5 * dt * v1[idx].vy]
  }));
  const v2 = getVelocities(list2);

  const list3 = list.map((item, idx) => ({
    ...item,
    position: [item.position[0] + 0.5 * dt * v2[idx].vx, item.position[1] + 0.5 * dt * v2[idx].vy]
  }));
  const v3 = getVelocities(list3);

  const list4 = list.map((item, idx) => ({
    ...item,
    position: [item.position[0] + dt * v3[idx].vx, item.position[1] + dt * v3[idx].vy]
  }));
  const v4 = getVelocities(list4);

  list.forEach((item, idx) => {
    const vx = (v1[idx].vx + 2 * v2[idx].vx + 2 * v3[idx].vx + v4[idx].vx) / 6;
    const vy = (v1[idx].vy + 2 * v2[idx].vy + 2 * v3[idx].vy + v4[idx].vy) / 6;
    const newPos = [item.position[0] + dt * vx, item.position[1] + dt * vy];

    const entry = vortices.get(item.id);
    if (entry) {
      entry.position = newPos;
    }
  });

  return {
    ok: true,
    hamiltonian: calculateHamiltonian(),
    angularMomentum: calculateAngularMomentum(),
    vortices: listVortices()
  };
}
