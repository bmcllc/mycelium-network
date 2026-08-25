import { useEffect } from "react";
import { Link } from "wouter";
import { PageShell } from "./PageShell";
import { LIQUIDITY_POOLS, ACCESS_TIERS } from "../protocol/liquidity/pools";

export default function MeshLiquidityPage() {
  const tierParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tier")
      : null;
  const highlightBuilder = tierParam === "builder";

  useEffect(() => {
    const scrollToPool = () => {
      if (window.location.hash === "#pool-quantum") {
        document.getElementById("pool-quantum")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    scrollToPool();
    window.addEventListener("hashchange", scrollToPool);
    return () => window.removeEventListener("hashchange", scrollToPool);
  }, []);

  const quantumPool = LIQUIDITY_POOLS.find((p) => p.id === "POOL-QUANTUM");
  const builderTier = ACCESS_TIERS.find((t) => t.id === "builder");

  return (
    <PageShell title="Liquidity Mesh" eyebrow="Sabor Quântico™ · Protocol-First">
      {highlightBuilder && builderTier && (
        <div className="mb-6 p-4 border border-[#b6ff3a]/40 rounded-lg bg-[#b6ff3a]/5">
          <p className="text-[10px] tracking-widest text-[#b6ff3a] uppercase">Tier Builder seleccionado</p>
          <p className="mt-1 text-xs text-zinc-400">
            Deposita {builderTier.monthlySov} $SOV/mês na carteira mesh — debit automático,{" "}
            {builderTier.rateLimitPerHour} req/h, fila prioritária.
          </p>
          <p className="mt-2 text-[10px] text-zinc-600">
            Stack live: <code className="text-zinc-500">npm run server:sovereign</code> +{" "}
            <code className="text-zinc-500">npm run dev</code>
          </p>
        </div>
      )}

      <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
        Mercado líquido para compute, inferência e{" "}
        <strong className="text-[#00f0ff]/90 font-normal">Sabor Quântico</strong> — settlement DAT
        e taxa protocolo automática.
      </p>

      <div
        id="pool-quantum"
        className="mt-8 p-4 border border-[#00f0ff]/20 rounded-lg bg-[#00f0ff]/5 scroll-mt-8"
      >
        <p className="text-[10px] tracking-widest text-[#00f0ff]/80 uppercase">Pool premium · demo</p>
        <p className="mt-2 text-xs text-zinc-300">{quantumPool?.label}</p>
        <p className="mt-1 text-[10px] text-zinc-500">{quantumPool?.resources}</p>
        <p className="mt-2 text-[10px] text-zinc-600">
          Taxa protocolo {(quantumPool!.protocolFeeBps / 100).toFixed(1)}% · base{" "}
          {(quantumPool!.basePriceMicroPerUnit / 1_000_000).toFixed(4)} $SOV/un
        </p>
        <Link
          href="/sabor-quantico"
          className="inline-block mt-4 text-[10px] text-[#00f0ff]/90 hover:text-[#00f0ff] no-underline"
        >
          ← Calculadora & tiers na landing Sabor Quântico
        </Link>
      </div>

      <ul className="mt-6 space-y-2 text-[11px] text-zinc-600">
        <li>· Mint / consume DAT — débito automático no ledger $SOV</li>
        <li>· Preço por reputação — bom histórico paga menos</li>
        <li>· Liquidity mining 2× — primeiros provedores</li>
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/sabor-quantico"
          className="inline-block px-4 py-2 bg-[#b6ff3a] text-black text-[10px] font-semibold no-underline hover:bg-[#d4ff7a]"
        >
          LANDING SABOR QUÂNTICO
        </Link>
        <Link href="/" className="inline-block px-4 py-2 border border-zinc-800 text-[10px] text-zinc-500 no-underline hover:border-zinc-600">
          Início
        </Link>
      </div>
    </PageShell>
  );
}
