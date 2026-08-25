#!/usr/bin/env node
/**
 * Propõe raiz ETRNETAnchor a partir da auditoria PMU (servidor ou ficheiro).
 * Env: ANCHOR_RPC_URL, ANCHOR_PRIVATE_KEY, ETRNET_ANCHOR_ADDRESS, QUANTUM_API
 */
import { readFileSync } from "node:fs";

const API = process.env.QUANTUM_API || "http://127.0.0.1:8472";
const auditPath = process.argv[2];

async function main() {
  let result;
  if (auditPath) {
    const audit = JSON.parse(readFileSync(auditPath, "utf8"));
    const payload = {
      protocol: "PMU_ANCHOR_COMMIT",
      audit_sha3: audit.entropy?.sha3_256 ?? "",
      truth_level_id: audit.truth_level_id ?? "unknown",
      generated_at: audit.generated_at ?? Date.now(),
      void_pool_tip: audit.void_pool?.after?.chain_tip,
    };
    const res = await fetch(`${API}/pmu/anchor/propose?harmony_root=${payload.audit_sha3}`, {
      method: "POST",
    });
    result = await res.json();
  } else {
    const res = await fetch(`${API}/pmu/anchor/propose`, { method: "POST" });
    if (!res.ok) {
      console.error(await res.text());
      process.exit(1);
    }
    result = await res.json();
  }

  console.log("[pmu:anchor]", JSON.stringify(result, null, 2));
  if (!result.result?.proposed && !result.result?.skipped) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
