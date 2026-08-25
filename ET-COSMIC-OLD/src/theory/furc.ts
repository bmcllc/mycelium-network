/**
 * FURC v2.1 — Formalismo Unificado (coerência, potência, ruído).
 * Leis I–III + integração temporal da Segunda Lei (Δρ_τ).
 */

export interface FurcParams {
  rho: number;
  v_c: number;
  Q: number;
  lambda: number;
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  eps_r: number;
  d: number;
  V: number;
  P_inj: number;
  sigma_jitter: number;
  sigma_thermal: number;
  sigma_quantization: number;
  Z_isolation: number;
  Z_path: number;
  K_top: number;
  B?: number;
}

export interface FurcState {
  N: number;
  C_epsilon: number;
  R: number;
  E: number;
  I: number;
  P_ef: number;
  P_max: number;
  m_dot: number;
  delta_rho_dt: number;
  rho: number;
  time: number;
}

export const C_LIGHT = 299_792_458;
export const EPS0 = 8.854e-12;

export function noiseTotal(
  p: Pick<FurcParams, "sigma_jitter" | "sigma_thermal" | "sigma_quantization">,
): number {
  return p.sigma_jitter + p.sigma_thermal + p.sigma_quantization;
}

export function coherenceFromNoise(N: number): number {
  return Math.exp(-Math.max(0, N));
}

/** Operador de saturação (⊤) — clip em [min, max]. */
export function topOperator(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeFurc(params: FurcParams, rho = params.rho, time = 0): FurcState {
  const N = noiseTotal(params);
  const C_epsilon = coherenceFromNoise(N);
  const R = params.Q * (1 + params.lambda * C_epsilon);
  const E = ((params.eps_r * EPS0) / params.d ** 2) * params.V ** 2;
  const I =
    (params.Z_isolation / Math.max(params.Z_path, 1e-12)) *
    (1 / Math.max(1 - C_epsilon, 1e-6));
  const P_ef = params.P_inj * C_epsilon;
  const B = params.B ?? 1e-51;
  const P_max =
    B * rho * params.v_c ** 3 * (1 + params.alpha * R) * Math.exp(-params.beta * E);
  const excess = Math.max(0, params.P_inj - P_max);
  const delta_rho_dt =
    excess / (params.v_c ** 2 * C_LIGHT ** 2) + params.gamma * E;
  const m_dot =
    params.K_top *
    (1 / Math.max(1 - C_epsilon, 1e-6)) *
    (P_ef / C_LIGHT ** 2) *
    (1 + params.delta * R);

  return {
    N,
    C_epsilon,
    R,
    E,
    I,
    P_ef,
    P_max,
    m_dot,
    delta_rho_dt,
    rho,
    time,
  };
}

export function furcParamsFromMaterial(material: Uint8Array, resolution: number): FurcParams {
  const u = (i: number) => (material[i % material.length] ?? 0) / 255;
  return {
    rho: 0.85 + u(0) * 0.14,
    v_c: 1.2e8 + u(1) * 4e7,
    Q: 4 + u(2) * 12,
    lambda: 0.05 + u(3) * 0.15,
    alpha: 0.05 + u(4) * 0.1,
    beta: 0.02 + u(5) * 0.06,
    gamma: 0.005 + u(6) * 0.02,
    delta: 0.1 + u(7) * 0.2,
    eps_r: 3 + u(8) * 2,
    d: 1e-6 * (1 + u(9)),
    V: 1 + u(10) * 2,
    P_inj: 0.02 + (resolution % 100) / 2000 + u(11) * 0.08,
    sigma_jitter: u(12) * 0.04,
    sigma_thermal: u(13) * 0.03,
    sigma_quantization: u(14) * 0.02,
    Z_isolation: 100 + u(15) * 400,
    Z_path: 10 + u(16) * 40,
    K_top: 1,
  };
}

/** Simulador FURC com histórico e evolução de ρ_τ (Segunda Lei). */
export class FurcSimulator {
  readonly params: FurcParams;
  rho: number;
  time = 0;
  readonly history: FurcState[] = [];

  constructor(material: Uint8Array, resolution: number) {
    this.params = furcParamsFromMaterial(material, resolution);
    this.rho = this.params.rho;
  }

  step(dt: number, noiseMod = 0): FurcState {
    const p = { ...this.params };
    p.sigma_jitter = topOperator(p.sigma_jitter + noiseMod, 0, 0.2);
    const state = computeFurc(p, this.rho, this.time);
    this.rho = topOperator(this.rho + state.delta_rho_dt * dt, 0.05, 0.999);
    this.time += dt;
    this.history.push(state);
    return state;
  }

  get last(): FurcState {
    return this.history[this.history.length - 1] ?? computeFurc(this.params, this.rho, this.time);
  }
}
