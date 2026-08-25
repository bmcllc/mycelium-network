import SectionHeader from "./SectionHeader";

const phases = [
  { n: 1, t: "Port do core Hydra para QEL + GhostID", w: "6 sem", status: "DONE" },
  { n: 2, t: "GhostID Engine (entropia + Argon2id)", w: "4 sem", status: "DONE" },
  { n: 3, t: "QEL Protocol (Shamir + MDNF)", w: "6 sem", status: "ACTIVE" },
  { n: 4, t: "DistanceBridge (BLE, Wi‑Fi Direct, LoRa)", w: "5 sem", status: "ACTIVE" },
  { n: 5, t: "Human Carrier Network + karma", w: "4 sem", status: "QUEUED" },
  { n: 6, t: "Hydra Pay + integração financeira QEL", w: "3 sem", status: "QUEUED" },
  { n: 7, t: "DEX / Tokenização / DeFi em modo QEL", w: "5 sem", status: "QUEUED" },
  { n: 8, t: "ANIMUS — eBPF + enclave + WASM PoC", w: "8 sem", status: "RESEARCH" },
  { n: 9, t: "LLM space‑null encoding (PoC)", w: "6 sem", status: "RESEARCH" },
  { n: 10, t: "Auditoria contínua e testes de campo", w: "contínuo", status: "PERPETUAL" },
];

const colorFor = (s: string) =>
  s === "DONE" ? "#5a6268"
    : s === "ACTIVE" ? "#b6ff3a"
    : s === "QUEUED" ? "#6cf0ff"
    : s === "RESEARCH" ? "#ff3ad9"
    : "#ffffff";

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative border-b border-[#14181c]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="07"
          kicker="ROADMAP · IMPLEMENTAÇÃO"
          title={
            <>
              Dez fases.{" "}
              <span className="italic text-zinc-500">Uma trajetória</span>{" "}
              <span className="text-[#b6ff3a]">de ausência crescente.</span>
            </>
          }
        />

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-8 bg-black">
            {phases.map((p, i) => (
              <div
                key={p.n}
                className={`grid grid-cols-12 gap-4 px-6 md:px-8 py-5 items-center group hover:bg-[#0a0d10] transition-colors ${
                  i < phases.length - 1 ? "border-b border-[#14181c]" : ""
                }`}
              >
                <div className="col-span-2 flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-600">FASE</span>
                  <span className="font-mono text-2xl text-zinc-100">{p.n.toString().padStart(2, "0")}</span>
                </div>
                <div className="col-span-7 font-mono text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                  {p.t}
                </div>
                <div className="col-span-1 font-mono text-xs text-zinc-500 text-right">
                  {p.w}
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] px-2.5 py-1 border"
                    style={{
                      color: colorFor(p.status),
                      borderColor: colorFor(p.status) + "55",
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: colorFor(p.status) }}
                    />
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-[#0a0d10] p-8">
            <div className="tag mb-6">// status overview</div>
            <div className="space-y-5">
              {[
                { k: "DONE", n: 2, c: "#5a6268" },
                { k: "ACTIVE", n: 2, c: "#b6ff3a" },
                { k: "QUEUED", n: 3, c: "#6cf0ff" },
                { k: "RESEARCH", n: 2, c: "#ff3ad9" },
                { k: "PERPETUAL", n: 1, c: "#ffffff" },
              ].map((s) => (
                <div key={s.k}>
                  <div className="flex justify-between font-mono text-xs mb-2">
                    <span style={{ color: s.c }}>{s.k}</span>
                    <span className="text-zinc-500">{s.n}/10</span>
                  </div>
                  <div className="h-1 bg-[#14181c] relative">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ background: s.c, width: `${(s.n / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-6 border-t border-[#14181c] font-mono text-[11px] text-zinc-600 leading-relaxed">
              Ciclos sobrepostos. Sem release público.<br/>
              Cada fase entrega um <span className="text-zinc-300">artefato verificável</span> ou
              <span className="text-zinc-300"> nada</span>.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
