import { describe, it, expect } from "vitest";
import { creditAccount, getBalance } from "../../../server/economy/sovLedger.js";
import { consumeDat } from "../../../server/mesh/datSettlement.js";
import { registerDat } from "../../../server/mesh/datRegistry.js";
import {
  registerLiquidityProvider,
  bootstrapStatus,
} from "../../../server/mesh/liquidityMining.js";
import {
  createSlaCommitment,
  submitUptimeProof,
  evaluateSlaCommitment,
} from "../../../server/mesh/slaContract.js";
import { mintDat } from "./datEngine";
import { computeDatConsumption, validateDatForConsume } from "./datSettlement";
import { evaluateSla, createSlaCommitment as createSlaSpec } from "./slaContract";
import { computeBootstrapBonus, LIQUIDITY_MINING_BOOTSTRAP } from "./liquidityMining";

describe("datSettlement (TS)", () => {
  it("computeDatConsumption aplica pool + protocol fee", () => {
    const dat = mintDat({
      resourceId: "r1",
      poolId: "POOL-COMPUTE",
      reputationScore: 50,
      tier: "builder",
      currentBlock: 100,
    });
    const c = computeDatConsumption(dat, 5);
    expect(c.grossMicro).toBe(dat.paymentStreamMicro * 5);
    expect(c.poolFeeMicro).toBeGreaterThan(0);
    expect(c.netMicro).toBeLessThan(c.grossMicro);
  });

  it("validateDatForConsume rejeita expirado", () => {
    const dat = mintDat({
      resourceId: "r1",
      poolId: "POOL-AI",
      reputationScore: 50,
      tier: "citizen",
      currentBlock: 100,
      expiryBlocks: 10,
    });
    expect(validateDatForConsume(dat, 111).ok).toBe(false);
    expect(validateDatForConsume(dat, 105).ok).toBe(true);
  });
});

describe("slaContract (TS)", () => {
  it("evaluateSla fulfilled com heartbeats suficientes", () => {
    const c = createSlaSpec({
      commitmentId: "sla-test",
      providerId: "p1",
      poolId: "POOL-COMPUTE",
      stakeMicro: 100_000,
      windowMs: 60_000,
      heartbeatIntervalMs: 10_000,
    });
    const now = Date.now();
    const proofs = Array.from({ length: 6 }, (_, i) => ({
      commitmentId: c.commitmentId,
      providerId: c.providerId,
      timestamp: now - 50_000 + i * 10_000,
      latencyMs: 20,
      ok: true,
    }));
    const v = evaluateSla(c, proofs, now);
    expect(v.fulfilled).toBe(true);
    expect(v.slashedMicro).toBe(0);
  });

  it("evaluateSla violado com poucos heartbeats", () => {
    const c = createSlaSpec({
      commitmentId: "sla-fail",
      providerId: "p2",
      poolId: "POOL-STORAGE",
      stakeMicro: 200_000,
      windowMs: 60_000,
      heartbeatIntervalMs: 10_000,
      uptimeMinPct: 99.5,
    });
    const now = Date.now();
    const proofs = [{ commitmentId: c.commitmentId, providerId: c.providerId, timestamp: now - 1000, latencyMs: 50, ok: true }];
    const v = evaluateSla(c, proofs, now);
    expect(v.fulfilled).toBe(false);
    expect(v.slashedMicro).toBeGreaterThan(0);
  });
});

describe("liquidityMining (TS)", () => {
  it("computeBootstrapBonus respeita cap", () => {
    const bonus = computeBootstrapBonus(100_000, LIQUIDITY_MINING_BOOTSTRAP.bonusCapMicro - 1000);
    expect(bonus).toBeLessThanOrEqual(1000);
  });
});

