import { useState, useEffect, useRef } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { priceTickFromMaterial } from "../lib/moduleRealityBackend";
import {
  TemporalOracle,
  createTimeLockIntent,
  type TemporalIntent,
  type AnchoredExecution,
  type HedgeCommitment,
} from "../crypto/temporalOracle";

export default function TemporalOracleLab() {
  const { material } = useOmegaMaterial(128);
  const tickRef = useRef(0);
  const [oracle] = useState(() => new TemporalOracle());

  // Form state
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [pair, setPair] = useState("vBTC/vUSD");
  const [amount, setAmount] = useState("0.5");
  const [anchorPrice, setAnchorPrice] = useState("42000");
  const [slippageBps, setSlippageBps] = useState("200"); // 2%
  const [windowMinutes, setWindowMinutes] = useState("120"); // 2 horas
  const [channel, setChannel] = useState("LoRa Mesh");

  // Oracle state
  const [activeIntents, setActiveIntents] = useState<
    Array<TemporalIntent & { timeRemainingMs: number }>
  >([]);
  const [executions, setExecutions] = useState<AnchoredExecution[]>([]);
  const [hedges, setHedges] = useState<HedgeCommitment[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Simulation: live price feed
  const [livePrice, setLivePrice] = useState(42000);
  const [priceVolatility, setPriceVolatility] = useState(0.5); // % por tick
  const priceRef = useRef(livePrice);
  priceRef.current = livePrice;

  // Ephemeral trader key (simula GhostID)
  const [traderKey] = useState(() => crypto.getRandomValues(new Uint8Array(32)));

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 80));
  };

  const refresh = () => {
    oracle.sweep();
    setActiveIntents(oracle.getActiveIntents());
    setExecutions(oracle.getExecutions());
    setHedges(oracle.getHedges());
  };

  useEffect(() => {
    if (!material) return;
    const interval = setInterval(() => {
      setLivePrice((prev) => priceTickFromMaterial(material, prev, priceVolatility, tickRef.current++));
    }, 2000);
    return () => clearInterval(interval);
  }, [priceVolatility, material]);

  // Auto-refresh active intents
  useEffect(() => {
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateIntent = () => {
    const intent = createTimeLockIntent({
      side,
      pair,
      amount: parseFloat(amount),
      anchorPrice: parseFloat(anchorPrice),
      slippageBps: parseInt(slippageBps),
      validityWindowMs: parseInt(windowMinutes) * 60 * 1000,
      channel,
      estimatedLatency: channel === "LoRa Mesh" ? "horas" : channel === "HCN" ? "min–horas" : "5–80ms",
      traderPrivKey: traderKey,
    });

    oracle.registerIntent(intent);
    addLog(`INTENT CRIADA: ${intent.id}`);
    addLog(`  ${side} ${amount} ${pair} @ anchor=${anchorPrice} ± ${slippageBps}bps`);
    addLog(`  Janela: ${windowMinutes} min | Canal: ${channel}`);
    addLog(`  Price Commitment: ${intent.priceCommitment.slice(0, 16)}...`);
    addLog(`  Time Proof (Ed25519): ${intent.timeProof.slice(0, 16)}...`);
    refresh();
  };

  const handleTryExecute = (intentId: string) => {
    const result = oracle.tryExecute(intentId, priceRef.current);
    if (!result) return;

    if (result.accepted) {
      addLog(`✓ EXECUÇÃO ACEITA: ${intentId}`);
      addLog(`  Preço execução: ${result.executionPrice.toFixed(2)} | Anchor: ${result.anchorPrice.toFixed(2)}`);
      addLog(`  Slippage real: ${result.slippageActual} bps (limite: ${result.slippageAllowed} bps)`);
      addLog(`  ZK Proof: ${result.zkProof.slice(0, 16)}...`);
    } else {
      addLog(`✗ EXECUÇÃO REJEITADA: ${intentId}`);
      addLog(`  Slippage ${result.slippageActual} bps > limite ${result.slippageAllowed} bps`);
      addLog(`  ZK Proof de rejeição: ${result.zkProof.slice(0, 16)}...`);
    }
    refresh();
  };

  const handleAddHedge = (intentId: string) => {
    const hedge = oracle.addHedge(intentId, 50);
    if (!hedge) return;
    addLog(`HEDGE ATIVADO: ${intentId}`);
    addLog(`  Direção: ${hedge.hedgeDirection} | Premium: ${hedge.premium}bps`);
    addLog(`  Preço ativação: ${hedge.activationPrice.toFixed(2)}`);
    addLog(`  Commitment: ${hedge.commitment.slice(0, 16)}...`);
    refresh();
  };

  const handlePriceShock = (direction: "up" | "down", magnitude: number) => {
    setLivePrice(prev => {
      const shocked = direction === "up"
        ? prev * (1 + magnitude / 100)
        : prev * (1 - magnitude / 100);
      addLog(`⚡ CHOQUE DE PREÇO: ${direction.toUpperCase()} ${magnitude}% → ${shocked.toFixed(2)}`);
      return +shocked.toFixed(2);
    });
  };

  const formatMs = (ms: number) => {
    if (ms <= 0) return "EXPIRED";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  return (
    <section className="border border-[#14181c] bg-[#070809]">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-[#14181c] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 3.1</span>
              <span className="h-px w-12 bg-[#6cf0ff]/40" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">TEMPORAL INTENT ORACLE</span>
            </div>
            <h3 className="font-sans text-2xl text-zinc-100">
              Oráculo de Intenção Temporal <span className="text-[#6cf0ff]">(TIO)</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-zinc-500">LIVE PRICE</div>
            <div className="font-mono text-2xl text-zinc-100">${livePrice.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Intent Builder + Price Controls */}
          <div className="lg:col-span-5 space-y-5">
            {/* Price Simulator */}
            <div className="border border-[#14181c] bg-black p-4">
              <div className="tag mb-3">ORÁCULO DE MERCADO (Ω)</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs text-zinc-500">Volatilidade:</span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={priceVolatility}
                  onChange={e => setPriceVolatility(+e.target.value)}
                  className="flex-1 accent-[#6cf0ff]"
                />
                <span className="font-mono text-xs text-[#6cf0ff] w-10">{priceVolatility.toFixed(1)}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handlePriceShock("up", 1)} className="py-1.5 bg-emerald-900/30 text-emerald-400 font-mono text-[10px] border border-emerald-900/50 hover:bg-emerald-900/50">+1%</button>
                <button onClick={() => handlePriceShock("up", 5)} className="py-1.5 bg-emerald-900/30 text-emerald-400 font-mono text-[10px] border border-emerald-900/50 hover:bg-emerald-900/50">+5%</button>
                <button onClick={() => handlePriceShock("down", 1)} className="py-1.5 bg-red-900/30 text-red-400 font-mono text-[10px] border border-red-900/50 hover:bg-red-900/50">-1%</button>
                <button onClick={() => handlePriceShock("down", 5)} className="py-1.5 bg-red-900/30 text-red-400 font-mono text-[10px] border border-red-900/50 hover:bg-red-900/50">-5%</button>
              </div>
            </div>

            {/* Intent Builder Form */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="tag mb-3">CRIAR TIME-LOCKED INTENT</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setSide("BUY")} className={`py-1.5 font-mono text-xs border ${side === "BUY" ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/10" : "border-[#14181c] text-zinc-500"}`}>BUY</button>
                  <button onClick={() => setSide("SELL")} className={`py-1.5 font-mono text-xs border ${side === "SELL" ? "border-[#ff3ad9] text-[#ff3ad9] bg-[#ff3ad9]/10" : "border-[#14181c] text-zinc-500"}`}>SELL</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">PAIR</label>
                    <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none">
                      <option>vBTC/vUSD</option>
                      <option>vETH/vUSD</option>
                      <option>vADA/vBTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">AMOUNT</label>
                    <input type="text" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">ANCHOR PRICE ($)</label>
                    <input type="text" value={anchorPrice} onChange={e => setAnchorPrice(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">SLIPPAGE (BPS)</label>
                    <input type="text" value={slippageBps} onChange={e => setSlippageBps(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">JANELA (MIN)</label>
                    <input type="text" value={windowMinutes} onChange={e => setWindowMinutes(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] text-zinc-600 mb-1">CANAL</label>
                    <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2 py-1.5 outline-none">
                      <option>LoRa Mesh</option>
                      <option>HCN (Human Carrier)</option>
                      <option>BLE / Wi-Fi Direct</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateIntent}
                  className="w-full py-2.5 bg-[#6cf0ff] text-black font-mono text-xs tracking-wider hover:bg-white transition-colors"
                >
                  CRIAR INTENT TIME-LOCKED
                </button>
              </div>
            </div>
          </div>

          {/* Right: Active Intents + Executions + Logs */}
          <div className="lg:col-span-7 space-y-5">
            {/* Active Intents */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">INTENTS ATIVAS ({activeIntents.length})</span>
                <span className="font-mono text-[10px] text-zinc-600">AUTO-SWEEP ENABLED</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeIntents.length === 0 ? (
                  <div className="text-center font-mono text-xs text-zinc-600 py-4">Nenhuma intent ativa. Crie uma ordem temporal.</div>
                ) : activeIntents.map(intent => (
                  <div key={intent.id} className="p-3 bg-black border border-[#14181c]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-zinc-200">{intent.id.slice(0, 20)}...</span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 border ${intent.timeRemainingMs > 60000 ? "text-[#b6ff3a] border-[#b6ff3a]/30" : "text-[#ff3ad9] border-[#ff3ad9]/30"}`}>
                        TTL: {formatMs(intent.timeRemainingMs)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-zinc-500 mb-2">
                      <div>{intent.side} <span className="text-zinc-300">{intent.amount}</span></div>
                      <div>Anchor: <span className="text-[#6cf0ff]">${intent.anchorPrice}</span></div>
                      <div>Slip: <span className="text-zinc-300">{intent.slippageBps}bps</span></div>
                      <div>Via: <span className="text-zinc-300">{intent.channel}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTryExecute(intent.id)} className="flex-1 py-1 bg-[#6cf0ff]/20 text-[#6cf0ff] font-mono text-[10px] border border-[#6cf0ff]/30 hover:bg-[#6cf0ff]/40">
                        EXECUTAR @ ${livePrice.toFixed(0)}
                      </button>
                      <button onClick={() => handleAddHedge(intent.id)} className="px-3 py-1 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10">
                        HEDGE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution Results + Hedges */}
            {(executions.length > 0 || hedges.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {executions.length > 0 && (
                  <div className="border border-[#14181c] bg-black p-3">
                    <div className="tag mb-2">EXECUÇÕES ({executions.length})</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {executions.slice(-5).map((ex, i) => (
                        <div key={i} className={`p-2 border font-mono text-[9px] ${ex.accepted ? "border-[#b6ff3a]/20 text-[#b6ff3a]" : "border-[#ff3ad9]/20 text-[#ff3ad9]"}`}>
                          {ex.accepted ? "✓" : "✗"} slip={ex.slippageActual}/{ex.slippageAllowed}bps @ ${ex.executionPrice.toFixed(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {hedges.length > 0 && (
                  <div className="border border-[#14181c] bg-black p-3">
                    <div className="tag mb-2">HEDGES ATIVOS ({hedges.length})</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {hedges.map((h, i) => (
                        <div key={i} className="p-2 border border-[#ff3ad9]/20 font-mono text-[9px] text-zinc-400">
                          {h.hedgeDirection} @ ${h.activationPrice.toFixed(0)} | {h.premium}bps premium
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal Logs */}
            <div className="border border-[#14181c] bg-black p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="tag">ORACLE LOG</span>
                <button onClick={() => setLogs([])} className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400">CLEAR</button>
              </div>
              <div className="h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="border-l-2 border-[#14181c] pl-2">{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Explanation */}
        <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed grid md:grid-cols-3 gap-6">
          <div>
            <span className="text-[#6cf0ff] font-bold">1. TIME-LOCKED INTENTS</span>
            <p className="mt-1">Ordens com janela de validade criptográfica (Ed25519). Se a janela expirar antes da chegada via LoRa/HCN, a ordem é matematicamente inválida. Previne ordens zumbis.</p>
          </div>
          <div>
            <span className="text-[#6cf0ff] font-bold">2. ZK-ANCHORED EXECUTION</span>
            <p className="mt-1">Preço ancorado retroativamente com Pedersen Commitment. Execução aceita se slippage real ≤ tolerância declarada. Prova ZK impede manipulação do anchor.</p>
          </div>
          <div>
            <span className="text-[#6cf0ff] font-bold">3. DELTA-NEUTRAL HEDGING</span>
            <p className="mt-1">Posições de proteção automáticas para ordens de alto valor. Ativam-se se o preço ultrapassar o limiar de slippage durante o transporte.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
