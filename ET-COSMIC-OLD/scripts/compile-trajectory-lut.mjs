#!/usr/bin/env node
/** Regenera src/qrc/trajectoryLut.generated.ts a partir de core/motor_qrc */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = spawnSync("python3", ["-m", "core.motor_qrc.trajectory_compiler"], {
  cwd: root,
  encoding: "utf8",
});
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}

const jsonPath = join(root, "core/motor_qrc/trajectory_lut.json");
const { readFileSync } = await import("node:fs");
const data = JSON.parse(readFileSync(jsonPath, "utf8"));

const entries = Object.entries(data.entries)
  .map(([k, v]) => `  "${k}": { distance: ${v.distance}, sin2: ${v.sin2}, cost: ${v.cost} },`)
  .join("\n");

const ts = `/**
 * LUT gerada por core/motor_qrc/trajectory_compiler.py
 * npm run qrc:compile-lut
 */
import type { StaGeodesicResult } from "./staGeodesic";
import { staSin2Geodesic } from "./staGeodesic";

export const TRAJECTORY_LUT_SCALE = ${data.scale};

export const TRAJECTORY_LUT: Record<
  string,
  { distance: number; sin2: number; cost: number }
> = {
${entries}
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
`;

const out = join(root, "src/qrc/trajectoryLut.generated.ts");
writeFileSync(out, ts);
writeFileSync(join(root, "eternet_ts/src/qrc/trajectoryLut.generated.ts"), ts);
console.log("[qrc] LUT → src/qrc/trajectoryLut.generated.ts");
