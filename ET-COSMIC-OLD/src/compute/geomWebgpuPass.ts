/**
 * PMU geom_relativity — WebGPU compute real (4×256 workgroups).
 *
 * Combina PoH geométrico (hgpuCompute) com dispatch GPU (gpuMiner).
 * Ref: PMU §3.5 HGPU / §3.7.3 vHGPU terceirizada.
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { hgpuPoW } from "../crypto/hgpuCompute";
import { gpuMiner } from "../crypto/gpuMiner";

export interface GeomWebgpuPassResult {
  webgpuUsed: boolean;
  gpuDevice: "gpu" | "cpu";
  gpuIterations: number;
  geomIterations: number;
  spectralBands: number;
  coresUsed: number;
  topologyHash: string;
  hashPrefix: string;
  method: string;
}

/**
 * Frame geométrico com 4 cores lógicos × 1024 iterações GPU cada.
 */
export async function runGeomWebgpuPass(
  resolution = 64,
  cores = 4,
): Promise<GeomWebgpuPassResult> {
  const bands = Math.min(64, Math.max(16, resolution));
  const perCoreGpuIters = 1024;

  const gpuReady = await gpuMiner.init();
  const challengeHex = Array.from(sha3_256(new TextEncoder().encode(`pmu-geom:${Date.now()}`)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let gpuIterations = 0;
  let gpuDevice: "gpu" | "cpu" = "cpu";
  let hashPrefix = "00";

  if (gpuReady) {
    const mine = await gpuMiner.mine(
      { challenge: challengeHex.slice(0, 16), difficulty: 1, prefix: "geom" },
      perCoreGpuIters * cores,
    );
    gpuIterations = mine.iterations;
    gpuDevice = mine.device;
    hashPrefix = mine.hash.slice(0, 16);
  }

  const pow = hgpuPoW(Math.min(4, Math.max(1, resolution % 5)), 16 * cores);
  const topologyHash = Array.from(sha3_256(new TextEncoder().encode(`geom:${pow.hash}:${hashPrefix}`)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

  return {
    webgpuUsed: gpuReady && gpuDevice === "gpu",
    gpuDevice,
    gpuIterations,
    geomIterations: pow.iterations,
    spectralBands: bands,
    coresUsed: cores,
    topologyHash,
    hashPrefix,
    method: gpuReady ? "webgpu_spectral_poh" : "cpu_spectral_poh",
  };
}
