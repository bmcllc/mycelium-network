import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ACCESS_TIERS, LIQUIDITY_POOLS } from "../protocol/liquidity/pools";
import { computeReputationPrice } from "../protocol/liquidity/reputationPricing";
import Void308Checkout from "./Void308Checkout";
import BuilderSubscribeCheckout from "./BuilderSubscribeCheckout";
import PairedDepositPanel from "./PairedDepositPanel";

const quantumPool = LIQUIDITY_POOLS.find((p) => p.id === "POOL-QUANTUM")!;
const builderTier = ACCESS_TIERS.find((t) => t.id === "builder")!;

function microToSov(micro: number): string {
  return (micro / 1_000_000).toFixed(4);
}

export default function SaborQuanticoPage() {
  const [reputation, setReputation] = useState(72);
  const [units, setUnits] = useState(10);

  const quote = useMemo(
    () =>
      computeReputationPrice({
        poolId: "POOL-QUANTUM",
        reputationScore: reputation,
        demandFactor: 1,
        units,
      }),
    [reputation, units],
  );

  return (
    <div className="min-h-screen bg-[#050607] text-zinc-300 font-mono selection:bg-[#b6ff3a]/20 overflow-x-hidden">
      {/* Hero glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,240,255,0.15), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(182,255,58,0.06), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-12 md:py-20">
        <Link
          href="/"
          className="text-[10px] text-zinc-600 hover:text-[#b6ff3a] no-underline tracking-widest uppercase"
        >
          ← ET-COSMIC
        </Link>

        <p className="mt-10 text-[10px] tracking-[0.4em] text-[#00f0ff]/90 uppercase">
          Sabor Quântico™ · clássico honesto
        </p>
        <h1 className="mt-3 font-sans text-4xl md:text-6xl font-light text-zinc-100 tracking-tight leading-tight">
          Simulação soberana
          <span className="block text-[#00f0ff]/90">que o CFO audita.</span>
        </h1>
        <p className="mt-5 text-sm text-zinc-500 max-w-2xl leading-relaxed">
          Tensor LUSUS-Q / QRC em CPU/GPU clássico — sem bullshit de qubits. Pay-per-use via DAT,
          settlement automático $SOV, trilha PMU para pharma e finance.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#builder-subscribe"
            className="inline-block px-6 py-3 bg-[#b6ff3a] text-black text-xs font-semibold tracking-wide no-underline hover:bg-[#d4ff7a] transition-colors"
          >
            ACTIVAR BUILDER — {builderTier.monthlySov} $SOV/mês
          </a>
          <a
            href="#deposito-pareado"
            className="inline-block px-6 py-3 border border-zinc-600 text-zinc-300 text-xs tracking-wide no-underline hover:border-[#00f0ff]/50 transition-colors"
          >
            DEPOSITAR $SOV
          </a>
          <Link
            href="/mesh/liquidity#pool-quantum"
            className="inline-block px-6 py-3 border border-[#00f0ff]/50 text-[#00f0ff] text-xs tracking-wide no-underline hover:bg-[#00f0ff]/10 transition-colors"
          >
            DEMO POOL-QUANTUM
          </Link>
          <a
            href="#void-308"
            className="inline-block px-6 py-3 border border-violet-500/50 text-violet-300 text-xs tracking-wide no-underline hover:bg-violet-500/10 transition-colors"
          >
            VOID-308 — 100 $SOV
          </a>
        </div>

        {/* Value props */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              stat: "50–70%",
              label: "vs cloud reservado",
              sub: "AMM transparente · sem negociação",
            },
            {
              stat: "15 min",
              label: "onboarding",
              sub: "Zero contrato · só DAT + saldo $SOV",
            },
            {
              stat: "4,5%",
              label: "pool premium",
              sub: "Protocolo captura valor · provedor fica 95,5%",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 border border-[#1a1f26] rounded-lg bg-black/30"
            >
              <p className="text-2xl text-[#b6ff3a] font-sans font-light">{item.stat}</p>
              <p className="mt-1 text-xs text-zinc-300">{item.label}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Live quote calculator */}
        <section className="mt-14 p-6 border border-[#00f0ff]/25 rounded-xl bg-[#00f0ff]/5">
          <p className="text-[10px] tracking-widest text-[#00f0ff]/80 uppercase">
            Calculadora live · POOL-QUANTUM
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {quantumPool.resources} — taxa protocolo {(quantumPool.protocolFeeBps / 100).toFixed(1)}%
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Reputação ({reputation}/100)
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={reputation}
                onChange={(e) => setReputation(Number(e.target.value))}
                className="mt-2 w-full accent-[#00f0ff]"
              />
              <span className="text-[10px] text-zinc-600">
                Novato 0,8× → Enterprise 1,5× · actual {quote.reputationMultiplier.toFixed(2)}×
              </span>
            </label>
            <label className="block">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Unidades tensor
              </span>
              <input
                type="number"
                min={1}
                max={10000}
                value={units}
                onChange={(e) => setUnits(Math.max(1, Number(e.target.value) || 1))}
                className="mt-2 w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-3xl font-sans font-light text-zinc-100">
              {microToSov(quote.totalMicro)}{" "}
              <span className="text-sm text-zinc-500">$SOV estimado</span>
            </p>
            <p className="text-[10px] text-zinc-600">
              {microToSov(quote.unitPriceMicro)} $SOV/un · demanda normal 1,0×
            </p>
          </div>
        </section>

        <PairedDepositPanel />
        <BuilderSubscribeCheckout />
        <Void308Checkout />

        {/* Tiers */}
        <section className="mt-14">
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase">Tiers auto-executáveis</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACCESS_TIERS.map((tier) => {
              const highlight = tier.id === "builder";
              return (
                <div
                  key={tier.id}
                  className={`p-4 rounded-lg border ${
                    highlight
                      ? "border-[#b6ff3a]/60 bg-[#b6ff3a]/5 ring-1 ring-[#b6ff3a]/20"
                      : "border-[#1a1f26] bg-black/20"
                  }`}
                >
                  {highlight && (
                    <span className="text-[9px] tracking-widest text-[#b6ff3a] uppercase">
                      Recomendado
                    </span>
                  )}
                  <p className={`text-sm ${highlight ? "text-[#b6ff3a]" : "text-zinc-300"}`}>
                    {tier.label}
                  </p>
                  <p className="mt-1 text-lg text-zinc-100">{tier.monthlySov} $SOV</p>
                  <p className="text-[10px] text-zinc-600">/ mês · debit automático</p>
                  <p className="mt-2 text-[10px] text-zinc-500">{tier.benefit}</p>
                  {tier.rateLimitPerHour != null && (
                    <p className="text-[10px] text-zinc-600">{tier.rateLimitPerHour} req/h</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Honesty */}
        <section className="mt-14 p-5 border border-zinc-800 rounded-lg">
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase">Compromisso honesto</p>
          <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
            Sabor Quântico™ <strong className="text-zinc-400 font-normal">não</strong> vende hardware
            quântico. Entrega simulação clássica reproduzível, documentada em AGPL e whitepaper v2.0.
            Cada job pode gerar auditoria PMU (VOID-308) para compliance.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-4 text-[10px] text-zinc-600">
          <Link href="/mesh/liquidity" className="text-[#00f0ff]/80 hover:text-[#00f0ff] no-underline">
            Liquidity Mesh →
          </Link>
          <Link
            href="/governance/sovereignty"
            className="text-violet-400/80 hover:text-violet-300 no-underline"
          >
            Sovereignty →
          </Link>
          <a
            href="https://gitlab.com/bmcc-DEV/et-cosmic/-/blob/main/docs/PROTOCOL-FIRST-MESH.md"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-400"
          >
            Modelo de negócio (docs)
          </a>
        </div>
      </div>
    </div>
  );
}
