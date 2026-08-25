import { useCallback, useEffect, useState } from "react";
import { defaultAccountId, fetchBalance } from "../economy/sovEconomyClient";
import {
  fetchBuilderTierPrice,
  fetchTierStatus,
  subscribeBuilderTierApi,
} from "../mesh/liquidityMeshClient";

const DEMO_TOPUP =
  import.meta.env.VITE_SOV_VAS_DEMO === "1" || import.meta.env.DEV;

export default function BuilderSubscribeCheckout() {
  const [accountId] = useState(defaultAccountId);
  const [balanceSov, setBalanceSov] = useState<number | null>(null);
  const [monthlySov, setMonthlySov] = useState(250);
  const [tierActive, setTierActive] = useState(false);
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [meshOnline, setMeshOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const b = await fetchBalance(accountId);
      setBalanceSov(b.balanceSov);
      setMeshOnline(true);
    } catch {
      setBalanceSov(null);
      setMeshOnline(false);
    }
    try {
      const p = await fetchBuilderTierPrice();
      setMonthlySov(p.monthlySov);
      setMeshOnline(true);
    } catch {
      /* offline */
    }
    try {
      const s = await fetchTierStatus(accountId);
      setTierActive(s.active);
      setRenewsAt(s.renewsAt ? new Date(s.renewsAt).toLocaleDateString("pt-PT") : null);
      setRenewalError(s.lastRenewalError ?? null);
    } catch {
      setTierActive(false);
      setRenewalError(null);
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await subscribeBuilderTierApi({
        accountId,
        demoTopUp: DEMO_TOPUP && (balanceSov ?? 0) < monthlySov,
      });
      setMsg(
        `Builder activo até ${new Date(r.renewsAt).toLocaleDateString("pt-PT")} · saldo ${r.balanceSov.toFixed(2)} $SOV · ${r.rateLimitPerHour} req/h`,
      );
      setTierActive(true);
      setRenewsAt(new Date(r.renewsAt).toLocaleDateString("pt-PT"));
      await refresh();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Erro na subscrição";
      setMsg(
        err.includes("INSUFFICIENT") || err.includes("402")
          ? `${err} — deposite $SOV abaixo ou ligue o VPS (npm run server:sovereign)`
          : err,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="builder-subscribe"
      className="mt-14 p-6 border border-[#b6ff3a]/30 rounded-xl bg-[#b6ff3a]/5 scroll-mt-8"
    >
      <p className="text-[10px] tracking-widest text-[#b6ff3a]/90 uppercase">
        Tier Builder · débito automático
      </p>
      <h2 className="mt-2 font-sans text-xl text-zinc-100">Activar Builder — {monthlySov} $SOV/mês</h2>
      <p className="mt-2 text-xs text-zinc-500 max-w-xl">
        Débito imediato no ledger soberano. Sem contrato, sem fatura manual — renovação mensal no VPS.
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-zinc-600">
        <span>
          API:{" "}
          {meshOnline === null ? "…" : meshOnline ? (
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
        {tierActive && renewsAt && (
          <span className="text-[#b6ff3a]">Activo · renova {renewsAt}</span>
        )}
        {!tierActive && renewalError && (
          <span className="text-amber-500">Renovação falhou — deposite $SOV</span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || meshOnline === false || tierActive}
          onClick={handleSubscribe}
          className="px-6 py-3 bg-[#b6ff3a] text-black text-xs font-semibold tracking-wide hover:bg-[#d4ff7a] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy
            ? "A PROCESSAR…"
            : tierActive
              ? "BUILDER JÁ ACTIVO"
              : `SUBSCREVER — ${monthlySov} $SOV`}
        </button>
      </div>

      {DEMO_TOPUP && meshOnline && !tierActive && (balanceSov ?? 0) < monthlySov && (
        <p className="mt-3 text-[10px] text-amber-500/90">
          Modo demo: crédito automático de {monthlySov} $SOV se saldo insuficiente (dev/staging).
        </p>
      )}

      {msg && (
        <p
          className={`mt-4 text-[11px] p-3 border rounded ${
            tierActive && !msg.includes("Erro")
              ? "border-[#b6ff3a]/30 text-[#b6ff3a]/90 bg-[#b6ff3a]/5"
              : "border-amber-500/30 text-amber-200/90 bg-amber-500/5"
          }`}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
