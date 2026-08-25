import { memo, useState, useCallback } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  categories,
  getCategoryHubPath,
  getRoutesByCategory,
  isPanelCategoryActive,
  PANEL_CATEGORY_IDS,
  type PanelCategoryId,
} from "../router";

function SvgIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const PRIMARY_TABS: PanelCategoryId[] = ["home", "crypto", "finance", "network"];

function BottomBar() {
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleTab = useCallback(
    (id: PanelCategoryId | "more") => {
      if (id === "more") {
        setDrawerOpen(true);
        setDrawerCategory(null);
        return;
      }
      setLocation(getCategoryHubPath(id));
      setDrawerOpen(false);
      setDrawerCategory(null);
      setSearch("");
    },
    [setLocation]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerCategory(null);
    setSearch("");
  }, []);

  const currentCat = categories.find((c) => c.id === drawerCategory);
  const routes = drawerCategory ? getRoutesByCategory(drawerCategory) : [];
  const filteredRoutes = search.trim()
    ? categories.flatMap((cat) => getRoutesByCategory(cat.id)).filter((r) => r.label.toLowerCase().includes(search.toLowerCase()))
    : routes;

  const moreActive =
    drawerOpen && !drawerCategory
      ? true
      : PANEL_CATEGORY_IDS.some(
          (id) => !PRIMARY_TABS.includes(id) && isPanelCategoryActive(id, location)
        );

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-[#080a0c]/95 backdrop-blur border-t border-[#1a1f26] flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom)]">
        {PRIMARY_TABS.map((tabId) => {
          const cat = categories.find((c) => c.id === tabId)!;
          const isActive = isPanelCategoryActive(tabId, location);
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => handleTab(tabId)}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 min-w-[52px] transition-colors ${
                isActive ? "text-[#a855f7]" : "text-zinc-500 active:text-zinc-300"
              }`}
            >
              <SvgIcon path={cat.icon} className="w-5 h-5" />
              <span className="text-[8px] font-mono truncate max-w-[56px]">{cat.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => handleTab("more")}
          className={`flex flex-col items-center gap-0.5 py-2 px-2 min-w-[52px] transition-colors ${
            moreActive ? "text-[#a855f7]" : "text-zinc-500 active:text-zinc-300"
          }`}
        >
          <SvgIcon path="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" className="w-5 h-5" />
          <span className="text-[8px] font-mono">Mais</span>
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-[#080a0c] border-t border-[#1a1f26] max-h-[70vh] overflow-y-auto rounded-t-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#080a0c]/95 backdrop-blur px-4 py-3 border-b border-[#1a1f26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentCat && (
                  <div className="w-5 h-5 flex items-center justify-center rounded" style={{ background: `${currentCat.color}15` }}>
                    <SvgIcon path={currentCat.icon} className="w-3 h-3" />
                  </div>
                )}
                <span className="font-mono text-xs text-zinc-300">
                  {currentCat ? currentCat.label : "TODAS AS ÁREAS"}
                </span>
              </div>
              <button type="button" onClick={closeDrawer} className="text-zinc-500 text-lg px-2" aria-label="Fechar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!drawerCategory && (
              <div className="px-4 py-2 border-b border-[#1a1f26]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar painéis..."
                  className="w-full bg-[#0a0d10] border border-[#1a1f26] px-3 py-2.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/30 rounded placeholder:text-zinc-700"
                  style={{ fontSize: 16 }}
                />
              </div>
            )}

            {!drawerCategory && !search.trim() && (
              <div className="p-4 grid grid-cols-3 gap-2">
                {PANEL_CATEGORY_IDS.filter((id) => id !== "home").map((id) => {
                  const cat = categories.find((c) => c.id === id)!;
                  return (
                    <Link
                      key={id}
                      href={getCategoryHubPath(id)}
                      onClick={closeDrawer}
                      className="flex flex-col items-center gap-1.5 py-3 border border-[#1a1f26] rounded-lg hover:border-[#2a2f36] transition-colors active:bg-[#0a0d10] no-underline"
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: `${cat.color}15` }}>
                        <SvgIcon path={cat.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400">{cat.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {(drawerCategory || search.trim()) && (
              <div className="p-2">
                {drawerCategory && currentCat && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerCategory(null);
                        setSearch("");
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-[10px] font-mono text-zinc-500"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Voltar
                    </button>
                    <HubDrawerLink
                      path={getCategoryHubPath(drawerCategory)}
                      label={`Índice ${currentCat.label}`}
                      description={currentCat.description}
                      color={currentCat.color}
                      icon={currentCat.icon}
                      onClose={closeDrawer}
                    />
                  </>
                )}
                {filteredRoutes.map((route) => {
                  const cat = categories.find((c) => c.id === route.category);
                  return (
                    <MobileLink
                      key={route.path}
                      route={route}
                      color={cat?.color || "#5a6268"}
                      onClose={closeDrawer}
                    />
                  );
                })}
                {filteredRoutes.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 font-mono text-xs">Nenhum painel encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const HubDrawerLink = memo(function HubDrawerLink({
  path,
  label,
  description,
  color,
  icon,
  onClose,
}: {
  path: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  onClose: () => void;
}) {
  const [isActive] = useRoute(path);

  return (
    <Link
      href={path}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 mb-1 no-underline rounded-lg border border-dashed transition-colors ${
        isActive ? "bg-[#a855f7]/10 border-[#a855f7]/40 text-[#a855f7]" : "border-[#1a1f26] text-zinc-400 active:bg-[#0a0d10]"
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: `${color}15` }}>
        <svg className="w-4 h-4" fill="none" stroke={isActive ? "#a855f7" : color} viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs">{label}</div>
        <div className="text-[9px] text-zinc-600 truncate">{description}</div>
      </div>
    </Link>
  );
});

const MobileLink = memo(function MobileLink({
  route,
  color,
  onClose,
}: {
  route: { path: string; label: string; description: string; icon: string };
  color: string;
  onClose: () => void;
}) {
  const [isActive] = useRoute(route.path);

  return (
    <Link
      href={route.path}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 no-underline rounded-lg transition-colors ${
        isActive ? "bg-[#a855f7]/10 text-[#a855f7]" : "text-zinc-400 active:bg-[#0a0d10]"
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: `${color}15` }}>
        <svg className="w-4 h-4" fill="none" stroke={isActive ? "#a855f7" : color} viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={route.icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs">{route.label}</div>
        <div className="text-[9px] text-zinc-600 truncate">{route.description}</div>
      </div>
    </Link>
  );
});

export default memo(BottomBar);
