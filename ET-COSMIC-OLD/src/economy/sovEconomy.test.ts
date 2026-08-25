import { describe, it, expect } from "vitest";
import { creditAccount, getBalance, applyProtocolFee, economyStatus } from "../../server/economy/sovLedger.js";
import { publishBinary, purchaseBinary, listBinaries } from "../../server/economy/binaryMarket.js";
import { registerHostingSite, recordHostingTraffic, listHostingSites } from "../../server/economy/hostingRevenue.js";
import { registerMiner, submitEthicalWork, listMiners } from "../../server/economy/ethicalMining.js";

describe("SOV economy (VOID-710)", () => {
  it("stores em memória durante testes", () => {
    expect(economyStatus().persisted).toBe(false);
    expect(listBinaries().length).toBeGreaterThanOrEqual(0);
    expect(listHostingSites().length).toBeGreaterThanOrEqual(0);
    expect(listMiners().length).toBeGreaterThanOrEqual(0);
  });

  it("aplica taxa 10 bps", () => {
    const { feeMicro, netMicro } = applyProtocolFee(1_000_000);
    expect(feeMicro).toBe(1000);
    expect(netMicro).toBe(999_000);
  });

  it("VOID-703 compra binário com saldo", () => {
    const buyer = "test-buyer-703";
    creditAccount(buyer, 2_000_000, { channel: "test" });
    const art = publishBinary({ name: "void-node", priceSov: 1, sellerId: "seller-703" });
    const buy = purchaseBinary(art.artifactId, buyer);
    expect(buy.error).toBeUndefined();
    expect(getBalance(buyer).balanceMicro).toBeLessThan(2_000_000);
  });

  it("VOID-704 credita hospedagem", () => {
    const owner = "host-704";
    const site = registerHostingSite({ ownerId: owner, origin: "https://example.com" });
    const r = recordHostingTraffic(site.siteId, { visitors: 2000, bytesServed: 2e9 });
    expect(r.creditedMicro).toBeGreaterThan(0);
    expect(getBalance(owner).balanceMicro).toBeGreaterThan(0);
  });

  it("VOID-705 mineração ética sem throttle", () => {
    const w = registerMiner("worker-test", { accountId: "miner-acct", consent: true });
    const r = submitEthicalWork(w.workerId, { accountId: "miner-acct", type: "ising", cpuPct: 2 });
    expect(r.creditedMicro).toBeGreaterThan(0);
    expect(r.destructiveHash).toBe(false);
  });

  it("VOID-705 throttle por LSC", () => {
    const w = registerMiner("worker-hot", { accountId: "miner-hot" });
    const r = submitEthicalWork(w.workerId, { accountId: "miner-hot", cpuPct: 99 });
    expect(r.action).toBe("throttle");
  });
});
