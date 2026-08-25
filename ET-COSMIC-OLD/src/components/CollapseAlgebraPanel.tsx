/**
 * ETΞRNET — Painel de Algebra de Colapsos com Memória
 *
 * Renderiza um painel interativo da Algebra de Colapsos (Cap. 8):
 * - Canvas heatmap do campo de defeitos χ(x)
 * - Operadores ACUMULAR / LIBERAR / COLAPSAR com slider
 * - Funcional de ação S com decomposição de termos
 * - Medida de irreversibilidade (divergência KL)
 * - Teste de não-associatividade (produto triplo ★)
 * - Reconstrução de memória em 5 camadas com barras de coerência
 *
 * Referência: "O Livro do ETRNET", Cap. 8
 */

import { useEffect, useRef, useState } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import {
  CollapseAlgebra,
  getCollapseAlgebra,
  createInitialState,
  actionFunctional,
  irreversibilityMeasure,
  defectDensityField,
  type CollapseState,
  type ActionFunctional,
} from "../collapse/collapseAlgebra";

/** Tamanho da grade do campo φ */
const GRID_SIZE = 64;

/** Cores para o heatmap de defeitos */
function chiToColor(chi: number): string {
  const intensity = Math.min(1, chi * 10);
  const r = Math.round(255 * intensity);
  const g = Math.round(58 * (1 - intensity));
  const b = Math.round(217 * (1 - intensity * 0.5));
  return `rgb(${r},${g},${b})`;
}

