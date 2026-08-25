import { useState } from "react";
import { ISOSSUPRA_DISCLAIMER_PT } from "../lib/anacrocasticLimits";
import { runIsossupraEngine, runIsossupraPipeline, fetchIsossupraStatus } from "../isossupra/isossupraClient";

type EngineId = "ising" | "thermal-qrng" | "acoustic" | "thomas-fermi" | "chaos-bell" | "vortex" | "homotopy" | "pipeline";

const ENGINES: { id: EngineId; label: string; sku: string }[] = [
  { id: "ising", label: "Ising Solver (VOID-500)", sku: "VOID-500" },
  { id: "thermal-qrng", label: "QRNG Térmico (VOID-501)", sku: "VOID-501" },
  { id: "acoustic", label: "Handshake Acústico (VOID-502)", sku: "VOID-502" },
  { id: "thomas-fermi", label: "Thomas-Fermi SDF (VOID-503)", sku: "VOID-503" },
  { id: "chaos-bell", label: "Chaos-Bell Auth (VOID-504)", sku: "VOID-504" },
  { id: "vortex", label: "Vortex Memory (VOID-505)", sku: "VOID-505" },
  { id: "homotopy", label: "Homotopy Compiler (VOID-506)", sku: "VOID-506" },
  { id: "pipeline", label: "Pipeline VOID-600", sku: "VOID-600" },
];

export default function IsossupraCorePanel() {
  const [engine, setEngine] = useState<EngineId>("ising");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const push = (line: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...prev].slice(0, 28));

  const run = async () => {
    setLoading(true);
    try {
      if (engine === "pipeline") {
        const r = await runIsossupraPipeline({ bits: 256, room: "etrnet:lab" });
        push(`Pipeline: thermal ${(r as { thermal?: { source?: string } }).thermal?.source}`);
        push((r as { disclaimer?: string }).disclaimer ?? "");
      } else if (engine === "vortex") {
        const r = await runIsossupraEngine("vortex", {
          action: "seal",
          secretId: "demo-1",
          payload: "ghost-secret",
          geometrySeed: "room-a",
        });
        push(`Vórtice selado: ${JSON.stringify(r).slice(0, 120)}…`);
      } else if (engine === "ising") {
        const r = await runIsossupraEngine<{ energy: number; supra: { shardCount: number } }>("ising", {
          n: 14,
          shardCount: 4,
        });
        push(`Max-Cut energy=${r.energy} shards=${r.supra?.shardCount}`);
      } else if (engine === "thomas-fermi") {
        const r = await runIsossupraEngine<{ bindingEnergyEV: number; molecule: string }>("thomas-fermi", {
          molecule: "H2",
        });
        push(`${r.molecule} binding≈${r.bindingEnergyEV?.toFixed(4)} eV`);
      } else if (engine === "thermal-qrng") {
        const r = await runIsossupraEngine<{ entropy_hex: string; hardware: boolean }>("thermal-qrng", {
          bits: 256,
        });
        push(`QRNG thermal hardware=${r.hardware} hex=${r.entropy_hex?.slice(0, 16)}…`);
      } else if (engine === "acoustic") {
        const r = await runIsossupraEngine<{ session: { key_hex: string } }>("acoustic", {
          room: "etrnet:lab",
        });
        push(`Sessão acústica key=${r.session?.key_hex?.slice(0, 16)}…`);
      } else if (engine === "homotopy") {
        const r = await runIsossupraEngine<{ paths: unknown[] }>("homotopy", {
          programId: "void-mapreduce",
        });
        push(`Homotopy paths=${r.paths?.length ?? 0}`);
      } else {
        const r = await runIsossupraEngine("chaos-bell", { seed: Date.now() % 10000 });
        push(`Chaos-Bell key=${(r as { session_key_hex?: string }).session_key_hex?.slice(0, 16)}…`);
      }
      const st = await fetchIsossupraStatus();
      push(`Core ${st.engine} — ${st.engines?.length ?? 0} motores`);
    } catch (e) {
      push(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
      push("Servidor offline? npm run server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <span className="tag text-violet-400/80 border-violet-900/40 bg-violet-950/20">VOID-600</span>
        <h2 className="font-sans font-light text-3xl text-zinc-100 mt-4">
          Isossupramulated <span className="text-violet-300/90 italic">Core</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2 max-w-2xl">{ISOSSUPRA_DISCLAIMER_PT}</p>

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2 max-h-[420px] overflow-y-auto">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEngine(e.id)}
                className={`w-full text-left px-4 py-2 border font-mono text-[10px] ${
                  engine === e.id
                    ? "border-violet-600/50 bg-violet-950/20 text-violet-200"
                    : "border-[#1a1f26] text-zinc-500 hover:border-[#2a2f36]"
                }`}
              >
                {e.label}
              </button>
            ))}
            <button
              type="button"
              disabled={loading}
              onClick={run}
              className="w-full mt-4 py-3 border border-violet-700/40 text-violet-200 font-mono text-xs hover:bg-violet-950/30 disabled:opacity-40"
            >
              {loading ? "Executando…" : "Executar motor"}
            </button>
          </div>
          <pre className="lg:col-span-2 border border-[#1a1f26] bg-[#0a0c0e] p-4 font-mono text-[10px] text-zinc-400 min-h-[280px] overflow-auto">
            {log.length ? log.join("\n") : "Selecione um motor VOID-500–506 ou pipeline VOID-600."}
          </pre>
        </div>
      </div>
    </section>
  );
}
