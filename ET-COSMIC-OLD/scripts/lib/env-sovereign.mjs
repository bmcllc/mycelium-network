import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const ENV_SOVEREIGN = join(ROOT, ".env.sovereign");
export const ENV_EXAMPLE = join(ROOT, ".env.sovereign.example");

export function readEnvText(path = ENV_SOVEREIGN) {
  return readFileSync(path, "utf8");
}

export function parseEnv(text) {
  const out = {};
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
    out[key] = val;
  }
  return out;
}

export function upsertEnvLine(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
  if (re.test(text)) return text.replace(re, line);
  return `${text.replace(/\n?$/, "\n")}${line}\n`;
}

export function upsertEnvKeys(path, updates) {
  let text = existsSync(path) ? readEnvText(path) : "";
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;
    text = upsertEnvLine(text, key, String(value));
  }
  writeFileSync(path, text);
  return text;
}

export function ensureEnvSovereign() {
  if (existsSync(ENV_SOVEREIGN)) return false;
  if (!existsSync(ENV_EXAMPLE)) {
    throw new Error(".env.sovereign.example não encontrado");
  }
  copyFileSync(ENV_EXAMPLE, ENV_SOVEREIGN);
  return true;
}
