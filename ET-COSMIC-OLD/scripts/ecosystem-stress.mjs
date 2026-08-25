#!/usr/bin/env node
/**
 * Stress test do ecossistema VOID — AQRE, LUSUS, IMC, SOV, Silent Mesh, ETERNET.
 *
 * Uso:
 *   npm run stress:eco                    # tier medium, in-process
 *   npm run stress:eco -- --tier heavy
 *   npm run stress:eco -- --http          # contra server (npm run server:sovereign)
 *   npm run stress:eco -- --tier extreme --persist
 *   npm run stress:eco -- --json > report.json
 */
import "../server/loadEnv.js";

import { benchSync, benchAsync, formatRow, runPool, STRESS_HEADER } from "./lib/stress-utils.mjs";
import { runTask } from "../server/aqre/orchestrator.js";
import { solveMaxCut, randomGraph } from "../server/lusus/ising_machine.js";
import { cavityModes } from "../server/lusus/cavity_planck.js";
import { correlatedPair } from "../server/lusus/chaos_bell.js";
import { runImcAction, imcStatus } from "../server/imc/core.js";
import { runEngine, runIsossupraPipeline } from "../server/isossupra/core.js";
import {
  creditAccount,
  getBalance,
  economyStatus,
} from "../server/economy/sovLedger.js";
import { publishBinary, purchaseBinary } from "../server/economy/binaryMarket.js";
import { registerHostingSite, recordHostingTraffic } from "../server/economy/hostingRevenue.js";
import { registerMiner, submitEthicalWork } from "../server/economy/ethicalMining.js";
import { registerNode, heartbeatNode } from "../server/silentMesh/void700.js";
import crypto from "node:crypto";

const TIERS = {
  smoke: {
    aqreRounds: 40,
    lususRounds: 30,
    imcRounds: 20,
    economyOps: 80,
    meshNodes: 25,
    isossupraRounds: 15,
    entropyRounds: 30,
    concurrency: 4,
    causalMaxSize: 12,
    causalSteps: 24,
  },
  medium: {
    aqreRounds: 400,
    lususRounds: 200,
    imcRounds: 120,
    economyOps: 600,
    meshNodes: 200,
    isossupraRounds: 80,
    entropyRounds: 200,
    concurrency: 8,
    causalMaxSize: 16,
    causalSteps: 32,
  },
  heavy: {
    aqreRounds: 3000,
    lususRounds: 1500,
    imcRounds: 800,
    economyOps: 4000,
    meshNodes: 800,
    isossupraRounds: 400,
    entropyRounds: 1500,
    concurrency: 16,
    causalMaxSize: 20,
    causalSteps: 48,
  },
  extreme: {
    aqreRounds: 12000,
    lususRounds: 6000,
    imcRounds: 3000,
    economyOps: 15000,
    meshNodes: 3000,
    isossupraRounds: 1500,
    entropyRounds: 6000,
    concurrency: 32,
    causalMaxSize: 24,
    causalSteps: 64,
  },
};

function parseArgs(argv) {
  const out = {
    tier: "medium",
    http: false,
    persist: false,
    json: false,
    base: process.env.STRESS_BASE_URL ?? "http://127.0.0.1:3001",
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tier" && argv[i + 1]) out.tier = argv[++i];
    else if (argv[i] === "--http") out.http = true;
    else if (argv[i] === "--persist") out.persist = true;
    else if (argv[i] === "--json") out.json = true;
    else if (argv[i] === "--base" && argv[i + 1]) out.base = argv[++i];
  }
  return out;
}

