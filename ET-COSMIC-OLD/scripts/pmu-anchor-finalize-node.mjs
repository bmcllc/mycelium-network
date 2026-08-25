#!/usr/bin/env node
/**
 * Finaliza raiz pendente no ETRNETAnchor (após CHALLENGE_PERIOD).
 * Env: ANCHOR_RPC_URL, ANCHOR_PRIVATE_KEY, ETRNET_ANCHOR_ADDRESS
 */
import { ethers } from "ethers";
import { loadSovereignEnv } from "./load-env-sovereign.mjs";

loadSovereignEnv();

const RPC = process.env.ANCHOR_RPC_URL || process.env.VITE_ETHEREUM_RPC_URL;
const PK = process.env.ANCHOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
const ADDR = process.env.ETRNET_ANCHOR_ADDRESS || process.env.VITE_ETRNET_ANCHOR_ADDRESS;

const ABI = [
  "function finalizeRoot()",
  "function getState() view returns (bytes32,uint256,uint256,bytes32,uint256)",
  "function CHALLENGE_PERIOD() view returns (uint256)",
];

async function main() {
  if (!ADDR || !PK || !RPC) {
    console.error("Defina ETRNET_ANCHOR_ADDRESS, ANCHOR_PRIVATE_KEY, ANCHOR_RPC_URL");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK.startsWith("0x") ? PK : `0x${PK}`, provider);
  const contract = new ethers.Contract(ADDR, ABI, wallet);

  const state = await contract.getState();
  const pending = state[3];
  const pendingTs = Number(state[4]);
  const period = Number(await contract.CHALLENGE_PERIOD());
  const now = Math.floor(Date.now() / 1000);
  const unlock = pendingTs + period;

  if (pending === ethers.ZeroHash) {
    console.log("[pmu:anchor:finalize] Nada pendente — npm run pmu:anchor:propose:node primeiro");
    process.exit(1);
  }

  if (now < unlock) {
    const waitMin = Math.ceil((unlock - now) / 60);
    console.log(`[pmu:anchor:finalize] Aguarda ~${waitMin} min (CHALLENGE_PERIOD=${period}s)`);
    console.log(`[pmu:anchor:finalize] Repete: npm run pmu:anchor:finalize`);
    process.exit(2);
  }

  const fee = await provider.getFeeData();
  const tx = await contract.finalizeRoot({
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas:
      fee.maxPriorityFeePerGas && fee.maxFeePerGas && fee.maxPriorityFeePerGas <= fee.maxFeePerGas
        ? fee.maxPriorityFeePerGas
        : fee.maxFeePerGas
          ? fee.maxFeePerGas / 10n
          : undefined,
  });
  console.log("[pmu:anchor:finalize] tx", tx.hash);
  const rec = await tx.wait();
  console.log("[pmu:anchor:finalize] mined block", rec?.blockNumber, "status", rec?.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
