/**
 * DMC Token — Dual Token System for DePIN
 *
 * $DMC-U (Utility): Emissão elástica, gerada por Proof-of-Data, queimada após uso.
 * $DMC-G (Governance): Emissão fixa (100M), distribuída por Proof-of-Connectivity.
 *
 * Integrado com o ledger SOV existente — não substitui, estende.
 */

import { creditAccount, debitAccount, applyProtocolFee } from "./sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "./economyPersistence.js";

// ─── Token State ─────────────────────────────────────────────────────────────

const dmcStore = createPersistedStore("dmc-tokens.json", { idField: "accountId" });
registerEconomyFlusher(dmcStore.flush);

// $DMC-G: emissão fixa
const DMC_G_MAX_SUPPLY = 100_000_000_000_000; // 100M * 1M micro
let dmcGCirculating = 0;

// $DMC-U: emissão elástica (sem cap)
let dmcUCirculating = 0;
let dmcUBurned = 0;

// ─── $DMC-U (Utility Token) ─────────────────────────────────────────────────

/** Credita $DMC-U para uma conta (emissão por Proof-of-Data). */
export function creditDMCU(accountId, amountMicro, reason = "pod") {
  const entry = getOrCreateEntry(accountId);
  entry.dmcu += amountMicro;
  dmcUCirculating += amountMicro;
  dmcStore.map.set(accountId, entry);
  dmcStore.schedule();
  return { accountId, dmcu: entry.dmcu, credited: amountMicro, reason };
}

/** Queima $DMC-U (removido da circulação após uso). */
export function burnDMCU(accountId, amountMicro) {
  const entry = getOrCreateEntry(accountId);
  if (entry.dmcu < amountMicro) return { error: "INSUFFICIENT_DMCU", available: entry.dmcu };
  entry.dmcu -= amountMicro;
  dmcUBurned += amountMicro;
  dmcUCirculating -= amountMicro;
  dmcStore.map.set(accountId, entry);
  dmcStore.schedule();
  return { accountId, dmcu: entry.dmcu, burned: amountMicro };
}

/** Transfere $DMC-U entre contas (com taxa de protocolo). */
export function transferDMCU(fromId, toId, amountMicro, bps = 10) {
  const from = getOrCreateEntry(fromId);
  const fee = Math.floor((amountMicro * bps) / 10_000);
  const net = amountMicro - fee;
  if (from.dmcu < amountMicro) return { error: "INSUFFICIENT_DMCU", available: from.dmcu };

  from.dmcu -= amountMicro;
  const to = getOrCreateEntry(toId);
  to.dmcu += net;
  dmcUBurned += fee; // taxa é queimada
  dmcUCirculating -= fee;

  dmcStore.map.set(fromId, from);
  dmcStore.map.set(toId, to);
  dmcStore.schedule();
  return { fromId, toId, amount: net, fee, burned: fee };
}

// ─── $DMC-G (Governance Token) ──────────────────────────────────────────────

/** Credita $DMC-G para uma conta (distribuição por Proof-of-Connectivity). */
export function creditDMCG(accountId, amountMicro, reason = "poc") {
  if (dmcGCirculating + amountMicro > DMC_G_MAX_SUPPLY) {
    return { error: "MAX_SUPPLY_REACHED", remaining: DMC_G_MAX_SUPPLY - dmcGCirculating };
  }
  const entry = getOrCreateEntry(accountId);
  entry.dmcg += amountMicro;
  dmcGCirculating += amountMicro;
  dmcStore.map.set(accountId, entry);
  dmcStore.schedule();
  return { accountId, dmcg: entry.dmcg, credited: amountMicro, reason };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function getDMCBalance(accountId) {
  const entry = getOrCreateEntry(accountId);
  return { accountId, dmcu: entry.dmcu, dmcg: entry.dmcg };
}

export function getDMCStatus() {
  return {
    dmcu: { circulating: dmcUCirculating, burned: dmcUBurned, elastic: true },
    dmcg: { circulating: dmcGCirculating, maxSupply: DMC_G_MAX_SUPPLY, remaining: DMC_G_MAX_SUPPLY - dmcGCirculating },
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function getOrCreateEntry(accountId) {
  let entry = dmcStore.map.get(accountId);
  if (!entry) {
    entry = { accountId, dmcu: 0, dmcg: 0 };
    dmcStore.map.set(accountId, entry);
  }
  return entry;
}

export function flushDMCTokens() {
  dmcStore.flush();
}
