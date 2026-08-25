import { lazy, Suspense, useEffect, useState } from "react";
import { Router, Route, Switch } from "wouter";
import SaborQuanticoPage from "./SaborQuanticoPage";
import HomePage from "./HomePage";
import MeshLiquidityPage from "./MeshLiquidityPage";
import GovernanceSovereigntyPage from "./GovernanceSovereigntyPage";
import { PageShell } from "./PageShell";

const PaymentGatewayPanel = lazy(() => import("../components/PaymentGatewayPanel"));
const Onboarding = lazy(() => import("../components/Onboarding"));
const ProductsPage = lazy(() => import("./ProductsPage"));
const BusinessModelPage = lazy(() => import("./BusinessModelPage"));

function NotFoundPage() {
  return (
    <PageShell title="404" eyebrow="Not found">
      <p className="text-sm text-zinc-500">Rota não encontrada neste shell de produção.</p>
    </PageShell>
  );
}

function PaymentPage() {
  return (
    <PageShell title="Pagamentos" eyebrow="Lightning + NWC">
      <Suspense fallback={<div className="text-xs text-zinc-600 animate-pulse p-6">Carregando gateway...</div>}>
        <PaymentGatewayPanel />
      </Suspense>
    </PageShell>
  );
}

/** base wouter alinhado ao Vite BASE_URL (domínio único GitLab → `/'). */
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ProductionApp() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("etrnet:onboarding:done");
    if (!done) setShowOnboarding(true);

    // Registrar SW em todos os contextos (inclusive PWA standalone)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <Router base={routerBase}>
      {showOnboarding && (
        <Suspense fallback={null}>
          <Onboarding onClose={() => { setShowOnboarding(false); localStorage.setItem("etrnet:onboarding:done", "1"); }} />
        </Suspense>
      )}
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/sabor-quantico" component={SaborQuanticoPage} />
        <Route path="/mesh/liquidity" component={MeshLiquidityPage} />
        <Route path="/governance/sovereignty" component={GovernanceSovereigntyPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/business" component={BusinessModelPage} />
        <Route path="/finance/payment" component={PaymentPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
}
