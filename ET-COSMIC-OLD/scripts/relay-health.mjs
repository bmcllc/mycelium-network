#!/usr/bin/env node
/**
 * Sonda relays NOSTR via WebSocket (Node 22+).
 * Uso: node scripts/relay-health.mjs [ws://primary] [wss://fallback]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

function loadEnvSovereign() {
  const path = join(root, ".env.sovereign");
  try {
    const text = readFileSync(path, "utf8");
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
    /* sem .env.sovereign */
  }
}

loadEnvSovereign();

const urls = process.argv.slice(2).filter((u) => typeof u === "string" && u.trim().length > 0);
if (urls.length === 0) {
  const primary = (process.env.VITE_NOSTR_RELAY_PRIMARY ?? "ws://localhost:7777").trim();
  const fallback = (process.env.VITE_NOSTR_RELAY_FALLBACK ?? "").trim();
  urls.push(primary);
  if (fallback) urls.push(fallback);
}

function probe(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    let done = false;
    const finish = (partial) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* */
      }
      resolve({ url, ...partial });
    };
    const timer = setTimeout(
      () => finish({ ok: false, latencyMs: Date.now() - started, error: "timeout" }),
      timeoutMs,
    );
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      finish({ ok: false, latencyMs: 0, error: msg });
      return;
    }
    ws.onopen = () => finish({ ok: true, latencyMs: Date.now() - started });
    ws.onerror = () =>
      finish({ ok: false, latencyMs: Date.now() - started, error: "connection_error" });
  });
}

let failed = 0;
console.log("=== NOSTR relay health ===\n");

for (const url of [...new Set(urls)]) {
  const r = await probe(url);
  const icon = r.ok ? "✓" : "✗";
  const detail = r.ok ? `${r.latencyMs}ms` : r.error;
  console.log(`${icon} ${url} — ${detail}`);
  if (!r.ok) failed++;
}

console.log("");
process.exit(failed > 0 ? 1 : 0);
