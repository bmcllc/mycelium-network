/**
 * VOID-700 + VOID-702 — Silent Mesh Hosting & Web Node Manager
 */

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import {
  activateSilentMeshOnPage,
  heartbeat,
  listMeshNodes,
  type SilentMeshNode,
} from "../silentMesh/voidMeshClient";
import { BROWSER_LIMITS, estimateCpuPct } from "../silentMesh/lscResourceGuard";

const EMBED_SNIPPET = `<script async src="/void-mesh.js" data-void-sku="VOID-700" data-void-compute="true"></script>`;

export default function SilentMeshHostingPanel() {
  const [nodes, setNodes] = useState<SilentMeshNode[]>([]);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [consent, setConsent] = useState({ compute: true, entropy: false, cdn: true });
  const [cpu, setCpu] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 12));

  const refresh = useCallback(async () => {
    try {
      setNodes(await listMeshNodes());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => setCpu(estimateCpuPct()), 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const activate = async () => {
    const id = await activateSilentMeshOnPage(consent);
    setNodeId(id);
    push(id ? `Nó browser ${id} activo` : "Service Worker indisponível");
    await refresh();
  };

  const ping = async () => {
    if (!nodeId) return;
    const h = await heartbeat(nodeId);
    push(`Heartbeat → ${h.action}${h.reason ? ` (${h.reason})` : ""}`);
  };

  return (
    <section className="space-y-8">
      <SectionHeader
        tag="VOID-700 · VOID-702"
        title="Propagação Silenciosa"
        subtitle="Cada site e cada VPS tornam-se nós da malha — sem AWS, sem parasitismo."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 border border-[#1a1f26] rounded-lg space-y-3">
          <h3 className="font-mono text-xs text-[#6cf0ff]">LIMITES LSC (VOID-180)</h3>
          <p className="text-[10px] text-zinc-500">
            Browser: CPU ≤ {BROWSER_LIMITS.cpuPctMax}%, RAM ≤ {BROWSER_LIMITS.ramMbMax} MB, ciclo idle 5 min.
            VPS: CPU ≤ 3%, RAM ≤ 64 MB (systemd).
          </p>
          <p className="font-mono text-sm text-zinc-300">CPU estimada: {cpu}%</p>
        </div>
        <div className="p-4 border border-[#1a1f26] rounded-lg space-y-3">
          <h3 className="font-mono text-xs text-[#b6ff3a]">CONSENTIMENTO</h3>
          {(["compute", "entropy", "cdn"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={consent[k]}
                onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))}
              />
              {k === "compute" && "Marketplace (VOID-520) em idle"}
              {k === "entropy" && "Sensores EaaS (VOID-521)"}
              {k === "cdn" && "Cache mesh CDN (VOID-701)"}
            </label>
          ))}
          <button
            type="button"
            onClick={() => void activate()}
            className="mt-2 px-3 py-2 font-mono text-xs bg-[#b6ff3a]/10 text-[#b6ff3a] border border-[#b6ff3a]/30 rounded"
          >
            Activar nó nesta página
          </button>
          {nodeId && (
            <button
              type="button"
              onClick={() => void ping()}
              className="ml-2 px-3 py-2 font-mono text-xs text-zinc-400 border border-zinc-700 rounded"
            >
              Heartbeat
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border border-[#1a1f26] rounded-lg">
        <h3 className="font-mono text-xs text-zinc-500 mb-2">EMBED (uma linha)</h3>
        <pre className="text-[10px] text-zinc-400 overflow-x-auto p-3 bg-black/40 rounded">{EMBED_SNIPPET}</pre>
        <p className="mt-2 text-[10px] text-zinc-600">
          VPS: <code className="text-zinc-500">curl -sSL https://get.eternet.app/void-node | bash</code> — ver{" "}
          <code>scripts/void-node-install.sh</code>
        </p>
      </div>

      <div className="p-4 border border-[#1a1f26] rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-mono text-xs text-zinc-400">NÓS NA MALHA ({nodes.length})</h3>
          <button type="button" onClick={() => void refresh()} className="font-mono text-[10px] text-zinc-500">
            Actualizar
          </button>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {nodes.map((n) => (
            <div key={n.nodeId} className="font-mono text-[10px] text-zinc-500 flex justify-between">
              <span>
                {n.nodeId} · {n.mode}
              </span>
              <span className="text-[#b6ff3a]">
                {(n.stats?.sovEarnedMicro ?? 0) / 1000} mSOV · {n.stats?.tasksCompleted ?? 0} jobs
              </span>
            </div>
          ))}
          {nodes.length === 0 && <p className="text-zinc-600 text-xs">Nenhum nó registado ainda.</p>}
        </div>
      </div>

      {log.length > 0 && (
        <pre className="font-mono text-[10px] text-zinc-600 p-3 bg-black/30 rounded max-h-32 overflow-y-auto">
          {log.join("\n")}
        </pre>
      )}
    </section>
  );
}
