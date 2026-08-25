#!/usr/bin/env node
/** Harmonia servidor: POST /cosmic/void/harmony */
const API = process.env.QUANTUM_API || "http://127.0.0.1:8472";

async function main() {
  try {
    const health = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3_000) });
    if (!health.ok) throw new Error(`health ${health.status}`);
  } catch {
    console.error(`[cosmic:harmony] Motor CQR offline em ${API}`);
    console.error("  Suba: npm run quantum:dev   (terminal separado, deixar a correr)");
    process.exit(1);
  }

  const res = await fetch(`${API}/cosmic/void/harmony?resolution=64&bits=2048`, {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log("[cosmic:harmony]", data.protocol, data.manifest?.truth_level);
  console.log("[cosmic:harmony] root:", data.manifest?.harmony_root?.slice(0, 32));
  console.log("[cosmic:harmony] report:", data.audit_report_path);
  const vr = data.void_runner;
  if (vr?.success) {
    console.log("[cosmic:harmony] void-runner OK:", JSON.stringify(vr.output).slice(0, 80));
  } else {
    console.warn("[cosmic:harmony] void-runner:", vr?.error ?? "não executado");
  }
  const anc = data.anchor;
  if (anc?.proposed) {
    console.log("[cosmic:harmony] anchor proposed:", anc.root, anc.txHash);
  } else if (anc?.skipped) {
    console.log("[cosmic:harmony] anchor skipped:", anc.reason);
  } else if (anc?.error) {
    console.warn("[cosmic:harmony] anchor:", anc.error);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
