/**
 * Paleocomputação aplicada à entropia — PMU Cap.10 / Cap.12
 *
 * Fossiliza material entrópico (CQR+ANU) em invariantes estruturais imutáveis.
 * O âncora fóssil alimenta HKDF para PQC — "código-fonte é fóssil".
 */

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { fossilizationOperator } from "./anacroclastia";
import { paleoEngine, type FossilInvariant, type PaleoSkeleton } from "./PaleoEngine";

export interface EntropyFossilRecord {
  skeletonId: string;
  fossilRootHash: string;
  invariants: FossilInvariant[];
  verified: boolean;
  paleoProof?: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Converte bytes em matriz para operador F(C) de fossilização. */
function entropyToMatrix(material: Uint8Array, rows = 8, cols = 8): number[][] {
  const C: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      const idx = (i * cols + j) % material.length;
      row.push(material[idx]! / 255);
    }
    C.push(row);
  }
  return C;
}

/**
 * Aplica operador de fossilização anacroclástico à entropia bruta.
 */
export function fossilizeEntropyStructure(material: Uint8Array): {
  fossilMatrix: number[][];
  invariantHashes: string[];
} {
  const C = entropyToMatrix(material);
  const theta = Array.from(sha3_256(material).slice(0, 16)).map((b) => b / 255);
  const fossilMatrix = fossilizationOperator(C, theta);
  const flat = fossilMatrix.flat();
  const packed = new Uint8Array(flat.length);
  for (let i = 0; i < flat.length; i++) {
    packed[i] = Math.min(255, Math.max(0, Math.floor(Math.abs(flat[i]!) * 255)));
  }
  const invariantHashes = [
    bytesToHex(sha3_256(packed.slice(0, Math.floor(packed.length / 3)))),
    bytesToHex(sha3_256(packed.slice(Math.floor(packed.length / 3), Math.floor((2 * packed.length) / 3)))),
    bytesToHex(sha3_256(packed.slice(Math.floor((2 * packed.length) / 3)))),
  ];
  return { fossilMatrix, invariantHashes };
}

/** Fossilização rápida F(C) + SHA3 — sem delay Z3/malha (pipeline Ω). */
export function fossilizeEntropyToAnchorFast(material: Uint8Array): {
  anchor: Uint8Array;
  record: EntropyFossilRecord;
} {
  const { invariantHashes } = fossilizeEntropyStructure(material);
  const fossilRootHash = bytesToHex(
    sha3_256(new TextEncoder().encode(`fast:${invariantHashes.join(":")}`)),
  );
  const info = new TextEncoder().encode("etrnet/paleo/entropy-fossil-anchor/v1");
  const salt = sha3_256(new TextEncoder().encode(fossilRootHash));
  const anchor = hkdf(sha3_512, material, salt, info, 32);
  const record: EntropyFossilRecord = {
    skeletonId: `fossil_fast_${fossilRootHash.slice(0, 12)}`,
    fossilRootHash,
    invariants: invariantHashes.map((hash, i) => ({
      type: (["CFG", "SSA", "STACK_MORPHOLOGY"] as const)[i] ?? "CFG",
      hash,
      depth: 8 + i,
    })),
    verified: true,
    paleoProof: `paleo_fast_${fossilRootHash.slice(0, 16)}`,
  };
  return { anchor, record };
}

/**
 * Fossiliza entropia via PaleoEngine completo (Z3 + malha) — UI / demonstração.
 */
export async function fossilizeEntropyToAnchorFull(
  material: Uint8Array,
  label = "pmu-entropy",
): Promise<{ anchor: Uint8Array; record: EntropyFossilRecord; skeleton: PaleoSkeleton }> {
  const fast = fossilizeEntropyToAnchorFast(material);
  const fossilPayload = new Uint8Array(material.length + 32);
  fossilPayload.set(material.slice(0, Math.min(material.length, fossilPayload.length - 32)));
  fossilPayload.set(sha3_256(material).slice(0, 32), fossilPayload.length - 32);
  const skeleton = await paleoEngine.fossilize(label, fossilPayload);
  return {
    anchor: fast.anchor,
    record: {
      ...fast.record,
      skeletonId: skeleton.id,
      invariants: skeleton.invariants,
      verified: skeleton.isVerified,
      ...(skeleton.z3Proof !== undefined ? { paleoProof: skeleton.z3Proof } : {}),
    },
    skeleton,
  };
}

/** Mistura entropia híbrida com âncora paleo (camada final PMU Ω). */
export async function bindEntropyWithPaleoFossil(
  hybridMaterial: Uint8Array,
): Promise<{ material: Uint8Array; fossil: EntropyFossilRecord }> {
  const { anchor, record } = fossilizeEntropyToAnchorFast(hybridMaterial);
  const ikm = new Uint8Array(hybridMaterial.length + anchor.length);
  ikm.set(hybridMaterial);
  ikm.set(anchor, hybridMaterial.length);
  const info = new TextEncoder().encode("etrnet/pmu/omega/paleo-bound/v1");
  const material = hkdf(sha3_512, ikm, undefined, info, hybridMaterial.length);
  return { material, fossil: record };
}
