#!/usr/bin/env node
/** @deprecated Use: npm run scrapscanner */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, "..");
const args = process.argv.slice(2);

const r = spawnSync("npx", ["tsx", "src/harvesters/scrapScannerCli.ts", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
process.exit(r.status ?? 1);
