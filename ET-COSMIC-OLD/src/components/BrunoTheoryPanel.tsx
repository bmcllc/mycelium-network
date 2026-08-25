/**
 * Motor Bruno — FURC + HMCO + DTU + PDC + Colapso + RCP (arquivo teoria).
 */

import { useCallback, useState, type ReactNode } from "react";
import { runBrunoTheorySimulation } from "../theory/brunoTheoryEngine";
import type { BrunoTheoryFrame } from "../theory/brunoTheoryFrame";
import { runLscMcmCoupledFrame } from "../compute/lscMcmCoupled";
import { projectTesseract } from "../theory/collapseEngineering";

export default function BrunoTheoryPanel() {
  const [frame, setFrame] = useState<BrunoTheoryFrame | null>(null);
  const [steps, setSteps] = useState(24);
  const [lsc, setLsc] = useState<ReturnType<typeof runLscMcmCoupledFrame> | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState(64);

  const run = useCallback(() => {
    setLoading(true);
    try {
      setFrame(runBrunoTheorySimulation({ resolution, steps }).frame);
      setLsc(runLscMcmCoupledFrame(resolution));
    } finally {
      setLoading(false);
    }
  }, [resolution, steps]);

  const tess = frame ? projectTesseract(`panel:${resolution}`, frame.collapse.Df) : [];

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-10 max-w-3xl">
          <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">ARQUIVO TEORIA</span>
          <h2 className="mt-4 font-sans font-light text-3xl md:text-5xl text-zinc-100">
            Teoria <span className="text-[#6cf0ff]">implementada</span>
          </h2>
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
            FURC · HMCO–AMUA · DTU · PDC 5.2 · Engenharia do Colapso · RCP — runtime real, entropia Ω
            determinística. Integrado em Harmonia, PMU e finanças de colapso.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <label className="font-mono text-[10px] text-zinc-500 flex items-center gap-2">
            res
            <input
              type="number"
              min={8}
              max={256}
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value) || 64)}
              className="w-16 bg-black border border-[#14181c] px-2 py-1 text-zinc-300"
            />
          </label>
          <label className="font-mono text-[10px] text-zinc-500 flex items-center gap-2">
            steps
            <input
              type="number"
              min={4}
              max={128}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value) || 24)}
              className="w-16 bg-black border border-[#14181c] px-2 py-1 text-zinc-300"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={run}
            className="px-4 py-2 font-mono text-[10px] bg-[#6cf0ff] text-black disabled:opacity-50"
          >
            {loading ? "COMPUTANDO…" : "EXECUTAR SIMULAÇÃO COMPLETA"}
          </button>
        </div>

        {frame && (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-[9px]">
            <Card title="FURC v2.1" color="#6cf0ff">
              <Row label="C_ε" value={frame.furc.C_epsilon.toFixed(6)} />
              <Row label="P_max" value={frame.furc.P_max.toExponential(2)} />
              <Row label="ṁ_fase" value={frame.furc.m_dot.toExponential(2)} />
            </Card>
            <Card title="HMCO" color="#b6ff3a">
              <Row label="κ" value={frame.hmco.kappa.toFixed(4)} />
              <Row label="C_cache" value={frame.hmco.C_cache.toFixed(4)} />
              <Row label="prefetch" value={frame.hmco.prefetch_mode} />
            </Card>
            <Card title="DTU 3.0" color="#a78bfa">
              <Row label="N_τ" value={frame.dtu.N_tau.toFixed(2)} />
              <Row label="Ψ_col" value={frame.dtu.Psi_col.toFixed(4)} />
            </Card>
            <Card title="PDC 5.2" color="#f97316">
              <Row label="ECS ok" value={String(frame.pdc.ecsMatches)} />
              <Row label="voxels" value={String(frame.pdc.voxelCount)} />
              <Row label="arena" value={String(frame.pdc.arenaSlotsUsed)} />
            </Card>
            <Card title="Colapso" color="#ec4899">
              <Row label="Ω" value={frame.collapse.omega.toFixed(4)} />
              <Row label="χ boost" value={frame.collapse.chi_boost.toFixed(4)} />
              <Row label="stress" value={frame.collapse.stress_from_projection.toFixed(4)} />
            </Card>
            <Card title="RCP" color="#22d3ee">
              <Row label="splat" value={frame.rcp.splatDensity.toFixed(4)} />
              <Row label="partículas" value={String(frame.rcp.particles)} />
              <Row label="E" value={frame.rcp.energy.toFixed(2)} />
            </Card>
          </div>
        )}

        {frame?.simulation && (
          <p className="mt-4 font-mono text-[9px] text-zinc-500">
            Sim: {frame.simulation.steps} steps · FURC {frame.simulation.furcHistoryLen} ticks · HMCO{" "}
            {frame.simulation.hmcoTraceLen} · RCP {frame.simulation.rcpFrames} frames · DTU coh=
            {frame.simulation.dtuCoherence.toFixed(4)}
          </p>
        )}

        {tess.length > 0 && (
          <p className="mt-6 font-mono text-[9px] text-zinc-600">
            Tesseract projetado (16 vértices): ex. [{tess[0]!.map((v) => v.toFixed(2)).join(", ")}] …
          </p>
        )}

        {lsc && (
          <p className="mt-4 font-mono text-[10px] text-zinc-500">
            LSC/MCM: {lsc.method} · C_ε={lsc.C_epsilon.toFixed(4)} · collapse_ω=
            {String(lsc.theory.collapse_omega ?? "—")}
          </p>
        )}
      </div>
    </section>
  );
}

function Card({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-[#14181c] p-3 space-y-1.5">
      <div style={{ color }} className="tracking-widest text-[8px]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-zinc-400">
      <span>{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}
