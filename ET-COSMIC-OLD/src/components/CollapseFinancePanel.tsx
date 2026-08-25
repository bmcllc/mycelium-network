/**
 * ETΞRNET — Painel de Finanças de Colapso
 *
 * Renderiza o painel interativo das Finanças de Colapso (Cap. 12):
 * - Collateralized Collapse Bonds (CCB)
 * - Hysteresis Savings Vaults (HSV)
 * - Coherence Bonds
 * - Scar Tokens
 * - CDR (Cohomology Diversification Ratio)
 * - Coherence Swap
 *
 * Referência: "O Livro do ETRNET", Cap. 12
 */

import { useEffect, useMemo, useState } from "react";
import {
  ccbCoupon,
  coherenceCoupon,
  cohDiversificationRatio,
  type CollateralizedCollapseBond,
  type HysteresisVault,
  type CoherenceBond,
  type ScarToken,
} from "../crypto/collapseFinance";
import { loadOmegaMaterial, seedCollapseFinanceFromMaterial } from "../lib/moduleRealityBackend";

export default function CollapseFinancePanel() {
  const [stressIndex, setStressIndex] = useState(0.3);
  const [coherenceEpsilon, setCoherenceEpsilon] = useState(0.5);
  const [ccb, setCcb] = useState<CollateralizedCollapseBond | null>(null);
  const [hsv, setHsv] = useState<HysteresisVault | null>(null);
  const [bonds, setBonds] = useState<CoherenceBond[]>([]);
  const [scars, setScars] = useState<ScarToken[]>([]);
  const [omegaLabel, setOmegaLabel] = useState("");

  useEffect(() => {
    void (async () => {
      const { material, meta } = await loadOmegaMaterial(256);
      const seeded = seedCollapseFinanceFromMaterial(material);
      setCcb(seeded.ccb);
      setHsv(seeded.hsv);
      setBonds(seeded.bonds);
      setScars(seeded.scars);
      setStressIndex(seeded.ccb.stressIndex);
      setCoherenceEpsilon(seeded.bonds[0]?.coherenceMeasure ?? 0.5);
      setOmegaLabel(`${meta.tier} · ${meta.sha3Prefix}…`);
    })();
  }, []);

  if (!ccb || !hsv) {
    return (
      <section className="border-b border-[#14181c] bg-black p-12 font-mono text-[10px] text-zinc-500">
        A carregar instrumentos de colapso (entropia Ω)…
      </section>
    );
  }

  /** CCB com estresse atualizado */
  const liveCCB = useMemo(
    () => ({ ...ccb, stressIndex, klDivergence: stressIndex * 0.4 }),
    [ccb, stressIndex]
  );
  const ccbCouponValue = useMemo(() => ccbCoupon(liveCCB), [liveCCB]);

  /** HSV withdraw com penalidade de histerese */
  const hsvPenalty = useMemo(() => {
    const elapsed = (Date.now() - hsv.lastActionTime) / (86400000 * 30);
    return Math.abs(hsv.hysteresisState - Math.exp(-hsv.beta * elapsed)) * 0.1;
  }, [hsv]);

  /** Coherence Bonds com C_ε ao vivo */
  const liveBonds = useMemo(
    () =>
      bonds.map((b) => ({
        ...b,
        coherenceMeasure: coherenceEpsilon,
      })),
    [bonds, coherenceEpsilon]
  );

  /** CDR — cohDiversificationRatio espera number[] */
  const cdr = useMemo(() => {
    const h1Norms = [0.2, 0.8, 0.0, 0.5, 0.1]; // normas H¹ dos ativos
    return cohDiversificationRatio(h1Norms);
  }, []);

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              § 12.1
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              FINANÇAS DE COLAPSO
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Instrumentos de <span className="text-[#b6ff3a]">Colapso</span> com Memória
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            CCBs, HSV, Coherence Bonds e Scar Tokens — instrumentos financeiros que
            internalizam a mecânica dos colapsos com memória (Cap. 8) e a Teoria LSC (Cap. 9).
            {omegaLabel ? (
              <span className="block mt-2 font-mono text-[10px] text-zinc-600">Ω {omegaLabel}</span>
            ) : null}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* CCB + HSV */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            {/* CCB Dashboard */}
            <div className="mb-8">
              <span className="tag mb-4 block">COLLATERALIZED COLLAPSE BOND (CCB)</span>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-black border border-[#14181c]">
                  <div className="font-mono text-[9px] text-zinc-500 mb-1">STRESS INDEX σ</div>
                  <div className="font-mono text-lg text-[#ff3ad9]">{stressIndex.toFixed(3)}</div>
                </div>
                <div className="p-3 bg-black border border-[#14181c]">
                  <div className="font-mono text-[9px] text-zinc-500 mb-1">KL DIVERGENCE I</div>
                  <div className="font-mono text-lg text-[#6cf0ff]">{liveCCB.klDivergence.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-black border border-[#14181c]">
                  <div className="font-mono text-[9px] text-zinc-500 mb-1">CUPOM c(σ)</div>
                  <div className="font-mono text-lg text-[#b6ff3a]">{(ccbCouponValue * 100).toFixed(2)}%</div>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-zinc-500">ÍNDICE DE ESTRESSE</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={stressIndex}
                  onChange={(e) => setStressIndex(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ff3ad9]"
                />
              </div>
              <div className="p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
                c(σ) = base × (1 + σ) × exp(-I) — cupom indexado ao estresse com monitoramento KL
              </div>
            </div>

            {/* HSV */}
            <div className="mb-8">
              <span className="tag mb-4 block">HYSTERESIS SAVINGS VAULT (HSV)</span>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-black border border-[#14181c]">
                  <div className="font-mono text-[9px] text-zinc-500 mb-1">SALDO</div>
                  <div className="font-mono text-lg text-[#6cf0ff]">${hsv.balance.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-black border border-[#14181c]">
                  <div className="font-mono text-[9px] text-zinc-500 mb-1">PENALIDADE HSV</div>
                  <div className="font-mono text-lg text-[#ff3ad9]">{(hsvPenalty * 100).toFixed(1)}%</div>
                </div>
              </div>
              {/* Curva de histerese SVG */}
              <div className="border border-[#14181c] bg-black/50 p-2 mb-2">
                <svg viewBox="0 0 280 80" className="w-full h-20">
                  <line x1="20" y1="10" x2="20" y2="70" stroke="#14181c" strokeWidth="0.5" />
                  <line x1="20" y1="70" x2="270" y2="70" stroke="#14181c" strokeWidth="0.5" />
                  <path
                    d={`M 20 60 Q 60 ${60 - hsv.hysteresisState * 40} 100 ${60 - hsv.hysteresisState * 30} T 180 ${60 - hsv.hysteresisState * 20} T 270 ${60 - hsv.hysteresisState * 10}`}
                    fill="none"
                    stroke="#6cf0ff"
                    strokeWidth="1.5"
                    opacity="0.8"
                  />
                  <circle cx="60" cy={60 - hsv.hysteresisState * 35} r="2" fill="#b6ff3a" />
                  <circle cx="140" cy={60 - hsv.hysteresisState * 25} r="2" fill="#b6ff3a" />
                  <circle cx="220" cy={60 - hsv.hysteresisState * 15} r="2" fill="#b6ff3a" />
                  <text x="145" y="78" className="fill-zinc-600" fontSize="5" fontFamily="monospace" textAnchor="middle">
                    {'h(t) = ∫₀ᵗ e^{-β(t-s)}σ(s)ds'}
                  </text>
                </svg>
              </div>
              <div className="p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
                r(t) = r₀ + α·h(t) - γ·D^α_φ — taxa ajustada com memória completa do mercado
              </div>
            </div>

            {/* Coherence Bonds */}
            <div>
              <span className="tag mb-4 block">COHERENCE BONDS</span>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-zinc-500">COERÊNCIA MODAL C_ε</span>
                  <span className="font-mono text-[10px] text-[#6cf0ff]">{coherenceEpsilon.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={coherenceEpsilon}
                  onChange={(e) => setCoherenceEpsilon(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
                />
              </div>
              <div className="space-y-2">
                {liveBonds.map((bond) => (
                  <div
                    key={bond.id}
                    className="flex items-center justify-between p-2 bg-black border border-[#14181c] font-mono text-[10px]"
                  >
                    <span className="text-zinc-400">{bond.id}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500">C_ε={bond.coherenceMeasure.toFixed(2)}</span>
                      <span className="text-[#b6ff3a]">Yield: {(coherenceCoupon(bond) * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
                yield = base × C_ε² — mercado diverso = cupons altos; bolha = cupons → 0
              </div>
            </div>
          </div>

          {/* Scar Tokens + CDR */}
          <div className="lg:col-span-5 bg-black p-6 md:p-8">
            {/* Scar Tokens */}
            <div className="mb-8">
              <span className="tag mb-4 block">SCAR TOKENS</span>
              <div className="space-y-2">
                {scars.map((scar) => (
                  <div
                    key={scar.id}
                    className="p-3 bg-[#0a0d10] border border-[#14181c]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-[#ff3ad9]">{scar.id}</span>
                      <span className="font-mono text-[9px] text-zinc-500">ρ={scar.defectDensity.toFixed(2)}</span>
                    </div>
                    <div className="font-mono text-[9px] text-zinc-400">
                      χ = [{scar.defectField.map((v) => v.toFixed(2)).join(", ")}]
                    </div>
                    <div className="mt-2 w-full h-1 bg-[#14181c] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ff3ad9] rounded-full"
                        style={{ width: `${Math.min(100, scar.defectDensity * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[8px] text-zinc-600">
                      value: ${scar.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
                Cicatriz topológica de cada crash → direito a fração das taxas + governança
              </div>
            </div>

            {/* CDR */}
            <div className="mb-8">
              <span className="tag mb-4 block">COHOMOLOGY DIVERSIFICATION RATIO</span>
              <div className="p-4 bg-[#0a0d10] border border-[#14181c]">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] text-zinc-500">CDR</span>
                  <span
                    className={`font-mono text-lg ${cdr > 0.3 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}`}
                  >
                    {cdr.toFixed(3)}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#14181c] rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff3ad9] to-[#b6ff3a] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, cdr * 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-px bg-yellow-500"
                    style={{ left: "30%" }}
                  />
                </div>
                <div className="flex justify-between mt-1 font-mono text-[8px] text-zinc-600">
                  <span>0</span>
                  <span className="text-yellow-500">0.3 (LIMITE SAUDÁVEL)</span>
                  <span>1</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
                CDR = |{`{H¹ ≠ 0}`}| / total — CDR &gt; 0.3 = portfólio robusto
              </div>
            </div>

            {/* Coherence Swap */}
            <div className="mb-8">
              <span className="tag mb-4 block">COHERENCE SWAP</span>
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#6cf0ff]">PARTE A (LETF)</span>
                  <span className="text-zinc-600">↔</span>
                  <span className="text-[#ff3ad9]">PARTE B (HEDGE)</span>
                </div>
                <div className="text-zinc-500 text-[9px] mb-2">
                  A quer reduzir C_ε (paga prêmio fixo) | B quer aumentar C_ε (recebe prêmio + risco)
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Exposição:</span>
                  <span className="text-[#b6ff3a]">{coherenceEpsilon.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Fossil ETFs */}
            <div>
              <span className="tag mb-4 block">FOSSIL ETFs (fETF)</span>
              <div className="space-y-2">
                {[
                  { name: "fETF Core Algos", cat: "Ordenação, busca, criptografia", color: "#6cf0ff" },
                  { name: "fETF Legacy Enterprise", cat: "COBOL, Fortran, RPG", color: "#ff3ad9" },
                  { name: "fETF Open Source", cat: "OpenSSL, Linux, GCC", color: "#b6ff3a" },
                ].map((etf) => (
                  <div
                    key={etf.name}
                    className="p-2 bg-[#0a0d10] border border-[#14181c] flex items-center justify-between"
                  >
                    <span className="font-mono text-[10px]" style={{ color: etf.color }}>
                      {etf.name}
                    </span>
                    <span className="font-mono text-[8px] text-zinc-600">{etf.cat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-400">Sexta Fusão:</strong> Cada crash é uma cicatriz.
              Cada cicatriz é um ativo. Cada ativo é uma lição que o universo não deixará que se perca.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
