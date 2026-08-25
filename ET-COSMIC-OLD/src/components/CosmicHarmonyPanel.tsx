/**
 * Cosmic VOID — harmonia PMU Ω + GhostDock + HiggsGit + Phantom Pipeline.
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  prepareCosmicHarmonyCycle,
  runCosmicHarmonyCycle,
  type CosmicHarmonyResult,
} from "../core/cosmicVoidOrchestrator";
import { getPendingHarmonyCount } from "../harvesters/phantomHarvestHarmony";
import {
  cosmicSovereignLabel,
  ensureSovereignAmpConsent,
  isCosmicSovereignLocal,
} from "../lib/cosmicSovereignMode";
import {
  getRemoteCqrUrl,
  probeRemoteCqrUrl,
  setRemoteCqrUrl,
} from "../lib/remoteCqrConfig";
import { getQuantumMode, probeQuantumServer, resetQuantumStateForRemoteChange } from "../crypto/quantumBridge";
import { getTruthLevelSpec } from "../pmu/pmuTruthLevels";

export default function CosmicHarmonyPanel() {
  const [result, setResult] = useState<CosmicHarmonyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghostId, setGhostId] = useState("void-cosmic");
  const [pendingHarvest, setPendingHarvest] = useState(getPendingHarmonyCount());
  const [quantumMode, setQuantumMode] = useState(getQuantumMode());
  const [remoteCqr, setRemoteCqr] = useState(getRemoteCqrUrl() ?? "");
  const [remoteProbe, setRemoteProbe] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);

  const saveRemoteCqr = () => {
    setRemoteCqrUrl(remoteCqr.trim() || null);
    resetQuantumStateForRemoteChange();
    setRemoteProbe(null);
  };

  const testRemoteCqr = async () => {
    setRemoteBusy(true);
    setRemoteProbe(null);
    try {
      const url = remoteCqr.trim() || getRemoteCqrUrl();
      if (url) setRemoteCqrUrl(url);
      resetQuantumStateForRemoteChange();
      const r = await probeRemoteCqrUrl(url ?? undefined);
      setRemoteProbe(r.ok ? `✓ ${r.message}` : `✗ ${r.message}`);
      if (r.ok) await probeQuantumServer(true);
      setQuantumMode(getQuantumMode());
    } finally {
      setRemoteBusy(false);
    }
  };

  const resetMotor = async () => {
    setError(null);
    setResult(null);
    await prepareCosmicHarmonyCycle();
    resetQuantumStateForRemoteChange();
    await ensureSovereignAmpConsent();
    await probeQuantumServer(true);
    setQuantumMode(getQuantumMode());
    setRemoteProbe("motor reiniciado — pode correr Harmonia");
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureSovereignAmpConsent();
      await probeQuantumServer(true);
      setQuantumMode(getQuantumMode());
      const r = await runCosmicHarmonyCycle({ ghostId, resolution: 64 });
      setPendingHarvest(getPendingHarmonyCount());
      setResult(r);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (raw.includes("CGF_DCC_DENIED")) {
        setError(
          "Consentimento CGF insuficiente. Abra Governança → Consentimento e assine o núcleo v1, ou use APK soberano atualizado.",
        );
      } else if (/parse URL|void-local-cqr|URL inválid/i.test(raw)) {
        setError(
          "Motor CQR local: pedido HTTP inválido. Atualize o APK (npm run android:build:sovereign) e tente de novo.",
        );
      } else if (/webgpu|gpu|out of memory|oom/i.test(raw)) {
        setError(
          `${raw} — REINICIAR MOTOR abaixo. No Android, prefira PWA (Chrome → instalar): ver DOC/PWA-ANDROID.md.`,
        );
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const level = result?.audit ? getTruthLevelSpec(result.audit.truth_level) : null;

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-10 max-w-3xl">
          <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">VOID × PMU</span>
          <h2 className="mt-4 font-sans font-light text-3xl text-zinc-100">
            Harmonia <span className="text-[#b6ff3a]">Cósmica</span>
          </h2>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            Entropia Ω → GhostDock (TS no browser; GhostDocker Rust via motor quântico + void-runner) →
            HiggsGit → Phantom Pipeline. Com fila em sessionStorage, importa contactos na harmonia (sem scrape).
            Motor: <span className="text-zinc-300">{quantumMode}</span> · modo:{" "}
            <span className="text-zinc-300">{cosmicSovereignLabel()}</span> · fila harvest:{" "}
            {pendingHarvest}.
            {isCosmicSovereignLocal()
              ? " CQR no dispositivo ativo — ou URL remota abaixo para GhostDocker Rust longe de casa."
              : " GhostDocker Rust via URL remota ou VPS :9443."}
          </p>
          <Link
            href="/compute/pmu-roadmap"
            className="mt-2 inline-block font-mono text-[9px] text-zinc-600 hover:text-[#b6ff3a]"
          >
            roadmap PMU →
          </Link>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[9px] text-zinc-600">
            <Link href="/compute/pmu-vhgpu" className="hover:text-[#b6ff3a]">
              PMU vHGPU
            </Link>
            <span>·</span>
            <Link href="/compute/pmu-truth" className="hover:text-[#b6ff3a]">
              Verdade Ω
            </Link>
            <span>·</span>
            <Link href="/harvester" className="hover:text-[#b6ff3a]">
              Phantom Harvester
            </Link>
            <span>·</span>
            <Link href="/compute/bruno-theory" className="hover:text-[#6cf0ff]">
              FURC/PDC/Colapso
            </Link>
          </div>
        </div>

        <div className="mb-8 p-4 border border-[#14181c] bg-[#0a0d10]/80 max-w-2xl">
          <p className="font-mono text-[10px] text-zinc-500 mb-2">
            Motor CQR remoto (usar longe) — HTTPS ou túnel Cloudflare
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="font-mono text-[10px] text-zinc-500 flex-1 min-w-[200px]">
              URL
              <input
                value={remoteCqr}
                onChange={(e) => setRemoteCqr(e.target.value)}
                placeholder="https://xxx.trycloudflare.com"
                className="block mt-1 w-full px-2 py-1 bg-black border border-[#14181c] text-zinc-300 text-xs"
              />
            </label>
            <button
              type="button"
              disabled={remoteBusy}
              onClick={() => {
                saveRemoteCqr();
              }}
              className="px-3 py-2 font-mono text-[10px] border border-zinc-700 text-zinc-400"
            >
              GUARDAR
            </button>
            <button
              type="button"
              disabled={remoteBusy}
              onClick={() => void testRemoteCqr()}
              className="px-3 py-2 font-mono text-[10px] border border-[#b6ff3a]/30 text-[#b6ff3a]"
            >
              TESTAR
            </button>
            <button
              type="button"
              onClick={() => {
                setRemoteCqr("");
                setRemoteCqrUrl(null);
                resetQuantumStateForRemoteChange();
                setRemoteProbe("modo local");
              }}
              className="px-3 py-2 font-mono text-[10px] border border-zinc-800 text-zinc-600"
            >
              LOCAL
            </button>
          </div>
          {remoteProbe && (
            <p className="mt-2 font-mono text-[9px] text-zinc-500">{remoteProbe}</p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-8">
          <label className="font-mono text-[10px] text-zinc-500">
            GhostID
            <input
              value={ghostId}
              onChange={(e) => setGhostId(e.target.value)}
              className="block mt-1 px-2 py-1 bg-[#0a0d10] border border-[#14181c] text-zinc-300 text-xs w-48"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void run()}
            className="px-4 py-2 font-mono text-[10px] border border-[#b6ff3a]/40 bg-[#b6ff3a]/10 text-[#b6ff3a] disabled:opacity-50"
          >
            HARMONIA COMPLETA
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void resetMotor()}
            className="px-4 py-2 font-mono text-[10px] border border-zinc-700 text-zinc-500 disabled:opacity-50"
            title="Liberta WebGPU, cache EcoNet e sonda CQR sem reinstalar o APK"
          >
            REINICIAR MOTOR
          </button>
        </div>
        <p className="mb-6 font-mono text-[9px] text-zinc-600 max-w-2xl">
          Segunda Harmonia no telemóvel: use REINICIAR MOTOR se falhar — não precisa reinstalar o APK após
          atualizar com <span className="text-zinc-500">npm run android:build:sovereign</span>.
        </p>

        {error && (
          <p className="mb-6 font-mono text-[10px] text-red-400 border border-red-500/30 p-3">{error}</p>
        )}

        {result && (
          <div className="space-y-4 font-mono text-[10px] text-zinc-400">
            <p className="text-[#b6ff3a]">{result.pipeline}</p>
            <p>harmony root: {result.harmonyRootHash.slice(0, 40)}…</p>
            <p className="text-[#6cf0ff]">
              teoria: {String(result.brunoTheory.theory)} · Ω={Number(result.brunoTheory.collapse_omega).toFixed(3)}{" "}
              · RCP splat={Number(result.brunoTheory.rcp_splat).toFixed(3)}
            </p>
            {level && (
              <p style={{ color: level.color }}>
                Verdade: {level.label} · STS{" "}
                {result.audit?.sts_light.skipped
                  ? "SKIP"
                  : result.audit?.sts_light.passed
                    ? "PASS"
                    : "FAIL"}
              </p>
            )}
            <p>
              Sandbox: <span className="text-[#b6ff3a]">{result.ghostDock.backend}</span> ·{" "}
              {result.ghostDock.sessionId.slice(0, 20)}… ({result.ghostDock.auditEvents} eventos)
            </p>
            {result.voidRunner && (
              <p>
                void-runner:{" "}
                {result.voidRunner.success
                  ? `OK · ${JSON.stringify(result.voidRunner.output).slice(0, 48)}…`
                  : `offline — ${result.voidRunner.error?.slice(0, 60) ?? "n/d"}`}
              </p>
            )}
            {result.serverManifest && (
              <p>
                manifesto servidor: {result.serverManifest.truthLevel ?? "—"} · exec{" "}
                {result.serverManifest.voidRunnerExecuted ? "sim" : "não"}
              </p>
            )}
            <p>
              Phantom Harvest:{" "}
              {result.phantomHarvest.ran
                ? `${result.phantomHarvest.imported} importados`
                : result.phantomHarvest.skippedReason ?? "—"}
            </p>
            {result.meshManifest && (
              <p>
                Malha NOSTR:{" "}
                {result.meshManifest.published
                  ? `publicado ${result.meshManifest.eventId?.slice(0, 16)}…`
                  : result.meshManifest.error ?? "falhou"}
              </p>
            )}
            {result.anchor && (
              <p>
                Anchor L2:{" "}
                {result.anchor.txHash
                  ? `tx ${result.anchor.txHash.slice(0, 18)}…`
                  : result.anchor.skippedReason ?? result.anchor.root?.slice(0, 18)}
              </p>
            )}
            <p>
              Higgs: {result.higgs.commits.length} commits · scar {result.higgs.scar.token.slice(0, 16)}… · deploy{" "}
              {result.phantom.deployed ? "OK" : "pendente"}
            </p>
            <p>Phantom: {result.phantom.wasmUri}</p>
            <p>paleo fóssil: {result.phantom.paleoFossilHash.slice(0, 24)}…</p>
            <p>
              PMU: {result.pmu.pqc.kemAlgorithm} + {result.pmu.pqc.dsaAlgorithm} · {result.pmu.totalCores} cores
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