function benchAqre(tier) {
  let lsc429 = 0;
  const spin = benchSync("AQRE spin_network", (i) => {
    const r = runTask("spin_network", { nodeCount: 18 + (i % 3), cEpsilon: 0.1 + (i % 5) * 0.02 });
    if (r.status === 429 || r.error === "LSC_LIMIT_EXCEEDED") lsc429++;
    else if (!r.ok) throw new Error(r.error ?? "spin fail");
  }, tier.aqreRounds);
  spin.lsc429 = lsc429;

  lsc429 = 0;
  let lrViolations = 0;
  const causal = benchSync("AQRE causal_tracker", (i) => {
    const size = Math.min(tier.causalMaxSize, 8 + (i % 8));
    const r = runTask("causal_tracker", {
      size,
      steps: tier.causalSteps,
      cEpsilon: 0.15,
      J: 0.5 + (i % 3) * 0.25,
    });
    if (r.status === 429 || r.error === "LSC_LIMIT_EXCEEDED") lsc429++;
    else if (!r.ok) throw new Error(r.error ?? "causal fail");
    else if (r.result?.liebRobinson?.violated) lrViolations++;
  }, Math.floor(tier.aqreRounds / 2));
  causal.lsc429 = lsc429;
  causal.lrViolations = lrViolations;

  lsc429 = 0;
  const chi = benchSync("AQRE chi_field", (i) => {
    const r = runTask("chi_field", { gridSize: 24 + (i % 8), cEpsilon: 0.12 });
    if (r.status === 429) lsc429++;
    else if (!r.ok) throw new Error(r.error ?? "chi fail");
  }, Math.floor(tier.aqreRounds / 3));
  chi.lsc429 = lsc429;

  lsc429 = 0;
  const sdf = benchSync("AQRE sdf", (i) => {
    const r = runTask("sdf", {
      resolution: 32 + (i % 16),
      steps: 6,
      cEpsilon: 0.1,
    });
    if (r.status === 429) lsc429++;
    else if (!r.ok) throw new Error(r.error ?? "sdf fail");
  }, Math.floor(tier.aqreRounds / 4));
  sdf.lsc429 = lsc429;

  // Ramp cEpsilon até LSC bloquear
  let rampBlockedAt = null;
  for (let c = 0.5; c <= 1; c += 0.02) {
    const r = runTask("spin_network", { nodeCount: 10, cEpsilon: c, pCurrent: 0.5 });
    if (!r.ok || r.status === 429) {
      rampBlockedAt = c;
      break;
    }
  }

  return { results: [spin, causal, chi, sdf], rampBlockedAt, lrViolations };
}

function benchLusus(tier) {
  const ising = benchSync("LUSUS ising maxcut", (i) => {
    const n = 16 + (i % 48);
    solveMaxCut(n, randomGraph(n), 200 + (i % 100));
  }, tier.lususRounds);

  const cavity = benchSync("LUSUS cavity_planck", (i) => {
    cavityModes(32 + (i % 32));
  }, Math.floor(tier.lususRounds / 2));

  const chaos = benchSync("LUSUS chaos_bell", (i) => {
    correlatedPair(1000 + i);
  }, tier.lususRounds);

  return [ising, cavity, chaos];
}

function benchImc(tier) {
  const actions = [
    ["VOID-510", { bits: 256, nodeId: "stress", streams: { device_hex: "ab".repeat(32) } }],
    ["VOID-511", { n: 16 }],
    ["VOID-512", { room: "stress-room" }],
    ["VOID-513", { seed: 42 }],
    ["VOID-514", { molecule: "H2", shards: 4 }],
    ["VOID-520", { type: "ising", n: 12 }],
    ["VOID-521", { bits: 512 }],
    ["VOID-522", { proofs: ["p1", "p2", "p3"] }],
  ];
  return benchSync("IMC VOID-510–522", (i) => {
    const [action, body] = actions[i % actions.length];
    const payload = { ...body };
    // VOID-511/520 interpretam jobId como lookup — só submeter, sem id fixo
    if (action !== "VOID-511" && action !== "VOID-520") {
      payload.jobId = `stress-${i}`;
    }
    const r = runImcAction(action, payload);
    if (r.error) throw new Error(`${action}: ${r.error}`);
  }, tier.imcRounds);
}

function benchIsossupra(tier) {
  const engines = ["VOID-500", "VOID-501", "VOID-503", "VOID-504", "VOID-506"];
  const single = benchSync("Isossupra engines", (i) => {
    const id = engines[i % engines.length];
    const body =
      id === "VOID-500"
        ? { n: 14 }
        : id === "VOID-501"
          ? { bits: 256 }
          : id === "VOID-503"
            ? { molecule: "H2" }
            : id === "VOID-504"
              ? { seed: i }
              : { programId: `stress-${i}`, blocks: [{ op: "ising", n: 8 }] };
    const r = runEngine(id, body);
    if (r.error) throw new Error(r.error);
  }, tier.isossupraRounds);

  const pipeline = benchSync("Isossupra pipeline", (i) => {
    runIsossupraPipeline({ bits: 256, seed: i, room: `r${i % 10}` });
  }, Math.floor(tier.isossupraRounds / 3));

  return [single, pipeline];
}

