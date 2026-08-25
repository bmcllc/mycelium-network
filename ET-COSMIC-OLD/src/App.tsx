import { Suspense, useEffect, useState, lazy } from "react";
import { Router, Route, Switch, Redirect } from "wouter";
import { LEGACY_PATH_REDIRECTS } from "./b2b/componentMap";
import { isMobileShell } from "./lib/cosmicSovereignMode";
import AppLayout from "./layouts/AppLayout";
import NotFoundPage from "./components/NotFoundPage";
import {
  getActiveCategoryHubRoutes,
  routes,
  b2bRouteMeta,
  type PanelCategoryId,
  type RouteDef,
} from "./router";
import { getB2bSingleEntry, isB2bSlimShell } from "./b2b/buildFlags";

const MarketingLanding = lazy(() => import("./AppLanding"));
const B2bMinimalLanding = lazy(() =>
  import("./AppLanding").then((m) => ({ default: m.B2bMinimalLanding })),
);

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "safari";
  if (ua.includes("Edg")) return "edge";
  return "chrome";
}

function BrowserWarning({ browser }: { browser: string }) {
  if (browser === "chrome" || browser === "edge") return null;
  const limitations: Record<string, string[]> = {
    firefox: ["Web Bluetooth", "Web Serial"],
    safari: ["Web Bluetooth", "Web Serial", "Web NFC"],
  };
  const missing = limitations[browser] || [];
  if (missing.length === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-yellow-500/30 px-4 py-2 text-xs font-mono text-yellow-400/80 flex items-center gap-2 backdrop-blur-sm">
      <span className="text-yellow-500">&#9888;</span>
      <span>
        Hardware local limitado ({missing.join(", ")}). Use Chrome para acesso completo ao HCN.
      </span>
    </div>
  );
}

const landingFallback = (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <span className="font-mono text-xs text-zinc-600 animate-pulse">CARREGANDO…</span>
  </div>
);

/** Entrada `/` — redirect build-time, landing B2B ou marketing (chunk lazy). */
function RootEntryRoute() {
  const singleEntry = getB2bSingleEntry();
  if (singleEntry) {
    return <Redirect to={singleEntry} />;
  }
  if (b2bRouteMeta.active) {
    return (
      <Suspense fallback={landingFallback}>
        <B2bMinimalLanding />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={landingFallback}>
      <MarketingLanding />
    </Suspense>
  );
}

function PanelScreen({ route }: { route: RouteDef }) {
  return <AppLayout route={route} />;
}

function CategoryHubScreen({ categoryId }: { categoryId: PanelCategoryId }) {
  return <AppLayout categoryId={categoryId} />;
}

export default function App() {
  const [browser] = useState(detectBrowser);
  const slim = isB2bSlimShell();

  useEffect(() => {
    if (slim) return;
    void import("./protocol/amp/consentReceiptStore").then((m) =>
      m.consentReceiptStore.hydrateFromOpfs(),
    );
  }, [slim]);

  useEffect(() => {
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const isKnownRelayNoise = (reason: unknown): boolean => {
      if (!(reason instanceof Error)) return false;
      const msg = reason.message.toLowerCase();
      return (
        msg.includes("invalid: id is computed incorrectly") ||
        msg.includes("rate-limited") ||
        msg.includes("pow:")
      );
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isLocalDev) return;
      if (isKnownRelayNoise(event.reason)) event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);

    if (!slim) {
      void import("./network/NativeBridge").then(({ nativeBridge }) => {
        if (nativeBridge.isAvailable()) nativeBridge.activateCarrierService();
      });
    }

    if ("serviceWorker" in navigator) {
      if (isLocalDev) {
        // Em dev, desregistra SW para não interferir com HMR
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => void r.unregister());
        });
      } else if (!slim) {
        // Em produção: registra SW em TODOS os contextos (browser, PWA, Capacitor)
        navigator.serviceWorker.register("/sw.js").then(() => {
          console.log("[VØID] Service Worker registrado no Stratum 3.");
        }).catch(() => {});
      }
    }

    const onVisibility = () => {
      if (slim) return;
      if (document.visibilityState === "hidden" && isMobileShell()) {
        void import("./core/cosmicVoidOrchestrator").then((m) => m.prepareCosmicHarmonyCycle());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slim]);

  const pagesBase = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

  return (
    <Router base={pagesBase}>
      <Switch>
        <Route path="/" component={RootEntryRoute} />
        {Object.entries(LEGACY_PATH_REDIRECTS).map(([from, to]) => (
          <Route key={from} path={from}>
            <Redirect to={to} />
          </Route>
        ))}
        {getActiveCategoryHubRoutes().map((hub) => (
          <Route key={hub.path} path={hub.path}>
            <CategoryHubScreen categoryId={hub.categoryId} />
          </Route>
        ))}
        {routes.map((route) => (
          <Route key={route.path} path={route.path}>
            <PanelScreen route={route} />
          </Route>
        ))}
        <Route component={NotFoundPage} />
      </Switch>
      <BrowserWarning browser={browser} />
    </Router>
  );
}
