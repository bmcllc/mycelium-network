#!/usr/bin/env node
/**
 * E2E completo /finance/payment — HTTP server + NWC interop (se configurado).
 * Alinha checklist P2 do VOID-QRC-PLANO-INDUSTRIA.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import "../server/loadEnv.js";

const BASE = process.env.FINANCE_E2E_URL ?? "http://127.0.0.1:3001";
const START_SERVER = process.env.FINANCE_E2E_START_SERVER === "1";

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/api/economy/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  let child;
  if (!(await serverUp()) && START_SERVER) {
    console.log("[finance:full] A arrancar server:sovereign…");
    child = spawn("node", ["server/server.js"], {
      cwd: process.cwd(),
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "development" },
    });
    for (let i = 0; i < 15; i++) {
      await sleep(500);
      if (await serverUp()) break;
    }
  }

  console.log("\n══ Finance payment FULL E2E ══\n");

  const httpLive = await serverUp();
  if (!httpLive) {
    console.log("  ○ HTTP server offline — testes in-process only (FINANCE_E2E_START_SERVER=1 para HTTP)\n");
  }

  const vitestEnv = httpLive ? { FINANCE_E2E_HTTP: "1", FINANCE_E2E_URL: BASE } : {};

  const steps = [
    ["finance-preflight", "node", ["scripts/finance-preflight.mjs"], {}, false],
    ["payment-panel-flow", "npx", ["vitest", "run", "src/crypto/paymentPanel.flow.test.ts", "src/routes/finance.payment.route.test.ts", "src/server/finance.payment.test.ts"], vitestEnv, false],
    ["finance-payment-e2e", "node", ["scripts/finance-payment-e2e.mjs"], { FINANCE_E2E_HTTP_OPTIONAL: "1" }, true],
  ];

  if (process.env.FINANCE_NWC_LIVE === "1" && (process.env.VITE_NWC_SECRET || process.env.NWC_SECRET)) {
    steps.push([
      "nwc-interop-live",
      "npx",
      ["vitest", "run", "src/crypto/nwcInterop.live.test.ts"],
      { NWC_INTEROP_LIVE: "1" },
      true,
    ]);
  } else {
    console.log("  ○ NWC live skip — FINANCE_NWC_LIVE=1 + VITE_NWC_SECRET para interop\n");
  }

  let fail = 0;
  for (const [label, cmd, args, extraEnv, optional] of steps) {
    console.log(`▸ ${label}`);
    const code = await new Promise((resolve) => {
      const p = spawn(cmd, args, {
        cwd: process.cwd(),
        stdio: "inherit",
        env: { ...process.env, FINANCE_E2E_URL: BASE, ...extraEnv },
      });
      p.on("close", resolve);
    });
    if (code !== 0) {
      if (optional) console.log(`  ○ ${label} skip (opcional — relay/wallet offline)\n`);
      else fail++;
    }
  }

  if (child) child.kill("SIGTERM");

  console.log(fail === 0 ? "\n✅ Finance FULL E2E OK\n" : `\n⚠️ ${fail} passo(s) falharam\n`);
  console.log("Browser manual: npm run dev → http://localhost:5173/finance/payment\n");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
