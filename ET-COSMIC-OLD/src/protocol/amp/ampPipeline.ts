/**
 * Fluxo sequencial PMU §4 / Figura 2:
 * CGF → EIM → ASM → DPL → HCF → MTS → LIG → PB (opcional)
 */

import { assertOperationAllowed, type LatticeLevel } from "./consentLattice";
import { consentReceiptStore } from "./consentReceiptStore";

export type AmpPipelineStage =
  | "CGF"
  | "EIM"
  | "ASM"
  | "DPL"
  | "HCF"
  | "MTS"
  | "LIG"
  | "PB";

const STAGE_OPS: Record<AmpPipelineStage, import("./consentLattice").AmpOperation> = {
  CGF: "spawn_identity",
  EIM: "spawn_identity",
  ASM: "crdt_merge",
  DPL: "pedersen_commit",
  HCF: "webgpu_compute",
  MTS: "ble_advertise",
  LIG: "nwc_payment",
  PB: "legacy_import",
};

/**
 * Garante consentimento antes de cada estágio do pipeline.
 */
export function assertPipelineStage(stage: AmpPipelineStage): void {
  const level = consentReceiptStore.getMaxLevel();
  assertOperationAllowed(level, STAGE_OPS[stage]);
}

export function getPipelineStatus(): {
  maxLevel: LatticeLevel;
  stages: { stage: AmpPipelineStage; allowed: boolean }[];
} {
  const maxLevel = consentReceiptStore.getMaxLevel();
  const stages = (Object.keys(STAGE_OPS) as AmpPipelineStage[]).map((stage) => ({
    stage,
    allowed: (() => {
      try {
        assertOperationAllowed(maxLevel, STAGE_OPS[stage]);
        return true;
      } catch {
        return false;
      }
    })(),
  }));
  return { maxLevel, stages };
}