function benchEconomy(tier) {
  const prefix = `stress:${Date.now()}:`;
  creditAccount(`${prefix}treasury`, 1_000_000_000, { channel: "stress" });

  const burst = benchSync("SOV economy burst", (i) => {
    const acct = `${prefix}u${i % 200}`;
    creditAccount(acct, 10_000 + (i % 1000), { channel: "stress" });
    if (i % 7 === 0) {
      const art = publishBinary({
        name: `bin-${i}`,
        priceSov: 0.01,
        sellerId: `${prefix}seller`,
      });
      creditAccount(`${prefix}buyer`, 50_000);
      purchaseBinary(art.artifactId, `${prefix}buyer`);
    }
    if (i % 11 === 0) {
      const site = registerHostingSite({
        ownerId: acct,
        origin: `https://stress-${i}.local`,
      });
      recordHostingTraffic(site.siteId, { visitors: 3, bytesGb: 0.01 });
    }
    if (i % 13 === 0) {
      const w = registerMiner(`worker-${i}`, { accountId: acct });
      submitEthicalWork(w.workerId, { accountId: acct, cpuPct: 2, type: "ising" });
    }
    getBalance(acct);
  }, tier.economyOps);

  return burst;
}

function benchMesh(tier) {
  const nodes = [];
  const reg = benchSync("VOID-700 register", (i) => {
    const n = registerNode({
      mode: i % 5 === 0 ? "vps" : "browser",
      consent: { compute: true, cdn: true },
      siteOrigin: `https://n${i}.local`,
    });
    nodes.push(n.nodeId);
  }, tier.meshNodes);

  const hb = benchSync("VOID-700 heartbeat", (i) => {
    const id = nodes[i % nodes.length];
    const r = heartbeatNode(id, { cpuPct: 1 + (i % 4), ramMb: 10 });
    if (r.action === "reject") throw new Error("heartbeat rejected");
  }, tier.meshNodes * 2);

  return [reg, hb];
}

function benchEntropy(tier) {
  return benchSync("ETERNET entropy mix", (i) => {
    const bell = correlatedPair(i);
    const os = crypto.randomBytes(32);
    crypto.createHash("sha3-512").update(`${bell.seed}:${os.toString("hex")}`).digest();
  }, tier.entropyRounds);
}

