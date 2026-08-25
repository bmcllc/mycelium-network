import { useState, useEffect } from "react";
import { loadOmegaMaterial, deriveHexId } from "../lib/moduleRealityBackend";

export default function Hero() {
  const [buildId, setBuildId] = useState("····");

  useEffect(() => {
    void loadOmegaMaterial(64).then(({ material }) => {
      setBuildId(deriveHexId(material, "build", 0, 5).toUpperCase());
    });
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-[#14181c]">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

      {/* radial halo */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-[#b6ff3a]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* meta line */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.25em] text-zinc-500 mb-10">
          <span className="text-[#b6ff3a]">◆ v1.0</span>
          <span>/</span>
          <span>SYNTHESIS · VØID · HYDRA · Ωmega</span>
          <span>/</span>
          <span className="text-[#6cf0ff]">br/acc</span>
          <span>/</span>
          <span>BUILD 0x{buildId}</span>
        </div>

        <h1 className="font-sans font-light text-[42px] md:text-[88px] leading-[0.95] tracking-tight text-zinc-100 mb-8">
          <span
            className="glitch font-mono font-bold text-[#b6ff3a]"
            data-text="VØID"
          >
            VØID
          </span>
          <span className="text-zinc-600"> / </span>
          <span className="italic font-light">when information &amp;</span>
          <br />
          <span className="italic font-light text-zinc-400">value become indistinguishable </span>
          <span className="text-zinc-100">from infrastructure.</span>
        </h1>

        <p className="max-w-2xl text-zinc-400 text-lg leading-relaxed mb-10">
          O ecossistema VØID é um conjunto de protocolos convergentes que tratam{" "}
          <span className="text-zinc-100">comunicação</span> e{" "}
          <span className="text-zinc-100">valor</span> como o mesmo fenômeno —
          fragmentados, roteados offline, sem identidade persistente, sem pontos
          centrais de controle.
        </p>

        <div className="flex flex-wrap gap-3 mb-16">
          <a
            href="#core"
            className="group inline-flex items-center gap-3 px-5 py-3 bg-[#b6ff3a] text-black font-mono text-xs tracking-[0.2em] hover:bg-white transition-colors"
          >
            EXPLORE_PROTOCOLS
            <span className="group-hover:translate-x-1 transition-transform">▸</span>
          </a>
          <a
            href="#manifesto"
            className="inline-flex items-center gap-3 px-5 py-3 border border-[#14181c] text-zinc-300 font-mono text-xs tracking-[0.2em] hover:border-[#b6ff3a]/40 hover:text-[#b6ff3a] transition-colors"
          >
            READ_MANIFESTO
          </a>
          <div className="inline-flex items-center gap-3 px-5 py-3 font-mono text-xs tracking-[0.2em] text-zinc-500 cursor">
            $ void --init
          </div>
        </div>

        {/* stack visualization */}
        <div className="grid md:grid-cols-3 gap-px bg-[#14181c] border border-[#14181c]">
          {[
            {
              tag: "01 · NÚCLEO",
              name: "VØID Messenger",
              desc: "Comunicação anônima P2P com GhostID, QEL e DistanceBridge.",
              color: "#b6ff3a",
            },
            {
              tag: "02 · FINANCEIRO",
              name: "Hydra v7.0+",
              desc: "Transações, tokenização, DEX e DeFi sobre a mesma pilha de anonimato.",
              color: "#6cf0ff",
            },
            {
              tag: "03 · ESTRATOS PROFUNDOS",
              name: "Ωmega / Animus",
              desc: "Simbiose com kernel, browsers, LLMs e enclaves — indistinguível do ambiente.",
              color: "#ff3ad9",
            },
          ].map((s) => (
            <div key={s.name} className="bg-black p-7 group hover:bg-[#0a0d10] transition-colors">
              <div className="flex items-center justify-between mb-6">
                <span className="tag">{s.tag}</span>
                <span
                  className="size-2 rounded-full pulse-soft"
                  style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }}
                />
              </div>
              <div className="font-mono text-2xl text-zinc-100 mb-3">{s.name}</div>
              <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
