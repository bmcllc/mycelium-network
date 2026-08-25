/**
 * Teste de interop NWC contra wallet real — só corre com NWC_INTEROP_LIVE=1.
 * Uso: npm run nwc:interop
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runNwcInteropHarness } from "./nwcInteropHarness";

function resolveInteropUris(): string[] {
  const uris: string[] = [];
  
  // Adiciona URIs se fornecidas diretamente em variáveis de ambiente específicas
  const vars = [
    process.env.NWC_INTEROP_URI,
    process.env.NWC_INTEROP_URI_2,
    process.env.NWC_SECRET,
    process.env.VITE_NWC_SECRET,
  ];

  for (const val of vars) {
    if (val && val.trim() && !uris.includes(val.trim())) {
      uris.push(val.trim());
    }
  }

  return uris;
}

const uris = resolveInteropUris();
const runLive = process.env.NWC_INTEROP_LIVE === "1" && uris.length > 0;

describe.skipIf(!runLive)("NWC interop live (NIP-47)", () => {
  it(
    "connect, get_info, balance, list_transactions, make_invoice on all configured wallets",
    async () => {
      mkdirSync("DOC/evidence", { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      
      console.log(`[nwc:interop] Running interop checks on ${uris.length} wallets...`);
      
      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        const label = `wallet_${i + 1}`;
        
        console.log(`[nwc:interop] Testing ${label}...`);
        const report = await runNwcInteropHarness(uri, {
          timeoutMs: 30_000,
          invoiceAmountMsats: 1_000,
        });

        const keySuffix = report.walletPubKey ? report.walletPubKey.slice(0, 8) : label;
        const outPath = `DOC/evidence/nwc-interop-${keySuffix}-${date}.json`;
        writeFileSync(outPath, JSON.stringify(report, null, 2));

        console.log(`[nwc:interop] Relatório salvo: ${outPath}`);
        console.log(
          `[nwc:interop] ${label} - pass=${report.summary.passed} fail=${report.summary.failed} skip=${report.summary.skipped}`,
        );

        expect(report.summary.failed, `${label} falhou nos checks: ` + report.checks.map((c) => `${c.id}: ${c.details}`).join("; ")).toBe(
          0,
        );
      }
    },
    240_000,
  );
});
