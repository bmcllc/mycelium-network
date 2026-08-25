/**
 * Níveis de verdade PMU (L0–L4) — transparência na UI.
 */

export type PmuTruthLevel = 0 | 1 | 2 | 3 | 4;

export interface PmuTruthLevelSpec {
  level: PmuTruthLevel;
  id: string;
  label: string;
  description: string;
  color: string;
}

export const PMU_TRUTH_LEVELS: readonly PmuTruthLevelSpec[] = [
  {
    level: 0,
    id: "L0_degradado",
    label: "L0 — Degradado",
    description: "Só CSPRNG / motor offline",
    color: "#f59e0b",
  },
  {
    level: 1,
    id: "L1_cqr_classico",
    label: "L1 — CQR clássico (quimb)",
    description: "Motor Python quimb + CHSH por shots (emulação honesta)",
    color: "#94a3b8",
  },
  {
    level: 2,
    id: "L2_hibrido_verificado",
    label: "L2 — Híbrido verificado",
    description: "CQR + fonte hardware (ANU ou similar)",
    color: "#3b82f6",
  },
  {
    level: 3,
    id: "L3_omega_soberano",
    label: "L3 — Ω soberano",
    description: "Híbrido + paleo + pool em disco + STS leve",
    color: "#b6ff3a",
  },
  {
    level: 4,
    id: "L4_laboratorio",
    label: "L4 — Laboratório",
    description: "QRNG local ou cloud QC auditado (futuro)",
    color: "#a78bfa",
  },
] as const;

export function getTruthLevelSpec(level: number): PmuTruthLevelSpec {
  return PMU_TRUTH_LEVELS.find((x) => x.level === level) ?? PMU_TRUTH_LEVELS[0]!;
}

export interface SourceBreakdownItem {
  id: string;
  label: string;
  kind: "hardware" | "simulation" | "structural" | "sovereign" | "beacon" | "hardware_classical" | "cloud_optional" | "unknown";
}

