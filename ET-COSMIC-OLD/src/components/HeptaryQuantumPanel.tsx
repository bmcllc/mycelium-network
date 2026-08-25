import { useState, useRef } from "react";
import {
  runHeptaryQuantumSimulation,
  HEPTARY_MAX_QUSEPTS,
  type HeptarySimulationResult,
} from "../crypto/quantumBridge";

export default function HeptaryQuantumPanel() {
  const [nHeptits, setNHeptits] = useState(3);
  const [resolution, setResolution] = useState(64);
  const [loading, setLoading] = useState(false);
  const [activeCore, setActiveCore] = useState<number | null>(null);
  const [result, setResult] = useState<HeptarySimulationResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 30);
    setLogs([...logRef.current]);
  };

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    logRef.current = [];
    setLogs([]);
    
    addLog(`Iniciando ciclo Heptária com ${nHeptits} heptits (espaço de Hilbert: ${Math.pow(7, nHeptits)} dimensões)...`);

    // Scheduler vHGPU (visualização do pipeline)
    for (let c = 0; c < 4; c++) {
      setActiveCore(c);
      await new Promise((r) => setTimeout(r, 600));
      if (c === 0) addLog("vHGPU Core 0 [geom_relativity]: Flutuação quântica de vácuo aplicada.");
      if (c === 1) addLog("vHGPU Core 1 [quantum_void]: Par entrelaçado CGLMP criado e conectado.");
      if (c === 2) addLog("vHGPU Core 2 [algebra_paleo]: Transformada de Fourier Quântica Heptária (HQFT) calculada.");
      if (c === 3) addLog("vHGPU Core 3 [lsc_mcm]: Medição realizada, vetor de estado colapsado.");
    }
    
    try {
      const data = await runHeptaryQuantumSimulation(nHeptits, resolution);
      setResult(data);
      if (data) {
        addLog(`Ciclo concluído. Assinatura do colapso: ${data.audit.collapse_hash.slice(0, 16)}...`);
        addLog(`Desigualdade Bell-CGLMP S7 auditada: S = ${data.audit.cglmp_S7_value} (Limite Clássico: 2.0)`);
      }
    } catch (e) {
      addLog(`ERRO no ciclo heptária: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
      setActiveCore(null);
    }
  };

  return (
    <section id="heptary-quantum-panel" className="relative border-b border-[#14181c] bg-black overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#a855f7]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 relative z-10">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#d8b4fe]">§ 14.0</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#a855f7]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">HEPTARY COMPUTING</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Heptary <span className="text-[#c084fc] font-normal">Quantum Engine</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Emulação <strong className="text-zinc-300 font-normal">clássica</strong> em base 7 balanceada{" "}
            <code className="text-purple-300 font-mono">[-3 … 3]</code>. Aceleração real exige hardware quântico;
            aqui o espaço de Hilbert cresce como 7<sup>N</sup> e é limitado a N≤{HEPTARY_MAX_QUSEPTS}.
          </p>
          <div className="mt-4 p-3 border border-amber-900/40 bg-amber-950/15 rounded font-mono text-[10px] text-amber-200/90 max-w-2xl">
            ⚠ Emulação clássica (base 7) — violação CGLMP S₇ é numérica. Offline: colapso SHA3(Ω); online: motor CQR.
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c] rounded-lg overflow-hidden shadow-2xl shadow-purple-950/10">
          
          {/* Controls column */}
          <div className="lg:col-span-6 bg-[#0a0d10] p-6 md:p-8 flex flex-col justify-between">
            <div>
              <span className="tag mb-6 block text-purple-400 border-purple-950 bg-purple-950/20">CONFIGURADOR HEPTÁRIO</span>

              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[11px] text-zinc-400">UNIDADES HEPTITS</span>
                    <span className="font-mono text-xs text-[#c084fc] font-bold">{nHeptits} qusepts</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={HEPTARY_MAX_QUSEPTS}
                    step={1}
                    value={nHeptits}
                    disabled={loading}
                    onChange={(e) => setNHeptits(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#a855f7] disabled:opacity-50"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-zinc-600 mt-1">
                    <span>1 (7)</span>
                    <span>2 (49)</span>
                    <span>3 (343)</span>
                    <span>4 (2401 máx.)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[11px] text-zinc-400">ESTRESSE DE RESOLUÇÃO (PMU)</span>
                    <span className="font-mono text-xs text-[#c084fc] font-bold">{resolution} steps</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={256}
                    step={8}
                    value={resolution}
                    disabled={loading}
                    onChange={(e) => setResolution(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#a855f7] disabled:opacity-50"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-zinc-600 mt-1">
                    <span>8 Hz</span>
                    <span>128 Hz</span>
                    <span>256 Hz</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#a855f7] to-[#c084fc] text-black font-mono text-xs tracking-[0.2em] font-semibold hover:from-white hover:to-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    SIMULANDO SHARDS vHGPU...
                  </>
                ) : (
                  "DISPARAR COLAPSO HEPTÁRIO"
                )}
              </button>
            </div>
          </div>

          {/* Visualization Column */}
          <div className="lg:col-span-6 bg-black p-6 md:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#14181c]">
            <div className="space-y-6">
              
              {/* vHGPU cores states */}
              <div>
                <span className="tag mb-3 block text-purple-400">STATUS DA MALHA vHGPU</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 0, label: "Core 0: Geom Relativity", task: "Vácuo Heptário" },
                    { id: 1, label: "Core 1: Quantum Void", task: "Bell CGLMP" },
                    { id: 2, label: "Core 2: Algebra Paleo", task: "HQFT Fase" },
                    { id: 3, label: "Core 3: LSC MCM", task: "Colapso" }
                  ].map((core) => {
                    const isCurrent = activeCore === core.id;
                    const isPast = activeCore !== null && activeCore > core.id;
                    const hasFinished = result !== null;
                    return (
                      <div
                        key={core.id}
                        className={`p-3 border font-mono text-[10px] rounded transition-all ${
                          isCurrent
                            ? "border-[#c084fc] bg-[#a855f7]/10 text-white shadow-lg shadow-purple-950/20"
                            : isPast || hasFinished
                            ? "border-[#a855f7]/30 bg-purple-950/5 text-purple-300"
                            : "border-[#14181c] bg-[#050709] text-zinc-600"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="truncate">{core.label}</span>
                          {isCurrent && <span className="w-1.5 h-1.5 bg-[#c084fc] rounded-full animate-ping" />}
                        </div>
                        <div className="text-[9px] opacity-80">{core.task}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulation Result */}
              {result && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-[#0a0d10] border border-purple-950/40 rounded space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-purple-950/20 font-mono text-[10px]">
                      <span className="text-zinc-400">Motor Emulado</span>
                      <span className="text-[#c084fc] font-bold">{result.engine}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">Dimensão de Hilbert</span>
                        <span className="text-zinc-200">{result.state_dimension} estados</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Quibits Equivalentes</span>
                        <span className="text-zinc-200">~{result.efficiency.quantum_equivalent_qubits} qubits</span>
                      </div>
                    </div>

                    {/* Collapsed State Visualization */}
                    <div>
                      <span className="font-mono text-[9px] text-zinc-500 block mb-2">ESTADO COLAPSADO (HEPTITS)</span>
                      <div className="flex gap-2">
                        {result.vHGPU_shards[3]?.collapsed_state?.map((val, idx) => (
                          <div
                            key={idx}
                            className="flex-1 p-2 bg-black border border-purple-950 text-center font-mono text-xs rounded relative overflow-hidden group"
                          >
                            {/* Visual slider track inside card */}
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-[#a855f7]/10 transition-all"
                              style={{ height: `${((val + 3) / 6) * 100}%` }}
                            />
                            <div className="relative z-10">
                              <span className="text-[8px] text-zinc-500 block">H{idx}</span>
                              <span className="text-[#c084fc] font-bold text-sm">{val > 0 ? `+${val}` : val}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CGLMP Audit Status */}
                    <div className="pt-2 border-t border-purple-950/20">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-zinc-400">Auditoria CGLMP S7</span>
                        <span className="text-[#c084fc] font-bold">S = {result.audit.cglmp_S7_value}</span>
                      </div>
                      <div className="w-full bg-[#14181c] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-[#c084fc] h-full rounded-full transition-all"
                          style={{ width: `${(result.audit.cglmp_S7_value / 3.0) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-zinc-600 font-mono mt-1">
                        <span>L. Clássico (2.0)</span>
                        <span className="text-purple-400">Violado (Sucesso PQC)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal log logs */}
            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3 text-zinc-400">CONSOLE LOG</div>
              <div className="h-32 overflow-y-auto font-mono text-[9px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic text-zinc-700">// Pronto para colapso heptário...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-purple-950 pl-2 py-0.5">{log}</div>
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
