/**
 * AQRE — núcleo LSC (Leis 1–3) compartilhado.
 * Simulação clássica; nunca alega computação quântica real.
 */

const C = 299_792_458; // m/s

export function gSaturation(cEpsilon, mu = 0.001, beta = 8) {
  const c = Math.max(0, Math.min(0.9999, cEpsilon));
  return 1 / ((1 - c) + mu * Math.exp(beta * c));
}

export function kEffective(cEpsilon, k0 = 1, rThermal = 0.05) {
  const c = Math.max(0, Math.min(1, cEpsilon));
  return k0 * (1 - c) + rThermal;
}

/** Lei 1: P_max = η ρ E A v³ / c² */
export function pMaxReorganizational(eta, rho, E, A, v) {
  return (eta * rho * E * A * Math.pow(v, 3)) / (C * C);
}

export function evaluateLsc({
  cEpsilon,
  pCurrent,
  eta = 0.9,
  rho = 1,
  E = 1,
  A = 1,
  v = 1,
  k0 = 1,
  rThermal = 0.05,
  /** Escala normalizada 0–1 para o emulador (Lei 1 física em `pMaxSI`). */
  normalized = true,
}) {
  const c = Math.max(0, Math.min(1, cEpsilon));
  const G = gSaturation(c);
  const K_eff = kEffective(c, k0, rThermal);
  const pMaxSI = pMaxReorganizational(eta, rho, E, A, v);
  const P_max = normalized ? 1.0 : pMaxSI;
  const P = Math.max(0, normalized ? Math.min(2, pCurrent) : pCurrent);
  const overPower = P > P_max;
  const overCoherence = c > 0.86;
  const allowed = !overPower && !overCoherence;
  let status = "NORMAL";
  if (overPower || overCoherence) status = "CRITICAL";
  else if (c > 0.7) status = "WARNING";
  return {
    cEpsilon: c,
    P,
    P_max,
    P_max_SI: pMaxSI,
    G,
    K_eff,
    allowed,
    status,
    overPower,
    overCoherence,
    scale: normalized ? "normalized_0_1" : "si",
  };
}
