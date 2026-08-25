#!/usr/bin/env node
import { imcStatus, runImcAction } from "../server/imc/core.js";
import { silentMeshStatus, registerNode, heartbeatNode } from "../server/silentMesh/void700.js";
import { economyStatus, creditAccount, getBalance } from "../server/economy/sovLedger.js";
import { publishBinary, purchaseBinary } from "../server/economy/binaryMarket.js";
import { submitEthicalWork, registerMiner } from "../server/economy/ethicalMining.js";

const checks = [];
const ok = (n, d) => {
  checks.push(true);
  console.log(`  ✓ ${n}: ${d}`);
};
const fail = (n, e) => {
  checks.push(false);
  console.error(`  ✗ ${n}: ${e}`);
};

console.log("\n⚡ IMC v2.0 + VOID-700 preflight\n");

try {
  const st = imcStatus();
  ok("VOID-600", `${st.engines.length} motores`);
} catch (e) {
  fail("VOID-600", e);
}

for (const [action, label] of [
  ["VOID-510", "sensor"],
  ["VOID-511", "ising"],
  ["VOID-512", "acoustic"],
  ["VOID-513", "chaos"],
  ["VOID-514", "thomas"],
  ["VOID-520", "marketplace"],
  ["VOID-521", "eaas"],
  ["VOID-522", "zk"],
]) {
  try {
    const body =
      action === "VOID-511"
        ? { n: 8 }
        : action === "VOID-520"
          ? { type: "ising", n: 8 }
          : action === "VOID-512"
            ? { room: "preflight" }
            : action === "VOID-514"
              ? { molecule: "H2" }
              : action === "VOID-522"
                ? { proofs: ["a", "b"] }
                : { bits: 128, nodeId: "preflight", streams: { device_hex: "ab".repeat(32) } };
    const r = runImcAction(action, body);
    if (r.error) fail(label, r.error);
    else ok(label, r.sku ?? action);
  } catch (e) {
    fail(label, e);
  }
}

try {
  const sm = silentMeshStatus();
  ok("VOID-700", `${sm.activeNodes} nós · embed ${sm.embed}`);
  const n = registerNode({ mode: "browser", consent: { compute: true, cdn: true } });
  const hb = heartbeatNode(n.nodeId, { cpuPct: 2 });
  if (hb.action === "ok" || hb.action === "throttle") ok("VOID-700 heartbeat", hb.action);
  else fail("VOID-700 heartbeat", JSON.stringify(hb));
} catch (e) {
  fail("VOID-700", e);
}

try {
  const ec = economyStatus();
  ok("VOID-710", `${ec.revenueChannels.length} canais SOV`);
  creditAccount("preflight:sov", 1_000_000);
  const art = publishBinary({ name: "preflight-bin", priceSov: 0.1, sellerId: "preflight:seller" });
  creditAccount("preflight:buyer", 500_000);
  purchaseBinary(art.artifactId, "preflight:buyer");
  const m = registerMiner("preflight-miner", { accountId: "preflight:miner" });
  const wr = submitEthicalWork(m.workerId, { accountId: "preflight:miner", cpuPct: 1, type: "ising" });
  if (wr.creditedMicro > 0) ok("VOID-705", `+${wr.creditedMicro} µSOV`);
  else fail("VOID-705", JSON.stringify(wr));
} catch (e) {
  fail("SOV economy", e);
}

const bad = checks.filter((c) => !c).length;
console.log(`\n${bad ? "❌" : "✅"} ${checks.length - bad}/${checks.length}\n`);
process.exit(bad ? 1 : 0);