async function benchHttp(tier, base) {
  const endpoints = [
    { path: "/api/aqre/health", method: "GET" },
    { path: "/api/lusus/health", method: "GET" },
    { path: "/api/imc/health", method: "GET" },
    { path: "/api/economy/health", method: "GET" },
    { path: "/api/eternet/health", method: "GET" },
    {
      path: "/api/aqre/run",
      method: "POST",
      body: { task: "spin_network", params: { nodeCount: 12 } },
    },
    {
      path: "/api/lusus/ising/maxcut",
      method: "POST",
      body: { n: 12, iterations: 100 },
    },
    {
      path: "/api/eternet/entropy",
      method: "POST",
      body: { bits: 256 },
    },
  ];

  const rounds = tier.aqreRounds;
  const tasks = [];
  for (let i = 0; i < rounds; i++) {
    const ep = endpoints[i % endpoints.length];
    tasks.push(async () => {
      const res = await fetch(`${base.replace(/\/$/, "")}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { "Content-Type": "application/json" } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`${ep.path} HTTP ${res.status}`);
      return res.json();
    });
  }

  const t0 = performance.now();
  const pool = await runPool(tasks, tier.concurrency);
  const totalMs = performance.now() - t0;
  const ok = pool.filter((p) => p.ok).length;
  const latencies = pool.map((p) => p.ms).sort((a, b) => a - b);
  const { percentile } = await import("./lib/stress-utils.mjs");

  return {
    label: "HTTP mixed endpoints",
    iterations: rounds,
    ok,
    fail: pool.length - ok,
    lsc429: 0,
    totalMs,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    opsPerSec: ok / (totalMs / 1000),
    errors: [...new Set(pool.filter((p) => !p.ok).map((p) => p.error))].slice(0, 5),
  };
}

function verdict(tierName, allResults, limits) {
  const totalFail = allResults.reduce((s, r) => s + (r.fail ?? 0), 0);
  const totalOps = allResults.reduce((s, r) => s + (r.iterations ?? 0), 0);
  const minOps = Math.min(...allResults.map((r) => r.opsPerSec ?? 0));

  if (totalFail > totalOps * 0.05) return { grade: "FAIL", detail: ">5% operações falharam" };
  if (tierName === "extreme" && totalFail === 0) return { grade: "EXTREME_OK", detail: "Aguenta tier extreme sem falhas" };
  if (tierName === "heavy" && totalFail === 0) return { grade: "HEAVY_OK", detail: "Aguenta tier heavy — pronto para alpha industrial" };
  if (limits.rampBlockedAt != null && limits.rampBlockedAt < 0.9) {
    return { grade: "LSC_GUARD_OK", detail: `LSC bloqueia cε≈${limits.rampBlockedAt.toFixed(2)} (esperado ~0.86)` };
  }
  if (minOps < 10 && tierName !== "smoke") {
    return { grade: "SLOW", detail: `Gargalo: ${minOps.toFixed(0)} ops/s mínimo` };
  }
  return { grade: "PASS", detail: `${totalOps} ops, ${totalFail} falhas` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tier = TIERS[args.tier];
  if (!tier) {
    console.error(`Tier inválido: ${args.tier}. Use: ${Object.keys(TIERS).join(", ")}`);
    process.exit(1);
  }

  if (!args.persist) {
    process.env.SOV_LEDGER_PERSIST = "0";
  }

  const started = Date.now();
  const allResults = [];
  const limits = {};

  if (args.http) {
    try {
      const health = await fetch(`${args.base}/health`, { signal: AbortSignal.timeout(3000) });
      if (!health.ok) throw new Error(`HTTP ${health.status}`);
    } catch (e) {
      console.error(`\n✗ Server offline em ${args.base} — npm run server:sovereign\n`);
      process.exit(1);
    }
    allResults.push(await benchHttp(tier, args.base));
  } else {
    const aqre = benchAqre(tier);
    allResults.push(...aqre.results);
    limits.rampBlockedAt = aqre.rampBlockedAt;
    limits.lrViolations = aqre.lrViolations;

    allResults.push(...benchLusus(tier));
    allResults.push(benchImc(tier));
    allResults.push(...benchIsossupra(tier));
    allResults.push(benchEconomy(tier));
    allResults.push(...benchMesh(tier));
    allResults.push(benchEntropy(tier));
  }

  const durationSec = (Date.now() - started) / 1000;
  const v = verdict(args.tier, allResults, limits);

  const report = {
    tier: args.tier,
    mode: args.http ? "http" : "inprocess",
    persist: args.persist,
    durationSec,
    verdict: v,
    limits,
    imcEngines: args.http ? null : imcStatus().engines.length,
    economy: args.http ? null : economyStatus(),
    results: allResults,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(v.grade === "FAIL" ? 1 : 0);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  VOID Ecosystem Stress — ET-COSMIC");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Tier: ${args.tier}  │  Modo: ${report.mode}  │  Persist SOV: ${args.persist}`);
  console.log(`  Duração: ${durationSec.toFixed(1)}s  │  Veredito: ${v.grade} — ${v.detail}`);
  if (limits.rampBlockedAt != null) {
    console.log(`  LSC ramp: bloqueio em cε ≈ ${limits.rampBlockedAt.toFixed(2)}`);
  }
  if (limits.lrViolations != null) {
    console.log(`  Lieb-Robinson: ${limits.lrViolations} colapsos → Anderson (esperado sob stress)`);
  }
  console.log("───────────────────────────────────────────────────────────");
  console.log(STRESS_HEADER);
  for (const r of allResults) {
    console.log(formatRow(r));
  }
  console.log("───────────────────────────────────────────────────────────");
  console.log("  Limites conhecidos:");
  console.log("    • AQRE spin_network: máx 20 nós");
  console.log("    • LSC: cε > 0.86 → HTTP 429 / CRITICAL");
  console.log("    • VOID-700: throttle CPU/RAM por modo browser/vps");
  console.log("    • IMC Ising: n recomendado ≤ 64 por job");
  console.log("═══════════════════════════════════════════════════════════\n");

  process.exit(v.grade === "FAIL" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
