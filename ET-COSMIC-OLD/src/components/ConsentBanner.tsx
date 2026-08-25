import { useState } from "react";
import { Link } from "wouter";
import { useCoreConsent } from "../hooks/useCoreConsent";

export default function ConsentBanner() {
  const { ready, hasCore, signCore } = useCoreConsent();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || hasCore) return null;

  const handleQuickSign = async () => {
    setSigning(true);
    setError(null);
    try {
      await signCore();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 border-b border-[#b6ff3a]/40 bg-[#0a0d10]/95 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
      <p className="text-[11px] font-mono text-zinc-400 max-w-2xl">
        <span className="text-[#b6ff3a]">Consentimento necessário.</span> GhostID, mesh e
        pagamentos exigem recibo CGF (PMU). Assine o preset Núcleo v1 ou escolha escopos em
        detalhe.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleQuickSign}
          disabled={signing}
          className="px-3 py-1.5 bg-[#b6ff3a] text-black text-[10px] font-mono font-bold disabled:opacity-50"
        >
          {signing ? "ASSINANDO…" : "ASSINAR NÚCLEO v1"}
        </button>
        <Link
          href="/governance/consent"
          className="px-3 py-1.5 border border-zinc-600 text-zinc-300 text-[10px] font-mono hover:border-zinc-400"
        >
          DETALHES
        </Link>
      </div>
      {error && (
        <p className="w-full text-[10px] font-mono text-red-400">{error}</p>
      )}
    </div>
  );
}
