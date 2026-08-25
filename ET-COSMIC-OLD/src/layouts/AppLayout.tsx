import { Suspense, useEffect, useState, lazy } from "react";
import Sidebar from "../components/Sidebar";
import BottomBar from "../components/BottomBar";
import PanelWrapper from "../components/PanelWrapper";
import AppErrorBoundary from "../components/AppErrorBoundary";
import DevSetupBanner from "../components/DevSetupBanner";
import CategoryHubPanel from "../components/CategoryHubPanel";
import { getCategoryById, type PanelCategoryId, type RouteDef } from "../router";
import { isB2bSlimShell } from "../b2b/buildFlags";

const ConsentBanner = lazy(() => import("../components/ConsentBanner"));

/** Painéis que exigem banner AMP mesmo em build B2B slim. */
const CONSENT_PANEL_PATHS = new Set([
  "/messenger",
  "/harvester",
  "/crypto/ghostid",
  "/governance/consent",
  "/compute/cosmic-harmony",
]);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-[#b6ff3a] font-mono text-xs">
      <div className="animate-pulse">CARREGANDO…</div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/** Shell dos painéis e hubs por área */
export default function AppLayout({
  route,
  categoryId,
}: {
  route?: RouteDef;
  categoryId?: PanelCategoryId;
}) {
  const isMobile = useIsMobile();
  const Panel = route?.component;
  const hubCat = categoryId ? getCategoryById(categoryId) : undefined;
  const showConsent =
    !isB2bSlimShell() || (route?.path != null && CONSENT_PANEL_PATHS.has(route.path));

  return (
    <div className="min-h-screen bg-black text-zinc-300">
      {!isMobile && <Sidebar />}

      <main
        className={`min-h-screen ${!isMobile ? "ml-60" : "pb-16"}`}
        style={{ contain: "layout" }}
      >
        {showConsent && (
          <Suspense fallback={null}>
            <ConsentBanner />
          </Suspense>
        )}
        <DevSetupBanner />
        <Suspense fallback={<LoadingFallback />}>
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {route && Panel ? (
              <PanelWrapper
                title={route.label}
                category={route.category}
                path={route.path}
                icon={route.icon}
                description={route.description}
              >
                <AppErrorBoundary>
                  <Panel />
                </AppErrorBoundary>
              </PanelWrapper>
            ) : categoryId && hubCat ? (
              <PanelWrapper
                title={hubCat.label}
                category={categoryId}
                icon={hubCat.icon}
                description={hubCat.description}
              >
                <CategoryHubPanel categoryId={categoryId} />
              </PanelWrapper>
            ) : null}
          </div>
        </Suspense>
      </main>

      {isMobile && <BottomBar />}
    </div>
  );
}
