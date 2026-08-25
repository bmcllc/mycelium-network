#!/usr/bin/env node
/**
 * Propõe raiz ETRNETAnchor via ethers (sem web3 Python).
 * Env: ANCHOR_RPC_URL, ANCHOR_PRIVATE_KEY, ETRNET_ANCHOR_ADDRESS, QUANTUM_API
 */
import { sha3_256 } from "@noble/hashes/sha3.js";
import { ethers } from "ethers";
import { loadSovereignEnv } from "./load-env-sovereign.mjs";

loadSovereignEnv();

const API = process.env.QUANTUM_API || "http://127.0.0.1:8472";
const RPC = process.env.ANCHOR_RPC_URL || process.env.VITE_ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PK = process.env.ANCHOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
const ADDR = process.env.ETRNET_ANCHOR_ADDRESS || process.env.VITE_ETRNET_ANCHOR_ADDRESS;

const ABI = [
  "function proposeRoot(bytes32 _newRoot)",
  "function getState() view returns (bytes32,uint256,uint256,bytes32,uint256)",
];

function payloadRoot(payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return (
    "0x" +
    Array.from(sha3_256(new TextEncoder().encode(canonical)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function main() {
  if (!ADDR || !PK) {
    console.error("Defina ETRNET_ANCHOR_ADDRESS e ANCHOR_PRIVATE_KEY");
    process.exit(1);
  }

  const auditRes = await fetch(`${API}/pmu/audit/full?bits=2048`);
  if (!auditRes.ok) {
    console.error("Auditoria falhou:", await auditRes.text());
    process.exit(1);
  }
  const audit = await auditRes.json();
  const payload = {
    protocol: "PMU_ANCHOR_COMMIT",
    audit_sha3: audit.entropy?.sha3_256 ?? "",
    truth_level_id: audit.truth_level_id ?? "unknown",
    generated_at: audit.generated_at ?? Date.now(),
    void_pool_tip: audit.void_pool?.after?.chain_tip,
  };
  const root = payloadRoot(payload);

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK.startsWith("0x") ? PK : `0x${PK}`, provider);
  const contract = new ethers.Contract(ADDR, ABI, wallet);

  console.log("[pmu:anchor] root", root);
  console.log("[pmu:anchor] contract", ADDR, "rpc", RPC);
  const fee = await provider.getFeeData();
  const tx = await contract.proposeRoot(root, {
    maxFeePerGas: fee.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas:
      fee.maxPriorityFeePerGas && fee.maxFeePerGas && fee.maxPriorityFeePerGas <= fee.maxFeePerGas
        ? fee.maxPriorityFeePerGas
        : fee.maxFeePerGas
          ? fee.maxFeePerGas / 10n
          : undefined,
  });
  console.log("[pmu:anchor] tx", tx.hash);
  const rec = await tx.wait();
  console.log("[pmu:anchor] mined block", rec?.blockNumber, "status", rec?.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
