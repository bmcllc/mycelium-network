import SectionHeader from "./SectionHeader";

const rows = [
  ["Zero identidade persistente", "GhostID destruído ao fechar sessão · CLT opcional entre sessões"],
  ["Conteúdo inacessível em trânsito", "QEL fragmenta em 3 shards · K=2 necessário para reconstituir"],
  ["Sem logs em disco", "RAM only · zero‑fill no encerramento de sessão"],
  ["Comunicação sem internet", "DistanceBridge: BLE · Wi‑Fi Direct · LoRa · HCN · DTN"],
  ["Resistência à censura", "Caminhos independentes (MDNF) · HCN torna bloqueio físico inviável"],
  ["Anti‑correlação temporal", "Rotas recalculadas a cada mensagem ou transação"],
  ["Indistinguibilidade de fundo", "ANIMUS se confunde com infraestrutura legítima (eBPF · LLMs · browsers)"],
  ["Sobrevivência pós‑ataque", "Teoria da percolação · R₀ > 3 · acima do limiar de conectividade global"],
];

export default function Guarantees() {
  return (
    <section className="relative border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="06"
          kicker="GARANTIAS"
          title={
            <>
              Privacidade <span className="italic text-zinc-500">e</span>{" "}
              <span className="text-[#b6ff3a]">resiliência</span> — por construção.
            </>
          }
        />

        <div className="border border-[#14181c]">
          {rows.map(([k, v], i) => (
            <div
              key={k}
              className={`grid grid-cols-12 gap-4 px-6 md:px-8 py-5 items-center group hover:bg-[#0a0d10] transition-colors ${
                i < rows.length - 1 ? "border-b border-[#14181c]" : ""
              }`}
            >
              <div className="col-span-1 font-mono text-xs text-zinc-700 group-hover:text-[#b6ff3a] transition-colors">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-span-12 md:col-span-4 font-mono text-sm text-zinc-100 tracking-[0.02em]">
                {k}
              </div>
              <div className="col-span-12 md:col-span-6 text-sm text-zinc-400 leading-relaxed">
                {v}
              </div>
              <div className="col-span-1 text-right">
                <span className="font-mono text-[10px] text-[#b6ff3a] tracking-[0.2em]">
                  ✓ OK
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
