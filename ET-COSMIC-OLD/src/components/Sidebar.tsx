import { memo, useState, useCallback, useMemo } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  categories,
  getCategoryHubPath,
  getRoutesByCategory,
  isPanelCategoryActive,
  type PanelCategoryId,
  type RouteDef,
} from "../router";

function SvgIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ home: true });
  const [search, setSearch] = useState("");

  const toggleCategory = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const all = categories.flatMap((cat) =>
      getRoutesByCategory(cat.id).map((r) => ({ ...r, catLabel: cat.label, catColor: cat.color }))
    );
    return all.filter(
      (r) => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#080a0c] border-r border-[#1a1f26] flex flex-col z-40 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1a1f26]">
        <Link href="/" className="flex items-center gap-2 no-underline group">
          <div className="w-8 h-8 rounded bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center group-hover:bg-[#a855f7]/20 transition-colors">
            <span className="text-[#a855f7] font-mono text-xs font-bold">V</span>
          </div>
          <div>
            <div className="text-[#a855f7] font-mono text-sm font-bold tracking-widest">VØID</div>
            <div className="text-zinc-700 font-mono text-[8px]">ET-RNET PROTOCOL</div>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#1a1f26]">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar painéis..."
            className="w-full bg-[#0a0d10] border border-[#1a1f26] pl-8 pr-3 py-2 text-[11px] font-mono text-zinc-300 outline-none focus:border-[#a855f7]/30 transition-colors placeholder:text-zinc-700 rounded"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {filteredRoutes ? (
          /* Search results */
          <div className="px-2 py-1">
            <div className="text-[9px] font-mono text-zinc-600 px-2 py-1">
              {filteredRoutes.length} resultados
            </div>
            {filteredRoutes.map((route) => (
              <SearchResultLink key={route.path} route={route} color={route.catColor} />
            ))}
          </div>
        ) : (
          /* Category tree */
          categories.map((cat) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              expanded={!!expanded[cat.id]}
              areaActive={isPanelCategoryActive(cat.id as PanelCategoryId, location)}
              onToggle={() => toggleCategory(cat.id)}
            />
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a1f26] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
        <span className="text-[8px] font-mono text-zinc-700">
          VØID PROTOCOL v∞ · AGPL-3.0 · livre
        </span>
      </div>
    </aside>
  );
}

const CategoryBlock = memo(function CategoryBlock({
  cat,
  expanded,
  areaActive,
  onToggle,
}: {
  cat: { id: string; label: string; icon: string; color: string };
  expanded: boolean;
  areaActive: boolean;
  onToggle: () => void;
}) {
  const hubPath = getCategoryHubPath(cat.id);
  const [hubExact] = useRoute(hubPath);
  const routes = getRoutesByCategory(cat.id);

  return (
    <div className="mb-0.5">
      <div
        className={`flex items-center gap-1 px-1 py-1 ${
          areaActive ? "bg-[#0a0d10]/80" : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
          </svg>
        </button>
        <Link
          href={hubPath}
          className={`flex flex-1 items-center gap-2 py-1.5 pr-2 no-underline transition-colors group min-w-0 ${
            hubExact ? "text-zinc-100" : areaActive ? "text-zinc-300" : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          {hubExact && (
            <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: cat.color }} />
          )}
          <div className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0" style={{ background: `${cat.color}15` }}>
            <SvgIcon path={cat.icon} className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-mono tracking-wider uppercase truncate flex-1">
            {cat.label}
          </span>
          <span className="text-[8px] font-mono text-zinc-700 flex-shrink-0">{routes.length}</span>
        </Link>
      </div>

      {expanded && (
        <div className="ml-4 border-l border-[#1a1f26]">
          {routes.map((route) => (
            <SidebarLink key={route.path} route={route} color={cat.color} />
          ))}
        </div>
      )}
    </div>
  );
});

const SidebarLink = memo(function SidebarLink({ route, color }: { route: RouteDef; color: string }) {
  const [isActive] = useRoute(route.path);

  return (
    <Link
      href={route.path}
      className={`flex items-center gap-2 px-3 py-1.5 text-[11px] no-underline transition-colors ${
        isActive
          ? "text-zinc-100 bg-[#0a0d10]"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-[#0a0d10]/50"
      }`}
    >
      {isActive && (
        <div className="w-0.5 h-4 rounded-full -ml-[13px] mr-1.5" style={{ background: color }} />
      )}
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke={isActive ? color : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={route.icon} />
      </svg>
      <span className="font-mono truncate">{route.label}</span>
    </Link>
  );
});

const SearchResultLink = memo(function SearchResultLink({
  route,
  color,
}: {
  route: RouteDef & { catLabel: string };
  color: string;
}) {
  const [isActive] = useRoute(route.path);

  return (
    <Link
      href={route.path}
      className={`flex items-center gap-2 px-3 py-2 no-underline transition-colors rounded ${
        isActive ? "bg-[#0a0d10] text-zinc-100" : "text-zinc-400 hover:bg-[#0a0d10] hover:text-zinc-300"
      }`}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={route.icon} />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] truncate">{route.label}</div>
        <div className="text-[9px] text-zinc-600 truncate">{route.description}</div>
      </div>
      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ color, background: `${color}15` }}>
        {route.catLabel}
      </span>
    </Link>
  );
});

export default memo(Sidebar);
