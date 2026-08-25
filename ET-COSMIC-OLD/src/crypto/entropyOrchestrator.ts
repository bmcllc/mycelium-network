/**
 * PMU Entropy Orchestrator — CQR + ANU + Paleocomputação (Ω)
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import type { QuantumEntropy } from "./quantumBridge";
import { generateImcEntropyForGhost } from "../imc/imcEntropy";
import { isImcV2Build } from "../b2b/imcInfrastructure";
import {
  bindEntropyWithPaleoFossil,
  type EntropyFossilRecord,
} from "../paleo/paleoEntropyFossil";
import { isEternetEntropyEnabled } from "../eternet/config";
import { generateEternetEntropy, eternetToQuantumEntropy } from "../eternet/entropy";

export type EntropyTier =
  | "imc_eaas"
  | "eternet_hybrid"
  | "omega"
  | "hybrid"
  | "cqr_only"
  | "anu_only"
  | "degraded"
  | "degraded_simulated";

export interface HybridEntropyResult {
  material: Uint8Array;
  sha3_256: string;
  tier: EntropyTier;
  sources: string[];
  quantumVerified: boolean;
  simulation: boolean;
  chshViolated: boolean | null;
  cqr: QuantumEntropy | null;
  anuBytes: Uint8Array | null;
  paleoFossil: EntropyFossilRecord | null;
}

const ANU_PROXY = "/qrng-anu/API/jsonI.php";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function fetchAnuEntropyBytes(nBytes: number): Promise<Uint8Array | null> {
  const length = Math.max(1, Math.min(nBytes, 1024));
  const url = `${ANU_PROXY}?length=${length}&type=uint8`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: number[] };
    if (!json.success || !json.data?.length) return null;
    return new Uint8Array(json.data.slice(0, length));
  } catch {
    return null;
  }
}

function expandHybridMaterial(cqr: Uint8Array, anu: Uint8Array | null, outLen: number): Uint8Array {
  const ikm = anu ? new Uint8Array(cqr.length + anu.length) : new Uint8Array(cqr);
  if (anu) {
    ikm.set(cqr);
    ikm.set(anu, cqr.length);
  } else {
    ikm.set(cqr);
  }
  const info = new TextEncoder().encode(
    anu ? "etrnet/pmu/hybrid/client/cqr+anu/v1" : "etrnet/pmu/hybrid/client/cqr/v1",
  );
  return hkdf(sha3_512, ikm, undefined, info, outLen);
}

function buildResult(
  material: Uint8Array,
  cqrEnt: QuantumEntropy | null,
  anuDirect: Uint8Array | null,
  paleoFossil: EntropyFossilRecord | null,
  tier: EntropyTier,
): HybridEntropyResult {
  const hash = sha3_256(material);
  const sources: string[] = [];
  if (cqrEnt?.sources?.length) sources.push(...cqrEnt.sources);
  else if (cqrEnt) sources.push(cqrEnt.source);
  else sources.push("cqr_fallback");
  if (anuDirect) sources.push("anu_vacuum_client");
  if (paleoFossil) sources.push("paleo_fossil");

  const quantumVerified =
    Boolean(cqrEnt?.quantum_verified) || anuDirect !== null || Boolean(paleoFossil?.verified);

  return {
    material,
    sha3_256: Array.from(hash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    tier,
    sources: [...new Set(sources)],
    quantumVerified,
    simulation: !quantumVerified,
    chshViolated: cqrEnt?.chsh_audit?.chsh_violated ?? null,
    cqr: cqrEnt,
    anuBytes: anuDirect,
    paleoFossil,
  };
}

function isEternetMaterial(cqr: QuantumEntropy | null): boolean {
  if (!cqr) return false;
  return (
    cqr.source === "eternet" ||
    cqr.method === "eternet_hybrid" ||
    cqr.method === "bruno_theory_frame" ||
    cqr.method === "lusus_chaos_bell" ||
    cqr.method === "imc_sensor_mesh"
  );
}

/** Híbrido IMC EaaS + ANU (v3) ou ETERNET híbrido (Bruno+LUSUS+device). */
export async function fetchHybridEntropy(bits = 512): Promise<HybridEntropyResult> {
  const needBytes = Math.max(bits / 8, 64);
  const cqrEnt = isImcV2Build()
    ? await generateImcEntropyForGhost(bits)
    : isEternetEntropyEnabled()
      ? eternetToQuantumEntropy(await generateEternetEntropy(bits))
      : await (async () => {
          const { generateQuantumEntropyWithFallback } = await import("./quantumBridge");
          return generateQuantumEntropyWithFallback(bits, 3);
        })();
  const anuDirect = await fetchAnuEntropyBytes(needBytes);

  const cqrMaterial = hexToBytes(cqrEnt.entropy_hex);
  const material = expandHybridMaterial(cqrMaterial, anuDirect, needBytes);
  let tier: EntropyTier = isImcV2Build() ? "imc_eaas" : cqrEnt.simulation ? "degraded_simulated" : "degraded";
  if (isImcV2Build() && anuDirect) tier = "imc_eaas";
  else if (isEternetMaterial(cqrEnt)) tier = "eternet_hybrid";
  else if (anuDirect && cqrEnt && !cqrEnt.simulation) tier = "hybrid";
  else if (anuDirect) tier = "anu_only";
  else if (cqrEnt && !cqrEnt.simulation) tier = "cqr_only";

  return buildResult(material, cqrEnt, anuDirect, null, tier);
}

/**
 * PMU Ω — servidor v4 (CQR+ANU+paleo) + reforço cliente ANU + fossilização paleo local.
 */
export async function fetchOmegaEntropy(bits = 512): Promise<HybridEntropyResult> {
  const needBytes = Math.max(bits / 8, 64);

  const omegaEnt = isImcV2Build()
    ? await generateImcEntropyForGhost(bits)
    : await (async () => {
        const { generateQuantumEntropyWithFallback } = await import("./quantumBridge");
        return generateQuantumEntropyWithFallback(bits, 4);
      })();
  const anuDirect = await fetchAnuEntropyBytes(needBytes);

  let baseMaterial = hexToBytes(omegaEnt.entropy_hex);
  if (omegaEnt.simulation) {
    const hybrid = await fetchHybridEntropy(bits);
    baseMaterial = hybrid.material;
  }

  if (anuDirect) {
    baseMaterial = expandHybridMaterial(baseMaterial, anuDirect, needBytes);
  }

  const { material, fossil } = await bindEntropyWithPaleoFossil(baseMaterial);

  const tier: EntropyTier = omegaEnt.simulation ? "degraded_simulated" : "omega";
  return buildResult(material, omegaEnt, anuDirect, fossil, tier);
}

export async function deriveHybridSeed(domain: string, length: number): Promise<Uint8Array> {
  const omega = await fetchOmegaEntropy(512);
  const info = new TextEncoder().encode(`etrnet/pqc/${domain}`);
  return hkdf(sha3_512, omega.material, undefined, info, length);
}

export async function deriveOmegaSeed(domain: string, length: number): Promise<Uint8Array> {
  return deriveHybridSeed(domain, length);
}
