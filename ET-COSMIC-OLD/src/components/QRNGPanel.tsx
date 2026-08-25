import { useRef, useState } from "react";
import { qrng, type QRNGResult, type QRNGSource } from "../crypto/qrng";

export default function QRNGPanel() {
  const [bits, setBits] = useState(256);
  const [source, setSource] = useState<QRNGSource>("local");
  const [lastResult, setLastResult] = useState<QRNGResult | null>(null);
  const [entropy, setEntropy] = useState<string>("");
  const [stats, setStats] = useState(qrng.getStats());
  const [sources, setSources] = useState<{ anu: boolean } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleGenerate = async () => {
    try {
      qrng.setConfig({ preferredSource: source });
      const result = await qrng.getQuantumBytes(bits);
      setLastResult(result);
      setStats(qrng.getStats());
      addLog(`QRNG: ${result.bits} bits de ${result.source} (quantum=${result.quantumVerified})`);
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleEntropy = async () => {
    try {
      const hex = await qrng.getQuantumEntropy();
      setEntropy(hex);
      addLog(`Entropia GhostID: ${hex.slice(0, 32)}...`);
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCheckSources = async () => {
    const s = await qrng.checkSources();
    setSources(s);
    addLog(`Fontes: ANU=${s.anu ? "ONLINE" : "OFFLINE"}, local=SEMPRE`);
  };

  return (
    <section id="qrng-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 13.0</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">QRNG</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Quantum <span className="text-[#b6ff3a]">RNG</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Gerador de numeros aleatorios quanticos via ANU (vacuum fluctuations) com fallback local (CSPRNG).
            Entropia genuina para seeding de GhostID e chaves efemeras.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">GERACAO QRNG</span>
              <span className="font-mono text-[10px] text-zinc-600">cache: {stats.cacheSize}</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] text-zinc-500">BITS</span>
              <input
                type="range" min={64} max={1024} step={64} value={bits}
                onChange={(e) => setBits(parseInt(e.target.value))}
                className="flex-1 h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#b6ff3a]"
              />
              <span className="font-mono text-[10px] text-[#b6ff3a] w-12 text-right">{bits}</span>
            </div>

            <div className="flex gap-2 mb-6">
              {(["local", "anu"] as QRNGSource[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-all ${
                    source === s
                      ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/10 text-[#b6ff3a]"
                      : "border-[#14181c] text-zinc-600 hover:border-zinc-700"
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleGenerate}
                className="py-3 bg-[#b6ff3a] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                GERAR BYTES
              </button>
              <button
                onClick={handleEntropy}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 transition-all"
              >
                ENTROPIA GHOSTID
              </button>
            </div>

            <button
              onClick={handleCheckSources}
              className="w-full py-2 bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono text-[10px] tracking-[0.2em] hover:bg-zinc-800 hover:text-zinc-200 transition-all"
            >
              VERIFICAR FONTES
            </button>

            {sources && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="text-zinc-600 mb-1">ANU (Quantico)</div>
                  <div className={sources.anu ? "text-[#b6ff3a]" : "text-zinc-600"}>
                    {sources.anu ? "ONLINE" : "OFFLINE"}
                  </div>
                </div>
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="text-zinc-600 mb-1">Local (CSPRNG)</div>
                  <div className="text-[#b6ff3a]">SEMPRE</div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {lastResult && (
                <div>
                  <span className="tag mb-3 block">ULTIMO RESULTADO</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">fonte</span>
                      <span className="text-[#b6ff3a]">{lastResult.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">bits</span>
                      <span className="text-zinc-300">{lastResult.bits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">quantico</span>
                      <span className={lastResult.quantumVerified ? "text-[#b6ff3a]" : "text-zinc-500"}>
                        {lastResult.quantumVerified ? "VERIFICADO" : "CSPRNG"}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-[#14181c] break-all text-zinc-500">
                      {Array.from(lastResult.data.slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                    </div>
                  </div>
                </div>
              )}

              {entropy && (
                <div>
                  <span className="tag mb-3 block">ENTROPIA SHA3-256</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#b6ff3a]/20 font-mono text-[8px] text-[#b6ff3a] break-all leading-relaxed">
                    {entropy}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">fonte preferida</span>
                  <span className="text-[#b6ff3a]">{stats.preferredSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">cache</span>
                  <span className="text-zinc-300">{stats.cacheSize} entradas</span>
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
