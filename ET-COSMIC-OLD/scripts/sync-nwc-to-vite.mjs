#!/usr/bin/env node
/** Copia NWC_SECRET → VITE_NWC_SECRET se VITE_* estiver vazio. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ENV = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.sovereign");
let text = readFileSync(ENV, "utf8");
const found = {};
for (const line of text.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  found[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}
const uri = found.NWC_SECRET || found.NWC_INTEROP_URI || "";
const vite = found.VITE_NWC_SECRET || "";
if (!uri?.startsWith("nostr+walletconnect://")) {
  console.error("[nwc] NWC_SECRET ausente no .env.sovereign");
  process.exit(1);
}
if (vite?.startsWith("nostr+walletconnect://")) {
  console.log("[nwc] VITE_NWC_SECRET já definido");
  process.exit(0);
}
const re = /^VITE_NWC_SECRET=.*$/m;
const line = `VITE_NWC_SECRET=${uri}`;
text = re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, "\n")}${line}\n`;
writeFileSync(ENV, text);
console.log("[nwc] VITE_NWC_SECRET ← NWC_SECRET (mesma URI)");
