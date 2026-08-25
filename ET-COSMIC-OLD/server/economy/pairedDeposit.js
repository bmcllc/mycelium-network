/**
 * Depósito pareado — par local (Lightning/NWC) → crédito ledger µSOV (FR-001).
 */
import crypto from "crypto";
import { createPersistedStore } from "./economyPersistence.js";
import { creditAccount, getBalance, microToSov, sovToMicro } from "./sovLedger.js";

const SAT_PER_SOV = parseFloat(process.env.SOV_SAT_RATE ?? "1000", 10);

const store = createPersistedStore("paired-deposits.json", { idField: "depositId" });
const { map: deposits, schedule: schedulePersist } = store;

export function satPerSovRate() {
  return SAT_PER_SOV;
}

export function satsForSov(amountSov) {
  return Math.max(1, Math.ceil(Number(amountSov) * SAT_PER_SOV));
}

function demoDepositAllowed() {
  return (
    process.env.SOV_DEPOSIT_DEMO === "1" ||
    process.env.NODE_ENV === "development" ||
    process.env.VITEST === "true"
  );
}

/**
 * @param {{ accountId?: string; amountSov?: number; method?: string; reference?: string }} body
 */
export function createPairedDepositIntent(body = {}) {
  const accountId = body.accountId ? String(body.accountId) : "";
  if (!accountId) return { error: "accountId required" };

  const amountSov = Number(body.amountSov);
  if (!amountSov || amountSov <= 0) return { error: "amountSov required" };

  const method = body.method ? String(body.method) : "lightning";
  const amountMicro = sovToMicro(amountSov);
  const depositId = `dep-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  const record = {
    depositId,
    accountId,
    amountSov,
    amountMicro,
    amountSat: satsForSov(amountSov),
    method,
    reference: body.reference ?? null,
    status: "pending",
    createdAt: Date.now(),
    invoiceId: null,
    settledAt: null,
  };
  deposits.set(depositId, record);
  schedulePersist();

  if (method === "simulated" || method === "demo" || method === "nwc") {
    if (method !== "nwc" && !demoDepositAllowed()) {
      return { error: "SIMULATED_DISABLED", depositId };
    }
    if (method === "nwc") {
      return {
        ok: true,
        depositId,
        accountId,
        amountSov,
        amountMicro,
        amountSat: record.amountSat,
        method: "nwc",
        status: "pending",
        lightningLabel: `paired:${depositId}`,
        hint: "NWC: crie invoice Lightning com pairedDepositId; confirmação credita o ledger",
      };
    }
    return settlePairedDeposit(depositId, { channel: "paired_deposit_simulated", method });
  }

  return {
    ok: true,
    depositId,
    accountId,
    amountSov,
    amountMicro,
    amountSat: record.amountSat,
    method,
    status: "pending",
    satPerSov: SAT_PER_SOV,
    lightningLabel: `paired:${depositId}`,
    hint: "POST /api/lightning/create com { pairedDepositId, amountSat }",
  };
}

export function getPendingDeposit(depositId) {
  return deposits.get(depositId) ?? null;
}

export function linkInvoiceToDeposit(depositId, invoiceId) {
  const d = deposits.get(depositId);
  if (!d) return { error: "DEPOSIT_NOT_FOUND" };
  if (d.status !== "pending") return { error: "DEPOSIT_NOT_PENDING", status: d.status };
  d.invoiceId = invoiceId;
  schedulePersist();
  return { ok: true, depositId, invoiceId };
}

export function settlePairedDeposit(depositId, meta = {}) {
  const d = deposits.get(depositId);
  if (!d) return { error: "DEPOSIT_NOT_FOUND" };
  if (d.status === "credited") {
    return {
      ok: true,
      already: true,
      depositId,
      accountId: d.accountId,
      creditedSov: microToSov(d.amountMicro),
      balance: getBalance(d.accountId),
    };
  }

  creditAccount(d.accountId, d.amountMicro, {
    channel: "paired_deposit",
    depositId,
    method: d.method,
    ...meta,
  });
  d.status = "credited";
  d.settledAt = Date.now();
  schedulePersist();

  const balance = getBalance(d.accountId);
  return {
    ok: true,
    depositId,
    accountId: d.accountId,
    creditedMicro: d.amountMicro,
    creditedSov: microToSov(d.amountMicro),
    balanceSov: balance.balanceSov,
    balance,
  };
}

/** Chamado quando invoice Lightning confirma (server.js). */
export function settlePairedDepositFromInvoice(invoice) {
  if (!invoice?.pairedDepositId) return null;
  if (invoice.status !== "confirmed") return null;
  if (invoice.pairedCredited) return { ok: true, already: true };

  const pending = deposits.get(invoice.pairedDepositId);
  if (!pending || pending.status === "credited") {
    invoice.pairedCredited = true;
    return { ok: true, already: true };
  }

  const result = settlePairedDeposit(invoice.pairedDepositId, {
    invoiceId: invoice.id,
    paymentHash: invoice.paymentHash,
    channel: "paired_deposit_lightning",
  });
  if (result.ok) invoice.pairedCredited = true;
  return result;
}

export function getDepositStatus(depositId) {
  const d = deposits.get(depositId);
  if (!d) return { error: "DEPOSIT_NOT_FOUND" };
  return {
    deposit: {
      depositId: d.depositId,
      accountId: d.accountId,
      amountSov: d.amountSov,
      amountSat: d.amountSat,
      method: d.method,
      status: d.status,
      invoiceId: d.invoiceId,
      settledAt: d.settledAt,
    },
    balance: getBalance(d.accountId),
  };
}

export function simulateSettleDeposit(depositId) {
  if (!demoDepositAllowed()) return { error: "SIMULATE_DISABLED" };
  return settlePairedDeposit(depositId, { channel: "paired_deposit_simulated", simulated: true });
}
