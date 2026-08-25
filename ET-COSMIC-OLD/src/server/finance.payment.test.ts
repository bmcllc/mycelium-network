/**
 * Finance / Lightning — testes in-process + HTTP opcional.
 */
import { describe, expect, it } from "vitest";
import { creditAccount, economyStatus, getBalance } from "../../server/economy/sovLedger.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — módulo server ESM sem tipos
import { runTensorContract } from "../../server/lusus/tensor_contract.js";

describe("finance — SOV ledger in-process", () => {
  it("creditAccount e economyStatus", () => {
    creditAccount("vitest:finance", 500, { channel: "vitest" });
    const bal = getBalance("vitest:finance");
    expect(bal.balanceMicro).toBeGreaterThan(0);
    const st = economyStatus();
    expect(st.currency).toBeTruthy();
  });
});

describe("lusus — tensor contract in-process", () => {
  it("contrai matriz 2x2", async () => {
    const r = await runTensorContract({
      mode: "matrix",
      a: { data: [1, 2, 3, 4], rows: 2, cols: 2 },
      b: { data: [5, 6, 7, 8], rows: 2, cols: 2 },
    });
    expect(r.rows).toBe(2);
    expect(r.cols).toBe(2);
    expect(r.data[0]).toBeCloseTo(19, 5);
    expect(r.data[1]).toBeCloseTo(22, 5);
  });
});

describe("finance — HTTP lightning (opcional)", () => {
  const base = process.env.FINANCE_E2E_URL ?? "http://127.0.0.1:3001";

  it.skipIf(process.env.FINANCE_E2E_HTTP !== "1")("cria invoice com server HTTP activo", async () => {
    const res = await fetch(`${base}/api/lightning/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountSat: 1000, label: "vitest-finance" }),
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const json = (await res.json()) as { invoice?: string };
    expect(json.invoice).toBeTruthy();
  });
});
