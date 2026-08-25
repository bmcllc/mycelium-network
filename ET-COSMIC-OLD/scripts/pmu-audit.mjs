#!/usr/bin/env node
/**
 * Auditoria PMU Ω — grava JSON em void_pool/reports/
 * Uso: npm run pmu:audit
 * VOID-COSMIC_VPS: ET_RNET_ROOT=../ET-RNET npm run pmu:audit
 */

const API = process.env.QUANTUM_API || "http://127.0.0.1:8472";
const bits = Number(process.env.PMU_AUDIT_BITS || 2048);

async function main() {
  const health = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!health?.ok) {
    console.error(`[pmu:audit] Motor offline em ${API} — rode: npm run quantum:dev`);
    process.exit(1);
  }

  const res = await fetch(`${API}/pmu/audit/full?bits=${bits}`, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
  const report = await res.json();
  console.log(`[pmu:audit] Nível ${report.truth_level_id} (L${report.truth_level})`);
  const sts = report.sts_light?.skipped
    ? "SKIP (amostra curta)"
    : report.sts_light?.passed
      ? "PASS"
      : "FAIL";
  console.log(`[pmu:audit] STS: ${sts}`);
  console.log(`[pmu:audit] Pool pulses: ${report.void_pool?.after?.pulses ?? "?"}`);
  console.log(`[pmu:audit] Relatório: ${report.report_path ?? "—"}`);
  console.log(`[pmu:audit] sha3: ${report.entropy.sha3_256?.slice(0, 32)}…`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
