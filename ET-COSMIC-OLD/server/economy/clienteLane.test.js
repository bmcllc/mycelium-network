/**
 * Cliente lane — depósito pareado + tier Builder (ledger em memória em test).
 */
import { describe, expect, it } from "vitest";
import {
  createPairedDepositIntent,
  getDepositStatus,
  settlePairedDeposit,
} from "./pairedDeposit.js";
import {
  subscribeTier,
  getTierStatus,
  renewSubscription,
  processDueRenewals,
} from "../mesh/tierSubscriptions.js";

const ACCOUNT = "vitest:cliente-lane";

describe("pairedDeposit", () => {
  it("credita ledger em modo simulated", () => {
    const r = createPairedDepositIntent({
      accountId: ACCOUNT,
      amountSov: 5,
      method: "simulated",
    });
    expect(r.ok).toBe(true);
    expect(r.creditedSov).toBe(5);
    const st = getDepositStatus(r.depositId);
    expect(st.deposit.status).toBe("credited");
    expect(st.balance.balanceSov).toBeGreaterThanOrEqual(5);
  });

  it("idempotente ao liquidar duas vezes", () => {
    const intent = createPairedDepositIntent({
      accountId: `${ACCOUNT}:dup`,
      amountSov: 1,
      method: "lightning",
    });
    expect(intent.depositId).toBeTruthy();
    expect(settlePairedDeposit(intent.depositId).ok).toBe(true);
    expect(settlePairedDeposit(intent.depositId).already).toBe(true);
  });
});

describe("tierSubscriptions", () => {
  const subAccount = `${ACCOUNT}:tier-${Date.now()}`;

  it("subscreve builder com débito", () => {
    const r = subscribeTier({ accountId: subAccount, tier: "builder", demoTopUp: true });
    expect(r.ok).toBe(true);
    expect(r.tier).toBe("builder");
    expect(r.monthlySov).toBe(250);
    const st = getTierStatus(subAccount, { attemptRenewal: false });
    expect(st.active).toBe(true);
  });

  it("bloqueia segunda subscrição activa", () => {
    const r = subscribeTier({ accountId: subAccount, tier: "builder", demoTopUp: true });
    expect(r.error).toBe("ALREADY_ACTIVE");
  });

  it("processDueRenewals retorna relatório", () => {
    const r = processDueRenewals();
    expect(r).toHaveProperty("processed");
    expect(Array.isArray(r.results)).toBe(true);
  });

  it("renewSubscription sem subscrição falha", () => {
    expect(renewSubscription("vitest:nobody-ever").error).toBe("NO_SUBSCRIPTION");
  });
});
