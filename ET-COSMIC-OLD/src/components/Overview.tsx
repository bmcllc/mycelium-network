import SectionHeader from "./SectionHeader";

export default function Overview() {
  return (
    <section id="overview" className="relative border-b border-[#14181c]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="01"
          kicker="VISÃO GERAL"
          title={
            <>
              Três camadas evolutivas.{" "}
              <span className="italic text-zinc-500">Uma única doutrina:</span>{" "}
              <span className="text-[#b6ff3a]">indistinguibilidade.</span>
            </>
          }
          description={
            <>
              Nenhuma entidade vê a mensagem ou transação completa. Nenhum dado
              persiste em disco. A rede só pode ser desligada se toda a
              infraestrutura digital global for destruída.
            </>
          }
        />

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Big quote panel */}
          <div className="lg:col-span-7 bg-black p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="size-1.5 rounded-full bg-[#b6ff3a] pulse-soft" />
              <span className="tag">PRINCÍPIO FUNDAMENTAL</span>
            </div>
            <blockquote className="font-sans font-light text-2xl md:text-3xl text-zinc-200 leading-snug">
              <span className="text-[#b6ff3a] font-mono mr-2">"</span>
              Quando o dinheiro e a comunicação se tornam tão privados quanto um{" "}
              <span className="italic">pensamento</span>, o poder volta para as
              mãos de quem os gera.
              <span className="text-[#b6ff3a] font-mono ml-1">"</span>
            </blockquote>
            <div className="mt-10 grid grid-cols-3 gap-6 pt-8 border-t border-[#14181c]">
              {[
                ["7", "estratos do Animus"],
                ["3", "shards por mensagem"],
                ["0", "bytes em disco"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-mono text-4xl text-zinc-100">{n}</div>
                  <div className="tag mt-2">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stack list */}
          <div className="lg:col-span-5 bg-[#0a0d10] p-8 md:p-10">
            <div className="tag mb-8">STACK · TOP↓BOTTOM</div>
            <ol className="space-y-6">
              {[
                {
                  k: "L7",
                  t: "Hydra Pay / DEX / DeFi",
                  c: "#6cf0ff",
                },
                { k: "L6", t: "QEL Fragmentation Layer", c: "#b6ff3a" },
                { k: "L5", t: "GhostID + CLT identity", c: "#b6ff3a" },
                { k: "L4", t: "DistanceBridge transport", c: "#b6ff3a" },
                { k: "L3", t: "Sphinx + OHTTP routing", c: "#ff3ad9" },
                { k: "L2", t: "ANIMUS substrate (eBPF/SGX/WASM)", c: "#ff3ad9" },
                { k: "L1", t: "LLM null-space encoding", c: "#ff3ad9" },
              ].map((row) => (
                <li
                  key={row.k}
                  className="flex items-center gap-4 group"
                >
                  <span
                    className="font-mono text-xs w-9 text-zinc-600 group-hover:text-zinc-300 transition-colors"
                  >
                    {row.k}
                  </span>
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: row.c, boxShadow: `0 0 10px ${row.c}` }}
                  />
                  <span className="font-mono text-sm text-zinc-300 group-hover:text-white transition-colors">
                    {row.t}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-700">
                    OK
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
