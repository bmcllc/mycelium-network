/**
 * Backend partilhado — entropia Ω real (CQR/dispositivo) para painéis que antes usavam mocks.
 */

import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { collapseFinanceManager } from "../crypto/collapseFinance";
import { architectEyeScale } from "../theory/collapseEngineering";
import type {
  CoherenceBond,
  CollateralizedCollapseBond,
  HysteresisVault,
  ScarToken,
} from "../crypto/collapseFinance";
import { fetchOmegaEntropy, type EntropyTier } from "../crypto/entropyOrchestrator";
import type { QuantumCausalGraph, QCGEdge, QCGNode } from "../lsc/lscEngine";
import {
  fossilizeEntropyStructure,
  fossilizeEntropyToAnchorFast,
} from "../paleo/paleoEntropyFossil";
import type { ArchaeologicalVector, CoherenceSheaf } from "../paleo/anacroclastia";
import type { ParasiticHost } from "../crypto/supplyChain";

export interface ModuleRealityMeta {
  tier: EntropyTier;
  quantumVerified: boolean;
  sha3Prefix: string;
}

function byteAt(material: Uint8Array, i: number): number {
  return material[i % material.length] ?? 0;
}

export function unit(material: Uint8Array, i: number): number {
  return byteAt(material, i) / 255;
}

/** Estado de mercado MPS derivado de entropia Ω (Singularity / QRC). */
export function marketStateFromMaterial(
  material: Uint8Array,
  assetCount = 3,
): { prices: Float64Array; volumes: Float64Array; volatilities: Float64Array; timestamp: number } {
  const n = Math.min(assetCount, 8);
  return {
    prices: Float64Array.from({ length: n }, (_, i) => unit(material, i)),
    volumes: Float64Array.from({ length: n }, (_, i) => unit(material, i + 8)),
    volatilities: Float64Array.from({ length: n }, (_, i) => 0.05 + unit(material, i + 16) * 0.2),
    timestamp: Date.now(),
  };
}

/** Material determinístico offline (SHA3) — fallback honesto sem Math.random. */
export function offlineMaterialFromSeed(seed: string, len = 64): Uint8Array {
  const out = new Uint8Array(len);
  let digest = sha3_256(new TextEncoder().encode(seed));
  for (let i = 0; i < len; i++) {
    if (i > 0 && i % 32 === 0) {
      digest = sha3_256(new Uint8Array([...digest, i & 0xff]));
    }
    out[i] = digest[i % digest.length]!;
  }
  return out;
}

/** Carrega entropia Ω (motor CQR no dispositivo ou remoto; fallback CSPRNG rotulado). */
export async function loadOmegaMaterial(bits = 256): Promise<{
  material: Uint8Array;
  meta: ModuleRealityMeta;
}> {
  const omega = await fetchOmegaEntropy(bits);
  const material =
    omega.material.length > 0
      ? omega.material
      : new Uint8Array(sha3_256(new TextEncoder().encode(omega.sha3_256)));
  return {
    material,
    meta: {
      tier: omega.tier,
      quantumVerified: omega.quantumVerified,
      sha3Prefix: omega.sha3_256.slice(0, 16),
    },
  };
}

