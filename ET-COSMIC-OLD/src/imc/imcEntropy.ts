/**
 * Entropia IMC v2 — VOID-521 + VOID-510 (substitui cadeia CQR para GhostID/PMU).
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha3_512 } from "@noble/hashes/sha3.js";
import { generateEternetEntropy, eternetToQuantumEntropy } from "../eternet/entropy";
import { collectSensorEntropy } from "./sensorEntropy";
import type { QuantumEntropy } from "../crypto/quantumBridge";
import { isImcV2Build } from "../b2b/imcInfrastructure";

const IMC_BASE = import.meta.env.VITE_IMC_API_URL ?? "/api/imc";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function fetchImcEntropyPackage(bits = 512, nodeId?: string): Promise<{
  entropy_hex: string;
  sha3_256: string;
  sources: string[];
  simulation: true;
  quantum_verified: false;
  sku: string;
}> {
  const id = nodeId ?? `node-${crypto.randomUUID().slice(0, 8)}`;
  let streams: Record<string, string> = {};
  try {
    streams = await collectSensorEntropy();
  } catch {
    streams = { device_hex: Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("") };
  }
  const res = await fetch(`${IMC_BASE}/entropy/service`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bits, nodeId: id, streams }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`IMC EaaS ${res.status}`);
  return res.json();
}

/** Prioridade: IMC EaaS → ETERNET → offline CSPRNG */
export async function generateImcEntropyForGhost(bits = 256): Promise<QuantumEntropy> {
  if (!isImcV2Build()) {
    const e = await generateEternetEntropy(bits);
    return eternetToQuantumEntropy(e);
  }
  try {
    const pack = await fetchImcEntropyPackage(bits);
    return {
      entropy_hex: pack.entropy_hex,
      sha3_256: pack.sha3_256,
      bits,
      source: "imc",
      sources: pack.sources ?? ["VOID-521", "VOID-510"],
      n_measurements: pack.sources?.length ?? 2,
      method: "imc_sensor_mesh",
      simulation: true,
      quantum_verified: false,
      pmu_domain: "imc:eaas",
    };
  } catch {
    const e = await generateEternetEntropy(bits);
    return eternetToQuantumEntropy(e);
  }
}

export async function deriveImcSeed(domain: string, length: number): Promise<Uint8Array> {
  const pack = await fetchImcEntropyPackage(512);
  const material = hexToBytes(pack.entropy_hex);
  const info = new TextEncoder().encode(`etrnet/imc/${domain}/v2`);
  return hkdf(sha3_512, material, undefined, info, length);
}
