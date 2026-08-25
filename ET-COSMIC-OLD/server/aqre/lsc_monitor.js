/**
 * AQRE LSC Monitor — guardião das três leis; recusa com 429 se exceder limites.
 */

import { evaluateLsc } from "./lscCore.js";

const readings = [];
const MAX_READINGS = 500;

export function recordLscReading(args) {
  const result = evaluateLsc({
    cEpsilon: args.C_epsilon ?? args.cEpsilon ?? 0,
    pCurrent: args.P_current ?? args.pCurrent ?? 0,
    eta: args.eta,
    rho: args.rho,
    E: args.E,
    A: args.A,
    v: args.v,
    k0: args.k0,
    rThermal: args.r_thermal ?? args.rThermal,
  });
  const reading = {
    timestamp: args.timestamp ?? Date.now(),
    ...result,
    message: result.allowed
      ? null
      : `LSC: ${result.overPower ? "P > P_max" : ""}${result.overPower && result.overCoherence ? " + " : ""}${result.overCoherence ? "Cε > 0.86" : ""}`.trim(),
  };
  readings.push(reading);
  if (readings.length > MAX_READINGS) readings.shift();
  return reading;
}

export function lscGuardMiddleware(req, res, next) {
  const c = parseFloat(req.headers["x-lsc-c-epsilon"] ?? req.query.cEpsilon ?? "0");
  const p = parseFloat(req.headers["x-lsc-p-current"] ?? req.query.pCurrent ?? "0");
  const reading = recordLscReading({ cEpsilon: c, pCurrent: p });
  res.setHeader("X-LSC-Status", reading.status);
  res.setHeader("X-LSC-P-Max", String(reading.P_max));
  res.setHeader("X-LSC-G", String(reading.G));
  res.setHeader("X-LSC-K-Eff", String(reading.K_eff));
  if (!reading.allowed) {
    return res.status(429).json({
      error: "LSC_LIMIT_EXCEEDED",
      disclaimer: "Emulador clássico AQRE — limites fenomenológicos, não hardware quântico.",
      reading,
    });
  }
  req.lscReading = reading;
  next();
}

export function getLscHistory(limit = 50) {
  return readings.slice(-limit);
}
