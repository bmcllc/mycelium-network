/**
 * Landing IMC v2.0 — foco único: Mesh Computer (sem marketing legado).
 */
import { Link } from "wouter";
import {
  categories,
  getCategoryHubPath,
  getRoutesByCategory,
  routes,
  b2bRouteMeta,
} from "./router";
import { CRITICAL_PROBLEM_SKUS } from "./b2b/imcSkuLineage";
import PanelTierBadge from "./components/PanelTierBadge";
import { V1_PRODUCTION_PATHS } from "./panelTiers";

function CategorySection({
  category,
}: {
  category: { id: string; label: string; icon: string; color: string; description: string };
}) {
  const categoryRoutes = getRoutesByCategory(category.id);
  if (categoryRoutes.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link
          href={getCategoryHubPath(category.id)}
          className="flex items-center gap-3 no-underline group flex-1 min-w-0"
        >
          <div
            className="w-8 h-8 rounded border flex items-center justify-center shrink-0"
            style={{ borderColor: `${category.color}40`, background: `${category.color}10` }}
          >
            <svg className="w-4 h-4" style={{ color: category.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={category.icon} />
            </svg>
          </div>
          <div>
            <h3 className="font-mono text-sm text-zinc-200 group-hover:text-white">{category.label}</h3>
            <p className="text-[10px] text-zinc-600">{category.description}</p>
          </div>
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryRoutes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className="group block p-4 border border-[#1a1f26] rounded-lg hover:border-[#2a2f36] no-underline transition-all"
            style={{ borderLeftColor: category.color, borderLeftWidth: 3 }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-zinc-200 group-hover:text-[#b6ff3a]">{route.label}</span>
              {(V1_PRODUCTION_PATHS as readonly string[]).includes(route.path) && (
                <PanelTierBadge path={route.path} />
              )}
            </div>
            <div className="text-[9px] text-zinc-600 line-clamp-2 leading-relaxed mt-0.5">{route.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function B2bMinimalLanding() {
  const activeCats = categories.filter((c) => getRoutesByCategory(c.id).length > 0);
  return (
    <div className="scanlines noise min-h-screen text-zinc-300 bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <span className="tag">IMC v2.0</span>
        <h1 className="mt-4 font-sans font-light text-3xl text-zinc-100">{routes.length} módulos</h1>
        <p className="mt-2 text-sm text-zinc-500 font-mono">{b2bRouteMeta.label}</p>
        <Link href="/compute/imc" className="inline-block mt-6 px-6 py-3 border border-violet-700/50 text-violet-200 font-mono text-xs no-underline hover:bg-violet-950/30">
          Abrir IMC Core →
        </Link>
        <div className="mt-10 space-y-8">
          {activeCats.map((cat) => (
            <div key={cat.id}>
              <h2 className="font-mono text-[10px] tracking-wider uppercase mb-3" style={{ color: cat.color }}>
                {cat.label}
              </h2>
              <div className="grid gap-2">
                {getRoutesByCategory(cat.id).map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    className="flex items-center justify-between p-4 border border-[#1a1f26] rounded-lg hover:border-[#2a2f36] no-underline"
                    style={{ borderLeftColor: cat.color, borderLeftWidth: 3 }}
                  >
                    <span className="font-mono text-sm text-zinc-200">{route.label}</span>
                    <span className="text-[10px] font-mono text-zinc-600">{route.path}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketingLanding() {
  const activeCats = categories.filter((c) => getRoutesByCategory(c.id).length > 0);
  return (
    <div className="scanlines noise min-h-screen text-zinc-300 bg-black">
      <header className="border-b border-[#14181c] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <span className="tag text-violet-400/80">ETERNET · Whitepaper v2.0</span>
          <h1 className="mt-4 font-sans font-light text-4xl md:text-5xl text-zinc-100">
            Um dispositivo. <span className="italic text-violet-300/90">Um supercomputador anacróclasta.</span>
          </h1>
          <p className="mt-4 text-zinc-500 max-w-2xl text-sm leading-relaxed">
            Sem qubits. Sem laboratório. Microfone, câmera e malha Nostr transformados em entropia certificável,
            otimização útil e chaves da sala — com taxa de protocolo transparente.
          </p>
          <Link
            href="/compute/imc"
            className="inline-block mt-6 px-8 py-4 bg-violet-950/40 border border-violet-600/40 text-violet-100 font-mono text-sm no-underline hover:border-violet-400/60"
          >
            Entrar no IMC →
          </Link>
        </div>
      </header>

      <section className="border-b border-[#14181c] bg-[#0a0c0e]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-6">Problemas que ninguém resolveu — até agora</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {CRITICAL_PROBLEM_SKUS.map((p) => (
              <div key={p.id} className="p-4 border border-[#1a1f26] rounded-lg">
                <span className="font-mono text-[9px] text-violet-400">{p.sku} · {p.severity}</span>
                <p className="text-zinc-300 text-sm mt-2 font-medium">{p.problem}</p>
                <p className="text-zinc-600 text-xs mt-2">{p.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-zinc-500 text-sm mb-12 font-mono">{routes.length} módulos · build {b2bRouteMeta.label}</p>
        {activeCats.map((cat) => (
          <CategorySection key={cat.id} category={cat} />
        ))}
      </main>
    </div>
  );
}