export default function CollapseAlgebraPanel() {
  const { material } = useOmegaMaterial(256);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CollapseState>(() => createInitialState(GRID_SIZE));
  const [amount, setAmount] = useState(0.1);
  const [action, setAction] = useState<ActionFunctional>(() => actionFunctional(createInitialState(GRID_SIZE)));
  const [irreversibility, setIrreversibility] = useState(0);
  const [memoryLayers, setMemoryLayers] = useState<{ layer: number; name: string; coherence: number }[]>([]);
  const [tripleTest, setTripleTest] = useState<{ left: number; right: number; associative: boolean } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const algebraRef = useRef<CollapseAlgebra | null>(null);

  /** Inicializa singleton da algebra */
  useEffect(() => {
    algebraRef.current = getCollapseAlgebra();
    addLog("ALGEBRA_DE_COLAPSOS inicializada (Cap. 8)");
  }, []);

  useEffect(() => {
    if (!material) return;
    const s = createInitialState(GRID_SIZE, material);
    setState(s);
    setAction(actionFunctional(s));
    addLog(`Campo φ reiniciado com entropia Ω (${material.length} B)`);
  }, [material]);

  /** Desenha heatmap de χ(x) no canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chi = defectDensityField(state.phi);
    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / 8;

    for (let i = 0; i < GRID_SIZE; i++) {
      const color = chiToColor(chi[i] ?? 0);
      ctx.fillStyle = color;
      ctx.fillRect(i * cellW, 0, cellW + 1, canvas.height);

      // Barra horizontal com intensidade
      const barH = Math.min(cellH, cellH * (chi[i] ?? 0) * 8);
      ctx.fillStyle = `rgba(108, 240, 255, ${(chi[i] ?? 0) * 2})`;
      ctx.fillRect(i * cellW, canvas.height / 2 - barH / 2, cellW + 1, barH);
    }
  }, [state]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  };

  /** Aplica o operador ACUMULAR */
  const handleAcumular = () => {
    if (!algebraRef.current) return;
    const newState = algebraRef.current.accumulate(state, amount);
    setState(newState);
    setAction(actionFunctional(newState));
    setIrreversibility(
      irreversibilityMeasure(newState.phi, state.phi)
    );
    addLog(`ACUMULAR σ=${amount.toFixed(3)} → λ=${newState.lambda.toFixed(4)}`);
  };

  /** Aplica o operador LIBERAR */
  const handleLiberar = () => {
    if (!algebraRef.current) return;
    const newState = algebraRef.current.release(state, amount);
    setState(newState);
    setAction(actionFunctional(newState));
    setIrreversibility(
      irreversibilityMeasure(newState.phi, state.phi)
    );
    addLog(`LIBERAR rate=${amount.toFixed(3)} → λ=${newState.lambda.toFixed(4)}`);
  };

  /** Aplica o operador COLAPSAR */
  const handleColapsar = () => {
    if (!algebraRef.current) return;
    const newState = algebraRef.current.collapse(state);
    setState(newState);
    setAction(actionFunctional(newState));
    setIrreversibility(
      irreversibilityMeasure(newState.phi, state.phi)
    );

    // Reconstrução de memória
    const memResult = algebraRef.current.reconstructMemory(newState);
    setMemoryLayers(memResult.layers);
    addLog(`COLAPSAR → λ=${newState.lambda.toFixed(4)} (coerência: ${memResult.totalCoherence.toFixed(4)})`);
  };

  /** Teste de não-associatividade */
  const handleTripleProduct = () => {
    if (!algebraRef.current) return;
    const stateA = createInitialState(GRID_SIZE, material ?? undefined);
    const stateB = createInitialState(GRID_SIZE, material ?? undefined);

    // (â ★ r̂) ★ ĉ
    const ab = algebraRef.current.accumulate(stateA, 0.1);
    const ab_r = algebraRef.current.release(ab, 0.5);
    const left = algebraRef.current.collapse(ab_r);

    // â ★ (r̂ ★ ĉ)
    const bc = algebraRef.current.release(stateB, 0.5);
    const bc_c = algebraRef.current.collapse(bc);
    const right = algebraRef.current.accumulate(bc_c, 0.1);

    let diff = 0;
    for (let i = 0; i < left.phi.length; i++) {
      diff += Math.abs(left.phi[i] - right.phi[i]);
    }

    const associative = diff < 1e-10;
    setTripleTest({ left: left.lambda, right: right.lambda, associative });
    addLog(`TESTE TRIPLO: (${left.lambda.toFixed(4)}) vs (${right.lambda.toFixed(4)}) — ${associative ? "ASSOCIATIVO" : "NÃO-ASSOCIATIVO"}`);
  };

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              § 8.1
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              ALGEBRA DE COLAPSOS COM MEMÓRIA
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Painel de <span className="text-[#ff3ad9]">Colapsos</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Operadores â (acúmulo), r̂ (liberação), ĉ (colapso) atuam no espaço de Hilbert.
            O produto ★ é não-associativo: (â ★ r̂) ★ ĉ ≠ â ★ (r̂ ★ ĉ).
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Heatmap + Controles */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            {/* Heatmap de defeitos χ(x) */}
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CAMPO DE DEFECTOS χ(x)</span>
              <span className="font-mono text-[10px] text-zinc-600">
                GRID {GRID_SIZE}×8
              </span>
            </div>
            <div className="border border-[#14181c] bg-black/50 mb-6">
              <canvas
                ref={canvasRef}
                width={512}
                height={64}
                className="w-full h-16"
              />
            </div>

            {/* Operadores */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleAcumular}
                className="px-5 py-3 bg-[#b6ff3a]/10 text-[#b6ff3a] border border-[#b6ff3a]/30 font-mono text-[10px] tracking-[0.2em] hover:bg-[#b6ff3a] hover:text-black transition-all"
              >
                ACUMULAR
              </button>
              <button
                onClick={handleLiberar}
                className="px-5 py-3 bg-[#6cf0ff]/10 text-[#6cf0ff] border border-[#6cf0ff]/30 font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff] hover:text-black transition-all"
              >
                LIBERAR
              </button>
              <button
                onClick={handleColapsar}
                className="px-5 py-3 bg-[#ff3ad9]/10 text-[#ff3ad9] border border-[#ff3ad9]/30 font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9] hover:text-black transition-all"
              >
                COLAPSAR
              </button>
            </div>

            {/* Slider de quantidade */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">MAGNITUDE σ</span>
                <span className="font-mono text-[10px] text-[#6cf0ff]">{amount.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
              />
            </div>

            {/* Teste triplo */}
            <div className="border-t border-[#14181c] pt-4 mb-6">
              <button
                onClick={handleTripleProduct}
                className="px-5 py-3 bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono text-[10px] tracking-[0.2em] hover:bg-zinc-800 hover:text-zinc-200 transition-all"
              >
                TESTE PRODUTO TRIPLO (â ★ r̂) ★ ĉ
              </button>
              {tripleTest && (
                <div className="mt-3 p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-500">(â ★ r̂) ★ ĉ</span>
                    <span className="text-[#6cf0ff]">λ = {tripleTest.left.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-500">â ★ (r̂ ★ ĉ)</span>
                    <span className="text-[#6cf0ff]">λ = {tripleTest.right.toFixed(6)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#14181c]">
                    <span className={tripleTest.associative ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                      {tripleTest.associative ? "ASSOCIATIVO" : "NÃO-ASSOCIATIVO (confirmado)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Reconstrução de memória — 5 camadas */}
            {memoryLayers.length > 0 && (
              <div className="border-t border-[#14181c] pt-4">
                <span className="tag mb-3 block">RECONSTRUÇÃO DE MEMÓRIA — 5 CAMADAS</span>
                <div className="space-y-2">
                  {memoryLayers.map((layer) => (
                    <div key={layer.layer} className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-zinc-600 w-4">{layer.layer}</span>
                      <span className="font-mono text-[10px] text-zinc-400 flex-1 truncate">
                        {layer.name}
                      </span>
                      <div className="w-24 h-1.5 bg-[#14181c] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${layer.coherence * 100}%`,
                            backgroundColor:
                              layer.coherence > 0.7
                                ? "#b6ff3a"
                                : layer.coherence > 0.4
                                  ? "#6cf0ff"
                                  : "#ff3ad9",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 w-10 text-right">
                        {(layer.coherence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Funcional + Irreversibilidade + Terminal */}
          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Funcional de Ação S */}
              <div>
                <span className="tag mb-4 block">FUNCIONAL DE AÇÃO S[φ]</span>
                <div className="space-y-3 font-mono text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">S_total</span>
                    <span className="text-[#6cf0ff] text-sm">{action.S.toFixed(4)}</span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l border-[#14181c]">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">T cinético ∫|∇φ|²</span>
                      <span className="text-zinc-300">{action.kineticTerm.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">T memória ∫h[φ]|dφ/dt|²</span>
                      <span className="text-zinc-300">{action.memoryTerm.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">T defeitos ∫χ²(x)</span>
                      <span className="text-zinc-300">{action.defectTerm.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Irreversibilidade */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="tag">IRREVERSIBILIDADE D_KL</span>
                  <span className="font-mono text-[10px] text-[#ff3ad9]">
                    {irreversibility.toFixed(6)}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#14181c] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#b6ff3a] via-[#6cf0ff] to-[#ff3ad9] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, irreversibility * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-600">
                  <span>REVERSÍVEL</span>
                  <span>IRREVERSÍVEL</span>
                </div>
              </div>

              {/* Estado do sistema */}
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">tempo t</span>
                  <span className="text-zinc-300">{state.t.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">parâmetro λ</span>
                  <span className="text-[#6cf0ff]">{state.lambda.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">histórico</span>
                  <span className="text-zinc-300">{state.history.length} snapshots</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Grid</span>
                  <span className="text-zinc-300">{state.phi.length} pontos</span>
                </div>
              </div>
            </div>

            {/* Terminal de log */}
            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[10px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando operador...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-[#14181c] pl-2">
                      {log}
                    </div>
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
