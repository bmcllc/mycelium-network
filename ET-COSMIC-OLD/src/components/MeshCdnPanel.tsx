/**
 * VOID-701 — Mesh CDN (sites estáticos na malha)
 */

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { listCdnSites, publishCdnSite } from "../silentMesh/voidMeshClient";

export default function MeshCdnPanel() {
  const [sites, setSites] = useState<Array<{ siteId: string; name: string; gatewayPath: string }>>([]);
  const [name, setName] = useState("");
  const [paths, setPaths] = useState("/index.html\n/manifest.json");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSites(await listCdnSites());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publish = async () => {
    const manifest = paths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const out = await publishCdnSite(name || "Site", manifest);
    setMsg(`Publicado ${out.siteId} → ${out.gatewayPath}`);
    setName("");
    await refresh();
  };

  return (
    <section className="space-y-8">
      <SectionHeader
        tag="VOID-701"
        title="Mesh CDN"
        subtitle="Sites estáticos servidos pela malha — o VPS só entrega o script inicial."
      />

      <div className="p-4 border border-[#1a1f26] rounded-lg space-y-4">
        <input
          className="w-full bg-black/40 border border-zinc-800 rounded px-3 py-2 font-mono text-xs text-zinc-300"
          placeholder="Nome do site"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="w-full h-24 bg-black/40 border border-zinc-800 rounded px-3 py-2 font-mono text-[10px] text-zinc-400"
          value={paths}
          onChange={(e) => setPaths(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void publish()}
          className="px-4 py-2 font-mono text-xs bg-[#6cf0ff]/10 text-[#6cf0ff] border border-[#6cf0ff]/30 rounded"
        >
          Publicar na malha
        </button>
        {msg && <p className="text-[10px] text-[#b6ff3a]">{msg}</p>}
      </div>

      <div className="space-y-2">
        {sites.map((s) => (
          <div
            key={s.siteId}
            className="p-3 border border-[#1a1f26] rounded flex justify-between font-mono text-[10px]"
          >
            <span className="text-zinc-300">{s.name}</span>
            <code className="text-zinc-600">{s.gatewayPath}</code>
          </div>
        ))}
        {sites.length === 0 && (
          <p className="text-zinc-600 text-xs">Nenhum site na malha. O cache distribuído activa com VOID-700 nos visitantes.</p>
        )}
      </div>
    </section>
  );
}
