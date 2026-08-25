/**
 * ETΞRNET — Painel de Anacroclastia & Paleocomputação Estrutural
 *
 * Renderiza o painel interativo da Anacroclastia (Cap. 10):
 * - Slider de erosão α (0-1)
 * - Funcional de tensão Ψ
 * - Indicador de obstrução de cohomologia H¹
 * - Visualização métrica arqueológica (SVG scatter)
 * - Pipeline de transformação: S → E_α → L_X → F → A(S)
 * - Camadas estratigráficas (barras empilhadas)
 * - Lista de invariantes fósseis com hashes
 *
 * Referência: "O Livro do ETRNET", Cap. 10
 */

import { useEffect, useMemo, useState } from "react";
import {
  controlledErosion,
  stratigraphicLift,
  tensionFunctional,
  anacroclasticTransform,
  archaeologicalMetricSpace,
  cohomologyObstruction,
  type ArchaeologicalVector,
  type CoherenceSheaf,
} from "../paleo/anacroclastia";
import { buildAnacroclastiaFromMaterial, loadOmegaMaterial } from "../lib/moduleRealityBackend";

export default function AnacroclastiaPanel() {
  const [alpha, setAlpha] = useState(0.3);
  const [artifacts, setArtifacts] = useState<ArchaeologicalVector[]>([]);
  const [sheaf, setSheaf] = useState<CoherenceSheaf | null>(null);
  const [fossilInvariants, setFossilInvariants] = useState<{ type: string; hash: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { material } = await loadOmegaMaterial(256);
      const built = buildAnacroclastiaFromMaterial(material);
      setArtifacts(built.artifacts);
      setSheaf(built.sheaf);
      setFossilInvariants(built.fossilHashes);
    })();
  }, []);

  if (!sheaf) {
    return (
      <section className="border-b border-[#14181c] bg-black p-12 font-mono text-[10px] text-zinc-500">
        A carregar fóssil paleo (entropia Ω)…
      </section>
    );
  }

  /** Dados de referência e sinal */
  const signalS = useMemo(
    () => Array.from({ length: 12 }, (_, i) => 0.5 * Math.sin(i * 0.5) + 0.3),
    []
  );
  const referenceX = useMemo(
    () => Array.from({ length: 12 }, (_, i) => 0.4 * Math.cos(i * 0.4) + 0.2),
    []
  );

  /** Cálculos derivados de α */
  const eroded = useMemo(() => controlledErosion(alpha, signalS), [alpha, signalS]);
  const lifted = useMemo(() => stratigraphicLift(referenceX, 4), [referenceX]);
  const transformResult = useMemo(() => anacroclasticTransform([signalS], alpha, referenceX), [alpha, signalS, referenceX]);
  const psi = useMemo(() => tensionFunctional(eroded, referenceX), [eroded, referenceX]);
  const obstruction = useMemo(() => cohomologyObstruction(sheaf), [sheaf]);
  const metric = useMemo(() => archaeologicalMetricSpace(artifacts), [artifacts]);

  /** SVG scatter plot para métrica arqueológica */
  const buildScatterPlot = (): React.ReactNode => {
    const w = 240;
    const h = 120;
    const pad = 15;
    const points = artifacts.map((a, _i) => {
      const vals = Array.from(a.omega.values());
      const x = pad + ((vals[0] ?? 0.5) * (w - 2 * pad));
      const y = h - pad - ((vals[1] ?? 0.5) * (h - 2 * pad));
      return { x, y, id: a.id };
    });

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
        {/* Grid */}
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#14181c" strokeWidth="0.5" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#14181c" strokeWidth="0.5" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#ff3ad9"
              opacity={0.6 + i * 0.08}
            />
            <text
              x={p.x + 5}
              y={p.y - 4}
              className="fill-zinc-600"
              fontSize="5"
              fontFamily="monospace"
            >
              {p.id}
            </text>
          </g>
        ))}
        {/* Axes labels */}
        <text x={w / 2} y={h - 2} className="fill-zinc-600" fontSize="5" fontFamily="monospace" textAnchor="middle">
          ω_1 (cfg)
        </text>
        <text x={3} y={h / 2} className="fill-zinc-600" fontSize="5" fontFamily="monospace" textAnchor="middle" transform={`rotate(-90, 3, ${h / 2})`}>
          ω_2 (ssa)
        </text>
      </svg>
    );
  };

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">
              § 10.1
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ff3ad9]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              ANACROCLASTIA & PALEOCOMPUTAÇÃO ESTRUTURAL
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Transformação <span className="text-[#ff3ad9]">Anacroclástica</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            A(S) = F ∘ L_X ∘ E_α(S) compõe erosão controlada, levantamento estratigráfico
            e fossilização para extrair invariantes imutáveis de binários.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Erosão + Tensão + Cohomologia + Métrica */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            {/* Slider de erosão α */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">PARÂMETRO DE EROSÃO α</span>
                <span className="font-mono text-[10px] text-[#ff3ad9]">{alpha.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ff3ad9]"
              />
              <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-600">
                <span>0.0 (SEM EROSÃO)</span>
                <span>1.0 (EROSÃO MÁXIMA)</span>
              </div>
            </div>

            {/* Pipeline de transformação */}
            <div className="mb-8">
              <span className="tag mb-4 block">PIPELINE DE TRANSFORMAÇÃO</span>
              <div className="flex items-center gap-2 font-mono text-[10px] overflow-x-auto pb-2">
                <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 shrink-0">
                  S
                </div>
                <span className="text-zinc-600">→</span>
                <div className="px-3 py-2 bg-[#ff3ad9]/10 border border-[#ff3ad9]/30 text-[#ff3ad9] shrink-0">
                  E_α
                </div>
                <span className="text-zinc-600">→</span>
                <div className="px-3 py-2 bg-[#6cf0ff]/10 border border-[#6cf0ff]/30 text-[#6cf0ff] shrink-0">
                  L_X
                </div>
                <span className="text-zinc-600">→</span>
                <div className="px-3 py-2 bg-[#b6ff3a]/10 border border-[#b6ff3a]/30 text-[#b6ff3a] shrink-0">
                  F
                </div>
                <span className="text-zinc-600">→</span>
                <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 shrink-0">
                  A(S)
                </div>
              </div>
              <div className="mt-2 font-mono text-[8px] text-zinc-600">
                Erosão α={alpha.toFixed(2)} → Levantamento 4 camadas → Fossilização F
              </div>
            </div>

            {/* Funcional de tensão Ψ */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">FUNCIONAL DE TENSÃO Ψ(B, H)</span>
                <span className="font-mono text-[10px] text-[#6cf0ff]">{psi.toFixed(4)}</span>
              </div>
              <div className="w-full h-3 bg-[#14181c] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6cf0ff] to-[#ff3ad9] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, psi * 10)}%` }}
                />
              </div>
              <div className="mt-2 font-mono text-[8px] text-zinc-600">
                Ψ = D_KL(B||H) + λ|B-H|² — mede tensão entre código e referência
              </div>
            </div>

            {/* Cohomology obstruction */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">OBFUSCAÇÃO DE COHOMOLOGIA H¹</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${obstruction < 0.001 ? "bg-[#b6ff3a]" : "bg-[#ff3ad9]"}`}
                  />
                  <span
                    className={`font-mono text-[10px] ${obstruction < 0.001 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}`}
                  >
                    {obstruction < 0.001 ? "H¹ = 0 (EXATO)" : `H¹ ≠ 0 (${obstruction.toFixed(4)})`}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                <div className="text-zinc-500 mb-1">Sheaf de coerência — seções locais:</div>
                {Array.from(sheaf.sections.entries()).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-zinc-600">{key}</span>
                    <span className="text-zinc-300">[{val.map((v) => v.toFixed(2)).join(", ")}]</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Métrica arqueológica scatter */}
            <div>
              <span className="tag mb-3 block">ESPAÇO MÉTRICO ARQUEOLÓGICO Ω</span>
              <div className="border border-[#14181c] bg-black/50 p-2">
                {buildScatterPlot()}
              </div>
              <div className="mt-2 font-mono text-[8px] text-zinc-600">
                {artifacts.length} artefatos | dimensão g_ij = {metric.dimension} | {metric.g.length > 0 ? `${metric.g.length}×${metric.g[0]?.length ?? 0} métrica` : "vazio"}
              </div>
            </div>
          </div>

          {/* Camadas + Invariantes + Erosão resultado */}
          <div className="lg:col-span-5 bg-black p-6 md:p-8">
            {/* Camadas estratigráficas */}
            <div className="mb-8">
              <span className="tag mb-4 block">CAMADAS ESTRATIGRÁFICAS</span>
              <div className="space-y-2">
                {lifted.map((layer, i) => {
                  const avgVal = layer.reduce((s, v) => s + Math.abs(v), 0) / layer.length;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-zinc-600 w-4">L{i + 1}</span>
                      <div className="flex-1 h-3 bg-[#14181c] rounded-sm overflow-hidden flex gap-px">
                        {layer.slice(0, 12).map((v, j) => (
                          <div
                            key={j}
                            className="h-full transition-all duration-300"
                            style={{
                              flex: 1,
                              backgroundColor: `rgba(255, 58, 217, ${Math.min(1, Math.abs(v) * 2)})`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-zinc-500 w-10 text-right">
                        {avgVal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resultado da erosão */}
            <div className="mb-8">
              <span className="tag mb-3 block">EROSÃO CONTROLADA E_α(S)</span>
              <div className="flex items-end gap-px h-12 bg-[#14181c] p-1">
                {eroded.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[#6cf0ff] transition-all duration-300"
                    style={{
                      height: `${Math.max(2, Math.abs(v) * 100)}%`,
                      opacity: 0.3 + Math.abs(v),
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 font-mono text-[8px] text-zinc-600">
                {eroded.filter((v) => Math.abs(v) > 0.001).length} / {eroded.length} traços sobreviveram à erosão
              </div>
            </div>

            {/* Resultado da fossilização */}
            <div className="mb-8">
              <span className="tag mb-3 block">RESULTADO DA FOSSILIZAÇÃO F</span>
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                <div className="text-zinc-500 mb-1">A(S) — output fossilizado:</div>
                <div className="text-[#b6ff3a] text-xs break-all">
                  [{transformResult[0]?.slice(0, 6).map((v) => v.toFixed(3)).join(", ")}
                  {transformResult[0] && transformResult[0].length > 6 ? ", ..." : ""}]
                </div>
              </div>
            </div>

            {/* Invariantes fósseis */}
            <div className="mb-8">
              <span className="tag mb-3 block">INVARIANTES FÓSSEIS</span>
              <div className="space-y-2">
                {fossilInvariants.map((inv) => (
                  <div
                    key={inv.type}
                    className="flex items-center justify-between p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]"
                  >
                    <span className="text-zinc-400">{inv.type}</span>
                    <span className="text-zinc-600 text-[8px]">#{inv.hash}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tensorial product */}
            <div>
              <span className="tag mb-3 block">PRODUTO TENSORIAL ANACROCLÁSTICO</span>
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                <div className="text-zinc-500 mb-1">F₁ ⊗_A F₂ — co-ocorrência estratigráfica:</div>
                <div className="text-zinc-300">
                  {fossilInvariants.length} invariantes × {artifacts.length} artefatos
                </div>
                <div className="text-[#b6ff3a] mt-1">
                  {fossilInvariants.length * artifacts.length} pares considerados
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-400">PaleoCLI 3:</strong> A fossilização F(C) = ∩ E_θ(C)
              é idempotente — aplicar duas vezes é equivalente a uma. O produto tensorial ⊗_A
              requer co-ocorrência na mesma camada estratigráfica.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
