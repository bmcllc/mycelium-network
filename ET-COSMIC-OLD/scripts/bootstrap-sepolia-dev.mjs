#!/usr/bin/env node
/**
 * Preenche .env.sovereign para deploy Sepolia de DEV (só chaves vazias).
 * Conta Hardhat #0 — chave pública de teste; precisa de ETH Sepolia no faucet.
 * Nunca imprime valores secretos.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(ROOT, ".env.sovereign");

/** Hardhat account #0 — só testnet; chave conhecida em todo o ecossistema. */
const DEV_PK = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEV_DAO = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function upsert(text, key, value, comment) {
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(text)) {
    const cur = text.match(re)?.[0] ?? "";
    const empty = /^[^=]+=\s*$/.test(cur) || /^[^=]+=$/.test(cur);
    if (!empty) return { text, changed: false, key };
    text = text.replace(re, comment ? `${comment}\n${line}` : line);
    return { text, changed: true, key };
  }
  const block = (comment ? `${comment}\n` : "") + `${line}\n`;
  return { text: text.replace(/\n?$/, "\n") + block, changed: true, key };
}

function main() {
  if (!readFileSync(ENV, "utf8")) {
    console.error("[bootstrap] .env.sovereign não encontrado");
    process.exit(1);
  }
  let text = readFileSync(ENV, "utf8");
  const touched = [];

  const comment =
    "# DEV Sepolia — conta Hardhat #0 (faucet: https://sepoliafaucet.com)";

  for (const [key, val] of [
    ["PRIVATE_KEY", DEV_PK],
    ["DAO_MULTISIG", DEV_DAO],
    ["ANCHOR_PRIVATE_KEY", `0x${DEV_PK}`],
    ["ANCHOR_RPC_URL", ""], // preenchido abaixo se SEPOLIA_RPC_URL existir
  ]) {
    if (key === "ANCHOR_RPC_URL") continue;
    const r = upsert(text, key, val, key === "PRIVATE_KEY" ? comment : undefined);
    text = r.text;
    if (r.changed) touched.push(key);
  }

  const sepMatch = text.match(/^SEPOLIA_RPC_URL=(.+)$/m);
  const sep = sepMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (sep) {
    const r = upsert(text, "ANCHOR_RPC_URL", sep);
    text = r.text;
    if (r.changed) touched.push("ANCHOR_RPC_URL");
    const r2 = upsert(text, "VITE_ETHEREUM_RPC_URL", sep);
    text = r2.text;
    if (r2.changed) touched.push("VITE_ETHEREUM_RPC_URL");
  }

  writeFileSync(ENV, text);
  if (touched.length === 0) {
    console.log("[bootstrap] Sepolia: variáveis já preenchidas — nada alterado");
  } else {
    console.log("[bootstrap] Sepolia dev:", touched.join(", "));
    console.log("[bootstrap] Endereço deployer/DAO:", DEV_DAO);
    console.log("[bootstrap] Peça ETH Sepolia no faucet e depois: npm run anchor:sepolia");
  }
}

main();
