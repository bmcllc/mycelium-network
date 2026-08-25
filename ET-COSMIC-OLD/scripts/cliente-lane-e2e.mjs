#!/usr/bin/env node
/**
 * E2E faixa Cliente — depósito pareado, tier Builder, mesh VAS.
 * Requer: npm run server:sovereign (ou VPS com APIs)
 */
import "../server/loadEnv.js";

const BASE = process.env.FINANCE_E2E_URL ?? process.env.CLIENTE_E2E_URL ?? "http://127.0.0.1:3001";
const ACCOUNT = process.env.CLIENTE_E2E_ACCOUNT ?? "e2e:cliente-lane";
const HTTP_TIMEOUT_MS = parseInt(process.env.CLIENTE_E2E_TIMEOUT_MS ?? "12000", 10);

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
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json };
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json };
}

console.log(`\n🧪 Cliente lane E2E → ${BASE}\n`);

try {
  const { res, json } = await getJson("/api/economy/deposit/paired/rate");
  if (res.ok && json.satPerSov) ok("deposit/paired/rate", `${json.satPerSov} sat/SOV`);
  else bad("deposit/paired/rate", String(res.status));
} catch (e) {
  bad("deposit/paired/rate", String(e.message ?? e));
}

try {
  const { res, json } = await postJson("/api/economy/deposit/paired/intent", {
    accountId: ACCOUNT,
    amountSov: 10,
    method: "simulated",
  });
  if (res.ok && json.ok) {
    ok("deposit/paired/intent (simulated)", `${json.creditedSov ?? 10} SOV`);
  } else if (json.error === "SIMULATED_DISABLED") {
    bad("deposit/paired/intent (simulated)", "active SOV_DEPOSIT_DEMO ou NODE_ENV=development no VPS");
  } else {
    bad("deposit/paired/intent (simulated)", json.error ?? String(res.status));
  }
} catch (e) {
  bad("deposit/paired/intent (simulated)", String(e.message ?? e));
}

try {
  const { res: iRes, json: intent } = await postJson("/api/economy/deposit/paired/intent", {
    accountId: `${ACCOUNT}:ln`,
    amountSov: 1,
    method: "lightning",
  });
  if (!iRes.ok || !intent.depositId) {
    bad("deposit/lightning intent", intent.error ?? String(iRes.status));
  } else {
    const { res: cRes, json: inv } = await postJson("/api/lightning/create", {
      pairedDepositId: intent.depositId,
      amountSat: intent.amountSat,
      label: intent.lightningLabel,
    });
    if (!cRes.ok || !inv.id) {
      bad("lightning/create paired", inv.error ?? inv.message ?? String(cRes.status));
    } else if (inv.mode === "lnd_real") {
      ok("lightning/create paired", `LND real · ${inv.amountSat} sat`);
      console.log("  ○ simulate-settle omitido (invoice LND real — usar webhook ou pagamento)");
    } else {
      const modeLabel = inv.mode ?? "simulation";
      ok("lightning/create paired", `${modeLabel}${inv.lndFallback ? " (LND fallback)" : ""}`);
      const { res: sRes, json: settled } = await postJson(
        `/api/lightning/simulate-settle/${encodeURIComponent(inv.id)}`,
      );
      if (sRes.ok && settled.ok) {
        const { res: stRes, json: st } = await getJson(
          `/api/economy/deposit/paired/${encodeURIComponent(intent.depositId)}`,
        );
        if (stRes.ok && st.deposit?.status === "credited") {
          ok("deposit/lightning → ledger", `${st.balance?.balanceSov?.toFixed?.(2) ?? "?"} SOV`);
        } else {
          bad("deposit status credited", st.deposit?.status ?? String(stRes.status));
        }
      } else {
        bad("lightning/simulate-settle", settled.error ?? settled.hint ?? String(sRes.status));
      }
    }
  }
} catch (e) {
  bad("deposit/lightning flow", String(e.message ?? e));
}

try {
  const { res, json } = await getJson("/api/mesh/liquidity/health");
  if (res.ok && json.features?.includes("vas-tier-builder-subscribe")) {
    ok("mesh/liquidity/health", json.features.length + " features");
  } else if (res.ok) ok("mesh/liquidity/health", "online");
  else bad("mesh/liquidity/health", String(res.status));
} catch (e) {
  bad("mesh/liquidity/health", String(e.message ?? e));
}

try {
  const { res, json } = await getJson("/api/mesh/liquidity/vas/tier/builder/price");
  if (res.ok && json.monthlySov === 250) ok("vas/tier/builder/price", "250 SOV/mês");
  else bad("vas/tier/builder/price", json.error ?? String(res.status));
} catch (e) {
  bad("vas/tier/builder/price", String(e.message ?? e));
}

try {
  const { res, json } = await postJson("/api/mesh/liquidity/vas/tier/subscribe", {
    accountId: `${ACCOUNT}:builder`,
    tier: "builder",
    demoTopUp: true,
  });
  if (res.ok && json.ok) {
    ok("vas/tier/subscribe builder", `renews ${json.renewsAtIso?.slice?.(0, 10) ?? "ok"}`);
  } else if (json.error === "ALREADY_ACTIVE") {
    ok("vas/tier/subscribe builder", "já activo");
  } else if (json.error === "INSUFFICIENT_SOV") {
    bad("vas/tier/subscribe", "saldo insuficiente — demoTopUp requer dev/VITEST no server");
  } else {
    bad("vas/tier/subscribe", json.error ?? String(res.status));
  }
} catch (e) {
  bad("vas/tier/subscribe", String(e.message ?? e));
}

try {
  const { res, json } = await getJson("/api/mesh/liquidity/vas/pmu-audit/price");
  if (res.ok && json.priceSov === 100) ok("vas/pmu-audit/price", "VOID-308 100 SOV");
  else bad("vas/pmu-audit/price", String(res.status));
} catch (e) {
  bad("vas/pmu-audit/price", String(e.message ?? e));
}

const optional = process.env.CLIENTE_E2E_OPTIONAL === "1";
console.log(`\n${fail === 0 ? "✅" : "⚠️"} ${pass} ok · ${fail} fail\n`);
if (fail > 0 && optional) process.exit(0);
process.exit(fail > 0 ? 1 : 0);
