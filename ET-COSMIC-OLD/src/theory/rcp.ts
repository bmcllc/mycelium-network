/**
 * RCP — Realidade Causal de Partículas: forças, vínculos τ, energia, splat 2D multi-passo.
 */

import type { CollapseEngineeringState } from "./collapseEngineering";
import type { FurcState } from "./furc";

export interface RcpParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  tau: number;
  mass: number;
}

export interface RcpFrame {
  particles: number;
  energy: number;
  splatDensity: number;
  homotopyPreserved: boolean;
  meanTau: number;
  step: number;
}

export interface RcpSimulationResult {
  frames: RcpFrame[];
  splatGrid: Float32Array;
  gridW: number;
  gridH: number;
  finalEnergy: number;
}

const TAU_BOND = 0.15;
const DT_DEFAULT = 0.016;

function splat(
  grid: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  mass: number,
  radius = 2,
): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = ix + dx;
      const py = iy + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const d2 = dx * dx + dy * dy;
      const wgt = Math.exp(-d2 / (radius * radius + 0.5)) * mass;
      grid[py * w + px]! += wgt;
    }
  }
}

export class RcpSimulator {
  readonly particles: RcpParticle[];
  readonly gridW: number;
  readonly gridH: number;
  readonly splatGrid: Float32Array;
  readonly frames: RcpFrame[] = [];
  private initialPositions: Array<[number, number, number]> = [];

  constructor(
    material: Uint8Array,
    furc: FurcState,
    collapse: CollapseEngineeringState,
    particleCount: number,
    gridW = 64,
    gridH = 64,
  ) {
    const u = (i: number) => (material[i % material.length] ?? 0) / 255;
    this.gridW = gridW;
    this.gridH = gridH;
    this.splatGrid = new Float32Array(gridW * gridH);
    const boost = collapse.chi_boost * furc.C_epsilon;
    this.particles = Array.from({ length: particleCount }, (_, id) => {
      const x = u(id) * gridW * 0.8 + gridW * 0.1;
      const y = u(id + 17) * gridH * 0.8 + gridH * 0.1;
      const z = u(id + 33) * 4 - 2;
      const pos: [number, number, number] = [x, y, z];
      this.initialPositions.push(pos);
      return {
        id,
        x,
        y,
        z,
        vx: (u(id + 50) - 0.5) * boost * 2,
        vy: (u(id + 51) - 0.5) * boost * 2,
        vz: 0,
        tau: 0.5 + u(id + 52) * 0.5,
        mass: 0.5 + u(id + 53) * collapse.omega * 0.01,
      };
    });
  }

  private bondForce(a: RcpParticle, b: RcpParticle): [number, number, number] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const dist = Math.hypot(dx, dy, dz) + 1e-6;
    const rest = (a.tau + b.tau) * 8;
    const f = (dist - rest) * TAU_BOND / dist;
    return [dx * f, dy * f, dz * f];
  }

  private totalEnergy(): number {
    let e = 0;
    for (const p of this.particles) {
      e += 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      e += p.mass * 9.81 * Math.max(0, p.z);
    }
    return e;
  }

  step(dt: number, furc: FurcState): RcpFrame {
    const n = this.particles.length;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    const fz = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = this.particles[i]!;
        const pj = this.particles[j]!;
        const [fxb, fyb, fzb] = this.bondForce(pi, pj);
        fx[i]! += fxb;
        fy[i]! += fyb;
        fz[i]! += fzb;
        fx[j]! -= fxb;
        fy[j]! -= fyb;
        fz[j]! -= fzb;
      }
    }

    const drag = 0.02 * (1 - furc.C_epsilon);
    for (let i = 0; i < n; i++) {
      const p = this.particles[i]!;
      const ax = fx[i]! / p.mass - drag * p.vx;
      const ay = fy[i]! / p.mass - drag * p.vy - 0.5;
      const az = fz[i]! / p.mass;
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.vz += az * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.x = Math.max(0, Math.min(this.gridW - 1, p.x));
      p.y = Math.max(0, Math.min(this.gridH - 1, p.y));
      splat(this.splatGrid, this.gridW, this.gridH, p.x, p.y, p.mass);
    }

    let splatSum = 0;
    for (let i = 0; i < this.splatGrid.length; i++) splatSum += this.splatGrid[i]!;
    const splatDensity = splatSum / (this.gridW * this.gridH);

    let homotopyPreserved = true;
    for (let i = 0; i < n; i++) {
      const init = this.initialPositions[i];
      const p = this.particles[i]!;
      if (!init) continue;
      const d = Math.hypot(p.x - init[0], p.y - init[1]);
      if (d > this.gridW * 0.85) homotopyPreserved = false;
    }

    const meanTau = this.particles.reduce((s, p) => s + p.tau, 0) / n;
    const frame: RcpFrame = {
      particles: n,
      energy: this.totalEnergy(),
      splatDensity,
      homotopyPreserved,
      meanTau,
      step: this.frames.length,
    };
    this.frames.push(frame);
    return frame;
  }

  run(steps: number, furc: FurcState, dt = DT_DEFAULT): RcpSimulationResult {
    for (let i = 0; i < steps; i++) this.step(dt, furc);
    const last = this.frames[this.frames.length - 1];
    return {
      frames: [...this.frames],
      splatGrid: this.splatGrid,
      gridW: this.gridW,
      gridH: this.gridH,
      finalEnergy: last?.energy ?? 0,
    };
  }
}

export function runRcpStep(
  material: Uint8Array,
  furc: FurcState,
  collapse: CollapseEngineeringState,
  particleCount: number,
): RcpFrame {
  const sim = new RcpSimulator(material, furc, collapse, particleCount);
  return sim.step(DT_DEFAULT, furc);
}
