#!/usr/bin/env node
/** Carrega .env.sovereign em process.env (sem sobrescrever vars já definidas). */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ENV = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.sovereign");

export function loadSovereignEnv() {
  if (!existsSync(ENV)) return false;
  for (const line of readFileSync(ENV, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

if (process.argv[1]?.endsWith("load-env-sovereign.mjs")) {
  loadSovereignEnv();
}
