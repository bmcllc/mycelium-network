import { useRef, useState } from "react";
import { gpuMiner, type MiningJob, type MiningResult } from "../crypto/gpuMiner";

export default function GPUMiningPanel() {
  const [status, setStatus] = useState(gpuMiner.getStatus());
  const [difficulty, setDifficulty] = useState(2);
  const [maxIter, setMaxIter] = useState(100000);
  const [result, setResult] = useState<MiningResult | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleInit = async () => {
    addLog("Inicializando WebGPU...");
    const ok = await gpuMiner.init();
    setStatus(gpuMiner.getStatus());
    addLog(ok ? "WebGPU inicializado com sucesso" : "WebGPU indisponivel, usando CPU fallback");
  };

  const handleMine = async () => {
    setIsMining(true);
    const challenge = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
    const job: MiningJob = {
      challenge,
      difficulty,
      prefix: "eternet_pow_",
    };
    addLog(`Mining iniciado: diff=${difficulty}, maxIter=${maxIter}, device=${status.device}`);

    const r = await gpuMiner.mine(job, maxIter);
    setResult(r);
    setIsMining(false);
    addLog(r.found
      ? `FOUND: nonce=${r.nonce} hash=${r.hash} (${r.iterations} iter, ${r.elapsedMs.toFixed(0)}ms, ${r.device})`
      : `NAO ENCONTRADO: ${r.iterations} iteracoes em ${r.elapsedMs.toFixed(0)}ms`
    );
  };

  return (
    <section id="gpu-mining-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ffd700]">§ 13.14</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffd700]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">GPU MINING</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Mineracao <span className="text-[#ffd700]">GPU</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            PoW via WebGPU compute shaders. Paraleliza hash SHA3 em centenas de cores GPU.
            GPU ~10M hashes/s vs CPU ~100k. Fallback automatico para CPU quando WebGPU indisponivel.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CONTROLE DE MINERACAO</span>
              <span className={`font-mono text-[10px] ${status.available ? "text-[#b6ff3a]" : "text-zinc-600"}`}>
                {status.device}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">DIFFICULTY</span>
                <span className="font-mono text-[10px] text-[#ffd700]">{difficulty}</span>
              </div>
              <input
                type="range" min={1} max={8} value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ffd700]"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">MAX ITERATIONS</span>
                <span className="font-mono text-[10px] text-[#ffd700]">{maxIter.toLocaleString()}</span>
              </div>
              <input
                type="range" min={10000} max={1000000} step={10000} value={maxIter}
                onChange={(e) => setMaxIter(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ffd700]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleInit}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 transition-all"
              >
                INIT WEBGPU
              </button>
              <button
                onClick={handleMine}
                disabled={isMining}
                className="py-3 bg-[#ffd700] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white disabled:opacity-50 transition-all"
              >
                {isMining ? "MINING..." : "INICIAR MINING"}
              </button>
            </div>

            {result && (
              <div className={`p-4 border font-mono text-[10px] space-y-1 ${
                result.found ? "bg-black border-[#ffd700]/20" : "bg-black border-zinc-800"
              }`}>
                <div className="tag mb-2">{result.found ? "BLOCO ENCONTRADO" : "RESULTADO"}</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">found</span>
                  <span className={result.found ? "text-[#ffd700]" : "text-zinc-600"}>{result.found ? "SIM" : "NAO"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">device</span>
                  <span className={result.device === "gpu" ? "text-[#b6ff3a]" : "text-zinc-400"}>
                    {result.device.toUpperCase()}
                  </span>
                </div>
                {result.found && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">nonce</span>
                      <span className="text-[#ffd700]">{result.nonce}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">hash</span>
                      <span className="text-zinc-300">{result.hash}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600">iterations</span>
                  <span className="text-zinc-300">{result.iterations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">tempo</span>
                  <span className="text-zinc-300">{result.elapsedMs.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">hashrate</span>
                  <span className="text-[#6cf0ff]">
                    {(result.iterations / (result.elapsedMs / 1000)).toFixed(0)} H/s
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="tag mb-2">STATUS DO DEVICE</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">WebGPU</span>
                  <span className={status.available ? "text-[#b6ff3a]" : "text-zinc-600"}>
                    {status.available ? "DISPONIVEL" : "INDISPONIVEL"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">device</span>
                  <span className="text-[#ffd700]">{status.device}</span>
                </div>
              </div>

              <div>
                <span className="tag mb-3 block">COMPUTE SHADER</span>
                <div className="space-y-2">
                  {[
                    { step: "1", name: "Workgroup dispatch", desc: "256 threads/grupo", color: "#ffd700" },
                    { step: "2", name: "SHA3 Keccak-f", desc: "24 rounds por hash", color: "#b6ff3a" },
                    { step: "3", name: "Leading zeros check", desc: "Verifica difficulty", color: "#6cf0ff" },
                    { step: "4", name: "Output buffer", desc: "Nonce + hash valido", color: "#ff3ad9" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-2 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                      <span className="w-5 h-5 flex items-center justify-center border text-[8px]" style={{ borderColor: s.color, color: s.color }}>{s.step}</span>
                      <div className="flex-1">
                        <div className="text-zinc-300">{s.name}</div>
                        <div className="text-zinc-600 text-[8px]">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">CPU hashrate</span>
                  <span className="text-zinc-300">~100k H/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">GPU hashrate</span>
                  <span className="text-[#ffd700]">~10M H/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">workgroup</span>
                  <span className="text-zinc-300">256 threads</span>
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
