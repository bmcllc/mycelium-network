/**
 * Motor de entropia ETERNET — Bruno Theory + LUSUS + CSPRNG (sem fingir QRNG).
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { runBrunoTheorySimulation } from "../theory/brunoTheoryEngine";
import { fetchChaosBell } from "../lib/lususClient";
import type { QuantumEntropy } from "../crypto/quantumBridge";
import { getEternetEngineMode } from "./config";
import { ETERNET_DISCLAIMER, type EternetEntropyResult } from "./types";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function frameDigest(seed: string, resolution: number): Uint8Array {
  const sim = runBrunoTheorySimulation({ seed, resolution, steps: 16 });
  const payload = JSON.stringify({
    v: sim.version,
    furc: sim.frame.furc.E,
    hmco: sim.frame.hmco.Phi,
    dtu: sim.frame.simulation?.dtuCoherence,
    rcp: sim.frame.simulation?.rcpFinalEnergy,
    collapse: sim.frame.collapse.Df,
  });
  return sha3_512(new TextEncoder().encode(payload));
}

export async function generateEternetEntropy(bits = 256): Promise<EternetEntropyResult> {
  const mode = getEternetEngineMode();
  const nBytes = Math.max(8, Math.ceil(bits / 8));
  const sources: string[] = [];
  const chunks: Uint8Array[] = [];

  const seedBase = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  chunks.push(crypto.getRandomValues(new Uint8Array(32)));
  sources.push("device_csprng");

  if (mode === "hybrid" || mode === "bruno") {
    const digest = frameDigest(`eternet:${seedBase}`, 64);
    chunks.push(digest);
    sources.push("bruno_theory");
  }

  if (mode === "hybrid" || mode === "lusus") {
    try {
      const bell = await fetchChaosBell(
        parseInt(seedBase.slice(0, 8), 16) % 10000,
      );
      const bellHex = sha3_256(
        new TextEncoder().encode(
          `${bell.correlation}:${bell.simulatedS}:${Date.now()}`,
        ),
      );
      chunks.push(bellHex);
      sources.push("lusus_chaos_bell");
    } catch {
      /* LUSUS offline — continua com Bruno + CSPRNG */
    }
  }

  const ikm = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) {
    ikm.set(c, off);
    off += c.length;
  }

  const info = new TextEncoder().encode(`etrnet/eternet/entropy/v1:${mode}`);
  const material = hkdf(sha3_512, ikm, undefined, info, nBytes);
  const entropy_hex = bytesToHex(material);
  const hash = sha3_256(material);

  let brunoMeta: EternetEntropyResult["bruno"];
  let lususMeta: EternetEntropyResult["lusus"];

  if (sources.includes("bruno_theory")) {
    const sim = runBrunoTheorySimulation({ seed: `eternet:${seedBase}`, resolution: 48, steps: 8 });
    const dtu = sim.frame.simulation?.dtuCoherence;
    const rcp = sim.frame.simulation?.rcpFinalEnergy;
    brunoMeta = {
      version: sim.version,
      resolution: sim.resolution,
      ...(dtu !== undefined ? { dtuCoherence: dtu } : {}),
      ...(rcp !== undefined ? { rcpFinalEnergy: rcp } : {}),
    };
  }

  if (sources.includes("lusus_chaos_bell")) {
    try {
      const bell = await fetchChaosBell(parseInt(seedBase.slice(0, 8), 16) % 10000);
      const s = (bell as { chaos?: { S?: number } }).chaos?.S;
      lususMeta = {
        correlation: bell.correlation,
        ...(s !== undefined ? { simulatedS: s } : {}),
      };
    } catch {
      /* ignore */
    }
  }

  const method: EternetEntropyResult["method"] =
    mode === "bruno"
      ? "bruno_theory_frame"
      : mode === "lusus"
        ? "lusus_chaos_bell"
        : "eternet_hybrid";

  return {
    entropy_hex,
    sha3_256: bytesToHex(hash),
    bits,
    source: "eternet",
    sources,
    n_measurements: sources.length,
    method,
    simulation: true,
    quantum_verified: false,
    ...(brunoMeta ? { bruno: brunoMeta } : {}),
    ...(lususMeta ? { lusus: lususMeta } : {}),
    disclaimer: ETERNET_DISCLAIMER,
  };
}

/** Adapta resultado ETERNET ao tipo legado QuantumEntropy (GhostID, PMU). */
export function eternetToQuantumEntropy(e: EternetEntropyResult): QuantumEntropy {
  const chsh = e.lusus?.simulatedS;
  return {
    entropy_hex: e.entropy_hex,
    sha3_256: e.sha3_256,
    bits: e.bits,
    source: e.source,
    sources: e.sources,
    n_measurements: e.n_measurements,
    method: e.method,
    simulation: true,
    quantum_verified: false,
    pmu_domain: "eternet:bruno+lusus",
    ...(chsh !== undefined
      ? {
          chsh_audit: {
            S_value: chsh,
            chsh_violated: false as const,
            method: "lusus_chaos_classical",
          },
        }
      : {}),
  };
}
