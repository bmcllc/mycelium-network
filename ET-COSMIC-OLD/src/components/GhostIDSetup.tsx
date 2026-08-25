import { useState, useEffect } from "react";
import { Link } from "wouter";
import type { GhostIdentity } from "../crypto/ghostid";
import { useCoreConsent } from "../hooks/useCoreConsent";

type Stage = "intro" | "consent" | "collecting" | "spawning" | "done" | "error";

interface Props {
  onSpawn: (onProgress?: (p: { stage: string; detail: string }) => void) => Promise<GhostIdentity>;
  moduleName?: string;
  themeColor?: string;
  onComplete?: () => void;
}

export default function GhostIDSetup({ onSpawn, moduleName, themeColor = "#a855f7", onComplete }: Props) {
  const { ready, hasCore, signCore } = useCoreConsent();
  const [stage, setStage] = useState<Stage>("intro");
  const [progress, setProgress] = useState({ stage: "", detail: "" });
  const [touchCount, setTouchCount] = useState(0);
  const [identity, setIdentity] = useState<GhostIdentity | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const handleTouch = () => {
    if (stage !== "collecting") return;
    setTouchCount((prev) => prev + 1);
  };

  const startCollecting = () => {
    if (!hasCore) {
      setStage("consent");
      return;
    }
    setErrorMsg(null);
    setTouchCount(0);
    setStage("collecting");
  };

  const handleSignAndContinue = async () => {
    setSigning(true);
    setErrorMsg(null);
    try {
      await signCore();
      setTouchCount(0);
      setStage("collecting");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  useEffect(() => {
    if (touchCount >= 5 && stage === "collecting") {
      setStage("spawning");
      onSpawn((p) => setProgress(p))
        .then((id) => {
          setIdentity(id);
          setStage("done");
          // Auto-trigger completion after 1.5s
          const timer = setTimeout(() => {
            if (onComplete) onComplete();
          }, 1500);
          return () => clearTimeout(timer);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          setErrorMsg(msg);
          setStage("error");
        });
    }
  }, [touchCount, stage, onSpawn, onComplete]);

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-zinc-500 font-mono text-xs animate-pulse">CARREGANDO CGF…</div>
      </div>
    );
  }

  if (stage === "consent") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-[#b6ff3a] font-mono text-xs tracking-widest">CONSENTIMENTO CGF</div>
          <p className="text-zinc-400 text-sm">
            GhostID exige nível ≥1 (entropia de hardware). Assine o preset Núcleo v1 antes de criar
            a identidade.
          </p>
          <button
            type="button"
            onClick={handleSignAndContinue}
            disabled={signing}
            className="w-full py-3 bg-[#b6ff3a] text-black font-mono text-xs tracking-widest disabled:opacity-50"
          >
            {signing ? "ASSINANDO…" : "ASSINAR NÚCLEO v1"}
          </button>
          <Link
            href="/governance/consent"
            className="block text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
          >
            Ver todos os escopos →
          </Link>
          {errorMsg && <p className="text-red-400 text-[10px] font-mono">{errorMsg}</p>}
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 font-mono text-xs">FALHA AO CRIAR GHOST ID</div>
          <p className="text-[10px] font-mono text-zinc-500 break-all">{errorMsg}</p>
          {errorMsg?.includes("CGF_DCC") && (
            <button
              type="button"
              onClick={() => setStage("consent")}
              className="px-4 py-2 bg-[#b6ff3a] text-black font-mono text-[10px]"
            >
              ASSINAR CONSENTIMENTO
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setTouchCount(0);
              setStage("intro");
            }}
            className="block mx-auto text-zinc-500 font-mono text-[10px] hover:text-zinc-300"
          >
            VOLTAR
          </button>
        </div>
      </div>
    );
  }

  if (stage === "intro") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="font-mono text-3xl font-bold tracking-widest" style={{ color: themeColor }}>VØID</div>
          <div className="text-zinc-500 font-mono text-xs tracking-wider">{moduleName || "MESSENGER"}</div>
          <div className="border border-[#1a1f26] p-6 space-y-4">
            <p className="text-zinc-300 text-sm">
              Identidade derivada de entropia, biometria e criptografia pós-quântica.
            </p>
            <p className="text-zinc-500 text-xs">Sem telefone. Sem email. Sem servidor central.</p>
          </div>
          <button
            type="button"
            onClick={startCollecting}
            className="w-full py-3 text-black font-mono text-xs tracking-widest transition-smooth"
            style={{ backgroundColor: themeColor }}
            onMouseOver={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            CRIAR GHOST ID
          </button>
          {!hasCore && (
            <p className="text-[9px] font-mono text-zinc-600">
              Será pedido consentimento CGF (PMU) no passo seguinte.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (stage === "collecting") {
    return (
      <div
        className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 px-8"
        onTouchStart={handleTouch}
        onClick={handleTouch}
      >
        <div className="text-center space-y-6 max-w-sm">
          <div className="font-mono text-xs tracking-widest" style={{ color: themeColor }}>COLETANDO ENTROPIA</div>
          <div className="relative w-40 h-40 mx-auto">
            <div
              className="absolute inset-0 rounded-full border-2 transition-all"
              style={{
                borderColor: touchCount > 0 ? themeColor : "#27272a",
                backgroundColor: touchCount > 0 ? `${themeColor}1a` : "transparent",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-mono" style={{ color: themeColor }}>{touchCount}</div>
              <span className="text-[9px] font-mono text-zinc-600 block">/ 5 toques</span>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">Toque na tela cinco vezes</p>
        </div>
      </div>
    );
  }

  if (stage === "spawning") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="font-mono text-xs" style={{ color: themeColor }}>DERIVANDO IDENTIDADE</div>
          {progress.detail && (
            <p className="text-[9px] font-mono text-zinc-500">{progress.detail}</p>
          )}
          <p className="text-zinc-700 text-[10px] font-mono animate-pulse">PROCESSANDO…</p>
        </div>
      </div>
    );
  }

  if (stage === "done" && identity) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <div className="text-[#00ff41] font-mono text-xs">GHOST ID CRIADO</div>
          <div className="font-mono text-lg" style={{ color: themeColor }}>{identity.handle}</div>
          <p className="text-[9px] font-mono text-zinc-600">
            {identity.entropyBits} bits · {identity.quantumVerified ? "QUÂNTICA" : "CSPRNG"}
          </p>
          <button
            type="button"
            onClick={() => {
              if (onComplete) onComplete();
            }}
            className="mt-4 px-4 py-2 border font-mono text-[10px] transition-smooth bg-black hover:bg-zinc-900"
            style={{ color: themeColor, borderColor: `${themeColor}66` }}
          >
            ACESSAR MÓDULO
          </button>
        </div>
      </div>
    );
  }

  return null;
}
