/**
 * Cliente PMU audit — VOID-COSMIC_VPS (motor em ET-RNET).
 */

const QUANTUM_API = process.env.QUANTUM_API ?? "http://127.0.0.1:8472";

export interface PmuAuditReport {
  truth_level: number;
  truth_level_id: string;
  entropy: { sha3_256: string; quantum_verified: boolean; simulation: boolean };
  sts_light: { passed: boolean };
  report_path?: string;
}

export async function fetchPmuAuditFull(bits = 512): Promise<PmuAuditReport> {
  const res = await fetch(`${QUANTUM_API}/pmu/audit/full?bits=${bits}`, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`PMU audit failed: ${res.status}`);
  return res.json() as Promise<PmuAuditReport>;
}
