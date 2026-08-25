import { useRef, useState } from "react";
import {
  paleoYieldManager,
  type YieldFarm,
  type FossilETF,
} from "../crypto/paleoYield";

export default function PaleoYieldPanel() {
  const [farms, setFarms] = useState<YieldFarm[]>([]);
  const [etfs, setETFs] = useState<FossilETF[]>([]);
  const [farmName, setFarmName] = useState("Linux Kernel");
  const [apr, setApr] = useState(0.15);
  const [age, setAge] = useState(1000);
  const [stakeAmount, setStakeAmount] = useState(100);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => {
    setFarms(paleoYieldManager.getAllFarms());
    setETFs(paleoYieldManager.getAllFossilETFs());
  };

  const handleCreateFarm = () => {
    const farm = paleoYieldManager.createFarm(farmName, apr, age);
    setSelectedFarm(farm.id);
    refresh();
    addLog(`Farm criada: ${farm.name} APR=${(apr * 100).toFixed(1)}% idade=${age}d`);
  };

  const handleStake = () => {
    if (!selectedFarm) return;
    try {
      paleoYieldManager.stake(selectedFarm, stakeAmount);
      refresh();
      addLog(`Stake: ${stakeAmount} em ${paleoYieldManager.getFarm(selectedFarm)?.name}`);
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClaim = () => {
    if (!selectedFarm) return;
    try {
      const claimed = paleoYieldManager.claim(selectedFarm, 0, Date.now());
      addLog(`Claim: ${claimed.toFixed(4)} de ${paleoYieldManager.getFarm(selectedFarm)?.name}`);
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCreateETF = () => {
    const etf = paleoYieldManager.createFossilETF("FOSSIL-CORE", "CORE_ALGOS", ["TCP/IP", "HTTP", "DNS"]);
    refresh();
    addLog(`ETF criado: ${etf.name} (${etf.components.length} componentes)`);
  };

  return (
    <section id="paleo-yield-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">§ 13.7</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ff3ad9]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">PALEO YIELD</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Paleo-Yield <span className="text-[#ff3ad9]">Farming</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Yield farming para ativos fosseis. Rendimento decrescende com a idade: yield = staked x APR x days x exp(-lambda x age).
            Fossil ETFs rastreiam infraestrutura legada.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CRIAR FARM</span>
              <span className="font-mono text-[10px] text-zinc-600">{farms.length} farms</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">NOME</span>
                <input
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ff3ad9]/50"
                />
              </div>
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">APR</span>
                <input
                  type="number" step="0.01" value={apr}
                  onChange={(e) => setApr(parseFloat(e.target.value))}
                  className="w-full bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                />
              </div>
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">IDADE (dias)</span>
                <input
                  type="number" value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">STAKE AMOUNT</span>
                <span className="font-mono text-[10px] text-[#ff3ad9]">{stakeAmount}</span>
              </div>
              <input
                type="range" min={10} max={1000} step={10} value={stakeAmount}
                onChange={(e) => setStakeAmount(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ff3ad9]"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              <button
                onClick={handleCreateFarm}
                className="py-3 bg-[#ff3ad9] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                CRIAR FARM
              </button>
              <button
                onClick={handleStake}
                disabled={!selectedFarm}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] hover:bg-[#b6ff3a]/10 disabled:opacity-50 transition-all"
              >
                STAKE
              </button>
              <button
                onClick={handleClaim}
                disabled={!selectedFarm}
                className="py-3 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[10px] hover:bg-[#ffd700]/10 disabled:opacity-50 transition-all"
              >
                CLAIM
              </button>
              <button
                onClick={handleCreateETF}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10 transition-all"
              >
                FOSSIL ETF
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {farms.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFarm(f.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedFarm === f.id
                      ? "border-[#ff3ad9]/50 bg-[#ff3ad9]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-300">{f.name}</span>
                    <span className="text-[#ff3ad9]">APR {(f.apr * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    staked: {f.totalStaked} | idade: {f.age}d | fossil: {Math.exp(-0.001 * f.age).toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {selectedFarm && (() => {
                const farm = paleoYieldManager.getFarm(selectedFarm);
                const positions = paleoYieldManager.getPositions(selectedFarm);
                if (!farm) return null;
                const fossilFactor = Math.exp(-0.001 * farm.age);
                return (
                  <div>
                    <span className="tag mb-3 block">FARM SELECIONADA</span>
                    <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">nome</span>
                        <span className="text-zinc-300">{farm.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">APR</span>
                        <span className="text-[#ff3ad9]">{(farm.apr * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">total staked</span>
                        <span className="text-[#b6ff3a]">{farm.totalStaked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">fossil factor</span>
                        <span className="text-[#ffd700]">{fossilFactor.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">posicoes</span>
                        <span className="text-zinc-300">{positions.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {etfs.length > 0 && (
                <div>
                  <span className="tag mb-3 block">FOSSIL ETFs</span>
                  <div className="space-y-2">
                    {etfs.map((e) => (
                      <div key={e.id} className="p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-300">{e.name}</span>
                          <span className="text-[#6cf0ff]">{e.category}</span>
                        </div>
                        <div className="text-zinc-600 text-[8px]">{e.components.join(", ")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">formula</span>
                  <span className="text-zinc-400 text-[8px]">staked x APR/365 x days x e^(-0.001 x age)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">lambda</span>
                  <span className="text-zinc-300">0.001</span>
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
