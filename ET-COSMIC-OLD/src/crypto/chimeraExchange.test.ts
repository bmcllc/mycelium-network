import { afterEach, describe, expect, it } from "vitest";
import type { GhostIdentity } from "./ghostid";
import { ChimeraExchange } from "./chimeraExchange";

function fakeGhost(seed = 0x42): GhostIdentity {
  return {
    handle: "ghost_test",
    publicKey: new Uint8Array(32).fill(seed),
    privateKey: new Uint8Array(32).fill(seed),
    x25519PublicKey: new Uint8Array(32).fill(seed + 1),
    x25519SecretKey: new Uint8Array(32).fill(seed + 2),
    entropyBits: 256,
    quantumVerified: false,
  };
}

describe("ChimeraExchange", () => {
  const exchange = ChimeraExchange.getInstance();

  afterEach(() => {
    exchange.destroy();
  });

  it("não expõe price/amount no order book público", () => {
    const order = exchange.submitOrder("BUY", "SOV/ETBRL", 100, 42.5, fakeGhost());
    expect(order.isEncrypted).toBe(true);
    expect(order.shards.length).toBeGreaterThan(0);
    expect("price" in order).toBe(false);
    expect("amount" in order).toBe(false);
  });

  it("emite LP tokens proporcionais ao depósito", () => {
    const pool = exchange.getPool("SOV/ETBRL");
    expect(pool).not.toBeNull();

    const first = exchange.addLiquidity("SOV/ETBRL", 1000, fakeGhost());
    expect(first).toBe(1000);

    const second = exchange.addLiquidity("SOV/ETBRL", 1000, fakeGhost(0x43));
    expect(second).toBeCloseTo(1000, 0);
  });

  it("valida timestamps causais anti-front-running", () => {
    const t = Date.now();
    const order = exchange.submitOrder("SELL", "SOV/ETARS", 10, 12, fakeGhost());
    expect(exchange.verifyCausalTimestamp(order.id, t + 50)).toBe(true);
  });
});
