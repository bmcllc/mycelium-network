import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  VOID_PRODUCTS,
  VOID_STACK_LAYERS,
  VOID_SOVEREIGN_DISCLAIMER,
  VOID_SOVEREIGN_LICENSE,
} from "../void/sovereignStack";
import {
  fetchVoidStackStatus,
  solveBridgeIsing,
  pciHandshake,
  pciRespond,
  meshRegister,
} from "../void/voidStackClient";

type Tab = "overview" | "bridge" | "pci" | "mesh";

export default function VoidSovereignStackPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const push = (line: string) =>
    setLog((p) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...p].slice(0, 20));

  useEffect(() => {
    fetchVoidStackStatus()
      .then((s) => setStatus(s as Record<string, unknown>))
      .catch(() => push("API /api/void offline — inicie npm run server"));
  }, []);

  const runBridge = async () => {
    setLoading(true);
    try {
      const r = await solveBridgeIsing({ n: 12, shardCount: 3 });
      push(`BRIDGE energy=${JSON.stringify((r as { solution?: { energy?: number } }).solution?.energy)}`);
    } catch (e) {
      push(`BRIDGE erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const runPci = async () => {
    setLoading(true);
    try {
      const h = (await pciHandshake("peer-demo")) as { sessionId?: string };
      const r = await pciRespond(h.sessionId ?? "", {
        latencyMs: 95,
        jitterProfile: [12, 14, 11, 13, 15],
      });
      push(`PCI verdict=${JSON.stringify((r as { integrity?: { verdict?: string } }).integrity?.verdict)}`);
    } catch (e) {
      push(`PCI erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const runMesh = async () => {
    setLoading(true);
    try {
      const r = await meshRegister({
        ghostId: `browser-${Date.now().toString(36)}`,
        capabilities: ["ising", "cdn"],
      });
      push(`MESH node=${JSON.stringify((r as { nodeId?: string }).nodeId)}`);
    } catch (e) {
      push(`MESH erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <header className="relative overflow-hidden border border-[#b6ff3a]/25 bg-[#0a0d10] p-8 md:p-10 rounded-sm">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 80% 10%, rgba(139,92,246,0.2), transparent), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(59,130,246,0.15), transparent)",
          }}
        />
        <div className="relative">
          <span className="tag text-[#b6ff3a]">VOID / ETERNET · SOBERANIA AGPL</span>
          <h1 className="text-3xl md:text-4xl font-sans font-light text-white mt-3">
            VOID Sovereign Stack
          </h1>
          <p className="text-zinc-500 text-sm mt-3 max-w-2xl leading-relaxed">
            Anacroclastia × Isossupramulação — três destruições, uma rede, um substrato.
            Licença <span className="text-[#6cf0ff] font-mono">{VOID_SOVEREIGN_LICENSE}</span>.
          </p>
          <p className="text-zinc-600 text-xs mt-4 font-mono max-w-3xl">{VOID_SOVEREIGN_DISCLAIMER}</p>
        </div>
      </header>

      {/* Camadas */}
      <section className="grid md:grid-cols-3 gap-3">
        {VOID_STACK_LAYERS.map((L) => (
          <div
            key={L.id}
            className="p-5 border border-zinc-900 bg-black/50 rounded-sm"
            style={{ borderTopColor: L.color, borderTopWidth: 3 }}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{L.label}</div>
            <div className="text-white text-sm mt-1">{L.subtitle}</div>
            <ul className="mt-3 space-y-1">
              {L.components.map((c) => (
                <li key={c} className="text-[11px] font-mono text-zinc-500">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Tabs produto */}
      <div className="flex flex-wrap gap-2 font-mono text-xs">
        {(["overview", "bridge", "pci", "mesh"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 border transition-smooth uppercase tracking-wider ${
              tab === t
                ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/5"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          {VOID_PRODUCTS.map((p) => (
            <article
              key={p.id}
              className="p-6 border border-zinc-900 bg-[#0a0d10] hover:border-[#b6ff3a]/30 transition-smooth"
            >
              <h3 className="font-mono text-[#b6ff3a] text-sm">{p.id}</h3>
              <p className="text-white text-lg mt-2 font-light">{p.tagline}</p>
              <p className="text-zinc-600 text-xs mt-3">
                <span className="text-red-400/80">Ídolo:</span> {p.idol}
              </p>
              <p className="text-zinc-500 text-xs mt-2">
                <span className="text-[#6cf0ff]">ISO:</span> {p.iso}
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                <span className="text-[#8b5cf6]">SUPRA:</span> {p.supra}
              </p>
              <Link href={p.path} className="inline-block mt-4 text-[10px] font-mono text-[#6cf0ff] hover:underline">
                {p.path} →
              </Link>
            </article>
          ))}
        </div>
      )}

      {tab === "bridge" && (
        <ProductDemo
          title="VOID-BRIDGE"
          desc="Parallel Tempering clássico — QUBO/Ising sem fila IBM."
          onRun={runBridge}
          loading={loading}
          link="/lab/sku-cosmos"
          linkLabel="Mapa SKU Cosmos"
        />
      )}
      {tab === "pci" && (
        <ProductDemo
          title="VOID-PCI"
          desc="PEFB — desafio físico + latência/jitter. Paridade funcional com QKD."
          onRun={runPci}
          loading={loading}
          link="/crypto/ghostid"
          linkLabel="GhostID + entropia"
        />
      )}
      {tab === "mesh" && (
        <ProductDemo
          title="VOID-MESH"
          desc="Silent Mesh — site/VPS como nó. Ganhe $SOV."
          onRun={runMesh}
          loading={loading}
          link="/network/silent-hosting"
          linkLabel="Silent Mesh Hosting"
        />
      )}

      {status && (
        <pre className="text-[10px] font-mono text-zinc-600 bg-black border border-zinc-900 p-4 overflow-x-auto rounded-sm">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}

      <div className="border border-zinc-900 bg-black p-4 font-mono text-[10px] text-zinc-500 max-h-40 overflow-y-auto">
        {log.length === 0 ? "Log da stack…" : log.map((l) => <div key={l}>{l}</div>)}
      </div>

      <footer className="text-center text-xs text-zinc-600 italic">
        Um núcleo · uma linha de HTML · três serviços ·{" "}
        <Link href="/finance/sov-economy" className="text-[#6cf0ff] hover:underline">
          economia $SOV
        </Link>
      </footer>
    </div>
  );
}

function ProductDemo({
  title,
  desc,
  onRun,
  loading,
  link,
  linkLabel,
}: {
  title: string;
  desc: string;
  onRun: () => void;
  loading: boolean;
  link: string;
  linkLabel: string;
}) {
  return (
    <div className="p-6 border border-zinc-900 bg-[#0a0d10] space-y-4">
      <h3 className="font-mono text-[#b6ff3a]">{title}</h3>
      <p className="text-zinc-500 text-sm">{desc}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onRun}
          className="px-5 py-2 bg-[#b6ff3a] text-black font-mono text-xs disabled:opacity-50"
        >
          {loading ? "…" : "EXECUTAR DEMO"}
        </button>
        <Link href={link} className="px-5 py-2 border border-zinc-700 text-zinc-400 font-mono text-xs hover:border-[#b6ff3a]/40">
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}