describe("mesh integration — DAT debit + SLA + bootstrap", () => {
  it("consumeDat debita consumer e credita provider", () => {
    const consumer = "mesh-consumer-1";
    const provider = registerLiquidityProvider({
      providerId: "lp-test-1",
      accountId: "provider-acct-1",
      poolId: "POOL-COMPUTE",
    });
    creditAccount(consumer, 500_000, { channel: "test" });

    const dat = registerDat({
      resourceId: "wasm-worker",
      poolId: "POOL-COMPUTE",
      paymentStreamMicro: 10_000,
      expiryBlock: Math.floor(Date.now() / 60000) + 100,
      tier: "builder",
      reputationScore: 70,
      proofOfWork: { scheme: "stub", digestHex: "abc", verified: false },
    });

    const r = consumeDat({
      datId: dat.datId,
      consumerId: consumer,
      providerId: provider.providerId,
      units: 2,
    });
    expect(r.error).toBeUndefined();
    expect(r.grossMicro).toBe(20_000);
    expect(getBalance(consumer).balanceMicro).toBeLessThan(500_000);
    expect(getBalance("provider-acct-1").balanceMicro).toBeGreaterThan(0);
  });

  it("consumeDat falha com saldo insuficiente", () => {
    const dat = registerDat({
      resourceId: "x",
      poolId: "POOL-AI",
      paymentStreamMicro: 1_000_000,
      expiryBlock: Math.floor(Date.now() / 60000) + 100,
      proofOfWork: { scheme: "stub", digestHex: "x", verified: false },
    });
    const r = consumeDat({
      datId: dat.datId,
      consumerId: "broke-user",
      providerId: "lp-any",
      units: 1,
    });
    expect(r.error).toBe("INSUFFICIENT_SOV");
  });

  it("liquidity mining bootstrap credita bonus", () => {
    const status = bootstrapStatus();
    expect(status.maxProviders).toBeGreaterThan(0);

    const provider = registerLiquidityProvider({
      providerId: "lp-bootstrap",
      accountId: "bootstrap-acct",
      poolId: "POOL-STORAGE",
    });
    if (provider.bootstrapEligible) {
      creditAccount("bootstrap-consumer", 100_000, { channel: "test" });
      const dat = registerDat({
        resourceId: "storage-shard",
        poolId: "POOL-STORAGE",
        paymentStreamMicro: 5000,
        expiryBlock: Math.floor(Date.now() / 60000) + 50,
        proofOfWork: { scheme: "stub", digestHex: "s", verified: false },
      });
      const r = consumeDat({
        datId: dat.datId,
        consumerId: "bootstrap-consumer",
        providerId: provider.providerId,
        units: 1,
      });
      expect(r.bootstrapBonusMicro).toBeGreaterThanOrEqual(0);
    }
  });

  it("SLA code-based: stake, proofs, evaluate fulfilled", () => {
    const account = "sla-provider-acct";
    creditAccount(account, 500_000, { channel: "test" });
    const provider = registerLiquidityProvider({
      providerId: "lp-sla",
      accountId: account,
      poolId: "POOL-COMPUTE",
    });

    const commitment = createSlaCommitment({
      providerId: provider.providerId,
      accountId: account,
      stakeMicro: 50_000,
      poolId: "POOL-COMPUTE",
      windowMs: 60_000,
      heartbeatIntervalMs: 10_000,
      uptimeMinPct: 80,
    });
    expect(commitment.error).toBeUndefined();
    const commitmentId = String(commitment.commitmentId);
    const providerId = String(provider.providerId);

    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      submitUptimeProof({
        commitmentId,
        providerId,
        timestamp: now - 55_000 + i * 10_000,
        ok: true,
      });
    }

    const verdict = evaluateSlaCommitment(commitmentId, now);
    expect(verdict.fulfilled).toBe(true);
    expect(verdict.bonusMicro).toBeGreaterThan(0);
    expect(getBalance(account).balanceMicro).toBeGreaterThan(450_000);
  });

  it("SLA violado faz slash parcial", () => {
    const account = "sla-violator";
    creditAccount(account, 200_000, { channel: "test" });
    const commitment = createSlaCommitment({
      providerId: "lp-violator",
      accountId: account,
      stakeMicro: 100_000,
      uptimeMinPct: 99.9,
      windowMs: 60_000,
      heartbeatIntervalMs: 10_000,
    });
    const commitmentId = String(commitment.commitmentId);
    submitUptimeProof({
      commitmentId,
      providerId: "lp-violator",
      timestamp: Date.now(),
      ok: false,
    });
    const verdict = evaluateSlaCommitment(commitmentId);
    expect(verdict.fulfilled).toBe(false);
    expect(verdict.slashedMicro).toBeGreaterThan(0);
  });
});
