import { useCallback, useEffect, useState } from "react";
import { defaultAccountId, fetchBalance } from "../economy/sovEconomyClient";
import {
  checkoutPmuAuditApi,
  fetchMeshHealth,
  fetchPmuAuditPrice,
} from "../mesh/liquidityMeshClient";

const DEMO_TOPUP =
  import.meta.env.VITE_SOV_VAS_DEMO === "1" || import.meta.env.DEV;

export default function Void308Checkout() {
  const [accountId] = useState(defaultAccountId);
  const [balanceSov, setBalanceSov] = useState<number | null>(null);
  const [priceSov, setPriceSov] = useState(100);
  const [meshOnline, setMeshOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reportJson, setReportJson] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const b = await fetchBalance(accountId);
      setBalanceSov(b.balanceSov);
    } catch {
      setBalanceSov(null);
    }
    try {
      await fetchMeshHealth();
      setMeshOnline(true);
    } catch {
      setMeshOnline(false);
    }
    try {
      const p = await fetchPmuAuditPrice();
      setPriceSov(p.priceSov);
    } catch {
      /* offline — preço default */
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCheckout = async () => {
    setBusy(true);
    setMsg(null);
    setReportJson(null);
    try {
      const r = await checkoutPmuAuditApi({
        consumerId: accountId,
        demoTopUp: DEMO_TOPUP && (balanceSov ?? 0) < priceSov,
      });
      setReportJson(JSON.stringify(r.report, null, 2));
      setMsg(
        `Auditoria paga · DAT ${r.dat.datId.slice(0, 20)}… · saldo ${r.balanceSov.toFixed(2)} $SOV`,
      );
      await refresh();
    } catch (e) {
      const err = e instanceof Error ? e.message : "Erro no checkout";
      setMsg(err);
      if (err.includes("402") || err.includes("INSUFFICIENT")) {
        setMsg(
          `${err} — ligue o VPS: npm run server:sovereign e credite $SOV (ou VITE_SOV_VAS_DEMO=1 em dev)`,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = () => {
    if (!reportJson) return;
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `void-308-pmu-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="void-308"
      className="mt-14 p-6 border border-violet-500/30 rounded-xl bg-violet-500/5 scroll-mt-8"
    >
      <p className="text-[10px] tracking-widest text-violet-300/90 uppercase">
        VAS premium · VOID-308
      </p>
      <h2 className="mt-2 font-sans text-xl text-zinc-100">Auditoria PMU on-chain</h2>
      <p className="mt-2 text-xs text-zinc-500 max-w-xl">
        Mint DAT → settlement automático → relatório JSON. Sem contrato, sem fatura manual.
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-zinc-600">
        <span>
          API mesh:{" "}
          {meshOnline === null ? "…" : meshOnline ? (
            <span className="text-[#b6ff3a]">online</span>
          ) : (
            <span className="text-amber-500">offline (configure VITE_PAGES_API_ORIGIN)</span>
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

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || meshOnline === false}
          onClick={handleCheckout}
          className="px-6 py-3 bg-violet-500 text-black text-xs font-semibold tracking-wide hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "A PROCESSAR…" : `PAGAR AUDITORIA — ${priceSov} $SOV`}
        </button>
        {reportJson && (
          <button
            type="button"
            onClick={downloadReport}
            className="px-6 py-3 border border-violet-400/50 text-violet-300 text-xs tracking-wide hover:bg-violet-500/10"
          >
            DESCARREGAR RELATÓRIO JSON
          </button>
        )}
      </div>

      {DEMO_TOPUP && meshOnline && (balanceSov ?? 0) < priceSov && (
        <p className="mt-3 text-[10px] text-amber-500/90">
          Modo demo: crédito automático de {priceSov} $SOV no primeiro checkout (dev/staging).
        </p>
      )}

      {msg && (
        <p
          className={`mt-4 text-[11px] p-3 border rounded ${
            reportJson
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
