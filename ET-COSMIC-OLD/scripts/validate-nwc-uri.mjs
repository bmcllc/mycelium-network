#!/usr/bin/env node
/**
 * Valida presença/formato de URI NWC sem imprimir o segredo.
 * Exit 0 = OK para interop; 1 = corrigir .env.sovereign
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const text = readFileSync(join(root, ".env.sovereign"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* */
  }
}

loadEnv();

const uri =
  process.env.NWC_INTEROP_URI ??
  process.env.NWC_SECRET ??
  process.env.VITE_NWC_SECRET ??
  "";

if (!uri) {
  console.error("✗ NWC: variável ausente (VITE_NWC_SECRET ou NWC_SECRET)");
  process.exit(1);
}

const issues = [];
if (!uri.startsWith("nostr+walletconnect://")) {
  issues.push("deve começar com nostr+walletconnect://");
}
if (!/[?&]relay=/.test(uri)) {
  issues.push("falta parâmetro ?relay=wss://...");
}
if (!/[?&]secret=/.test(uri)) {
  issues.push("falta parâmetro &secret=<hex>");
}
if (uri.includes("...") || uri.length < 80) {
  issues.push("parece placeholder do .env.example — copie URI completa do RTL/Alby");
}

if (/relay\.getalby\.com/i.test(uri) && !process.env.NWC_ALLOW_ALBY_RELAY) {
  console.warn("○ URI usa relay.getalby.com — se get_info der timeout, recria connection com ws://127.0.0.1:7777");
}

if (issues.length > 0) {
  console.error("✗ NWC URI inválida para interop:");
  for (const i of issues) console.error(`  - ${i}`);
  console.error("");
  console.error("Como obter URI real (ver DOC/NWC-Obter-URI.md):");
  console.error("  1. Alby Hub: http://localhost:8085 → Connections → Add Connection → Copy pairing secret");
  console.error("  2. Ou PWA: http://localhost:5173/finance/payment → colar URI no campo NWC");
  console.error("  3. .env.sovereign: VITE_NWC_SECRET=nostr+walletconnect://...?relay=...&secret=...");
  console.error("  4. npm run nwc:interop");
  process.exit(1);
}

console.log("✓ NWC URI com formato válido (relay + secret presentes)");
process.exit(0);
