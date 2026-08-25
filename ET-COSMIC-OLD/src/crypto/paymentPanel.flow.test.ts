/**
 * Fluxo /finance/payment (painel) — simulado sem browser.
 * Espelha PaymentGatewayPanel: connect → ack royalty → createPayment.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeProtocolRoyalty,
  fiatToSatEstimate,
} from "../protocol/sovereignty/protocolRoyalty";

const mockGateway = {
  getBtcPrices: vi.fn(),
  isNWCConnected: vi.fn(),
  connectNWC: vi.fn(),
  createPayment: vi.fn(),
};

vi.mock("./paymentGateway", () => ({
  paymentGateway: mockGateway,
}));

describe("PaymentGatewayPanel flow (simulated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGateway.getBtcPrices.mockResolvedValue({ brl: 420_000, usd: 85_000, eur: 78_000 });
    mockGateway.isNWCConnected.mockResolvedValue(false);
    mockGateway.connectNWC.mockResolvedValue({
      connected: true,
      walletPubKey: "npub1test",
      relay: "ws://127.0.0.1:7777",
      balanceSat: 50_000,
    });
    mockGateway.createPayment.mockResolvedValue({
      success: true,
      method: "nwc",
      invoice: "lnbc1000n1paneltest",
      amountSat: 1200,
      paymentHash: "abc123",
      protocolRoyalty: computeProtocolRoyalty(1200, "payment"),
      attempts: 1,
    });
  });

  it("connect → royalty ack → invoice", async () => {
    const { paymentGateway } = await import("./paymentGateway");

    const prices = await paymentGateway.getBtcPrices();
    const sat = fiatToSatEstimate("49.90", "BRL", prices);
    const split = computeProtocolRoyalty(sat, "payment");
    expect(sat).toBeGreaterThan(0);

    const mustAck = split.enabled && sat > 0;

    const info = await paymentGateway.connectNWC("nostr+walletconnect://test");
    expect(info.connected).toBe(true);

    const protocolFeeAck = mustAck;
    const canConfirm = info.connected && (!mustAck || protocolFeeAck);
    expect(canConfirm).toBe(true);

    const result = await paymentGateway.createPayment(
      { label: "ETRNET Premium", amount: "49.90", currency: "BRL" },
    );
    expect(result.success).toBe(true);
    expect(result.invoice).toMatch(/^lnbc/);
    expect(result.amountSat).toBeGreaterThan(0);
  });

  it("bloqueia pagamento sem ack de taxa de protocolo", () => {
    const sat = fiatToSatEstimate("10", "BRL", { brl: 420_000, usd: 85_000, eur: 78_000 });
    const split = computeProtocolRoyalty(sat, "payment");
    const connected = true;
    const protocolFeeAck = false;
    const mustAck = split.enabled && sat > 0;
    const canConfirm = connected && (!mustAck || protocolFeeAck);
    if (split.enabled && sat > 0) {
      expect(canConfirm).toBe(false);
    }
  });
});
