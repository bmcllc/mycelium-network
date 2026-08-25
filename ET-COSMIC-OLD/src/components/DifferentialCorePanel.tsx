import { useRef, useState } from "react";
import {
  computeFrechetDerivative,
  sobolevNorm,
  principalCurvatures,
  computeGradient,
  type FrechetDerivative,
  type PrincipalCurvatures,
} from "../crypto/differentialCore";

export default function DifferentialCorePanel() {
  const [frechet, setFrechet] = useState<FrechetDerivative | null>(null);
  const [curvatures, setCurvatures] = useState<PrincipalCurvatures | null>(null);
  const [sobolev, setSobolev] = useState(0);
  const [gradientNorm, setGradientNorm] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  // Test function: f(x,y) = x^2 + y^2 (paraboloid)
  const testFn = (p: number[]) => (p[0] ?? 0) ** 2 + (p[1] ?? 0) ** 2;

  const handleFrechet = () => {
    const p = [1.0, 1.0];
    const v = [1.0, 0.0];
    const result = computeFrechetDerivative(testFn, p, v);
    setFrechet(result);
    addLog(`Frechet Df([1,1])[1,0] = ${result.norm.toFixed(6)} (tangent: [${result.tangent.map(t => t.toFixed(4)).join(", ")}])`);
  };

  const handleCurvatures = () => {
    const p = [0.0, 0.0];
    const result = principalCurvatures(testFn, p);
    setCurvatures(result);
    addLog(`Curvaturas em [0,0]: k1=${result.k1.toFixed(4)}, k2=${result.k2.toFixed(4)}`);
  };

  const handleSobolev = () => {
    const field = Array.from({ length: 64 }, (_, i) =>
      Math.sin(2 * Math.PI * i / 64) + 0.5 * Math.cos(4 * Math.PI * i / 64)
    );
    const norm = sobolevNorm(field, 1);
    setSobolev(norm);
    addLog(`Sobolev H^1 de campo 64 pts: ||f|| = ${norm.toFixed(4)}`);
  };

  const handleGradient = () => {
    const p = [2.0, -1.0];
    const grad = computeGradient(testFn, p);
    const norm = Math.sqrt(grad.reduce((s, v) => s + v * v, 0));
    setGradientNorm(norm);
    addLog(`Gradiente em [2,-1]: [${grad.map(g => g.toFixed(4)).join(", ")}] |grad|=${norm.toFixed(4)}`);
  };

  return (
    <section id="differential-core-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 13.5</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">DIFFERENTIAL CORE</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Nucleo <span className="text-[#6cf0ff]">Diferencial</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Operadores diferenciais para o pipeline HGPU: Frechet derivative, norma de Sobolev,
            curvaturas principais e gradiente. Analise de sensibilidade e compressao espectral.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">OPERADORES DIFERENCIAIS</span>
              <span className="font-mono text-[10px] text-zinc-600">f(x,y) = x² + y²</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleFrechet}
                className="py-3 bg-[#6cf0ff] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                DERIVADA FRECHET
              </button>
              <button
                onClick={handleCurvatures}
                className="py-3 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9]/10 transition-all"
              >
                CURVATURAS
              </button>
              <button
                onClick={handleSobolev}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] tracking-[0.2em] hover:bg-[#b6ff3a]/10 transition-all"
              >
                NORMA SOBOLEV
              </button>
              <button
                onClick={handleGradient}
                className="py-3 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ffd700]/10 transition-all"
              >
                GRADIENTE
              </button>
            </div>

            {frechet && (
              <div className="p-4 bg-black border border-[#6cf0ff]/20 font-mono text-[10px] space-y-1 mb-4">
                <div className="tag mb-2">DERIVADA DE FRECHET</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">ponto</span>
                  <span className="text-zinc-300">[{frechet.point.map(p => p.toFixed(2)).join(", ")}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">tangente</span>
                  <span className="text-[#6cf0ff]">[{frechet.tangent.map(t => t.toFixed(4)).join(", ")}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">norma</span>
                  <span className="text-[#b6ff3a]">{frechet.norm.toFixed(6)}</span>
                </div>
              </div>
            )}

            {curvatures && (
              <div className="p-4 bg-black border border-[#ff3ad9]/20 font-mono text-[10px] space-y-1 mb-4">
                <div className="tag mb-2">CURVATURAS PRINCIPAIS</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">k1 (maior)</span>
                  <span className="text-[#ff3ad9]">{curvatures.k1.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">k2 (menor)</span>
                  <span className="text-[#6cf0ff]">{curvatures.k2.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">dir1</span>
                  <span className="text-zinc-400">[{curvatures.direction1.map(d => d.toFixed(3)).join(", ")}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">dir2</span>
                  <span className="text-zinc-400">[{curvatures.direction2.map(d => d.toFixed(3)).join(", ")}]</span>
                </div>
              </div>
            )}

            {(sobolev > 0 || gradientNorm > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {sobolev > 0 && (
                  <div className="p-3 bg-black border border-[#b6ff3a]/20 font-mono text-[10px]">
                    <div className="text-zinc-600 mb-1">||f||_H^1</div>
                    <div className="text-[#b6ff3a] text-lg">{sobolev.toFixed(4)}</div>
                  </div>
                )}
                {gradientNorm > 0 && (
                  <div className="p-3 bg-black border border-[#ffd700]/20 font-mono text-[10px]">
                    <div className="text-zinc-600 mb-1">|nabla f|</div>
                    <div className="text-[#ffd700] text-lg">{gradientNorm.toFixed(4)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="tag mb-3 block">OPERADORES IMPLEMENTADOS</span>
                <div className="space-y-2">
                  {[
                    { name: "Frechet Df(p)[v]", desc: "Diferencas centrais O(e²)", color: "#6cf0ff" },
                    { name: "Sobolev ||f||_H^s", desc: "DFT + pesos (1+k^2s)", color: "#b6ff3a" },
                    { name: "Curvaturas k1, k2", desc: "Autovalores da Hessiana", color: "#ff3ad9" },
                    { name: "nabla f (gradiente)", desc: "Diferencas centrais", color: "#ffd700" },
                    { name: "div V (divergencia)", desc: "Soma de parciais", color: "#6cf0ff" },
                    { name: "curl V (rotacional)", desc: "3D apenas", color: "#b6ff3a" },
                  ].map((op, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                      <span className="w-2 h-2" style={{ backgroundColor: op.color }} />
                      <div className="flex-1">
                        <div className="text-zinc-300">{op.name}</div>
                        <div className="text-zinc-600 text-[8px]">{op.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">funcao teste</span>
                  <span className="text-[#6cf0ff]">f(x,y) = x² + y²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">precisao</span>
                  <span className="text-zinc-300">O(eps²) central</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">eps padrao</span>
                  <span className="text-zinc-300">1e-6</span>
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
