/**
 * PMU vHGPU — 4 núcleos de ajuda (Protocolo de Malha Unificado §3.5.2 / §3.7.3)
 */

import { useCallback, useState } from "react";
import { Link } from "wouter";
import { PMU_VHGPU_DOMAINS } from "../compute/pmuDomains";
import { vHGPUClient } from "../protocol/amp/vhgpuClient";
import type { PmuVhgpuFrameResult } from "../compute/pmuVhgpuScheduler";
import type { PmuComputeBundle } from "../protocol/amp/pmuComputeOrchestrator";
import type { PmuOmegaResult } from "../protocol/amp/pmuOmegaPipeline";

export default function PmuVhgpuCoresPanel() {
  const [frames, setFrames] = useState<PmuVhgpuFrameResult[]>([]);
  const [bundle, setBundle] = useState<PmuComputeBundle | null>(null);
  const [omega, setOmega] = useState<PmuOmegaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await vHGPUClient.runPmuCycle(64);
      setBundle(result);
      setFrames(result.frames);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const runOne = useCallback(async (domainId: (typeof PMU_VHGPU_DOMAINS)[number]["id"]) => {
    setLoading(true);
    setError(null);
    try {
      const frame = await vHGPUClient.runPmuDomain(domainId, 64);
      setFrames((prev) => {
        const rest = prev.filter((f) => f.domain !== domainId);
        return [...rest, frame];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">PMU</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">vHGPU ×4</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Núcleos <span className="text-[#b6ff3a]">PMU</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Quatro domínios com mínimo de 4 cores lógicos cada, conforme{" "}
            <code className="text-[#b6ff3a]/80">Protocolo_de_Malha_Unificado.pdf</code>: geometria,
            quântica VOID (CQR circuito), paleocomputação (fossilização de entropia) e LSC/MCM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Link
            href="/compute/pmu-truth"
            className="px-3 py-2 font-mono text-[9px] border border-[#14181c] text-zinc-500 hover:text-[#b6ff3a]"
          >
            VERDADE Ω →
          </Link>
          <Link
            href="/compute/cosmic-harmony"
            className="px-3 py-2 font-mono text-[9px] border border-[#14181c] text-zinc-500 hover:text-[#b6ff3a]"
          >
            HARMONIA →
          </Link>
          <Link
            href="/compute/bruno-theory"
            className="px-3 py-2 font-mono text-[9px] border border-[#14181c] text-zinc-500 hover:text-[#6cf0ff]"
          >
            FURC/HMCO/DTU →
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAll()}
            className="px-4 py-2 font-mono text-[10px] border border-[#14181c] text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
          >
            CICLO PMU (16 cores)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const result = await vHGPUClient.runOmega(64);
                setOmega(result);
                setFrames(result.frames);
                setBundle(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 font-mono text-[10px] border border-[#b6ff3a]/40 bg-[#b6ff3a]/10 text-[#b6ff3a] disabled:opacity-50"
          >
            PMU Ω — ATÉ AO FIM
          </button>
        </div>

        {error && (
          <p className="mb-6 font-mono text-[10px] text-red-400 border border-red-500/30 p-3">{error}</p>
        )}

        {bundle && (
          <p className="mb-6 font-mono text-[10px] text-zinc-500">
            Pipeline {bundle.pipeline} · {bundle.totalCores} cores · {bundle.frames.length} domínios
          </p>
        )}

        {omega && (
          <div className="mb-6 p-4 border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 font-mono text-[10px] text-zinc-400 space-y-1">
            <p className="text-[#b6ff3a]">PMU Ω COMPLETO</p>
            <p>Pipeline: {omega.pipeline}</p>
            <p>Entropia tier: {omega.entropy.tier} · verificado: {String(omega.entropy.quantumVerified)}</p>
            <p>Fóssil paleo: {omega.entropy.paleoFossil?.fossilRootHash.slice(0, 24) ?? "—"}…</p>
            <p>
              PQC: {omega.pqc.kemAlgorithm} ({omega.pqc.kemPublicKeyBytes}B) + {omega.pqc.dsaAlgorithm} (
              {omega.pqc.dsaPublicKeyBytes}B)
            </p>
            {omega.audit && (
              <p>
                Verdade: {omega.audit.truth_level_id} · STS{" "}
                {omega.audit.sts_light.skipped
                  ? "SKIP"
                  : omega.audit.sts_light.passed
                    ? "PASS"
                    : "FAIL"}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-px bg-[#14181c] border border-[#14181c]">
          {PMU_VHGPU_DOMAINS.map((d) => {
            const frame = frames.find((f) => f.domain === d.id);
            return (
              <div key={d.id} className="bg-[#0a0d10] p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-mono text-[11px] text-[#b6ff3a]">{d.label}</h3>
                    <p className="font-mono text-[9px] text-zinc-600 mt-1">{d.pmuSection}</p>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500">{d.minCores} cores</span>
                </div>
                <p className="text-zinc-500 text-xs mb-4">{d.description}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runOne(d.id)}
                  className="w-full py-2 font-mono text-[9px] border border-[#14181c] text-zinc-400 hover:border-zinc-600 disabled:opacity-50"
                >
                  EXECUTAR DOMÍNIO
                </button>
                {frame && (
                  <div className="mt-4 font-mono text-[9px] text-zinc-600 space-y-1">
                    <div>backend: {frame.backend}</div>
                    <div>method: {frame.method}</div>
                    <div>{frame.durationMs.toFixed(1)} ms</div>
                    {Object.entries(frame.metrics).slice(0, 4).map(([k, v]) => (
                      <div key={k}>
                        {k}: {String(v).slice(0, 24)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
