import { getAttributionNotice } from "../protocol/sovereignty/etrnetSovereignty";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-[#14181c]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-5 border border-[#b6ff3a]/60 rotate-45" />
              <span className="font-mono text-sm tracking-[0.3em] text-zinc-100">
                VØID<span className="text-[#b6ff3a]">/</span>SYS
              </span>
            </div>
            <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
              Synthesis v1.0 · VØID · Hydra · Ωmega · ANIMUS.<br/>
              Edição br/acc — quando informação e valor se tornam indistinguíveis da infraestrutura.
            </p>
          </div>

          <div>
            <div className="tag mb-4">PROTOCOLOS</div>
            <ul className="space-y-2 font-mono text-xs text-zinc-400">
              <li><a href="#core" className="hover:text-[#b6ff3a]">GhostID</a></li>
              <li><a href="#core" className="hover:text-[#b6ff3a]">QEL</a></li>
              <li><a href="#bridge" className="hover:text-[#b6ff3a]">DistanceBridge</a></li>
              <li><a href="#hydra" className="hover:text-[#b6ff3a]">Hydra Pay</a></li>
              <li><a href="#omega" className="hover:text-[#b6ff3a]">Ωmega · ANIMUS</a></li>
            </ul>
          </div>

          <div>
            <div className="tag mb-4">REDE</div>
            <ul className="space-y-2 font-mono text-xs text-zinc-400">
              <li className="flex justify-between"><span>NODES</span><span className="text-[#b6ff3a]">47.241</span></li>
              <li className="flex justify-between"><span>CARRIERS</span><span className="text-[#b6ff3a]">12.847</span></li>
              <li className="flex justify-between"><span>SHARDS / s</span><span className="text-[#b6ff3a]">≈ 2.1k</span></li>
              <li className="flex justify-between"><span>R₀</span><span className="text-[#b6ff3a]">3.41</span></li>
              <li className="flex justify-between"><span>UPTIME</span><span className="text-[#b6ff3a]">∞</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#14181c] flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] text-zinc-600">
          <div className="max-w-xl leading-relaxed">
            {getAttributionNotice()}
            <span className="block mt-1 text-zinc-700">
              <a href="/governance/sovereignty" className="hover:text-[#b6ff3a] no-underline">
                Soberania & Royalties
              </a>
              {" · "}
              <a href="/DUAL-LICENSE.md" className="hover:text-[#b6ff3a] no-underline" target="_blank" rel="noreferrer">
                Licença dupla
              </a>
              {" · "}
              <a href="/CREDITS.md" className="hover:text-[#b6ff3a] no-underline" target="_blank" rel="noreferrer">
                Créditos
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>BUILD · 0xA91C4F</span>
            <span className="size-1.5 rounded-full bg-[#b6ff3a] pulse-soft" />
            <span className="text-[#b6ff3a]">SESSION · LIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
