/**
 * Cliente ETRNETAnchor — leitura JSON-RPC + transações via wallet (MetaMask).
 */

import { sha3_256 } from "@noble/hashes/sha3.js";
import { loadSovereignConfig } from "../config/sovereign";
import type { PmuAnchorCommitPayload } from "./pmuGovernanceMesh";
import {
  decodeGetStateResult,
  encodeFinalizeRootCalldata,
  encodeGetStateCalldata,
  encodeProposeRootCalldata,
} from "./etrnetAnchorAbi";

export interface AnchorChainState {
  currentRoot: string;
  lastUpdate: number;
  updateCount: number;
  pendingRoot: string;
  pendingTimestamp: number;
  contractAddress: string;
}

function getRpcUrl(): string {
  return (
    import.meta.env.VITE_ETHEREUM_RPC_URL ??
    import.meta.env.VITE_SEPOLIA_RPC_URL ??
    "http://127.0.0.1:8545"
  );
}

function getContractAddress(): string | undefined {
  return loadSovereignConfig().anchorAddress;
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (!json.result) throw new Error("eth_call sem resultado");
  return json.result;
}

/** Raiz Merkle bytes32 = SHA3-256 do payload PMU canónico. */
export function computeAnchorRootFromPayload(payload: PmuAnchorCommitPayload): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const hash = sha3_256(new TextEncoder().encode(canonical));
  return `0x${Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function fetchAnchorState(): Promise<AnchorChainState | null> {
  const address = getContractAddress();
  if (!address) return null;
  const raw = await ethCall(address, encodeGetStateCalldata());
  const decoded = decodeGetStateResult(raw);
  return {
    currentRoot: decoded.currentRoot,
    lastUpdate: Number(decoded.lastUpdate),
    updateCount: Number(decoded.updateCount),
    pendingRoot: decoded.pendingRoot,
    pendingTimestamp: Number(decoded.pendingTimestamp),
    contractAddress: address,
  };
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getWallet(): EthereumProvider | null {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

async function sendWalletTx(to: string, data: string): Promise<string> {
  const wallet = getWallet();
  if (!wallet) throw new Error("Wallet não encontrada (MetaMask / Rabby)");
  const accounts = (await wallet.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("Nenhuma conta na wallet");
  const txHash = (await wallet.request({
    method: "eth_sendTransaction",
    params: [{ from, to, data }],
  })) as string;
  return txHash;
}

/** DAO propõe nova raiz (requer wallet = daoMultisig). */
export async function proposeAnchorRoot(rootHex: string): Promise<{ txHash: string; root: string }> {
  const address = getContractAddress();
  if (!address) throw new Error("VITE_ETRNET_ANCHOR_ADDRESS não configurado");
  const data = encodeProposeRootCalldata(rootHex);
  const txHash = await sendWalletTx(address, data);
  return { txHash, root: rootHex };
}

export async function finalizeAnchorOnChain(): Promise<{ txHash: string }> {
  const address = getContractAddress();
  if (!address) throw new Error("VITE_ETRNET_ANCHOR_ADDRESS não configurado");
  const txHash = await sendWalletTx(address, encodeFinalizeRootCalldata());
  return { txHash };
}

/** Fluxo completo: payload → proposeRoot na L2. */
export async function commitAuditToAnchor(
  payload: PmuAnchorCommitPayload,
): Promise<{ root: string; txHash: string }> {
  const root = computeAnchorRootFromPayload(payload);
  const { txHash } = await proposeAnchorRoot(root);
  return { root, txHash };
}
