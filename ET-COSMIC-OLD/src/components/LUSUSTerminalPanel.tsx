import { useState } from "react";
import { LUSUS_DISCLAIMER_PT } from "../lib/anacrocasticLimits";
import {
  fetchChaosBell,
  fetchCavityModes,
  fetchThomasFermiH2,
  runIsingMaxCut,
} from "../lib/lususClient";
import { loadOmegaMaterial, lususSeedFromMaterial } from "../lib/moduleRealityBackend";

type LususModule = "ising" | "chaos" | "thomas" | "cavity";

export default function LUSUSTerminalPanel() {
  const [module, setModule] = useState<LususModule>("ising");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const push = (line: string) => setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...prev].slice(0, 24));

  const run = async () => {
    setLoading(true);
    try {
      if (module === "ising") {
        const r = await runIsingMaxCut(12);
        push(`Max-Cut energia=${r.energy} — ${r.disclaimer}`);
      } else if (module === "chaos") {
        const { material } = await loadOmegaMaterial(64);
        const seed = lususSeedFromMaterial(material);
        const r = await fetchChaosBell(seed);
        push(`CHSH clássico (LUSUS) S≈${r.simulatedS.toFixed(3)} corr=${r.correlation.toFixed(3)} seed=${seed}`);
        push(r.disclaimer);
      } else if (module === "thomas") {
        const r = await fetchThomasFermiH2(1.4);
        push(`H₂ binding≈${r.bindingEnergyEV?.toFixed(4)} eV (TF clássico)`);
        push(r.disclaimer);
      } else {
        const r = await fetchCavityModes(16);
        push(`Cavidade: ${r.modes?.length ?? 0} modos — ${r.disclaimer}`);
      }
    } catch (e) {
      push(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
      push("Servidor LUSUS offline? npm run server (porta 3001 ou PORT=3003)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <span className="tag text-cyan-400/80 border-cyan-900/40 bg-cyan-950/20">LUSUS</span>
        <h2 className="font-sans font-light text-3xl text-zinc-100 mt-4">
          LUSUS <span className="text-cyan-300/90 italic">Terminal</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2 max-w-2xl">{LUSUS_DISCLAIMER_PT}</p>

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            {(
              [
                ["ising", "Coherent Ising (Max-Cut)"],
                ["chaos", "Bell clássico (caos)"],
                ["thomas", "Thomas-Fermi H₂"],
                ["cavity", "Cavidade Planckiana"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setModule(id)}
                className={`w-full text-left px-4 py-3 border font-mono text-[10px] ${
                  module === id
                    ? "border-cyan-600/50 bg-cyan-950/20 text-cyan-200"
                    : "border-[#1a1f26] text-zinc-500 hover:border-[#2a2f36]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="w-full py-3 bg-cyan-600/80 text-black font-mono text-[10px] font-bold disabled:opacity-50"
            >
              {loading ? "RODANDO…" : "EXECUTAR MÓDULO"}
            </button>
          </div>
          <div className="lg:col-span-2 bg-[#050709] border border-[#14181c] p-4 font-mono text-[10px] text-zinc-500 min-h-[280px]">
            {log.length === 0 ? (
              <p className="text-zinc-600">Selecione um módulo e execute. Limites de escala permanecem clássicos.</p>
            ) : (
              log.map((line, i) => (
                <div key={i} className="mb-1 text-zinc-400">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="mt-6 text-[10px] font-mono text-zinc-600 max-w-3xl">
          As sete falhas clássicas (UV, átomo, fotoelétrico, Debye, calor negativo, CMB, Bell) são exploradas como
          engenharia — não como violação das leis quânticas.
        </p>
      </div>
    </section>
  );
}
