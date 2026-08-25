#!/usr/bin/env node
/**
 * Cron mensal — renova tiers vencidos (débito ledger $SOV).
 * systemd: 0 3 * * * cd /path/ET-COSMIC && node scripts/tier-renewal-cron.mjs
 */
import "../server/loadEnv.js";
import { processDueRenewals } from "../server/mesh/tierSubscriptions.js";

const report = processDueRenewals();
console.log(JSON.stringify(report, null, 2));
process.exit(report.failed > 0 ? 1 : 0);
