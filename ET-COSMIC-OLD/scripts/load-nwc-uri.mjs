#!/usr/bin/env node
/** Imprime URI NWC do .env.sovereign (stdout). Não logar em CI público. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load() {
  const keys = ["NWC_INTEROP_URI", "NWC_SECRET", "VITE_NWC_SECRET"];
  const fromEnv = keys.map((k) => process.env[k]).find((v) => v && v.trim());
  if (fromEnv) return fromEnv.trim();

  try {
    const text = readFileSync(join(root, ".env.sovereign"), "utf8");
    const found = {};
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
      found[key] = val;
    }
    for (const k of keys) {
      if (found[k]?.trim()) return found[k].trim();
    }
  } catch {
    /* */
  }
  return "";
}

const uri = load();
if (uri) process.stdout.write(uri);
