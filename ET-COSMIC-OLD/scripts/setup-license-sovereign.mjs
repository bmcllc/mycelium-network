#!/usr/bin/env node
/**
 * Aplica licença VOID-00 emitida (JSON de issue-void-license.mjs) em .env.sovereign.
 *
 * Uso:
 *   node scripts/issue-void-license.mjs --entropy-hex ... > license.json
 *   node scripts/setup-license-sovereign.mjs license.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureEnvSovereign, upsertEnvKeys, ENV_SOVEREIGN } from "./lib/env-sovereign.mjs";

const path = resolve(process.argv[2] ?? "");
if (!path) {
  console.error("Uso: node scripts/setup-license-sovereign.mjs <license.json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(path, "utf8"));
const snippet = raw.env_snippet ?? raw;
const keys = {
  VITE_VOID_LICENSE_ENFORCE: snippet.VITE_VOID_LICENSE_ENFORCE ?? "true",
  VITE_VOID_LICENSE_SKU: snippet.VITE_VOID_LICENSE_SKU ?? raw.sku,
  VITE_VOID_LICENSE_VENDOR_PK: snippet.VITE_VOID_LICENSE_VENDOR_PK ?? raw.vendor_pk_hex,
  VITE_VOID_LICENSE_PAYLOAD_HEX: snippet.VITE_VOID_LICENSE_PAYLOAD_HEX ?? raw.payload_hex,
  VITE_VOID_LICENSE_SIGNATURE_HEX: snippet.VITE_VOID_LICENSE_SIGNATURE_HEX ?? raw.signature_hex,
};

ensureEnvSovereign();
upsertEnvKeys(ENV_SOVEREIGN, keys);

console.log(`[license:setup] VOID-00 aplicado em .env.sovereign (SKU=${keys.VITE_VOID_LICENSE_SKU})`);
console.log(`  device_id: ${raw.device_id_hex ?? "n/d"}`);
console.log("  Rebuild: npm run build:b2b:sovereign-citizen  (ou vite build --mode sovereign)");
