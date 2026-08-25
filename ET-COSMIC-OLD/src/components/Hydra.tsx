import SectionHeader from "./SectionHeader";
import DoubleSpendDefenseLab from "./DoubleSpendDefenseLab";
import TemporalOracleLab from "./TemporalOracleLab";

export default function Hydra() {
  return (
    <section id="hydra" className="relative border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeader
          index="04"
          kicker="HYDRA v7.0 — FINANCIAL LAYER"
          title={
            <>
              <span className="text-[#6cf0ff]">Hydra v7.0</span>{" "}
              <span className="italic text-zinc-500">— finanças</span> invisíveis.
            </>
          }
          description="Hydra herda toda a pilha VØID e adiciona camadas financeiras: carteiras efêmeras, ordens fragmentadas, pagamentos offline, tokenização e DeFi — tudo sob a mesma doutrina de zero‑identidade."
        />

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c] mb-px">
          {/* Wallet card */}
          <div className="lg:col-span-5 bg-black p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-48 bg-gradient-to-bl from-[#6cf0ff]/10 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="tag">EPHEMERAL WALLET</div>
                <span className="font-mono text-[10px] text-[#6cf0ff]">SESSION_LIVE</span>
              </div>
              <div className="font-mono text-[11px] text-zinc-500 mb-2">handle</div>
              <div className="font-mono text-lg text-zinc-100 mb-8 break-all">
                void_◆_a91c4f7e3b2d8901
              </div>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="font-mono text-[11px] text-zinc-500 mb-2">balance · ∑ utxo</div>
                  <div className="font-sans text-4xl text-zinc-100">
                    ◆ 12.847<span className="text-zinc-600">,2940</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px] text-zinc-500 mb-2">commit</div>
                  <div className="font-mono text-xs text-[#b6ff3a]">pedersen·OK</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="font-mono text-xs tracking-[0.2em] py-3 bg-[#b6ff3a] text-black hover:bg-white transition-colors">
                  PAY ▸
                </button>
                <button className="font-mono text-xs tracking-[0.2em] py-3 border border-[#14181c] text-zinc-300 hover:border-[#6cf0ff]/40 hover:text-[#6cf0ff] transition-colors">
                  RECEIVE
                </button>
              </div>
              <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
                ⚠ session ends → wallet zero‑filled.<br/>
                no recovery. no seed. no log.
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="lg:col-span-7 bg-[#0a0d10] p-8 md:p-10">
            <div className="tag mb-6">v6.0 → v7.0 · MIGRATION</div>
            <div className="space-y-px">
              {[
                ["Identidade", "carteira persistente", "GhostID efêmero (destruído ao fechar)"],
                ["Privacidade", "stealth addr + ZK", "fragmentação QEL (3 shards)"],
                ["Offline", "local (≤ 100 m)", "global (HCN, LoRa, DTN)"],
                ["Persistência", "SQLite cifrado", "RAM only · zero disco"],
                ["Criptografia", "Ed25519 + AES", "PQC: ML‑KEM‑1024 + ML‑DSA‑87"],
                ["Ordem em DEX", "broadcast pública", "matchmaking fragmentado"],
              ].map(([k, a, b]) => (
                <div
                  key={k}
                  className="grid grid-cols-12 gap-4 py-4 border-b border-[#14181c] items-center"
                >
                  <div className="col-span-3 font-mono text-xs text-zinc-500 tracking-[0.1em]">
                    {k}
                  </div>
                  <div className="col-span-4 font-mono text-sm text-zinc-600 line-through decoration-[#ff3ad9]/40">
                    {a}
                  </div>
                  <div className="col-span-1 text-center text-[#b6ff3a]">→</div>
                  <div className="col-span-4 font-mono text-sm text-zinc-100">
                    {b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Double-Spend Defense Laboratory Section */}
        <div className="mb-12">
          <DoubleSpendDefenseLab />
        </div>

        {/* Temporal Intent Oracle — Latência DeFi */}
        <div className="mb-12">
          <TemporalOracleLab />
        </div>

        {/* features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#14181c] border-x border-b border-[#14181c]">
          {[
            { t: "Hydra Pay", d: "QR / BLE / cartão fantasma. Pagamentos offline com GhostID de sessão." },
            { t: "Tokenização", d: "Emissão de ativos ERC‑3643 / ERC‑1400 em modo anônimo." },
            { t: "DEX QEL", d: "Order book com matchmaking fragmentado. Sem MEV, sem front‑run." },
            { t: "Yield Aggregator", d: "Proxy de privacidade para depósitos em protocolos DeFi." },
          ].map((f) => (
            <div key={f.t} className="bg-black p-7 hover:bg-[#0a0d10] transition-colors">
              <div className="size-8 mb-5 border border-[#6cf0ff]/40 rotate-45 flex items-center justify-center">
                <div className="size-2 bg-[#6cf0ff] rounded-full -rotate-45" />
              </div>
              <h4 className="font-mono text-base text-zinc-100 mb-2">{f.t}</h4>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
