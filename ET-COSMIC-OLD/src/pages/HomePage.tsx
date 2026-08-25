import { useEffect, useState } from "react";
import { Link } from "wouter";
import { PageShell } from "./PageShell";

type PagesConfig = {
  hostedOn?: string;
  base?: string;
  url?: string;
  apiOrigin?: string | null;
  model?: string;
};

export default function HomePage() {
  const [cfg, setCfg] = useState<PagesConfig | null>(null);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    fetch(`${base}pages-config.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCfg)
      .catch(() => setCfg(null));
  }, [base]);

  return (
    <PageShell title="ET-COSMIC" eyebrow="Production · Protocol-First" showBack={false}>
      <Link
        href="/sabor-quantico"
        className="block -mt-2 mb-8 p-5 border border-[#00f0ff]/30 rounded-xl no-underline bg-gradient-to-br from-[#00f0ff]/10 to-transparent hover:border-[#00f0ff]/50 transition-colors group"
      >
        <p className="text-[10px] tracking-[0.35em] text-[#00f0ff]/90 uppercase">
          Novo · Sabor Quântico™
        </p>
        <p className="mt-2 font-sans text-lg text-zinc-100 group-hover:text-white transition-colors">
          Simulação soberana que o CFO audita
        </p>
        <p className="mt-1 text-[10px] text-zinc-500">
          Calculadora live · tier Builder · POOL-QUANTUM demo →
        </p>
      </Link>

      <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
        Shell soberano para GitLab Pages — mesh Protocol-First, WASM e APIs quando o backend
        estiver configurado.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <Link
          href="/products"
          className="block p-4 border border-[#b6ff3a]/30 rounded-lg no-underline hover:border-[#b6ff3a]/60 transition-colors"
        >
          <span className="text-xs text-[#b6ff3a]">Produtos</span>
          <p className="mt-1 text-[10px] text-zinc-600">10 SKUs · $SOV ou EUR · ativar agora</p>
        </Link>
        <Link
          href="/business"
          className="block p-4 border border-violet-500/30 rounded-lg no-underline hover:border-violet-500/60 transition-colors"
        >
          <span className="text-xs text-violet-300">Modelo de Negócio</span>
          <p className="mt-1 text-[10px] text-zinc-600">Sabor Quântico · receita · pricing</p>
        </Link>
        <Link
          href="/finance/payment"
          className="block p-4 border border-[#ffd700]/30 rounded-lg no-underline hover:border-[#ffd700]/60 transition-colors"
        >
          <span className="text-xs text-[#ffd700]">Pagamentos</span>
          <p className="mt-1 text-[10px] text-zinc-600">Lightning · NWC · sem KYC</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/mesh/liquidity"
          className="block p-4 border border-[#1a1f26] rounded-lg no-underline hover:border-[#b6ff3a]/40 transition-colors"
        >
          <span className="text-xs text-[#b6ff3a]">Liquidity Mesh</span>
          <p className="mt-1 text-[10px] text-zinc-600">DAT · SLA code-based · bootstrap</p>
        </Link>
        <Link
          href="/governance/sovereignty"
          className="block p-4 border border-[#1a1f26] rounded-lg no-underline hover:border-violet-500/40 transition-colors"
        >
          <span className="text-xs text-violet-300">Sovereignty</span>
          <p className="mt-1 text-[10px] text-zinc-600">Royalties · tesouraria · policy</p>
        </Link>
      </div>

      {cfg && (
        <div className="mt-10 p-4 border border-zinc-900 rounded text-[10px] text-zinc-600 space-y-1">
          <p>
            <span className="text-zinc-500">hosted:</span> {cfg.hostedOn ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">base:</span> {cfg.base ?? base}
          </p>
          <p>
            <span className="text-zinc-500">api:</span> {cfg.apiOrigin ?? "offline / Nostr"}
          </p>
        </div>
      )}

      <p className="mt-12 text-[10px] text-zinc-700">
        Dev full stack: <code className="text-zinc-500">npm run dev</code> · Deploy:{" "}
        <code className="text-zinc-500">npm run deploy:gitlab</code>
      </p>
    </PageShell>
  );
}
