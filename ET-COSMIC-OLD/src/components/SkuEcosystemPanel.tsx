import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SKU_CATALOG } from "../b2b/skuCatalog.generated";
import {
  ECOSYSTEM_LAYERS,
  buildAdaptedCatalogEntry,
  getSuccessor,
  type SkuEra,
} from "../b2b/imcSkuAdaptation";
import { SKU_LINEAGE } from "../b2b/imcSkuLineage";

const ERA_META: Record<
  SkuEra,
  { label: string; color: string; bg: string }
> = {
  foundation: { label: "Fundação", color: "#a3a3a3", bg: "rgba(163,163,163,0.12)" },
  trust: { label: "Confiança", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  finance: { label: "Finanças", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  mesh: { label: "Malha", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  arsenal: { label: "Arsenal IMC", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  economy: { label: "Economia SOV", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  lab: { label: "Lab", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  vault: { label: "Vault", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  terminal: { label: "Terminal", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  ops: { label: "Ops / OEM", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  retired: { label: "Precursor", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

const LAYER_SKU_FILTER: Record<string, (id: string, era: SkuEra) => boolean> = {
  foundation: (_, era) => era === "foundation",
  body: (id, era) => era === "mesh" || /^VOID-(40|41|42|43|44|45|700|701|702)$/.test(id),
  arsenal: (id, era) =>
    era === "arsenal" || /^VOID-(5[0-2][0-9]|600)$/.test(id),
  economy: (id, era) =>
    era === "economy" || /^VOID-(520|703|704|705|710)$/.test(id),
  surface: (id, era) =>
    ["trust", "finance", "vault", "terminal", "lab"].includes(era) &&
    !/^VOID-(5[0-2][0-9]|600|700|701|702|703|704|705|710)$/.test(id),
};

function voidNum(id: string): number {
  if (!id.startsWith("VOID-")) return 99999;
  const n = parseInt(id.slice(5), 16);
  return Number.isNaN(n) ? 99999 : n;
}

export default function SkuEcosystemPanel() {
  const [query, setQuery] = useState("");
  const [eraFilter, setEraFilter] = useState<SkuEra | "all">("all");
  const [layerFilter, setLayerFilter] = useState<string | "all">("all");

  const adapted = useMemo(
    () =>
      SKU_CATALOG.filter((s) => s.id.startsWith("VOID-")).map((s) =>
        buildAdaptedCatalogEntry(s.id, s.name, s.path ?? s.legacyPath),
      ),
    [],
  );

  const stats = useMemo(() => {
    const byEra: Partial<Record<SkuEra, number>> = {};
    let withRoute = 0;
    let migrated = 0;
    let retired = 0;
    for (const s of adapted) {
      byEra[s.era] = (byEra[s.era] ?? 0) + 1;
      if (s.path) withRoute++;
      if (SKU_LINEAGE[s.id] || s.successor) retired++;
    }
    const layers = ECOSYSTEM_LAYERS.map((L) => ({
      ...L,
      skuCount: adapted.filter((s) => LAYER_SKU_FILTER[L.id]?.(s.id, s.era)).length,
    }));
    return { byEra, withRoute, migrated, retired, layers, total: adapted.length };
  }, [adapted]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adapted
      .filter((s) => {
        if (eraFilter !== "all" && s.era !== eraFilter) return false;
        if (layerFilter !== "all") {
          const fn = LAYER_SKU_FILTER[layerFilter];
          if (fn && !fn(s.id, s.era)) return false;
        }
        if (!q) return true;
        return (
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.tagline.toLowerCase().includes(q) ||
          (s.path?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => voidNum(a.id) - voidNum(b.id));
  }, [adapted, query, eraFilter, layerFilter]);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
      <header className="relative overflow-hidden rounded-sm border border-[#b6ff3a]/20 bg-[#0a0d10] p-8 md:p-12">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(182,255,58,0.15), transparent 50%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(59,130,246,0.12), transparent)",
          }}
        />
        <div className="relative">
          <span className="tag text-[#b6ff3a]">ERA IMC v2 · SEM EMULAÇÃO QUÂNTICA</span>
          <h1 className="text-3xl md:text-4xl font-sans font-light text-white mt-4">
            SKU Cosmos
          </h1>
          <p className="text-zinc-500 text-sm mt-3 max-w-2xl leading-relaxed">
            Mapa vivo de {stats.total} produtos VOID adaptados: nomes IMC, rotas{" "}
            <code className="text-[#6cf0ff]">/lab/*</code> e{" "}
            <code className="text-[#6cf0ff]">/vault/*</code>, linhagem de precursores e
            camadas do ecossistema soberano.
          </p>
          <div className="flex flex-wrap gap-4 mt-8 font-mono text-xs">
            <StatChip label="SKUs" value={String(stats.total)} accent="#b6ff3a" />
            <StatChip label="Com rota UI" value={String(stats.withRoute)} accent="#6cf0ff" />
            <StatChip label="Linhagem" value={String(stats.retired)} accent="#8b5cf6" />
            <StatChip label="Bundles B2B" value={String(SKU_CATALOG.length - stats.total)} accent="#10b981" />
          </div>
        </div>
      </header>

      {/* Cinco camadas */}
      <section>
        <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase mb-4">
          Cinco camadas (visão Jobs)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.layers.map((L) => (
            <button
              key={L.id}
              type="button"
              onClick={() =>
                setLayerFilter((prev) => (prev === L.id ? "all" : L.id))
              }
              className={`text-left p-4 border rounded-sm transition-smooth ${
                layerFilter === L.id
                  ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/5"
                  : "border-zinc-800 hover:border-zinc-600 bg-black/40"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full mb-3"
                style={{ backgroundColor: L.color }}
              />
              <div className="text-white text-sm font-medium">{L.label}</div>
              <div className="text-2xl font-mono text-[#b6ff3a] mt-1">{L.skuCount}</div>
              <div className="text-[10px] text-zinc-600 mt-1 font-mono">{L.range}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="search"
          placeholder="Buscar VOID-XX, nome, rota, tagline…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-black border border-zinc-800 px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:border-[#b6ff3a]/40 outline-none"
        />
        <select
          value={eraFilter}
          onChange={(e) => setEraFilter(e.target.value as SkuEra | "all")}
          className="bg-black border border-zinc-800 px-4 py-3 text-sm text-zinc-300 font-mono min-w-[160px]"
        >
          <option value="all">Todas as eras</option>
          {(Object.keys(ERA_META) as SkuEra[]).map((era) => (
            <option key={era} value={era}>
              {ERA_META[era].label} ({stats.byEra[era] ?? 0})
            </option>
          ))}
        </select>
      </div>

      <p className="text-zinc-600 text-xs font-mono">
        {filtered.length} SKUs · AGPL-3.0 · malha VOID-700 · economia SOV
      </p>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((s) => {
          const meta = ERA_META[s.era];
          const succ = s.successor ?? SKU_LINEAGE[s.id]?.successor ?? getSuccessor(s.id);
          return (
            <article
              key={s.id}
              className="group border border-zinc-900 bg-[#0a0d10] p-4 hover:border-[#b6ff3a]/30 transition-smooth rounded-sm flex flex-col min-h-[140px]"
              style={{ boxShadow: `inset 3px 0 0 ${meta.color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[#b6ff3a] text-xs">{s.id}</span>
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
              </div>
              <h3 className="text-white text-sm mt-2 font-medium leading-snug group-hover:text-[#b6ff3a] transition-colors">
                {s.name}
              </h3>
              <p className="text-zinc-600 text-[11px] mt-2 leading-relaxed flex-1">
                {s.tagline}
              </p>
              {succ && (
                <p className="text-[10px] font-mono text-zinc-500 mt-2">
                  → <span className="text-[#8b5cf6]">{succ}</span>
                </p>
              )}
              {s.path ? (
                <Link
                  href={s.path}
                  className="mt-3 text-[10px] font-mono text-[#6cf0ff] hover:underline truncate"
                >
                  {s.path}
                </Link>
              ) : (
                <span className="mt-3 text-[10px] font-mono text-zinc-700">infra / bundle</span>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zinc-500 py-16 font-mono text-sm">
          Nenhum SKU — limpe os filtros.
        </p>
      )}

      <footer className="p-6 border border-zinc-900 text-zinc-600 text-xs leading-relaxed italic text-center">
        Precursores em vermelho apontam para motores IMC 510–522 e malha 700–710. O catálogo
        é gerado de docs/B2B-PRODUCT-LINES.md com adaptação automática (sem /quantum/*).
      </footer>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="px-4 py-2 border border-zinc-800 bg-black/60">
      <div className="text-zinc-600 uppercase tracking-widest text-[9px]">{label}</div>
      <div className="text-lg font-mono mt-0.5" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
