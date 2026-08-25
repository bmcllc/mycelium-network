import { beforeEach, describe, expect, it } from "vitest";
import { KIND_DEX_ORDER, KIND_DEX_TRADE } from "../network/etrnetKinds";
import { NostrDEX, ORDER_KIND, TRADE_KIND } from "./nostrDEX";

describe("NostrDEX", () => {
  let dex: NostrDEX;

  beforeEach(() => {
    NostrDEX.resetForTests();
    dex = NostrDEX.getInstance();
  });

  it("usa kinds ETRNET para ordens e trades", () => {
    expect(ORDER_KIND).toBe(KIND_DEX_ORDER);
    expect(TRADE_KIND).toBe(KIND_DEX_TRADE);
  });

  it("casa ordens ao preço do maker (sell no livro)", () => {
    const sell = dex.createOrder("sell", "ETR/BRL", 10, 100, "seller_pk", "utxo_s");
    const buy = dex.createOrder("buy", "ETR/BRL", 10, 105, "buyer_pk", "utxo_b");

    const trades = dex.matchOrders("ETR/BRL");
    expect(trades.length).toBe(1);
    expect(trades[0]?.price).toBe(sell.price);
    expect(trades[0]?.amount).toBe(10);
    expect(buy.status).toBe("matched");
    expect(sell.status).toBe("matched");
  });

  it("não casa buy com preço abaixo do sell", () => {
    dex.createOrder("sell", "ETR/BRL", 5, 100, "seller_pk", "utxo_s");
    dex.createOrder("buy", "ETR/BRL", 5, 90, "buyer_pk", "utxo_b");

    const trades = dex.matchOrders("ETR/BRL");
    expect(trades.length).toBe(0);
  });

  it("impede cancelamento por maker diferente", () => {
    const order = dex.createOrder("buy", "ETR/BRL", 1, 50, "alice", "utxo_a");
    expect(dex.cancelOrder(order.id, "bob")).toBe(false);
    expect(dex.cancelOrder(order.id, "alice")).toBe(true);
    expect(order.status).toBe("cancelled");
  });

  it("gera eventos NOSTR com kinds corretos", () => {
    const order = dex.createOrder("buy", "ETR/XMR", 2, 10, "pk1", "utxo_1");
    const event = dex.createOrderEvent(order);
    expect(event.kind).toBe(31215);
    expect(event.tags.some((t) => t[0] === "pair" && t[1] === "ETR/XMR")).toBe(true);

    dex.createOrder("sell", "ETR/XMR", 2, 9, "pk2", "utxo_2");
    const trades = dex.matchOrders("ETR/XMR");
    const tradeEvent = dex.createTradeEvent(trades[0]!);
    expect(tradeEvent.kind).toBe(31216);
  });
});