/** QCG derivado deterministicamente da entropia (LSC). */
export function buildQCGFromMaterial(material: Uint8Array, nodeCount = 8): QuantumCausalGraph {
  const nodes: QCGNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node_${i}`,
    E_tau: unit(material, i) * 5 + 1,
    coherencePhase: unit(material, i + 8) * Math.PI * 2,
    vibrationalModes: [
      Math.floor(unit(material, i + 16) * 5),
      Math.floor(unit(material, i + 24) * 5) + 5,
    ],
  }));
  const edges: QCGEdge[] = Array.from({ length: nodeCount + 2 }, (_, i) => ({
    from: `node_${i % nodeCount}`,
    to: `node_${(i + 1) % nodeCount}`,
    causalStrength: unit(material, i + 32) * 0.8 + 0.2,
  }));
  return { nodes, edges };
}

/** Instrumentos de colapso ancorados em entropia. */
export function seedCollapseFinanceFromMaterial(material: Uint8Array): {
  ccb: CollateralizedCollapseBond;
  hsv: HysteresisVault;
  bonds: CoherenceBond[];
  scars: ScarToken[];
} {
  const W = -1 + unit(material, 41) * 2;
  const omega = architectEyeScale(4, W);
  const stress = Math.min(1, unit(material, 0) * (0.7 + omega * 0.05));
  const coherence = unit(material, 1);
  const ccb = collapseFinanceManager.createCCB(
    0.03 + unit(material, 2) * 0.04,
    stress,
    5000 + Math.floor(unit(material, 3) * 15000),
    365 * 86400000,
  );
  ccb.klDivergence = stress * 0.4;
  const hsv = collapseFinanceManager.createHSV(
    3000 + Math.floor(unit(material, 4) * 7000),
    0.05 + unit(material, 5) * 0.1,
  );
  hsv.hysteresisState = 0.5 + unit(material, 6) * 0.4;
  const bonds = [0, 1, 2].map((i) =>
    collapseFinanceManager.createCoherenceBond(
      0.03,
      coherence * (0.5 + unit(material, 10 + i) * 0.5),
      5000,
      180 * 86400000,
    ),
  );
  const scars = [0, 1, 2].map((i) =>
    collapseFinanceManager.createScarToken(
      [
        unit(material, 20 + i * 3),
        unit(material, 21 + i * 3),
        unit(material, 22 + i * 3),
      ],
      50 + Math.floor(unit(material, 30 + i) * 200),
    ),
  );
  return { ccb, hsv, bonds, scars };
}

/** Artefactos paleo + sheaf a partir de fóssil real. */
export function buildAnacroclastiaFromMaterial(material: Uint8Array): {
  artifacts: ArchaeologicalVector[];
  sheaf: CoherenceSheaf;
  fossilHashes: { type: string; hash: string }[];
} {
  const { record } = fossilizeEntropyToAnchorFast(material);
  const { fossilMatrix } = fossilizeEntropyStructure(material);
  const flat = fossilMatrix.flat();
  const artifacts: ArchaeologicalVector[] = [0, 1, 2, 3, 4].map((i) => ({
    id: `art_${record.skeletonId}_${i}`,
    omega: new Map([
      ["cfg", flat[i * 3] ?? 0.5],
      ["ssa", flat[i * 3 + 1] ?? 0.5],
      ["stack", flat[i * 3 + 2] ?? 0.5],
    ]),
  }));
  const sections = new Map<string, number[]>();
  for (let i = 0; i < 3; i++) {
    sections.set(`cfg_node_${i}`, flat.slice(i * 3, i * 3 + 3));
  }
  const sheaf: CoherenceSheaf = {
    sections,
    obstruction: unit(material, 40) * 0.3,
  };
  const fossilHashes = record.invariants.map((inv, i) => ({
    type: ["CFG", "SSA", "STACK_MORPHOLOGY"][i] ?? "FOSSIL",
    hash: inv.hash.slice(0, 18) + "…",
  }));
  return { artifacts, sheaf, fossilHashes };
}

/** Monitor + justice tx derivados de commitment (não bytes aleatórios soltos). */
export function deriveWatchtowerPayloads(
  channelId: string,
  commitmentTxid: string,
  fundingOutpoint: string,
): { monitor: Uint8Array; justice: Uint8Array } {
  const seed = new TextEncoder().encode(`${channelId}:${commitmentTxid}:${fundingOutpoint}`);
  const monitor = sha3_256(new Uint8Array([...seed, ...new TextEncoder().encode(":monitor")]));
  const justice = sha3_512(new Uint8Array([...monitor, ...new TextEncoder().encode(":justice")]));
  return { monitor, justice };
}

/** Hash de colapso QRC ancorado em entropia. */
export function collapseHashFromMaterial(material: Uint8Array, stress: number): string {
  return Array.from(
    sha3_256(new TextEncoder().encode(`qrc-collapse:${stress}:${Array.from(material.slice(0, 16)).join(",")}`)),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/** Preço base derivado de entropia (oráculo Nostr — sem Math.random). */
export function oracleBasePriceFromMaterial(
  material: Uint8Array,
  pair: string,
): number {
  const defaults: Record<string, number> = {
    "ETR/BRL": 42.5,
    "ETR/XMR": 0.018,
    "ETR/USD": 0.85,
  };
  const base = defaults[pair.toUpperCase()] ?? 1;
  const jitter = (unit(material, 0) - 0.5) * 0.08 * base;
  return Math.max(0.0001, base + jitter);
}

/** Array de floats em [-scale, scale] derivado de Ω. */
export function floatArrayFromMaterial(
  material: Uint8Array,
  length: number,
  scale = 1,
  offset = 0,
): number[] {
  return Array.from({ length }, (_, i) => (unit(material, offset + i) - 0.5) * 2 * scale);
}

/** Ponto 3D em [-1, 1]³. */
export function point3FromMaterial(material: Uint8Array, index: number): [number, number, number] {
  return [
    unit(material, index) * 2 - 1,
    unit(material, index + 1) * 2 - 1,
    unit(material, index + 2) * 2 - 1,
  ];
}

export function deriveHexId(material: Uint8Array, label: string, index = 0, len = 8): string {
  return Array.from(
    sha3_256(new TextEncoder().encode(`${label}:${index}:${Array.from(material.slice(0, 24)).join(",")}`)),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, len);
}

/** Assinatura HCN 64B para mint karma. */
export function hcnSignatureFromMaterial(material: Uint8Array): Uint8Array {
  const a = sha3_256(material);
  const b = sha3_256(new Uint8Array([...a, ...new TextEncoder().encode("hcn:karma")]));
  return new Uint8Array([...a, ...b]);
}

/** Host parasita derivado de entropia (supply chain real). */
export function parasiteHostFromMaterial(material: Uint8Array, index: number): ParasiticHost {
  const h = deriveHexId(material, "parasite", index, 12);
  return {
    hostName: `host_${h}`,
    hostVersion: `${(unit(material, index) * 5 + 1).toFixed(1)}.0`,
    parasiteName: `void-${h}`,
    parasiteHash: deriveHexId(material, "phash", index, 16),
    hostIntegrity: unit(material, index + 3) > 0.7 ? "COMPROMISED" : "UNVERIFIED",
    resourceUsage: unit(material, index + 4) * 10,
    isDetected: unit(material, index + 5) > 0.8,
    killSwitch: false,
    symbiosisScore: Math.floor(unit(material, index + 6) * 40) + 50,
  };
}

/** Chaves hex para governança demo (DAO) ancoradas em Ω. */
export function governanceKeysFromMaterial(material: Uint8Array): [string, string, string] {
  return [
    deriveHexId(material, "gov1", 0, 8),
    deriveHexId(material, "gov2", 1, 8),
    deriveHexId(material, "gov3", 2, 8),
  ];
}

/** Provas inválidas determinísticas (teste anti-Sybil — rejeição esperada). */
export function sybilInvalidProofs(
  material: Uint8Array,
  commitment: string,
  difficulty: number,
  botIndex: number,
): {
  pow: {
    nonce: number;
    hash: string;
    difficulty: number;
    timestamp: number;
    iterations: number;
    elapsedMs: number;
  };
  vdf: {
    input: string;
    result: string;
    iterations: number;
    elapsedMs: number;
    challenge: string;
  };
} {
  const bad = deriveHexId(material, `sybil:${commitment}`, botIndex, 16);
  return {
    pow: {
      nonce: byteAt(material, botIndex),
      hash: bad.slice(0, 8),
      difficulty,
      timestamp: Date.now(),
      iterations: 1,
      elapsedMs: 1,
    },
    vdf: {
      input: commitment,
      result: bad.slice(8, 16),
      iterations: 1000,
      elapsedMs: 1,
      challenge: deriveHexId(material, "chal", botIndex, 8),
    },
  };
}

/** Tick de preço oracle temporal. */
export function priceTickFromMaterial(
  material: Uint8Array,
  prev: number,
  volatilityPct: number,
  tick: number,
): number {
  const change = prev * (volatilityPct / 100) * (unit(material, tick) * 2 - 1);
  return Math.max(100, +(prev + change).toFixed(2));
}

/** Seed numérico LUSUS (chaos bell, etc.). */
export function lususSeedFromMaterial(material: Uint8Array): number {
  return byteAt(material, 0) + byteAt(material, 1) * 256;
}

/** Coeficientes espectrais HGPU (64). */
export function spectralCoeffsFromMaterial(material: Uint8Array): Float32Array {
  const coeffs = new Float32Array(64);
  for (let j = 0; j < 64; j++) {
    coeffs[j] = (unit(material, j) - 0.5) * Math.exp(-j / 10);
  }
  return coeffs;
}
