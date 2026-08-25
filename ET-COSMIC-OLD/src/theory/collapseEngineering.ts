/**
 * Engenharia do Colapso — Olho do Arquiteto, tesseract, protocolo morfogênese 4D→3D.
 */

import { offlineMaterialFromSeed, unit } from "../lib/moduleRealityBackend";
import type { FurcState } from "./furc";

export function architectEyeScale(Df: number, W: number): number {
  const denom = Df - W;
  if (Math.abs(denom) < 1e-9) return 1;
  return Df / denom;
}

export function projectHyperdim(
  vertex: [number, number, number, number],
  Df: number,
): [number, number, number] {
  const omega = architectEyeScale(Df, vertex[3]);
  return [vertex[0] * omega, vertex[1] * omega, vertex[2] * omega];
}

export interface CollapseEngineeringState {
  Df: number;
  W: number;
  omega: number;
  projected: [number, number, number];
  chi_boost: number;
  stress_from_projection: number;
  tesseract_vertices: number;
  edge_stress_max: number;
  morphogenesis_protocol_step: number;
}

const TESSERACT_EDGES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 4],
  [0, 8],
  [1, 3],
  [1, 5],
  [1, 9],
  [2, 3],
  [2, 6],
  [2, 10],
  [3, 7],
  [3, 11],
  [4, 5],
  [4, 6],
  [4, 12],
  [5, 7],
  [5, 13],
  [6, 7],
  [6, 14],
  [7, 15],
  [8, 9],
  [8, 10],
  [8, 12],
  [9, 11],
  [9, 13],
  [10, 11],
  [10, 14],
  [11, 15],
  [12, 13],
  [12, 14],
  [13, 15],
  [14, 15],
];

export function projectTesseract(seed: string, Df = 4): [number, number, number][] {
  const mat = offlineMaterialFromSeed(seed, 32);
  const out: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const sx = i & 1 ? 1 : -1;
    const sy = i & 2 ? 1 : -1;
    const sz = i & 4 ? 1 : -1;
    const sw = i & 8 ? 1 : -1;
    const w = -1 + unit(mat, i) * 0.5 + sw * 0.25;
    out.push(projectHyperdim([sx, sy, sz, w], Df));
  }
  return out;
}

function edgeStress(
  verts: [number, number, number][],
  a: number,
  b: number,
): number {
  const va = verts[a];
  const vb = verts[b];
  if (!va || !vb) return 0;
  return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

/** Protocolo morfogênese: itera projeção com W adaptativo até stress estabilizar. */
export function runCollapseMorphogenesisProtocol(
  material: Uint8Array,
  furc: FurcState,
  resolution = 64,
  maxSteps = 8,
): CollapseEngineeringState {
  let Df = 4 + unit(material, 40) * 2;
  let W = -1 + unit(material, 41) * 2;
  const seed = `collapse:${resolution}:${material[0]}`;
  let verts = projectTesseract(seed, Df);
  let omega = architectEyeScale(Df, W);
  let edge_stress_max = 0;
  let step = 0;

  for (step = 0; step < maxSteps; step++) {
    edge_stress_max = 0;
    for (const [a, b] of TESSERACT_EDGES) {
      edge_stress_max = Math.max(edge_stress_max, edgeStress(verts, a, b));
    }
    const target = 2.5 * furc.C_epsilon;
    if (Math.abs(edge_stress_max - target) < 0.08) break;
    W += (edge_stress_max > target ? 0.05 : -0.05) * (1 - furc.N);
    W = Math.max(-1.5, Math.min(1.5, W));
    verts = projectTesseract(`${seed}:${step}`, Df);
    omega = architectEyeScale(Df, W);
    for (let i = 0; i < verts.length; i++) {
      const w = -1 + unit(material, 42 + (i % 16)) * 0.5;
      verts[i] = projectHyperdim(
        [
          verts[i]![0] / Math.max(omega, 0.1),
          verts[i]![1] / Math.max(omega, 0.1),
          verts[i]![2] / Math.max(omega, 0.1),
          w,
        ],
        Df,
      );
    }
  }

  const vertex: [number, number, number, number] = [
    -1 + unit(material, 42) * 2,
    -1 + unit(material, 43) * 2,
    -1 + unit(material, 44) * 2,
    W,
  ];
  const projected = projectHyperdim(vertex, Df);
  const mag = Math.hypot(projected[0], projected[1], projected[2]);
  const stress_from_projection = Math.min(1, mag / (3 * Math.max(1, omega)));
  const chi_boost = furc.C_epsilon * (0.5 + stress_from_projection * 0.5);

  return {
    Df,
    W,
    omega,
    projected,
    chi_boost,
    stress_from_projection,
    tesseract_vertices: verts.length,
    edge_stress_max,
    morphogenesis_protocol_step: step,
  };
}

export function runCollapseEngineering(
  material: Uint8Array,
  furc: FurcState,
  resolution = 64,
): CollapseEngineeringState {
  return runCollapseMorphogenesisProtocol(material, furc, resolution);
}
