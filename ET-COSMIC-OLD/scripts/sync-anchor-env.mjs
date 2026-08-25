#!/usr/bin/env node
/**
 * Grava endereço ETRNETAnchor em .env.sovereign e VOID-COSMIC_VPS/pmu.env
 *
 * Uso:
 *   node scripts/sync-anchor-env.mjs 0xABC...
 *   node scripts/sync-anchor-env.mjs   # lê vault/etrnet-anchor-deploy.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT_JSON = join(ROOT, "vault", "etrnet-anchor-deploy.json");
const SOVEREIGN = join(ROOT, ".env.sovereign");
const PMU_ENV = join(ROOT, "pmu.env");

function loadVault() {
  const arg = process.argv.find((a) => a.startsWith("0x"));
  if (arg?.startsWith("0x")) {
    const sepolia = process.argv.includes("--sepolia");
    const net = sepolia ? "sepolia" : null;
    return { address: arg, network: net };
  }
  if (existsSync(VAULT_JSON)) {
    return JSON.parse(readFileSync(VAULT_JSON, "utf8"));
  }
  console.error("Uso: node scripts/sync-anchor-env.mjs 0x...  (ou deploy primeiro)");
  process.exit(1);
}

function upsertLine(text, key, value, { exportPrefix = false } = {}) {
  const prefix = exportPrefix ? "export " : "";
  const line = `${prefix}${key}=${value}`;
  const re = new RegExp(`^${exportPrefix ? "export " : ""}${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, line);
  const trimmed = text.replace(/\n?$/, "\n");
  return trimmed + (trimmed.endsWith("\n") ? "" : "\n") + line + "\n";
}

function readSovereignRpc(network) {
  const text = readFileSync(SOVEREIGN, "utf8");
  const pick = (key) => {
    const m = text.match(new RegExp(`^${key}=(.+)$`, "m"));
    return m?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  };
  const sepoliaDefault = "https://ethereum-sepolia-rpc.publicnode.com";

  if (network === "localhost" || network === "hardhat") {
    return "http://127.0.0.1:8545";
  }
  if (network === "sepolia") {
    const rpc = pick("SEPOLIA_RPC_URL") || sepoliaDefault;
    if (rpc.includes("127.0.0.1") || rpc.includes("localhost")) {
      return sepoliaDefault;
    }
    return rpc;
  }

  const anchor = pick("ANCHOR_RPC_URL");
  if (anchor && !anchor.includes("127.0.0.1") && !anchor.includes("localhost")) {
    return anchor;
  }
  return pick("SEPOLIA_RPC_URL") || pick("VITE_ETHEREUM_RPC_URL") || sepoliaDefault;
}

function patchSovereign(address, rpcUrl) {
  let text = readFileSync(SOVEREIGN, "utf8");
  text = upsertLine(text, "VITE_ETRNET_ANCHOR_ADDRESS", address);
  text = upsertLine(text, "ETRNET_ANCHOR_ADDRESS", address);
  text = upsertLine(text, "ANCHOR_RPC_URL", rpcUrl);
  text = upsertLine(text, "VITE_ETHEREUM_RPC_URL", rpcUrl);
  if (!/^VITE_PMU_AUTO_ANCHOR=/m.test(text)) {
    text = upsertLine(text, "VITE_PMU_AUTO_ANCHOR", "true");
  }
  writeFileSync(SOVEREIGN, text);
  console.log("[sync] .env.sovereign atualizado");
}

function patchPmuEnv(address, opts) {
  if (!existsSync(PMU_ENV)) {
    console.warn("[sync] pmu.env não encontrado:", PMU_ENV);
    return;
  }
  let text = readFileSync(PMU_ENV, "utf8");
  text = upsertLine(text, "ETRNET_ANCHOR_ADDRESS", address, { exportPrefix: true });
  text = upsertLine(text, "ANCHOR_RPC_URL", opts.rpcUrl ?? "http://127.0.0.1:8545", {
    exportPrefix: true,
  });
  if (opts.anchorPrivateKey) {
    text = upsertLine(text, "ANCHOR_PRIVATE_KEY", opts.anchorPrivateKey, {
      exportPrefix: true,
    });
  }
  writeFileSync(PMU_ENV, text);
  console.log("[sync] pmu.env atualizado:", PMU_ENV);
}

const vault = loadVault();
const address = vault.address ?? vault;
if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  console.error("Endereço inválido:", address);
  process.exit(1);
}

const localKey =
  process.env.ANCHOR_PRIVATE_KEY ||
  (process.argv.includes("--local-hardhat-key")
    ? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    : undefined);

const rpcUrl = readSovereignRpc(vault.network);
patchSovereign(address, rpcUrl);
patchPmuEnv(address, { anchorPrivateKey: localKey, rpcUrl });
console.log(`[sync] RPC (${vault.network ?? "custom"}): ${rpcUrl}`);

console.log("\nPróximo:");
console.log("  1. npm run quantum:stop && npm run quantum:dev   # recarrega pmu.env");
console.log("  2. npm run dev                                    # recarrega .env.sovereign");
console.log("  3. npm run pmu:anchor:state");
