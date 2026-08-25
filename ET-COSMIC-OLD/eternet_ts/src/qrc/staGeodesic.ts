/**
 * Geodésica STA sin² — Sistema 2 (emulador clássico QRC).
 */

export type SafetyState = "normal" | "anderson_cage";

export interface StaGeodesicResult {
  distance: number;
  scale: number;
  sin2: number;
  effectiveCost: number;
  usedLut: boolean;
}

export interface LiebRobinsonResult {
  vLR: number;
  spreadRate: number;
  violated: boolean;
  safetyState: SafetyState;
}

export function staSin2Geodesic(distance: number, scale = 1.0): number {
  if (scale <= 0) throw new Error("scale > 0");
  const d = Math.max(0, distance);
  const theta = Math.min(Math.PI, (d / scale) * (Math.PI / 2));
  const s = Math.sin(theta);
  return s * s;
}

export function liebRobinsonLimit(J: number): number {
  return 2 * J;
}

export function evaluateLiebRobinson(spreadRate: number, J = 1.0): LiebRobinsonResult {
  const vLR = liebRobinsonLimit(J);
  const violated = spreadRate > vLR;
  return {
    vLR,
    spreadRate,
    violated,
    safetyState: violated ? "anderson_cage" : "normal",
  };
}

/** Distância efectiva shard → índice + hash commitment (determinístico). */
export function estimateShardDistance(shardIndex: number, commitment: string): number {
  let h = 0;
  for (let i = 0; i < commitment.length; i++) {
    h = (h * 31 + commitment.charCodeAt(i)) >>> 0;
  }
  const norm = (h % 1000) / 1000;
  return 0.25 + shardIndex * 0.35 + norm * 2.5;
}

/** Taxa de spread proxy a partir do índice e sin². */
export function estimateSpreadRate(shardIndex: number, sin2: number): number {
  return Math.abs(sin2 - 0.5) * (shardIndex + 1) * 1.2;
}
