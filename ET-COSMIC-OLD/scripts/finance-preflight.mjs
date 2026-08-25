#!/usr/bin/env node
/**
 * Pré-voo soberania financeira — SOV + Lightning/NWC (sem B2B).
 */
import "../server/loadEnv.js";
import { creditAccount, getBalance, economyStatus } from "../server/economy/sovLedger.js";
import { publishBinary, listBinaries } from "../server/economy/binaryMarket.js";
import { registerHostingSite, listHostingSites } from "../server/economy/hostingRevenue.js";
import { registerMiner, listMiners } from "../server/economy/ethicalMining.js";
import { economyPersistenceEnabled } from "../server/economy/economyPersistence.js";

const BASE = process.env.FINANCE_PREFLIGHT_URL ?? "http://127.0.0.1:3001";
let pass = 0;
let fail = 0;

function ok(label, detail = "") {
  pass++;
  console.log(`  ✓ ${label}${detail ? `: ${detail}` : ""}`);
}
function bad(label, detail = "") {
  fail++;
  console.log(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
}

console.log("\n💰 Soberania financeira — preflight\n");

// ── In-process (sem HTTP) ──
try {
  const st = economyStatus();
  ok("VOID-710 ledger", `${st.accounts} contas · ${st.totalSupplySov} SOV`);
} catch (e) {
  bad("VOID-710 ledger", String(e.message ?? e));
}

try {
  creditAccount("preflight:finance", 1000, { channel: "preflight" });
  ok("creditAccount", `${getBalance("preflight:finance").balanceMicro} µSOV`);
} catch (e) {
  bad("creditAccount", String(e.message ?? e));
}

try {
  const art = publishBinary({ name: "preflight-bin", priceSov: 0, sellerId: "preflight" });
  ok("VOID-703 binaries", `${listBinaries().length} artefactos (${art.artifactId})`);
} catch (e) {
  bad("VOID-703 binaries", String(e.message ?? e));
}

try {
  const site = registerHostingSite({ ownerId: "preflight", origin: "https://local" });
  ok("VOID-704 hosting", `${listHostingSites().length} sites (${site.siteId})`);
} catch (e) {
  bad("VOID-704 hosting", String(e.message ?? e));
}

try {
  const w = registerMiner("preflight-worker", { accountId: "preflight:miner" });
  ok("VOID-705 miners", `${listMiners().length} workers (${w.workerId})`);
} catch (e) {
  bad("VOID-705 miners", String(e.message ?? e));
}

if (economyPersistenceEnabled()) {
  ok("persistência", "activa (produção)");
} else {
  ok("persistência", "memória (test/dev)");
}

// ── HTTP (server opcional) ──
try {
  const res = await fetch(`${BASE}/api/economy/health`, { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const h = await res.json();
    ok("HTTP /api/economy/health", h.currency ?? "SOV");
  } else bad("HTTP /api/economy/health", String(res.status));
} catch {
  console.log("  ○ HTTP server offline — npm run server (opcional para preflight local)");
}

const hasLnd = Boolean(process.env.LND_REST_URL && process.env.LND_MACAROON_HEX);
const hasNwc = Boolean(process.env.VITE_NWC_SECRET || process.env.NWC_SECRET);
if (hasLnd) {
  ok("LND_REST_URL", process.env.LND_REST_URL);
  try {
    const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (process.env.LND_TLS_SKIP === "true") process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const url = `${process.env.LND_REST_URL.replace(/\/$/, "")}/v1/getinfo`;
    const res = await fetch(url, {
      headers: { "Grpc-Metadata-Macaroon": process.env.LND_MACAROON_HEX },
      signal: AbortSignal.timeout(5000),
    });
    if (process.env.LND_TLS_SKIP === "true") {
      if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    }
    if (res.ok) {
      const info = await res.json();
      ok("LND getinfo", info.alias ?? info.identity_pubkey?.slice(0, 16));
    } else bad("LND getinfo", `HTTP ${res.status}`);
  } catch (e) {
    bad("LND getinfo", String(e.message ?? e));
  }
} else {
  console.log("  ○ LND offline — npm run finance:setup após stack:up");
}

if (hasNwc) ok("NWC", "URI configurada");
else console.log("  ○ NWC ausente — RTL :8085 → Settings → NWC → npm run nwc:sync-vite");

try {
  const res = await fetch(`${BASE}/api/lightning/info`, { signal: AbortSignal.timeout(3000) });
  if (res.ok) {
    const info = await res.json();
    ok("HTTP /api/lightning/info", info.mode ?? info.alias ?? "ok");
  } else bad("HTTP /api/lightning/info", String(res.status));
} catch {
  console.log("  ○ HTTP /api/lightning/info — npm run server:sovereign (opcional)");
}

console.log(`\n${fail === 0 ? "✅" : "⚠️"} ${pass}/${pass + fail} checks in-process${fail ? ` · ${fail} falhas` : ""}\n`);
process.exit(fail > 0 ? 1 : 0);
