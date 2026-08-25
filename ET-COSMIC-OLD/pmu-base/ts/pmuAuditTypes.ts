/**
 * Tipos do relatório PMU audit (espelho de entropy_audit.py).
 */

import type { SourceBreakdownItem } from "./pmuTruthLevels";

export interface PmuAuditReport {
  schema: string;
  generated_at: number;
  truth_level: number;
  truth_level_id: string;
  entropy: {
    sha3_256: string;
    tier: string;
    method?: string;
    quantum_verified: boolean;
    simulation: boolean;
    sources: string[];
    source_breakdown: SourceBreakdownItem[];
  };
  chsh_audit?: {
    S_value?: number;
    chsh_violated?: boolean;
    method?: string;
  } | null;
  sts_light: {
    suite: string;
    passed: boolean | null;
    skipped?: boolean;
    reason?: string;
    tests: { name: string; passed: boolean }[];
    byte_length: number;
  };
  report_path?: string;
  paleo_fossil?: {
    fossil_root_hash?: string;
    skeleton_id?: string;
    verified?: boolean;
  } | null;
  void_pool: {
    before: { pulses: number; chain_tip: string; pool_dir: string };
    pulse?: Record<string, unknown> | null;
    after: { pulses: number; chain_tip: string };
  };
  disclaimer: string;
}
