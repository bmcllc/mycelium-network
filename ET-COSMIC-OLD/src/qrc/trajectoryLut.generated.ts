/**
 * LUT gerada por core/motor_qrc/trajectory_compiler.py
 * npm run qrc:compile-lut
 */
import type { StaGeodesicResult } from "./staGeodesic";
import { staSin2Geodesic } from "./staGeodesic";

export const TRAJECTORY_LUT_SCALE = 1;

export const TRAJECTORY_LUT: Record<
  string,
  { distance: number; sin2: number; cost: number }
> = {
  "0.1000": { distance: 0.1, sin2: 0.024471741852423214, cost: 0.0024471741852423214 },
  "0.2500": { distance: 0.25, sin2: 0.14644660940672624, cost: 0.03661165235168156 },
  "0.5000": { distance: 0.5, sin2: 0.4999999999999999, cost: 0.24999999999999994 },
  "1.0000": { distance: 1, sin2: 1, cost: 1 },
  "1.5000": { distance: 1.5, sin2: 0.5000000000000001, cost: 0.7500000000000002 },
  "2.0000": { distance: 2, sin2: 1.4997597826618576e-32, cost: 2.999519565323715e-32 },
  "3.0000": { distance: 3, sin2: 1.4997597826618576e-32, cost: 4.499279347985573e-32 },
  "5.0000": { distance: 5, sin2: 1.4997597826618576e-32, cost: 7.498798913309288e-32 },
  "8.0000": { distance: 8, sin2: 1.4997597826618576e-32, cost: 1.199807826129486e-31 },
  "10.0000": { distance: 10, sin2: 1.4997597826618576e-32, cost: 1.4997597826618576e-31 },
};

const LUT_TOLERANCE = 0.05;

export function lookupTrajectoryLut(distance: number): StaGeodesicResult | null {
  for (const entry of Object.values(TRAJECTORY_LUT)) {
    if (Math.abs(entry.distance - distance) <= LUT_TOLERANCE) {
      return {
        distance: entry.distance,
        scale: TRAJECTORY_LUT_SCALE,
        sin2: entry.sin2,
        effectiveCost: entry.cost,
        usedLut: true,
      };
    }
  }
  return null;
}

export function resolveStaGeodesic(distance: number, scale = TRAJECTORY_LUT_SCALE): StaGeodesicResult {
  const hit = lookupTrajectoryLut(distance);
  if (hit) return hit;
  const sin2 = staSin2Geodesic(distance, scale);
  return {
    distance,
    scale,
    sin2,
    effectiveCost: distance * sin2,
    usedLut: false,
  };
}
