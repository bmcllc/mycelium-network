import { useRef, useState } from "react";
import {
  SDFEngine,
  hgpuPoW,
  projectToSpectralBasis,
  windFieldAt,
  rayContinuation,
  type float3,
  type SDFResult,
} from "../crypto/hgpuCompute";

export default function HGPUComputePanel() {
  const [sdfValue, setSdfValue] = useState(0);
  const [powResult, setPowResult] = useState<{ found: boolean; nonce: number; hash: string; iterations: number; elapsedMs: number } | null>(null);
  const [rayResult, setRayResult] = useState<SDFResult | null>(null);
  const [coeffs, setCoeffs] = useState<Float32Array | null>(null);
  const [difficulty, setDifficulty] = useState(2);
  const [isMining, setIsMining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleSDF = () => {
    const sdf = new SDFEngine();
    const p: float3 = { x: 0.5, y: 0.3, z: 0.7 };
    const d = sdf.evaluate(p);
    setSdfValue(d);
    const grad = sdf.gradient(p);
    const curv = sdf.meanCurvature(p);
    addLog(`SDF([0.5,0.3,0.7]) = ${d.toFixed(4)} | grad=[${grad.x.toFixed(3)},${grad.y.toFixed(3)},${grad.z.toFixed(3)}] | curv=${curv.toFixed(4)}`);
  };

  const handleRay = () => {
    const sdf = new SDFEngine();
    const ray = {
      origin: { x: 0, y: 0, z: -3 },
      direction: { x: 0, y: 0, z: 1 },
      last_lambda: 2.5,
    };
    const result = rayContinuation(sdf, ray);
    setRayResult(result);
    addLog(`Ray: hit=${result.hit} lambda=${result.lambda.toFixed(4)} dist=${result.distance.toFixed(4)}`);
  };

  const handleSpectral = () => {
    const samplePoints: float3[] = [];
    for (let i = 0; i < 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      samplePoints.push({ x: Math.cos(theta), y: Math.sin(theta), z: 0 });
    }
    const spectral = projectToSpectralBasis(windFieldAt, samplePoints, 16);
    setCoeffs(spectral.coefficients);
    addLog(`Spectral: ${spectral.coefficients.length} coeffs, topology=0x${spectral.topologyHash.toString(16)}`);
  };

  const handlePoW = () => {
    setIsMining(true);
    addLog(`HGPU PoW iniciado (diff=${difficulty})...`);
    setTimeout(() => {
      const result = hgpuPoW(difficulty, 50000);
      setPowResult(result);
      setIsMining(false);
      addLog(result.found
        ? `PoW: nonce=${result.nonce} hash=${result.hash} (${result.iterations} iter, ${result.elapsedMs.toFixed(0)}ms)`
        : `PoW: nao encontrado em ${result.iterations} iteracoes`
      );
    }, 50);
  };

  return (
    <section id="hgpu-compute-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 13.9</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">vHGPU COMPUTE</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Homotopic <span className="text-[#b6ff3a]">GPU</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Pipeline HGPU: SDF Engine, Spectral Compression, Ray Continuation (Newton homotopico).
            PoW baseado em processamento geometrico real, nao apenas hash.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">HGPU PIPELINE</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={handleSDF}
                className="py-3 bg-[#b6ff3a] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                AVALIAR SDF
              </button>
              <button
                onClick={handleRay}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 transition-all"
              >
                RAY CONTINUATION
              </button>
              <button
                onClick={handleSpectral}
                className="py-3 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9]/10 transition-all"
              >
                SPECTRAL COMPRESS
              </button>
              <button
                onClick={handlePoW}
                disabled={isMining}
                className="py-3 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ffd700]/10 disabled:opacity-50 transition-all"
              >
                {isMining ? "MINING..." : "HGPU PoW"}
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">DIFFICULTY</span>
                <span className="font-mono text-[10px] text-[#ffd700]">{difficulty}</span>
              </div>
              <input
                type="range" min={1} max={6} value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ffd700]"
              />
            </div>

            {sdfValue !== 0 && (
              <div className="p-3 bg-black border border-[#b6ff3a]/20 font-mono text-[10px] mb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-600">SDF([0.5,0.3,0.7])</span>
                  <span className="text-[#b6ff3a]">{sdfValue.toFixed(6)}</span>
                </div>
              </div>
            )}

            {rayResult && (
              <div className="p-3 bg-black border border-[#6cf0ff]/20 font-mono text-[10px] space-y-1 mb-3">
                <div className="tag mb-1">RAY RESULT</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">hit</span>
                  <span className={rayResult.hit ? "text-[#b6ff3a]" : "text-zinc-600"}>{rayResult.hit ? "SIM" : "NAO"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">lambda</span>
                  <span className="text-[#6cf0ff]">{rayResult.lambda.toFixed(6)}</span>
                </div>
                {rayResult.hit && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">normal</span>
                    <span className="text-zinc-400">[{rayResult.normal.x.toFixed(3)}, {rayResult.normal.y.toFixed(3)}, {rayResult.normal.z.toFixed(3)}]</span>
                  </div>
                )}
              </div>
            )}

            {coeffs && (
              <div className="p-3 bg-black border border-[#ff3ad9]/20 font-mono text-[8px] mb-3">
                <div className="tag mb-1 text-[10px]">SPECTRAL COEFFICIENTS (16)</div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(coeffs).map((c, i) => (
                    <span key={i} className="text-zinc-500">{c.toFixed(3)}</span>
                  ))}
                </div>
              </div>
            )}

            {powResult && (
              <div className={`p-3 border font-mono text-[10px] space-y-1 ${
                powResult.found ? "bg-black border-[#ffd700]/20" : "bg-black border-zinc-800"
              }`}>
                <div className="tag mb-1">HGPU PoW RESULT</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">found</span>
                  <span className={powResult.found ? "text-[#ffd700]" : "text-zinc-600"}>{powResult.found ? "SIM" : "NAO"}</span>
                </div>
                {powResult.found && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">nonce</span>
                      <span className="text-[#ffd700]">{powResult.nonce}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">hash</span>
                      <span className="text-zinc-400">{powResult.hash}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600">iteracoes</span>
                  <span className="text-zinc-300">{powResult.iterations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">tempo</span>
                  <span className="text-zinc-300">{powResult.elapsedMs.toFixed(0)}ms</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="tag mb-3 block">PIPELINE HGPU</span>
                <div className="space-y-2">
                  {[
                    { step: "1", name: "SDF Engine", desc: "Avaliacao de campos de distancia", color: "#b6ff3a" },
                    { step: "2", name: "Spectral Compress", desc: "Autofuncoes do Laplaciano", color: "#6cf0ff" },
                    { step: "3", name: "Ray Continuation", desc: "Newton homotopico", color: "#ff3ad9" },
                    { step: "4", name: "Flow Core", desc: "Evolucao semi-Lagrangiana", color: "#ffd700" },
                    { step: "5", name: "Homotopy Cache", desc: "Invariantes topologicos", color: "#b6ff3a" },
                    { step: "6", name: "vHGPU PoW", desc: "Prova de trabalho geometrica", color: "#ffd700" },
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
                  <span className="text-zinc-600">SDF</span>
                  <span className="text-[#b6ff3a]">esfera + deformacao</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">campo</span>
                  <span className="text-zinc-300">vortice simples</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">coeficientes</span>
                  <span className="text-zinc-300">64 Fourier</span>
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
