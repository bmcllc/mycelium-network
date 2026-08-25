/**
 * ETΞRNET — Painel da Teoria LSC (Localização de Sistemas Coerentes)
 *
 * Renderiza o painel interativo da Teoria LSC (Cap. 9):
 * - Gauge C_ε (0-1) com gradiente de cor
 * - Medidor de potência P_current vs P_max
 * - Curva de saturação G(C_ε) via SVG path
 * - Display de rigidez K_eff = K_0(1-C_ε) + R_thermal
 * - 3 Leis da Bruno com valores ao vivo
 * - QCG: contagem de nós e energia
 *
 * Referência: "O Livro do ETRNET", Cap. 9
 */

import { useEffect, useState } from "react";
import {
  LSCEngine,
  getLSCEngine,
  totalEnergy,
  type QuantumCausalGraph,
  type LSCState,
} from "../lsc/lscEngine";
import { buildQCGFromMaterial, loadOmegaMaterial } from "../lib/moduleRealityBackend";

/** Cores para o gradiente C_ε */
function coherenceColor(c: number): string {
  if (c < 0.33) return "#b6ff3a"; // verde
  if (c < 0.66) return "#eab308"; // amarelo
  return "#ff3ad9"; // magenta
}

export default function LSCPanel() {
  const [cEpsilon, setCEpsilon] = useState(0.0);
  const [state, setState] = useState<LSCState>({
    C_epsilon: 0.0,
    P_current: 0.0,
    K_eff: 1.0,
    stressHistory: [],
  });
  const [graph, setGraph] = useState<QuantumCausalGraph | null>(null);
  const [entropyLabel, setEntropyLabel] = useState("");
  const [engine, setEngine] = useState<LSCEngine | null>(null);
  const [satCurve, setSatCurve] = useState<[number, number][]>([]);
  const [physicalPMax, setPhysicalPMax] = useState(0.0554);
  const [physicalPEff, setPhysicalPEff] = useState(0.0);

  /** Inicializa motor LSC + QCG ancorado em Ω */
  useEffect(() => {
    const eng = getLSCEngine();
    setEngine(eng);
    setSatCurve(eng.simulateSaturationCurve(50));
    void (async () => {
      const { material, meta } = await loadOmegaMaterial(256);
      setGraph(buildQCGFromMaterial(material));
      setEntropyLabel(`${meta.tier} · ${meta.sha3Prefix}…`);
    })();
  }, []);

  /** Atualiza todas as leis quando C_ε muda */
  useEffect(() => {
    if (!engine) return;

    const P_max = 100;
    const P_demand = 80;
    const P_current = engine.law1MaximumPower(P_demand, P_max, cEpsilon);
    const K_eff = engine.law3Holofriction(cEpsilon);

    const physPMax = engine.calculatePhysicalPMax();
    const physPEff = physPMax * cEpsilon;

    setPhysicalPMax(physPMax);
    setPhysicalPEff(physPEff);

    setState({
      C_epsilon: cEpsilon,
      P_current,
      K_eff,
      stressHistory: engine.getState().stressHistory,
    });
  }, [cEpsilon, engine]);

  /** Saturation curve SVG path */
  const buildSaturationPath = (): string => {
    if (satCurve.length === 0) return "";
    const w = 280;
    const h = 100;
    const pad = 10;

    return satCurve
      .map(([x, y], i) => {
        const px = pad + x * (w - 2 * pad);
        const py = h - pad - y * (h - 2 * pad);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
      })
      .join(" ");
  };

  /** Ponto atual na curva de saturação */
  const currentSatPoint = engine ? engine.law2Saturation(cEpsilon) : 0;

  const graphEnergy = graph ? totalEnergy(graph) : 0;
  const satPath = buildSaturationPath();

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">
              § 9.1
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              TEORIA LSC — LOCALIZAÇÃO DE SISTEMAS COERENTES
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Motor <span className="text-[#6cf0ff]">LSC</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            As 3 Leis da LSC governam a relação entre energia, coerência e geometria.
            O Grafo Causal Quântico propaga estresse através de arestas ponderadas.
            {entropyLabel ? (
              <span className="block mt-2 font-mono text-[10px] text-zinc-600">Ω {entropyLabel}</span>
            ) : null}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Gauge C_ε + Potência + Curva */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            {/* Gauge C_ε */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="tag">COERÊNCIA MODAL C_ε</span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: coherenceColor(cEpsilon) }}
                >
                  {cEpsilon.toFixed(4)}
                </span>
              </div>
              {/* Barra de gauge */}
              <div className="w-full h-6 bg-[#14181c] rounded-sm overflow-hidden mb-2">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${cEpsilon * 100}%`,
                    backgroundColor: coherenceColor(cEpsilon),
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cEpsilon}
                onChange={(e) => setCEpsilon(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
              />
              <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-600">
                <span>0.0 (INCOERENTE)</span>
                <span>1.0 (PERFEITAMENTE COERENTE)</span>
              </div>
            </div>

            {/* Potência */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">POTÊNCIA P_current</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">
                  {state.P_current.toFixed(2)} / 100
                </span>
              </div>
              <div className="w-full h-3 bg-[#14181c] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#b6ff3a] rounded-full transition-all duration-300"
                  style={{ width: `${state.P_current}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-600">
                <span>P = 0</span>
                <span>P_max = 100</span>
              </div>
            </div>

            {/* Curva de saturação SVG */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">CURVA DE SATURAÇÃO G(C_ε)</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {'G = 1/((1-C_ε) + μe^{βC_ε})'}
                </span>
              </div>
              <div className="border border-[#14181c] bg-black/50 p-2">
                <svg viewBox="0 0 280 100" className="w-full h-24">
                  {/* Grid */}
                  <line x1="10" y1="0" x2="10" y2="90" stroke="#14181c" strokeWidth="0.5" />
                  <line x1="10" y1="90" x2="270" y2="90" stroke="#14181c" strokeWidth="0.5" />
                  <line x1="10" y1="45" x2="270" y2="45" stroke="#14181c" strokeWidth="0.3" strokeDasharray="2 2" />
                  {/* Curve */}
                  {satPath && (
                    <path
                      d={satPath}
                      fill="none"
                      stroke="#6cf0ff"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Ponto atual */}
                  <circle
                    cx={10 + cEpsilon * 260}
                    cy={90 - currentSatPoint * 80}
                    r="3"
                    fill="#ff3ad9"
                  />
                  {/* Labels */}
                  <text x="12" y="14" className="fill-zinc-600" fontSize="6" fontFamily="monospace">1.0</text>
                  <text x="12" y="88" className="fill-zinc-600" fontSize="6" fontFamily="monospace">0.0</text>
                  <text x="260" y="98" className="fill-zinc-600" fontSize="6" fontFamily="monospace">C_ε=1</text>
                </svg>
              </div>
            </div>

            {/* Rigidez */}
            <div className="mb-6">
              <span className="tag mb-3 block">RIGIDEZ EFETIVA</span>
              <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">K_eff = K_0(1-C_ε) + R_thermal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">K_0</span>
                  <span className="text-zinc-300">1.0000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">(1 - C_ε)</span>
                  <span className="text-[#6cf0ff]">{(1 - cEpsilon).toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">R_thermal</span>
                  <span className="text-zinc-300">0.0500</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#14181c]">
                  <span className="text-zinc-400">K_eff</span>
                  <span className="text-[#b6ff3a]">{state.K_eff.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* QCG */}
            <div>
              <span className="tag mb-3 block">GRAFO CAUSAL QUÂNTICO (QCG)</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="text-zinc-600 mb-1">Nós</div>
                  <div className="text-[#6cf0ff] text-lg">{graph?.nodes.length ?? "—"}</div>
                </div>
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="text-zinc-600 mb-1">E_total</div>
                  <div className="text-[#b6ff3a] text-lg">{graphEnergy.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Leis da Bruno */}
          <div className="lg:col-span-5 bg-black p-6 md:p-8">
            <div className="tag mb-6">AS 3 LEIS DA LSC</div>

            {/* Lei 1 */}
            <div className="mb-6 p-4 bg-[#0a0d10] border border-[#14181c]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 flex items-center justify-center bg-[#b6ff3a]/10 text-[#b6ff3a] font-mono text-[10px] border border-[#b6ff3a]/30">
                  1
                </span>
                <span className="font-mono text-[10px] text-zinc-400 tracking-wider">
                  POTÊNCIA MÁXIMA
                </span>
              </div>
              <div className="font-mono text-[9px] text-zinc-500 mb-2 leading-relaxed">
                P_max = η · (ρ_τ · E_τ / c²) · A_ef · v_g³
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">v_g (Velocidade)</span>
                <span className="text-zinc-300">1.20e6 m/s</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">P_max física</span>
                <span className="text-[#b6ff3a]">{physicalPMax.toFixed(4)} W</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] pt-1 border-t border-[#14181c] mt-1">
                <span className="text-zinc-400">P_efetiva física</span>
                <span className="text-[#b6ff3a]">{physicalPEff.toFixed(4)} W</span>
              </div>
            </div>

            {/* Lei 2 */}
            <div className="mb-6 p-4 bg-[#0a0d10] border border-[#14181c]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 flex items-center justify-center bg-[#6cf0ff]/10 text-[#6cf0ff] font-mono text-[10px] border border-[#6cf0ff]/30">
                  2
                </span>
                <span className="font-mono text-[10px] text-zinc-400 tracking-wider">
                  SATURAÇÃO
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500 mb-2">
                G(C_ε) = 1 / ((1-C_ε) + μe^{'{βC_ε}'})
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">μ (Resistência)</span>
                <span className="text-zinc-300">0.001</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">β (Térmica)</span>
                <span className="text-zinc-300">8.000</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] pt-1 border-t border-[#14181c] mt-1">
                <span className="text-zinc-400">G(C_ε)</span>
                <span className="text-[#6cf0ff]">{currentSatPoint.toFixed(4)}</span>
              </div>
            </div>

            {/* Lei 3 */}
            <div className="mb-6 p-4 bg-[#0a0d10] border border-[#14181c]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 flex items-center justify-center bg-[#ff3ad9]/10 text-[#ff3ad9] font-mono text-[10px] border border-[#ff3ad9]/30">
                  3
                </span>
                <span className="font-mono text-[10px] text-zinc-400 tracking-wider">
                  HOLOFRICÇÃO
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500 mb-2">
                K_eff = K_0(1-C_ε) + R_thermal
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">K_0</span>
                <span className="text-zinc-300">1.0000</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-zinc-600">R_thermal</span>
                <span className="text-zinc-300">0.0500</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] pt-1 border-t border-[#14181c] mt-1">
                <span className="text-zinc-400">K_eff</span>
                <span className="text-[#ff3ad9]">{state.K_eff.toFixed(4)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-400">Gênesis Geométrica:</strong> A coerência modal C_ε
              gera curvatura no espaço-tempo computacional via R = κE. Quanto mais coerente o
              sistema, mais energia pode extrair, mas com fricção reduzida (holofricção).
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
