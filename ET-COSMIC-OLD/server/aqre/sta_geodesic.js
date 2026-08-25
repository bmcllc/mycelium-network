/**
 * Geodésica STA sin² + LUT (server AQRE).
 */

import { andersonCollapseRoute, evaluateLiebRobinson } from "./lieb_robinson.js";

const DEFAULT_LUT = {
  0.1: { distance: 0.1, sin2: 0.006167968750000001, cost: 0.0006167968750000001 },
  0.25: { distance: 0.25, sin2: 0.03806023437500001, cost: 0.009515058593750002 },
  0.5: { distance: 0.5, sin2: 0.14644660940672622, cost: 0.07322330470336311 },
  1.0: { distance: 1.0, sin2: 0.5, cost: 0.5 },
  1.5: { distance: 1.5, sin2: 0.8535533905932737, cost: 1.2803300858899106 },
  2.0: { distance: 2.0, sin2: 1.0, cost: 2.0 },
  3.0: { distance: 3.0, sin2: 1.0, cost: 3.0 },
  5.0: { distance: 5.0, sin2: 1.0, cost: 5.0 },
  8.0: { distance: 8.0, sin2: 1.0, cost: 8.0 },
  10.0: { distance: 10.0, sin2: 1.0, cost: 10.0 },
};

export function staSin2Geodesic(distance, scale = 1.0) {
  const d = Math.max(0, Number(distance) || 0);
  const theta = Math.min(Math.PI, (d / scale) * (Math.PI / 2));
  const s = Math.sin(theta);
  return s * s;
}

export function lookupLut(distance, tolerance = 0.05) {
  for (const entry of Object.values(DEFAULT_LUT)) {
    if (Math.abs(entry.distance - distance) <= tolerance) {
      return { ...entry, usedLut: true };
    }
  }
  return null;
}

export function resolveStaGeodesic(distance, scale = 1.0) {
  const hit = lookupLut(distance);
  if (hit) return hit;
  const sin2 = staSin2Geodesic(distance, scale);
  return {
    distance,
    sin2,
    cost: distance * sin2,
    usedLut: false,
  };
}

export function planStaRoute(body = {}) {
  const distance = Number(body.distance ?? 1.0);
  const spreadRate = Number(body.spreadRate ?? 0);
  const J = Number(body.J ?? 1.0);
  const geodesic = resolveStaGeodesic(distance, Number(body.scale ?? 1.0));
  const liebRobinson = evaluateLiebRobinson(spreadRate, J);
  const collapsed = liebRobinson.safetyState === "anderson_cage";
  return {
    engine: "STAUmpire",
    geodesic,
    liebRobinson,
    ...(collapsed ? andersonCollapseRoute() : { safetyState: "normal" }),
  };
}
