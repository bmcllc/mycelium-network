/**
 * Roadmap PMU — implementação real: anchor L2 + malha NOSTR.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { PMU_ROADMAP, type RoadmapStatus } from "../pmu/pmuRoadmap";
import { buildPmuAnchorPayload, hasAnchorContract } from "../pmu/pmuGovernanceMesh";
import { fetchPmuAuditFull } from "../pmu/pmuAuditClient";
import {
  commitAuditToAnchor,
  computeAnchorRootFromPayload,
  fetchAnchorState,
  finalizeAnchorOnChain,
  type AnchorChainState,
} from "../pmu/pmuAnchorClient";
import {
  subscribePmuMeshManifests,
  type PmuMeshManifestEvent,
} from "../pmu/pmuMeshSubscriber";
import { getMeshNostrPublicKey } from "../pmu/pmuMeshIdentity";
import {
  getQuantumMode,
  probeQuantumServer,
  resetQuantumProbe,
} from "../crypto/quantumBridge";

const STATUS_STYLE: Record<RoadmapStatus, string> = {
  done: "text-[#b6ff3a]",
  partial: "text-amber-400",
  planned: "text-zinc-500",
};

export default function PmuRoadmapPanel() {
  const anchorConfigured = hasAnchorContract();
  const [chain, setChain] = useState<AnchorChainState | null>(null);
  const [meshEvents, setMeshEvents] = useState<PmuMeshManifestEvent[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [quantumMode, setQuantumMode] = useState(getQuantumMode());

  const refreshChain = useCallback(async () => {
    try {
      setChain(await fetchAnchorState());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void probeQuantumServer().then(() => setQuantumMode(getQuantumMode()));
    if (anchorConfigured) void refreshChain();
    const sub = subscribePmuMeshManifests((ev) => {
      setMeshEvents((prev) => [ev, ...prev].slice(0, 12));
    });
    return () => sub.close();
  }, [anchorConfigured, refreshChain]);

  const proposeFromAudit = async () => {
    setMsg(null);
    try {
      const audit = await fetchPmuAuditFull(2048);
      const payload = buildPmuAnchorPayload(audit);
      const root = computeAnchorRootFromPayload(payload);
      const { txHash } = await commitAuditToAnchor(payload);
      setMsg(`Proposta enviada: ${txHash.slice(0, 18)}… root ${root.slice(0, 14)}…`);
      await refreshChain();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const finalize = async () => {
    setMsg(null);
    try {
      const { txHash } = await finalizeAnchorOnChain();
      setMsg(`Finalizado: ${txHash.slice(0, 22)}…`);
      await refreshChain();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-10 max-w-3xl">
          <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">PMU</span>
          <h2 className="mt-4 font-sans font-light text-3xl text-zinc-100">
            Roadmap <span className="text-[#b6ff3a]">PMU</span>
          </h2>
          <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
            Motor: <span className="text-zinc-200">{quantumMode}</span> · malha pubkey{" "}
            <span className="text-zinc-500">{getMeshNostrPublicKey().slice(0, 20)}…</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetQuantumProbe();
                void probeQuantumServer(true).then(() => setQuantumMode(getQuantumMode()));
              }}
              className="px-3 py-1 font-mono text-[10px] border border-zinc-700 text-zinc-400"
            >
              SONDAR CQR
            </button>
            {anchorConfigured && (
              <>
                <button
                  type="button"
                  onClick={() => void refreshChain()}
                  className="px-3 py-1 font-mono text-[10px] border border-zinc-700 text-zinc-400"
                >
                  LER ANCHOR
                </button>
                <button
                  type="button"
                  onClick={() => void proposeFromAudit()}
                  className="px-3 py-1 font-mono text-[10px] border border-[#b6ff3a]/40 text-[#b6ff3a]"
                >
                  PROPOR ROOT (WALLET)
                </button>
                <button
                  type="button"
                  onClick={() => void finalize()}
                  className="px-3 py-1 font-mono text-[10px] border border-amber-500/40 text-amber-400"
                >
                  FINALIZAR ROOT
                </button>
              </>
            )}
          </div>
          {chain && (
            <p className="mt-2 font-mono text-[9px] text-zinc-600">
              on-chain: {chain.currentRoot.slice(0, 14)}… · pending{" "}
              {chain.pendingRoot.slice(0, 14)}… · updates {chain.updateCount}
            </p>
          )}
          {msg && <p className="mt-2 font-mono text-[10px] text-zinc-400">{msg}</p>}
        </div>

        <ul className="space-y-3 font-mono text-[10px] mb-12">
          {PMU_ROADMAP.map((item) => (
            <li
              key={item.id}
              className="border border-[#14181c] p-4 flex flex-wrap justify-between gap-2"
            >
              <div>
                <span className={STATUS_STYLE[item.status]}>{item.status.toUpperCase()}</span>
                <span className="text-zinc-300 ml-2">{item.title}</span>
                <p className="text-zinc-500 mt-1">{item.detail}</p>
              </div>
              {item.route && (
                <Link href={item.route} className="text-[#b6ff3a] hover:underline self-start">
                  abrir →
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div>
          <p className="font-mono text-[10px] text-zinc-500 mb-3">MANIFESTOS MALHA (live)</p>
          {meshEvents.length === 0 ? (
            <p className="text-zinc-600 text-[10px] font-mono">À espera de kind 31220 nos relays…</p>
          ) : (
            <ul className="space-y-2">
              {meshEvents.map((ev) => (
                <li key={ev.id} className="border border-[#14181c] p-2 text-zinc-400">
                  {ev.manifest.truth_level_id} · {ev.manifest.ghost_id} ·{" "}
                  {ev.manifest.harmony_root.slice(0, 20)}…
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
