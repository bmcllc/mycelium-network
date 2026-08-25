#!/usr/bin/env node
/**
 * E2E soberano — /finance/payment APIs (Lightning + economia).
 * Não substitui teste manual no browser; valida stack HTTP mínima.
 */
import "../server/loadEnv.js";

const BASE = process.env.FINANCE_E2E_URL ?? "http://127.0.0.1:3001";
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

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json };
}

console.log("\n💳 Finance payment E2E (HTTP)\n");

try {
  const { res, json } = await getJson("/api/economy/health");
  if (res.ok) ok("economy/health", json.currency ?? "SOV");
  else bad("economy/health", String(res.status));
} catch (e) {
  bad("economy/health", String(e.message ?? e));
}

try {
  const { res, json } = await getJson("/api/lightning/info");
  if (res.ok) ok("lightning/info", json.mode ?? json.alias ?? "ok");
  else bad("lightning/info", String(res.status));
} catch (e) {
  bad("lightning/info", String(e.message ?? e));
}

try {
  const { res, json } = await getJson("/api/lightning/balance");
  if (res.ok) ok("lightning/balance", `${json.localSat ?? json.balance_sat ?? json.total_balance ?? "?"} sat`);
  else bad("lightning/balance", String(res.status));
} catch (e) {
  bad("lightning/balance", String(e.message ?? e));
}

try {
  const res = await fetch(`${BASE}/api/lightning/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountSat: 1000, label: "finance-e2e" }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (res.ok && (json.payment_request || json.invoice)) {
    ok("lightning/create invoice", `${json.paymentHash?.slice?.(0, 12) ?? json.payment_hash?.slice?.(0, 12) ?? "ok"}…`);
  } else {
    bad("lightning/create invoice", json.error ?? String(res.status));
  }
} catch (e) {
  bad("lightning/create invoice", String(e.message ?? e));
}

const hasNwc = Boolean(process.env.VITE_NWC_SECRET || process.env.NWC_SECRET);
if (hasNwc) ok("NWC URI", "configurada — validar pagamento no browser /finance/payment");
else console.log("  ○ NWC ausente — browser E2E manual após npm run nwc:sync-vite");

console.log("\n  → Cliente lane (depósito pareado + Builder + VOID-308): npm run cliente:lane-e2e\n");

const httpOptional = process.env.FINANCE_E2E_HTTP_OPTIONAL === "1";
console.log(`\n${fail === 0 ? "✅" : "⚠️"} ${pass}/${pass + fail} checks HTTP`);
if (fail > 0 && httpOptional) {
  console.log("  ○ HTTP offline — passo opcional no FULL E2E\n");
  console.log("  Browser: npm run dev → http://localhost:5173/finance/payment\n");
  process.exit(0);
}
console.log("  Browser: npm run dev → http://localhost:5173/finance/payment\n");
process.exit(fail > 0 ? 1 : 0);
