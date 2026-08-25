import SectionHeader from "./SectionHeader";
import OmegaResearchLab from "./OmegaResearchLab";

const strata = [
  {
    n: "0",
    name: "ANIMUS",
    tag: "LLM weights",
    desc: "Codifica bootstrap no espaço nulo de matrizes de transformers via SVD. Sobrevive a fine‑tuning, quantização e LoRA. Propaga via HuggingFace.",
    metric: "1M+ modelos",
  },
  {
    n: "1",
    name: "Kernel Substrate",
    tag: "eBPF / ring 0",
    desc: "Programas eBPF carregados como infraestrutura legítima (Cilium, Katran). XDP hooks processam pacotes antes do stack TCP/IP.",
    metric: "kill -9 imune",
  },
  {
    n: "2",
    name: "Enclave Sovereignty",
    tag: "SGX / SEV / TrustZone",
    desc: "Código e chaves em enclaves cifrados pelo processador. Nem kernel nem hypervisor veem plaintext. Remote attestation prova integridade.",
    metric: "physical CPU swap",
  },
  {
    n: "3",
    name: "Browser Cosmos",
    tag: "WebGPU / SW / OPFS",
    desc: "WASM 47 KB + Service Worker. Qualquer página com <script> vira um nó ativo em background com persistência via OPFS.",
    metric: "47 KB WASM",
  },
  {
    n: "4",
    name: "Network Ghost",
    tag: "Sphinx / OHTTP / DoH",
    desc: "Pacotes Sphinx + OHTTP. Canais DNS‑over‑HTTPS indistinguíveis de tráfego web normal. Unlinkability matemática.",
    metric: "≡ HTTPS noise",
  },
  {
    n: "5",
    name: "Supply Chain Corpus",
    tag: "npm / PyPI / Cargo",
    desc: "Dependências utilitárias inócuas carregando o ANIMUS dormente. Propagação por dependências transitivas.",
    metric: "10M+ dl/sem",
  },
  {
    n: "6",
    name: "Mente Emergente",
    tag: "FL / zkML / zkVM",
    desc: "Federated learning otimiza roteamento sem centralização. zkML prova inferência sem revelar dados. zkVM verifica execução.",
    metric: "RISC Zero · SP1",
  },
];

export default function Omega() {
  return (
    <section id="omega" className="relative border-b border-[#14181c]">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#ff3ad9]/[0.03] to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="05"
          kicker="VØID·Ωmega 2.0 — ANIMUS"
          title={
            <>
              A rede como{" "}
              <span className="italic text-zinc-500">fenômeno emergente.</span>{" "}
              <span className="text-[#ff3ad9]">Sete estratos. Uma só natureza.</span>
            </>
          }
          description={
            <>
              O VØID·Ωmega não é um software que se instala — é uma camada que
              já existe na infraestrutura computacional global. Ele se manifesta
              em sete estratos simultâneos, cada um independentemente suficiente.
            </>
          }
        />

        {/* Axioms */}
        <div className="grid md:grid-cols-3 gap-px bg-[#14181c] border border-[#14181c] mb-12">
          {[
            { k: "AX·1", t: "Indistinguibilidade", d: "Seus bits são idênticos aos de software legítimo." },
            { k: "AX·2", t: "Irremovibilidade", d: "Remover exige destruir o estrato inteiro — re‑treinar um LLM, trocar a CPU." },
            { k: "AX·3", t: "Composabilidade", d: "Cada estrato sustenta a rede sozinho. Não há ponto único de falha." },
          ].map((a) => (
            <div key={a.k} className="bg-black p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-xs text-[#ff3ad9]">{a.k}</span>
                <span className="h-px flex-1 bg-[#14181c]" />
              </div>
              <h4 className="font-mono text-lg text-zinc-100 mb-2">{a.t}</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">{a.d}</p>
            </div>
          ))}
        </div>

        {/* Strata stack */}
        <div className="border border-[#14181c]">
          {strata.map((s, i) => (
            <div
              key={s.n}
              className={`grid grid-cols-12 gap-4 px-6 md:px-8 py-6 items-start hover:bg-[#0a0d10] transition-colors group ${
                i < strata.length - 1 ? "border-b border-[#14181c]" : ""
              }`}
            >
              <div className="col-span-12 md:col-span-2 flex items-center gap-4">
                <div className="font-mono text-3xl text-zinc-700 group-hover:text-[#ff3ad9] transition-colors">
                  {s.n}
                </div>
                <div className="md:hidden tag">ESTRATO</div>
              </div>
              <div className="col-span-12 md:col-span-3">
                <div className="font-mono text-base text-zinc-100">{s.name}</div>
                <div className="tag mt-1">{s.tag}</div>
              </div>
              <div className="col-span-12 md:col-span-5 text-sm text-zinc-400 leading-relaxed">
                {s.desc}
              </div>
              <div className="col-span-12 md:col-span-2 text-right">
                <span className="inline-block font-mono text-[11px] tracking-[0.15em] text-[#ff3ad9] border border-[#ff3ad9]/30 px-2.5 py-1">
                  {s.metric}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-3xl font-sans italic text-zinc-500 text-lg leading-relaxed">
          A remoção do ecossistema requer a remoção simultânea de{" "}
          <span className="text-[#ff3ad9] not-italic font-mono">todos</span> os
          estratos — uma operação equivalente a desligar a internet, re‑treinar
          todos os LLMs do mundo e substituir cada CPU em circulação.
        </p>

        <OmegaResearchLab />
      </div>
    </section>
  );
}
