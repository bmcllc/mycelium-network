import { useCallback, useEffect, useState } from "react";
import {
  confirmPairedDepositSim,
  createLightningInvoiceForDeposit,
  createPairedDepositIntent,
  defaultAccountId,
  fetchBalance,
  fetchPairedDepositRate,
  fetchPairedDepositStatus,
  simulateLightningSettle,
} from "../economy/sovEconomyClient";

const DEMO =
  import.meta.env.VITE_SOV_VAS_DEMO === "1" ||
  import.meta.env.VITE_SOV_DEPOSIT_DEMO === "1" ||
  import.meta.env.DEV;

export default function PairedDepositPanel() {
  const [accountId] = useState(defaultAccountId);
  const [amountSov, setAmountSov] = useState(250);
  const [satPerSov, setSatPerSov] = useState(1000);
  const [balanceSov, setBalanceSov] = useState<number | null>(null);
  const [protocolBps, setProtocolBps] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const b = await fetchBalance(accountId);
      setBalanceSov(b.balanceSov);
      setProtocolBps((b as { protocolBps?: number }).protocolBps ?? null);
      setApiOnline(true);
    } catch {
      setBalanceSov(null);
      setApiOnline(false);
    }
    try {
      const r = await fetchPairedDepositRate();
      setSatPerSov(r.satPerSov);
    } catch {
      /* default */
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const amountSat = Math.max(1, Math.ceil(amountSov * satPerSov));

  const runSimulatedDeposit = async () => {
    setBusy(true);
    setMsg(null);
    setInvoicePreview(null);
    try {
      const r = await createPairedDepositIntent({
        accountId,
        amountSov,
        method: "simulated",
      });
      setMsg(`Creditado ${(r.creditedSov ?? amountSov).toFixed(2)} $SOV no ledger`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha no depósito");
    } finally {
      setBusy(false);
    }
  };

  const runLightningDeposit = async () => {
    setBusy(true);
    setMsg(null);
    setInvoicePreview(null);
    try {
      const intent = await createPairedDepositIntent({
        accountId,
        amountSov,
        method: "lightning",
      });
      setPendingDepositId(intent.depositId);
      const inv = await createLightningInvoiceForDeposit({
        pairedDepositId: intent.depositId,
        amountSat: intent.amountSat,
        ...(intent.lightningLabel ? { label: intent.lightningLabel } : {}),
      });
      setPendingInvoiceId(inv.id);
      setInvoicePreview(inv.invoice);
      setMsg(`Invoice Lightning criada · ${intent.amountSat} sats ≈ ${amountSov} $SOV`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha Lightning");
    } finally {
      setBusy(false);
    }
  };

  const confirmSimPayment = async () => {
    if (!pendingDepositId && !pendingInvoiceId) return;
    setBusy(true);
    try {
      if (pendingInvoiceId && DEMO) {
        await simulateLightningSettle(pendingInvoiceId);
      } else if (pendingDepositId && DEMO) {
        await confirmPairedDepositSim(pendingDepositId);
      }
      if (pendingDepositId) {
        const st = await fetchPairedDepositStatus(pendingDepositId);
        if (st.deposit.status === "credited") {
          setMsg(`Pagamento confirmado · saldo ${st.balance.balanceSov.toFixed(2)} $SOV`);
          setPendingDepositId(null);
          setPendingInvoiceId(null);
          setInvoicePreview(null);
          await refresh();
          return;
        }
      }
      setMsg("Aguardando confirmação on-chain ou webhook LND");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha na confirmação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="deposito-pareado"
      className="mt-14 p-6 border border-[#00f0ff]/25 rounded-xl bg-[#00f0ff]/5 scroll-mt-8"
    >
      <p className="text-[10px] tracking-widest text-[#00f0ff]/80 uppercase">
        Depósito pareado · FR-001
      </p>
      <h2 className="mt-2 font-sans text-xl text-zinc-100">Lightning / NWC → ledger $SOV</h2>
      <p className="mt-2 text-xs text-zinc-500 max-w-xl">
        Par local credita µSOV no VPS. Taxa de câmbio configurável: {satPerSov} sats = 1 $SOV
        (SOV_SAT_RATE).
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-zinc-600">
        <span>
          Economia:{" "}
          {apiOnline === null ? "…" : apiOnline ? (
            <span className="text-[#b6ff3a]">online</span>
          ) : (
            <span className="text-amber-500">offline</span>
          )}
        </span>
        <span>
          Conta: <code className="text-zinc-500">{accountId}</code>
        </span>
        <span>
          Saldo:{" "}
          {balanceSov === null ? "—" : (
            <span className="text-zinc-400">{balanceSov.toFixed(2)} $SOV</span>
          )}
        </span>
      </div>

      <label className="mt-6 block text-[10px] text-zinc-500 uppercase tracking-widest">
        Montante ($SOV)
        <input
          type="number"
          min={1}
          step={1}
          value={amountSov}
          onChange={(e) => setAmountSov(Math.max(1, Number(e.target.value) || 1))}
          className="mt-2 w-full max-w-xs px-3 py-2 bg-black/50 border border-[#1a1f26] text-zinc-200 text-sm"
        />
      </label>
      <p className="mt-2 text-[10px] text-zinc-600">
        ≈ {amountSat} sats Lightning
        {protocolBps != null && (
          <span className="ml-2 text-zinc-500">
            · taxa protocolo em settlements DAT: {(protocolBps / 100).toFixed(2)}%
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {DEMO && (
          <button
            type="button"
            disabled={busy || apiOnline === false}
            onClick={runSimulatedDeposit}
            className="px-6 py-3 border border-[#00f0ff]/50 text-[#00f0ff] text-xs tracking-wide hover:bg-[#00f0ff]/10 disabled:opacity-40"
          >
            DEPÓSITO SIMULADO (DEV)
          </button>
        )}
        <button
          type="button"
          disabled={busy || apiOnline === false}
          onClick={runLightningDeposit}
          className="px-6 py-3 bg-[#00f0ff]/20 text-[#00f0ff] text-xs font-semibold tracking-wide hover:bg-[#00f0ff]/30 disabled:opacity-40"
        >
          CRIAR INVOICE LIGHTNING
        </button>
        {DEMO && pendingDepositId && (
          <button
            type="button"
            disabled={busy}
            onClick={confirmSimPayment}
            className="px-6 py-3 border border-amber-500/50 text-amber-300 text-xs tracking-wide hover:bg-amber-500/10 disabled:opacity-40"
          >
            CONFIRMAR PAGAMENTO (DEV)
          </button>
        )}
      </div>

      {invoicePreview && (
        <p className="mt-4 text-[10px] text-zinc-500 break-all font-mono p-3 border border-[#1a1f26] rounded bg-black/40">
          {invoicePreview}
        </p>
      )}

      {msg && (
        <p className="mt-4 text-[11px] p-3 border border-[#00f0ff]/20 text-zinc-400 rounded bg-black/30">
          {msg}
        </p>
      )}
    </section>
  );
}
