#!/usr/bin/env node
/**
 * Gera carteira nova para Sepolia (evita Hardhat #0 bloqueado em faucets).
 * Atualiza PRIVATE_KEY, DAO_MULTISIG, ANCHOR_PRIVATE_KEY no .env.sovereign.
 * Imprime só o endereço público — nunca loga a chave.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";

const ENV = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.sovereign");
const w = Wallet.createRandom();
const pk = w.privateKey.slice(2);
const addr = w.address;

let text = readFileSync(ENV, "utf8");
const upsert = (key, val, comment) => {
  const line = `${key}=${val}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) text = text.replace(re, comment ? `${comment}\n${line}` : line);
  else text = text.replace(/\n?$/, "\n") + (comment ? `${comment}\n` : "") + `${line}\n`;
};

const comment =
  "# Sepolia deployer (gerado localmente — NÃO é Hardhat #0; guarde backup offline se for produção)";
upsert("PRIVATE_KEY", pk, comment);
upsert("DAO_MULTISIG", addr);
upsert("ANCHOR_PRIVATE_KEY", w.privateKey);

writeFileSync(ENV, text);

console.log("[sepolia-wallet] Nova carteira (faucet usa SÓ este endereço):");
console.log("");
console.log(`  ${addr}`);
console.log("");
console.log("Próximo:");
console.log("  1. Faucet PoW (sem mainnet): https://sepolia-faucet.pk910.de/");
console.log("  2. Ou Google Cloud (conta Google diferente):");
console.log("     https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
console.log("  3. npm run anchor:sepolia:balance");
console.log("  4. npm run anchor:sepolia");
console.log("");
console.log("Backup: exporte a chave do .env.sovereign (PRIVATE_KEY) para um gestor seguro.");
