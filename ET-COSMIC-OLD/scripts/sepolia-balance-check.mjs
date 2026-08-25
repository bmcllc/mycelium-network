#!/usr/bin/env node
/** Verifica saldo Sepolia do deployer (sem imprimir chaves). */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.sovereign"), "utf8");
const pick = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim() ?? "";
const rpc = pick("SEPOLIA_RPC_URL") || "https://ethereum-sepolia-rpc.publicnode.com";
const pk = pick("PRIVATE_KEY");
if (!pk) {
  console.error("[sepolia] PRIVATE_KEY ausente — npm run anchor:bootstrap-sepolia");
  process.exit(1);
}
const wallet = new ethers.Wallet(pk.startsWith("0x") ? pk : `0x${pk}`);
const provider = new ethers.JsonRpcProvider(rpc);
const bal = await provider.getBalance(wallet.address);
const eth = ethers.formatEther(bal);
console.log(`[sepolia] Deployer: ${wallet.address}`);
console.log(`[sepolia] Saldo: ${eth} ETH`);
if (bal === 0n) {
  console.log("[sepolia] Precisa de faucet (~0.01 ETH):");
  console.log("  https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("  https://sepoliafaucet.com/");
  process.exit(2);
}
process.exit(0);
