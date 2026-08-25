import { useRef, useState } from "react";
import { nostrOracle, type PriceReport, type AggregatedPrice } from "../crypto/nostrOracle";
import { loadOmegaMaterial, oracleBasePriceFromMaterial } from "../lib/moduleRealityBackend";

export default function NostrOraclePanel() {
  const [pair, setPair] = useState("ETR/BRL");
  const [price, setPrice] = useState("");
  const [source, setSource] = useState("binance");
  const [aggregated, setAggregated] = useState<AggregatedPrice | null>(null);
  const [stats, setStats] = useState(nostrOracle.getStats());
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleSubmit = () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return;
    const report: PriceReport = {
      id: `rpt_${Date.now()}`,
      oraclePk: crypto.getRandomValues(new Uint8Array(32)).toString(),
      pair: pair.toUpperCase(),
      price: p,
      timestamp: Date.now(),
      confidence: 0.95,
      source,
    };
    nostrOracle.submitReport(report);
    setStats(nostrOracle.getStats());
    addLog(`Report: ${pair} = ${p} (${source})`);
  };

  const handleAggregate = () => {
    const agg = nostrOracle.getPrice(pair);
    if (agg) {
      setAggregated(agg);
      addLog(`Aggregate: ${pair} median=${agg.medianPrice.toFixed(2)} conf=${agg.confidence.toFixed(2)}`);
    } else {
      addLog(`Nenhum report para ${pair}`);
    }
  };

  const handleSeedFromOmega = async () => {
    const { material, meta } = await loadOmegaMaterial(128);
    const base = oracleBasePriceFromMaterial(material, pair);
    const sources = ["binance", "coingecko", "kraken", "manual", "defi"] as const;
    for (let i = 0; i < 5; i++) {
      const jitter = ((material[i + 10] ?? 0) / 255 - 0.5) * 0.06 * base;
      const report: PriceReport = {
        id: `omega_${Date.now()}_${i}`,
        oraclePk: Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
        pair: pair.toUpperCase(),
        price: base + jitter,
        timestamp: Date.now(),
        confidence: 0.85 + (material[i + 20] ?? 0) / 2550,
        source: sources[i]!,
      };
      nostrOracle.submitReport(report);
    }
    setStats(nostrOracle.getStats());
    addLog(`5 reports Ω (${meta.tier}) para ${pair}`);
  };

  return (
    <section id="nostr-oracle-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ffd700]">§ 13.1</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffd700]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">NOSTR ORACLE</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Oracle de <span className="text-[#ffd700]">Preco</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Preco descentralizado via NOSTR kind 31219. Mediana com remocao de outliers (&gt;20%).
            Schelling point: 5+ nos reportam precos similares.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">SUBMETER REPORT</span>
              <span className="font-mono text-[10px] text-zinc-600">{stats.totalReports} reports</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {["ETR/BRL", "ETR/XMR", "ETR/SOV"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPair(p)}
                  className={`py-2 font-mono text-[10px] border transition-all ${
                    pair === p
                      ? "border-[#ffd700]/50 bg-[#ffd700]/10 text-[#ffd700]"
                      : "border-[#14181c] text-zinc-600 hover:border-zinc-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Preco..."
                className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#ffd700]/50"
              />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-400 focus:outline-none"
              >
                <option value="binance">binance</option>
                <option value="coingecko">coingecko</option>
                <option value="kraken">kraken</option>
                <option value="manual">manual</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={handleSubmit}
                className="py-3 bg-[#ffd700] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                SUBMETER
              </button>
              <button
                onClick={handleAggregate}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 transition-all"
              >
                AGREGAR
              </button>
              <button
                onClick={() => void handleSeedFromOmega()}
                className="py-3 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9]/10 transition-all"
              >
                SEED Ω 5x
              </button>
            </div>

            {aggregated && (
              <div className="p-4 bg-black border border-[#ffd700]/20 font-mono text-[10px] space-y-1">
                <div className="tag mb-2">{aggregated.pair} — AGGREGATED</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">mediana</span>
                  <span className="text-[#ffd700]">{aggregated.medianPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">media</span>
                  <span className="text-zinc-300">{aggregated.meanPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">validos</span>
                  <span className="text-[#b6ff3a]">{aggregated.validReports}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">outliers</span>
                  <span className="text-[#ff3ad9]">{aggregated.outlierCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">confianca</span>
                  <span className="text-[#6cf0ff]">{(aggregated.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="tag mb-3 block">PARES RASTREADOS</span>
                <div className="space-y-2">
                  {nostrOracle.getPairs().length === 0 ? (
                    <div className="font-mono text-[10px] text-zinc-600 italic">Nenhum par registrado</div>
                  ) : (
                    nostrOracle.getPairs().map((p) => {
                      const agg = nostrOracle.getPrice(p);
                      return (
                        <div key={p} className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-300">{p}</span>
                            <span className="text-[#ffd700]">{agg?.medianPrice.toFixed(4) ?? "—"}</span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>{agg?.validReports ?? 0} reports</span>
                            <span>conf: {((agg?.confidence ?? 0) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">pares</span>
                  <span className="text-zinc-300">{stats.pairs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">total reports</span>
                  <span className="text-[#ffd700]">{stats.totalReports}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">outlier threshold</span>
                  <span className="text-zinc-300">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">kind NOSTR</span>
                  <span className="text-[#6cf0ff]">31219</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando operador...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-[#14181c] pl-2">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
