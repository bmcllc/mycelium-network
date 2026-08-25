/**
 * SDF Engine — Simulação real de Signed Distance Fields com advecção Semi-Lagrangiana.
 * Mantém uma grade 2D de valores SDF representando formas e deforma via campo de velocidade.
 */

/**
 * Gera um SDF 2D para um círculo na grade.
 */
export function sdfCircle(resolution, cx, cy, radius) {
  const grid = new Float64Array(resolution * resolution);
  const dx = 2.0 / (resolution - 1);
  for (let j = 0; j < resolution; j++) {
    const y = -1 + j * dx;
    for (let i = 0; i < resolution; i++) {
      const x = -1 + i * dx;
      grid[j * resolution + i] = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - radius;
    }
  }
  return grid;
}

/**
 * Gera um SDF 2D para um torus (anel) na grade.
 */
export function sdfTorus(resolution, cx, cy, R, r) {
  const grid = new Float64Array(resolution * resolution);
  const dx = 2.0 / (resolution - 1);
  for (let j = 0; j < resolution; j++) {
    const y = -1 + j * dx;
    for (let i = 0; i < resolution; i++) {
      const x = -1 + i * dx;
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      grid[j * resolution + i] = Math.abs(d - R) - r;
    }
  }
  return grid;
}

/**
 * Interpolação bilinear no grid.
 */
function bilinearSample(grid, resolution, x, y) {
  const dx = 2.0 / (resolution - 1);
  // Coordenada contínua de grid
  const fi = (x + 1) / dx;
  const fj = (y + 1) / dx;

  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  const i1 = Math.min(i0 + 1, resolution - 1);
  const j1 = Math.min(j0 + 1, resolution - 1);

  const si = Math.max(0, Math.min(i0, resolution - 1));
  const sj = Math.max(0, Math.min(j0, resolution - 1));

  const tx = fi - i0;
  const ty = fj - j0;

  const v00 = grid[sj * resolution + si];
  const v10 = grid[sj * resolution + i1];
  const v01 = grid[j1 * resolution + si];
  const v11 = grid[j1 * resolution + i1];

  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

/**
 * Campo de velocidade tipo vórtice centrado na origem.
 */
function vortexVelocity(x, y, strength = 1.0) {
  const r2 = x * x + y * y + 0.01;
  return {
    vx: -strength * y / r2,
    vy:  strength * x / r2,
  };
}

/**
 * Campo de velocidade de cisalhamento (shear flow).
 */
function shearVelocity(x, y, strength = 1.0) {
  return {
    vx: strength * y,
    vy: 0,
  };
}

/**
 * Advecção Semi-Lagrangiana: para cada ponto do grid, rastreia para trás
 * pela velocidade e interpola o valor SDF na posição de partida.
 */
export function advectSemiLagrangian(sdf, resolution, dt, velocityType = "vortex", strength = 1.0) {
  const result = new Float64Array(resolution * resolution);
  const dx = 2.0 / (resolution - 1);
  const velFn = velocityType === "shear" ? shearVelocity : vortexVelocity;

  for (let j = 0; j < resolution; j++) {
    const y = -1 + j * dx;
    for (let i = 0; i < resolution; i++) {
      const x = -1 + i * dx;
      const vel = velFn(x, y, strength);

      // Backtrace: posição de origem
      const xOrig = x - vel.vx * dt;
      const yOrig = y - vel.vy * dt;

      result[j * resolution + i] = bilinearSample(sdf, resolution, xOrig, yOrig);
    }
  }

  return result;
}

/**
 * Calcula o gradiente do SDF via diferenças finitas centradas.
 */
export function sdfGradient(sdf, resolution) {
  const dx = 2.0 / (resolution - 1);
  const gradX = new Float64Array(resolution * resolution);
  const gradY = new Float64Array(resolution * resolution);

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const idx = j * resolution + i;
      const left  = i > 0 ? sdf[idx - 1] : sdf[idx];
      const right = i < resolution - 1 ? sdf[idx + 1] : sdf[idx];
      const down  = j > 0 ? sdf[idx - resolution] : sdf[idx];
      const up    = j < resolution - 1 ? sdf[idx + resolution] : sdf[idx];

      gradX[idx] = (right - left) / (2 * dx);
      gradY[idx] = (up - down) / (2 * dx);
    }
  }

  return { gradX, gradY };
}

/**
 * Calcula a curvatura (Laplaciano) do SDF.
 */
export function sdfCurvature(sdf, resolution) {
  const dx = 2.0 / (resolution - 1);
  const dx2 = dx * dx;
  const laplacian = new Float64Array(resolution * resolution);

  for (let j = 1; j < resolution - 1; j++) {
    for (let i = 1; i < resolution - 1; i++) {
      const idx = j * resolution + i;
      laplacian[idx] = (
        sdf[idx - 1] + sdf[idx + 1] +
        sdf[idx - resolution] + sdf[idx + resolution] -
        4 * sdf[idx]
      ) / dx2;
    }
  }

  return laplacian;
}

/**
 * Executa a simulação completa: gera SDF, advecta N passos, retorna estatísticas.
 */
export function runSdfSimulation(params = {}) {
  const resolution = Math.min(64, Math.max(8, params.resolution ?? 32));
  const steps = Math.min(20, Math.max(1, params.steps ?? 4));
  const dt = params.dt ?? 0.05;
  const shape = params.shape ?? "circle";
  const velocityType = params.velocityType ?? "vortex";
  const strength = params.strength ?? 1.0;

  // Gera SDF inicial
  let sdf;
  if (shape === "torus") {
    sdf = sdfTorus(resolution, 0, 0, 0.4, 0.15);
  } else {
    sdf = sdfCircle(resolution, 0.3, 0.0, 0.25);
  }

  // Estatísticas iniciais
  const initialStats = gridStats(sdf, resolution);

  // Advecta
  for (let s = 0; s < steps; s++) {
    sdf = advectSemiLagrangian(sdf, resolution, dt, velocityType, strength);
  }

  // Estatísticas finais
  const finalStats = gridStats(sdf, resolution);

  // Gradiente e curvatura
  const grad = sdfGradient(sdf, resolution);
  const curv = sdfCurvature(sdf, resolution);

  // Amostra central do grid (8x8) para visualização
  const sampleSize = Math.min(8, resolution);
  const offset = Math.floor((resolution - sampleSize) / 2);
  const sample = [];
  for (let j = 0; j < sampleSize; j++) {
    const row = [];
    for (let i = 0; i < sampleSize; i++) {
      row.push(Number(sdf[(offset + j) * resolution + (offset + i)].toFixed(4)));
    }
    sample.push(row);
  }

  return {
    resolution,
    steps,
    dt,
    shape,
    velocityType,
    strength,
    initialStats,
    finalStats,
    sampleGrid: sample,
    maxCurvature: Math.max(...Array.from(curv).map(Math.abs)),
    disclaimer: "SDF 2D com advecção Semi-Lagrangiana e interpolação bilinear — simulação clássica de deformação de campos de distância.",
  };
}

function gridStats(sdf, resolution) {
  let min = Infinity, max = -Infinity, sumAbs = 0, zeroCount = 0;
  const n = resolution * resolution;
  for (let i = 0; i < n; i++) {
    const v = sdf[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sumAbs += Math.abs(v);
    if (Math.abs(v) < 0.01) zeroCount++;
  }
  return {
    min: Number(min.toFixed(6)),
    max: Number(max.toFixed(6)),
    meanAbsValue: Number((sumAbs / n).toFixed(6)),
    zeroCrossingCells: zeroCount,
    totalCells: n,
  };
}
