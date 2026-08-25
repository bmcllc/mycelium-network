/**
 * VOID-710 — Ledger $SOV (micro-SOV: 1 SOV = 1_000_000 µSOV).
 */

import crypto from "crypto";
import {
  createPersistedStore,
  economyPersistenceEnabled,
  registerEconomyFlusher,
} from "./economyPersistence.js";

const MICRO_PER_SOV = 1_000_000;
const PROTOCOL_BPS = parseInt(process.env.VITE_PROTOCOL_ROYALTY_BPS ?? "10", 10);

const store = createPersistedStore(process.env.SOV_LEDGER_PATH ?? "sov-ledger.json");
const { map: accounts, schedule: schedulePersist, flush: flushLedgerStore, filePath: LEDGER_PATH } =
  store;

registerEconomyFlusher(flushLedgerStore);

function ensureAccount(accountId) {
  if (!accounts.has(accountId)) {
    accounts.set(accountId, { accountId, balanceMicro: 0, history: [] });
  }
  return accounts.get(accountId);
}

export function microToSov(micro) {
  return micro / MICRO_PER_SOV;
}

export function sovToMicro(sov) {
  return Math.floor(Number(sov) * MICRO_PER_SOV);
}

export function applyProtocolFee(grossMicro) {
  const fee = Math.floor((grossMicro * PROTOCOL_BPS) / 10000);
  return { feeMicro: fee, netMicro: grossMicro - fee, protocolBps: PROTOCOL_BPS };
}

export function creditAccount(accountId, amountMicro, meta = {}) {
  const acc = ensureAccount(accountId);
  acc.balanceMicro += amountMicro;
  acc.history.unshift({
    id: `tx-${crypto.randomBytes(6).toString("hex")}`,
    type: "credit",
    amountMicro,
    at: Date.now(),
    ...meta,
  });
  if (acc.history.length > 200) acc.history.length = 200;
  schedulePersist();
  return { accountId, balanceMicro: acc.balanceMicro, creditedMicro: amountMicro };
}

export function debitAccount(accountId, amountMicro, meta = {}) {
  const acc = ensureAccount(accountId);
  if (acc.balanceMicro < amountMicro) {
    return { error: "INSUFFICIENT_SOV", balanceMicro: acc.balanceMicro, requiredMicro: amountMicro };
  }
  acc.balanceMicro -= amountMicro;
  acc.history.unshift({
    id: `tx-${crypto.randomBytes(6).toString("hex")}`,
    type: "debit",
    amountMicro,
    at: Date.now(),
    ...meta,
  });
  schedulePersist();
  return { accountId, balanceMicro: acc.balanceMicro, debitedMicro: amountMicro };
}

export function getBalance(accountId) {
  const acc = ensureAccount(accountId);
  return {
    sku: "VOID-710",
    accountId,
    balanceMicro: acc.balanceMicro,
    balanceSov: microToSov(acc.balanceMicro),
    protocolBps: PROTOCOL_BPS,
    persisted: economyPersistenceEnabled(),
    ledgerPath: economyPersistenceEnabled() ? LEDGER_PATH : null,
  };
}

export function getHistory(accountId, limit = 30) {
  const acc = ensureAccount(accountId);
  return { accountId, entries: acc.history.slice(0, limit) };
}

export function transferWithFee(fromId, toId, grossMicro, channel) {
  const { feeMicro, netMicro } = applyProtocolFee(grossMicro);
  const treasuryId = "treasury:montelauro";
  const d = debitAccount(fromId, grossMicro, { channel, to: toId });
  if (d.error) return d;
  creditAccount(toId, netMicro, { channel, from: fromId });
  if (feeMicro > 0) creditAccount(treasuryId, feeMicro, { channel, fee: true });
  return {
    sku: "VOID-710",
    fromId,
    toId,
    grossMicro,
    feeMicro,
    netMicro,
    balanceFrom: getBalance(fromId).balanceMicro,
    balanceTo: getBalance(toId).balanceMicro,
  };
}

export function economyStatus() {
  let totalMicro = 0;
  for (const a of accounts.values()) totalMicro += a.balanceMicro;
  return {
    sku: "VOID-710",
    currency: "SOV",
    microUnit: "µSOV",
    accounts: accounts.size,
    totalSupplyMicro: totalMicro,
    totalSupplySov: microToSov(totalMicro),
    protocolBps: PROTOCOL_BPS,
    revenueChannels: ["hosting", "binary", "mining", "marketplace", "dat", "liquidity_mining", "sla"],
    persisted: economyPersistenceEnabled(),
    ledgerPath: economyPersistenceEnabled() ? LEDGER_PATH : null,
  };
}

export function flushSovLedger() {
  flushLedgerStore();
}
