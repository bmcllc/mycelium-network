import { describe, expect, it } from "vitest";
import type { GhostIdentity } from "./ghostid";
import { SovereignPools } from "./sovereignPools";

function fakeGhost(seed = 0xab): GhostIdentity {
  return {
    handle: "ghost_sip",
    publicKey: new Uint8Array(32).fill(seed),
    privateKey: new Uint8Array(32).fill(seed),
    x25519PublicKey: new Uint8Array(32).fill(seed + 1),
    x25519SecretKey: new Uint8Array(32).fill(seed + 2),
    entropyBits: 256,
    quantumVerified: false,
  };
}

describe("SovereignPools", () => {
  const pools = SovereignPools.getInstance();

  it("cria pool e aceita investimento", () => {
    const manager = fakeGhost();
    const pool = pools.createPool(
      {
        name: "Test SIP",
        strategy: "delta-neutral",
        minInvestment: 1000n,
        maxInvestors: 100,
        performanceFeeRate: 0.1,
        managementFeeRate: 0.02,
      },
      manager,
    );

    const investor = fakeGhost(0xcd);
    const share = pools.invest(pool.id, 5000n, investor);
    expect(share.shareAmount).toBeGreaterThan(0n);
    expect(pools.getPool(pool.id)?.investorCount).toBe(1);
  });

  it("ativa proposta pending → voting e aceita voto ZK", () => {
    const manager = fakeGhost(0x01);
    const pool = pools.createPool(
      {
        name: "Gov SIP",
        strategy: "momentum",
        minInvestment: 100n,
        maxInvestors: 50,
        performanceFeeRate: 0.05,
        managementFeeRate: 0.01,
      },
      manager,
    );

    const proposal = pools.submitProposal(
      pool.id,
      "Rebalancear para SOV",
      new Uint8Array(32).fill(0xff),
      manager,
    );
    expect(proposal.status).toBe("pending");

    const other = fakeGhost(0x02);
    expect(pools.activateProposal(proposal.id, other)).toBe(false);
    expect(pools.activateProposal(proposal.id, manager)).toBe(true);
    expect(proposal.status).toBe("voting");

    const vote = pools.vote(proposal.id, true, manager);
    expect(vote).not.toBeNull();
    expect(proposal.votesFor).toBe(1);

    const finalized = pools.finalizeVoting(proposal.id);
    expect(finalized?.status).toBe("approved");
  });

  it("impede double-vote na mesma proposta", () => {
    const manager = fakeGhost(0x11);
    const pool = pools.createPool(
      {
        name: "ZK SIP",
        strategy: "arb",
        minInvestment: 100n,
        maxInvestors: 10,
        performanceFeeRate: 0.02,
        managementFeeRate: 0.01,
      },
      manager,
    );

    const proposal = pools.submitProposal(pool.id, "Test", new Uint8Array(8), manager);
    pools.activateProposal(proposal.id, manager);

    expect(pools.vote(proposal.id, true, manager)).not.toBeNull();
    expect(pools.vote(proposal.id, false, manager)).toBeNull();
  });
});
