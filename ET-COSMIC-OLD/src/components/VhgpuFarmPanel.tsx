/**
 * VØID — Painel da vHGPU Farm
 *
 * Dashboard completo de mineração + investimento automatizado.
 * Visualiza mineração, portfolio, risco, e otimização LSC.
 *
 * Filosofia: "Cada crash é uma cicatriz. Cada cicatriz é um ativo."
 */

import { useState } from "react";
import { useVhgpuFarm } from "../core/useVhgpuFarm";

export default function VhgpuFarmPanel() {
  const { start, stop, runCycle, state, logs, isRunning } = useVhgpuFarm();
  const [autoRun, setAutoRun] = useState(false);
  const [stress, setStress] = useState(0.4);
  const [coherence, setCoherence] = useState(0.5);

  /** Rodar um ciclo manual */
  const handleCycle = async () => {
    await runCycle({ stress, C_epsilon: coherence });
  };

  /** Toggle auto-run */
  const toggleAutoRun = () => {
    setAutoRun((prev) => !prev);
    if (!autoRun) {
      start();
    } else {
      stop();
    }
  };

  return (
    <section id="farm" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              FARM
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              vHGPU AUTOMATIZADA
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            vHGPU <span className="text-[#b6ff3a]">Farm</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Mineração PoH + auto-compound + alocação ótima em CCB, Coherence Bonds,
            rETF e Hysteresis Vaults. Gerenciamento de risco via Mecânica dos Colapsos.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Mineração */}
          <div className="lg:col-span-4 bg-[#0a0d10] p-6 md:p-8">
            <span className="tag mb-4 block">MINERAÇÃO PoH</span>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">HASHRATE</div>
                <div className="font-mono text-lg text-[#6cf0ff]">
                  {state.mining.hashrate.toFixed(0)} <span className="text-[9px]">h/s</span>
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">BLOCOS</div>
                <div className="font-mono text-lg text-[#b6ff3a]">{state.mining.blocks}</div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">MINERADO</div>
                <div className="font-mono text-lg text-[#ff3ad9]">
                  {state.mining.totalMined.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">STATUS</div>
                <div className={`font-mono text-lg ${isRunning ? "text-[#b6ff3a]" : "text-zinc-600"}`}>
                  {isRunning ? "ATIVA" : "PARADA"}
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={toggleAutoRun}
                  className={`flex-1 px-4 py-2 font-mono text-xs border transition-colors ${
                    autoRun
                      ? "bg-[#ff3ad9]/10 border-[#ff3ad9]/30 text-[#ff3ad9]"
                      : "bg-[#b6ff3a]/10 border-[#b6ff3a]/30 text-[#b6ff3a]"
                  }`}
                >
                  {autoRun ? "PARAR AUTO" : "INICIAR AUTO"}
                </button>
                <button
                  onClick={handleCycle}
                  className="flex-1 px-4 py-2 bg-[#6cf0ff]/10 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-xs hover:bg-[#6cf0ff]/20 transition-colors"
                >
                  CICLO ÚNICO
                </button>
              </div>

              {/* Sliders */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-zinc-500">ESTRESSE σ</span>
                  <span className="font-mono text-[9px] text-[#ff3ad9]">{stress.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={stress}
                  onChange={(e) => setStress(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ff3ad9]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[9px] text-zinc-500">COERÊNCIA C_ε</span>
                  <span className="font-mono text-[9px] text-[#6cf0ff]">{coherence.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={coherence}
                  onChange={(e) => setCoherence(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
                />
              </div>
            </div>
          </div>

          {/* Portfolio */}
          <div className="lg:col-span-4 bg-black p-6 md:p-8">
            <span className="tag mb-4 block">PORTFOLIO</span>

            <div className="mb-4">
              <div className="p-4 bg-[#0a0d10] border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">VALOR TOTAL</div>
                <div className="font-mono text-2xl text-[#b6ff3a]">
                  ${state.portfolio.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className={`font-mono text-xs mt-1 ${
                  state.portfolio.returnPct >= 0 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"
                }`}>
                  {state.portfolio.returnPct >= 0 ? "+" : ""}
                  {state.portfolio.returnPct.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">RESERVA</div>
                <div className="font-mono text-sm text-[#6cf0ff]">
                  ${state.portfolio.cash.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">INVESTIDO</div>
                <div className="font-mono text-sm text-zinc-300">
                  ${state.portfolio.invested.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Alocação */}
            <div className="mb-4">
              <div className="font-mono text-[9px] text-zinc-500 mb-2">ALOCAÇÃO ÓTIMA</div>
              <div className="space-y-1">
                {[
                  { name: "CCB", pct: 30 + (1 - coherence) * 10, color: "#ff3ad9" },
                  { name: "CoherenceBond", pct: 25 + coherence * 15, color: "#6cf0ff" },
                  { name: "rETF", pct: 25 * (1 - coherence), color: "#b6ff3a" },
                  { name: "HysteresisVault", pct: 20 + stress * 10, color: "#a78bfa" },
                ].map((inst) => (
                  <div key={inst.name} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-zinc-600 w-24 truncate">{inst.name}</span>
                    <div className="flex-1 h-1.5 bg-[#14181c] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, inst.pct)}%`, backgroundColor: inst.color }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-zinc-500 w-8 text-right">
                      {inst.pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-mono text-[8px] text-zinc-600">
              Ciclos: {state.performance.cycles} | Trades: {state.performance.totalTrades}
            </div>
          </div>

          {/* Risco + Log */}
          <div className="lg:col-span-4 bg-[#0a0d10] p-6 md:p-8">
            {/* Risco */}
            <span className="tag mb-4 block">GERENCIAMENTO DE RISCO</span>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">ESTRESSE</div>
                <div className={`font-mono text-lg ${
                  state.risk.stress > 0.7 ? "text-[#ff3ad9]" :
                  state.risk.stress > 0.5 ? "text-yellow-500" : "text-[#b6ff3a]"
                }`}>
                  {state.risk.stress.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">RAisco</div>
                <div className={`font-mono text-lg ${
                  state.risk.level === "CRITICAL" ? "text-[#ff3ad9]" :
                  state.risk.level === "HIGH" ? "text-yellow-500" : "text-[#b6ff3a]"
                }`}>
                  {state.risk.level}
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">DRAWDOWN</div>
                <div className="font-mono text-lg text-zinc-300">
                  {(state.risk.drawdown * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">WIN RATE</div>
                <div className="font-mono text-lg text-[#6cf0ff]">
                  {state.performance.winRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Métricas LSC */}
            <div className="mb-4 p-3 bg-black border border-[#14181c]">
              <div className="font-mono text-[9px] text-zinc-500 mb-2">LEIS DE BRUNO</div>
              <div className="space-y-1 font-mono text-[9px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Law 1 (P ≤ P_max)</span>
                  <span className="text-[#b6ff3a]">ATIVA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Law 2 (G saturação)</span>
                  <span className={coherence > 0.86 ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>
                    {(1 / ((1 - coherence) + 0.1 * Math.exp(3 * coherence))).toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Law 3 (K_eff)</span>
                  <span className="text-[#6cf0ff]">
                    {(1 * (1 - coherence) + 0.01).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* Log */}
            <div>
              <div className="font-mono text-[9px] text-zinc-500 mb-2">ATIVIDADE</div>
              <div className="h-32 overflow-y-auto bg-black border border-[#14181c] p-2 font-mono text-[8px]">
                {logs.length === 0 ? (
                  <span className="text-zinc-600">Aguardando primeiro ciclo...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`${
                      log.includes("CRITICAL") || log.includes("ERROR")
                        ? "text-[#ff3ad9]"
                        : "text-zinc-500"
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#14181c] font-mono text-[8px] text-zinc-600 leading-relaxed">
              "O mercado que lembra está condenado a evoluir."
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
