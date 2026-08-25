/**
 * Verdade Ω — transparência de fontes, nível L0–L4, STS, pool soberano.
 */

import { useCallback, useEffect, useState } from "react";
import { getTruthLevelSpec } from "../pmu/pmuTruthLevels";
import {
  fetchPmuAuditFull,
  fetchPmuPoolStatus,
  fetchEntropyProviders,
  type PmuAuditReport,
} from "../pmu/pmuAuditClient";
import {
  getQuantumMode,
  probeQuantumServer,
  resetQuantumProbe,
} from "../crypto/quantumBridge";

export default function PmuTruthOmegaPanel() {
  const [report, setReport] = useState<PmuAuditReport | null>(null);
  const [providers, setProviders] = useState<string | null>(null);
  const [pool, setPool] = useState<{ pulses: number; chain_tip: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantumMode, setQuantumMode] = useState(getQuantumMode());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p, prov] = await Promise.all([
        fetchPmuAuditFull(2048),
        fetchPmuPoolStatus(),
        fetchEntropyProviders(),
      ]);
      setReport(r);
      setPool({ pulses: p.pulses, chain_tip: p.chain_tip });
      setProviders(prov.recommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void probeQuantumServer().then(() => setQuantumMode(getQuantumMode()));
    void refresh();
  }, [refresh]);

  const level = report ? getTruthLevelSpec(report.truth_level) : null;

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-10 max-w-3xl">
          <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">PMU</span>
          <h2 className="mt-4 font-sans font-light text-3xl text-zinc-100">
            Verdade <span className="text-[#b6ff3a]">Ω</span>
          </h2>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            Emulação com rótulos honestos: o que é hardware, simulação quântica (quimb) ou pool
            soberano. IBM não é obrigatório.
          </p>
          {providers && (
            <p className="mt-2 font-mono text-[10px] text-zinc-600">{providers}</p>
          )}
          <p className="mt-2 font-mono text-[10px] text-zinc-500">
            Motor CQR:{" "}
            <span className={quantumMode === "real" ? "text-[#b6ff3a]" : "text-amber-400"}>
              {quantumMode}
            </span>
            {quantumMode === "offline" && " — fallback CSPRNG/SHA3 rotulado"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => {
              resetQuantumProbe();
              void probeQuantumServer(true).then(() => setQuantumMode(getQuantumMode()));
            }}
            className="px-4 py-2 font-mono text-[10px] border border-[#14181c] text-zinc-400 hover:border-zinc-600"
          >
            SONDAR CQR
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="px-4 py-2 font-mono text-[10px] border border-[#b6ff3a]/40 bg-[#b6ff3a]/10 text-[#b6ff3a] disabled:opacity-50"
          >
            AUDITORIA Ω
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={() => {
              if (!report) return;
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `pmu-audit-${report.generated_at}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="px-4 py-2 font-mono text-[10px] border border-[#14181c] text-zinc-400 hover:border-zinc-600 disabled:opacity-50"
          >
            EXPORTAR JSON
          </button>
        </div>

        {error && (
          <p className="mb-6 font-mono text-[10px] text-red-400 border border-red-500/30 p-3">
            {error}
            <span className="block mt-2 text-zinc-500">npm run quantum:dev</span>
          </p>
        )}

        {level && report && (
          <div className="grid lg:grid-cols-2 gap-px bg-[#14181c] border border-[#14181c] mb-8">
            <div className="bg-[#0a0d10] p-6">
              <p className="font-mono text-[10px] text-zinc-500 mb-2">NÍVEL DE VERDADE</p>
              <p className="text-xl font-light" style={{ color: level.color }}>
                {level.label}
              </p>
              <p className="text-zinc-500 text-xs mt-2">{level.description}</p>
              <div className="mt-4 space-y-2 font-mono text-[10px] text-zinc-400">
                <div>simulation: {String(report.entropy.simulation)}</div>
                <div>quantum_verified: {String(report.entropy.quantum_verified)}</div>
                <div>
                  STS leve:{" "}
                  {report.sts_light.skipped
                    ? "SKIP"
                    : report.sts_light.passed
                      ? "PASS"
                      : "FAIL"}
                </div>
              </div>
            </div>
            <div className="bg-[#0a0d10] p-6">
              <p className="font-mono text-[10px] text-zinc-500 mb-2">POOL SOBERANO</p>
              <p className="text-zinc-300 font-mono text-sm">{pool?.pulses ?? 0} pulses</p>
              <p className="text-zinc-600 font-mono text-[10px] mt-1">chain {pool?.chain_tip ?? "—"}</p>
              <p className="text-zinc-600 font-mono text-[10px] mt-4 truncate" title={report.entropy.sha3_256}>
                sha3 {report.entropy.sha3_256.slice(0, 32)}…
              </p>
            </div>
          </div>
        )}

        {report && (
          <div className="bg-[#0a0d10] border border-[#14181c] p-6">
            <p className="font-mono text-[10px] text-zinc-500 mb-4">FONTES</p>
            <ul className="space-y-2">
              {report.entropy.source_breakdown.map((s) => (
                <li key={s.id} className="flex justify-between font-mono text-[10px]">
                  <span className="text-zinc-300">{s.label}</span>
                  <span className="text-zinc-600">{s.kind}</span>
                </li>
              ))}
            </ul>
            {report.chsh_audit && (
              <p className="mt-4 font-mono text-[10px] text-zinc-500">
                CHSH S={report.chsh_audit.S_value?.toFixed(3) ?? "—"}{" "}
                {report.chsh_audit.chsh_violated ? "· violado" : ""}
              </p>
            )}
            <p className="mt-4 font-mono text-[9px] text-zinc-600">{report.disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}
