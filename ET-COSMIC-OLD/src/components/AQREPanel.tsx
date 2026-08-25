import { useCallback, useEffect, useState } from "react";
import {
  ANACROCLASTIC_CLASSIFICATION,
  AQRE_DISCLAIMER_PT,
} from "../lib/anacrocasticLimits";
import { fetchAqreStatus, recordLsc, runAqreTask, type LscReading } from "../lib/aqreClient";

const TASKS = [
  { id: "spin_network", label: "Rede de spin (≤20 nós)" },
  { id: "causal_tracker", label: "Rastreador causal (Ising)" },
  { id: "memory_collapse", label: "Colapso com memória (MCM)" },
  { id: "chi_field", label: "Campo χ (vorticidade)" },
] as const;

export default function AQREPanel() {
  const [cEpsilon, setCEpsilon] = useState(0.35);
  const [pCurrent, setPCurrent] = useState(0.05);
  const [reading, setReading] = useState<LscReading | null>(null);
  const [task, setTask] = useState<string>("spin_network");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAqreStatus().catch(() => {});
  }, []);

  const refreshLsc = useCallback(async () => {
    try {
      const r = await recordLsc(cEpsilon, pCurrent);
      setReading(r);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
    }
  }, [cEpsilon, pCurrent]);

  const handleRun = async () => {
    setLoading(true);
    setOutput("");
    try {
      const out = await runAqreTask(task, { cEpsilon, pCurrent, nodeCount: 10 });
      if (!out.ok) {
        setOutput(out.error ?? "LSC_LIMIT_EXCEEDED (429)");
        if (out.reading) setReading(out.reading);
      } else {
        setReading(out.reading ?? null);
        setOutput(JSON.stringify(out.result, null, 2));
      }
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-8">
          <span className="tag text-amber-400/90 border-amber-900/40 bg-amber-950/20">ANACRÓCLASTA</span>
          <h2 className="font-sans font-light text-3xl md:text-4xl text-zinc-100 mt-4">
            AQRE — <span className="text-amber-200/90">Emulador Quântico-Relativístico</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-3 max-w-2xl">{AQRE_DISCLAIMER_PT}</p>
        </div>

        <div className="mb-8 p-4 border border-amber-900/30 bg-amber-950/10 rounded text-xs font-mono text-amber-200/80">
          Indicadores físicos ao vivo: P, Cε, G, K_eff. Tarefas que excedem LSC retornam HTTP 429.
        </div>

        <div className="grid lg:grid-cols-2 gap-px bg-[#14181c] border border-[#14181c] rounded-lg overflow-hidden mb-12">
          <div className="bg-[#0a0d10] p-6 space-y-6">
            <div>
              <label className="font-mono text-[10px] text-zinc-500">Cε (coerência)</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cEpsilon}
                onChange={(e) => setCEpsilon(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="font-mono text-xs text-amber-300">{cEpsilon.toFixed(3)}</span>
            </div>
            <div>
              <label className="font-mono text-[10px] text-zinc-500">P (potência relativa)</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={pCurrent}
                onChange={(e) => setPCurrent(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="font-mono text-xs text-amber-300">{pCurrent.toFixed(3)}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshLsc}
                className="px-4 py-2 border border-[#2a2f36] font-mono text-[10px] text-zinc-300 hover:border-amber-700"
              >
                ATUALIZAR LSC
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={loading}
                className="px-4 py-2 bg-amber-600/90 text-black font-mono text-[10px] font-semibold disabled:opacity-50"
              >
                {loading ? "EXECUTANDO…" : "EXECUTAR TAREFA"}
              </button>
            </div>
            <select
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full bg-black border border-[#1a1f26] font-mono text-xs text-zinc-300 p-2"
            >
              {TASKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-black p-6 font-mono text-[11px]">
            {reading ? (
              <dl className="grid grid-cols-2 gap-2 text-zinc-400">
                <dt>Status</dt>
                <dd className={reading.allowed ? "text-[#b6ff3a]" : "text-red-400"}>{reading.status}</dd>
                <dt>P / P_max</dt>
                <dd>{reading.P.toFixed(4)} / {reading.P_max.toExponential(2)}</dd>
                <dt>G(Cε)</dt>
                <dd>{reading.G.toFixed(4)}</dd>
                <dt>K_eff</dt>
                <dd>{reading.K_eff.toFixed(4)}</dd>
              </dl>
            ) : (
              <p className="text-zinc-600">Ajuste Cε e P e clique em Atualizar LSC.</p>
            )}
            {output && (
              <pre className="mt-4 p-3 bg-[#050709] border border-[#14181c] text-[10px] text-zinc-500 max-h-48 overflow-auto">
                {output}
              </pre>
            )}
          </div>
        </div>

        <h3 className="font-mono text-[10px] text-zinc-500 tracking-widest mb-4">CLASSIFICAÇÃO ANACRÓCLASTA</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(ANACROCLASTIC_CLASSIFICATION).map(([key, block]) => (
            <div key={key} className="border border-[#1a1f26] p-4 rounded">
              <div className="font-mono text-xs text-zinc-300 mb-2">{block.label}</div>
              <ul className="text-[11px] text-zinc-500 space-y-1 list-disc list-inside">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
