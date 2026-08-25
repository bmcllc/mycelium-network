#!/usr/bin/env npx tsx
/**
 * CLI ScrapScanner — mesmo núcleo que o painel VOID (sem app intermediário).
 */
import {
  scrapScanExchanges,
  scrapScanTelegramChannel,
  scrapScanSocialProfile,
  logsToStrings,
} from "./scrapScanner";

function help(): void {
  console.log("\n■ VØID PHANTOM HARVESTER — SCRAPSCANNER (VOID / CLI)\n");
  console.log("Uso: npm run scrapscanner -- [opções]\n");
  console.log("  --help");
  console.log("  --social <canal_telegram>     Canal público t.me/s/…");
  console.log("  --profile <user>            Perfil Telegram");
  console.log("  --x <query>                   Pesquisa X via Nitter (HTML público)");
  console.log("  --exchange [SYMBOL]         Tickers (default BTCUSDT)");
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) help();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--social") {
      const user = args[++i];
      if (!user) {
        console.error("Especifique o canal Telegram.");
        process.exit(1);
      }
      const r = await scrapScanTelegramChannel(user);
      logsToStrings(r.logs).forEach((l) => console.log(l));
    } else if (arg === "--profile") {
      const user = args[++i];
      if (!user) process.exit(1);
      const r = await scrapScanSocialProfile("telegram", user);
      logsToStrings(r.logs).forEach((l) => console.log(l));
    } else if (arg === "--x") {
      const q = args[++i];
      if (!q) process.exit(1);
      const r = await scrapScanSocialProfile("x", q);
      logsToStrings(r.logs).forEach((l) => console.log(l));
    } else if (arg === "--exchange") {
      const sym = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "BTCUSDT";
      const r = await scrapScanExchanges(sym);
      logsToStrings(r.logs).forEach((l) => console.log(l));
    } else {
      console.error(`Opção desconhecida: ${arg}`);
      help();
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
