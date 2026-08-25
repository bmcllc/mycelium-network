/**
 * CGF/DCC — Reticulado de consentimento (Protocolo de Malha Unificado §3.2)
 *
 * Teorema 3.2: exec(op) ⇒ consentimento_atual ⊒ consentimento_necessário(op)
 * (nível numérico do usuário deve ser ≥ nível exigido pela operação)
 *
 * SHA3-256 nos receipts — ver consentReceiptStore.ts
 */

import { sha3_256 } from "@noble/hashes/sha3.js";

/** Níveis do reticulado (⊥=0 … ⊤=10), ordem crescente de privilégio. */
export const LATTICE_LEVEL = {
  NONE: 0,
  IDENTITY_COLLECTION: 1,
  DIFFERENTIAL_COMPUTATION: 2,
  ANTIENTROPIC_SYNC: 3,
  HETEROGENEOUS_COMPUTE: 4,
  ZERO_KNOWLEDGE_TRANSIT: 5,
  VERIFIABLE_STATE: 6,
  RESOURCE_SCAVENGING: 7,
  LEGACY_BRIDGE: 8,
  COGNITIVE_OFFLOAD: 9,
  ECONOMIC_ATTENTION: 10,
} as const;

export type LatticeLevel = (typeof LATTICE_LEVEL)[keyof typeof LATTICE_LEVEL];

export type AmpOperation =
  | "spawn_identity"
  | "pedersen_commit"
  | "bulletproof_verify"
  | "crdt_merge"
  | "webgpu_compute"
  | "sphinx_route"
  | "merkle_fossilize"
  | "symbiont_cycles"
  | "legacy_import"
  | "federated_ml"
  | "nwc_payment"
  | "ble_advertise"
  | "quantum_sim";

/** Nível mínimo exigido por operação (derivado da Tabela 2 do PMU). */
export const OPERATION_REQUIRED_LEVEL: Record<AmpOperation, LatticeLevel> = {
  spawn_identity: LATTICE_LEVEL.IDENTITY_COLLECTION,
  pedersen_commit: LATTICE_LEVEL.DIFFERENTIAL_COMPUTATION,
  bulletproof_verify: LATTICE_LEVEL.DIFFERENTIAL_COMPUTATION,
  crdt_merge: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
  webgpu_compute: LATTICE_LEVEL.HETEROGENEOUS_COMPUTE,
  sphinx_route: LATTICE_LEVEL.ZERO_KNOWLEDGE_TRANSIT,
  merkle_fossilize: LATTICE_LEVEL.VERIFIABLE_STATE,
  symbiont_cycles: LATTICE_LEVEL.RESOURCE_SCAVENGING,
  legacy_import: LATTICE_LEVEL.LEGACY_BRIDGE,
  federated_ml: LATTICE_LEVEL.COGNITIVE_OFFLOAD,
  nwc_payment: LATTICE_LEVEL.ECONOMIC_ATTENTION,
  ble_advertise: LATTICE_LEVEL.ANTIENTROPIC_SYNC,
  quantum_sim: LATTICE_LEVEL.DIFFERENTIAL_COMPUTATION,
};

export const LATTICE_LEVEL_LABELS: Record<LatticeLevel, string> = {
  0: "⊥ nenhuma",
  1: "identity_collection — entropia de hardware",
  2: "differential_computation — Pedersen/Bulletproofs",
  3: "antientropic_sync — CRDT merge",
  4: "heterogeneous_compute — WebGPU/WASM",
  5: "zero_knowledge_transit — roteamento privado",
  6: "verifiable_state — Merkle/VSC",
  7: "resource_scavenging — ciclos ociosos",
  8: "legacy_bridge — importação iniciada pelo usuário",
  9: "cognitive_offload — ML federado",
  10: "⊤ economic_attention — Lightning/NWC",
};

export interface ConsentReceipt {
  version: string;
  maxLevelGranted: LatticeLevel;
  /** Escopos explicitamente assinados na UI (não inferidos só pelo nível máximo). */
  grantedScopeKeys: string[];
  signedAt: number;
  locale: string;
  receiptHash: string;
  revokedAt: number | null;
}

export const AMP_CONSENT_VERSION = "amp-cgf-1.0.0";

export function canonicalReceipt(level: LatticeLevel, signedAt: number): string {
  return JSON.stringify({ version: AMP_CONSENT_VERSION, maxLevelGranted: level, signedAt });
}

export function hashReceipt(payload: string): string {
  return Array.from(sha3_256(new TextEncoder().encode(payload)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifica Teorema 3.2: nível concedido ≥ nível necessário.
 */
export function isOperationAllowed(
  maxLevelGranted: LatticeLevel,
  op: AmpOperation,
): boolean {
  return maxLevelGranted >= OPERATION_REQUIRED_LEVEL[op];
}

export function assertOperationAllowed(
  maxLevelGranted: LatticeLevel,
  op: AmpOperation,
): void {
  const required = OPERATION_REQUIRED_LEVEL[op];
  if (!isOperationAllowed(maxLevelGranted, op)) {
    throw new Error(
      `CGF_DCC_DENIED: operação "${op}" exige nível ≥ ${required} ` +
        `(${LATTICE_LEVEL_LABELS[required]}), concedido: ${maxLevelGranted} ` +
        `(${LATTICE_LEVEL_LABELS[maxLevelGranted]}). Assine em /governance/consent`,
    );
  }
}

/** Preset “núcleo v1” do PMU: até pagamentos, sem ML federado nem legacy automático. */
export const CORE_V1_MAX_LEVEL: LatticeLevel = LATTICE_LEVEL.ECONOMIC_ATTENTION;

/** Preset laboratório: tudo exceto ⊤ implícito — nível 9. */
export const LAB_MAX_LEVEL: LatticeLevel = LATTICE_LEVEL.COGNITIVE_OFFLOAD;
