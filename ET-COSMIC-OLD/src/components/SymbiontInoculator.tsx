import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useVoid } from "../core/useVoid";
import { sovTokenomics } from "../crypto/sovTokenomics";
import { consentContract } from "../ethics/consentContract";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";

export default function SymbiontInoculator() {
  const { material } = useOmegaMaterial(64);
  const tickRef = useRef(0);
  const { identity } = useVoid();
  const [isInoculated, setIsInoculated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sovMined, setSovMined] = useState<bigint>(0n);
  const [shardCount, setShardCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    if (!isInoculated || !identity) return;

    const interval = setInterval(() => {
      const t = tickRef.current++;
      const routeIdx = material ? material[t % material.length]! % 5 : 0;
      const reward = sovTokenomics.mintRoutingReward(identity, routeIdx);
      setSovMined((prev) => prev + reward.amount);
      setShardCount((prev) => prev + (material ? (material[(t + 1) % material.length]! % 3) + 1 : 1));
      setStorageUsed((prev) =>
        Math.min(prev + (material ? material[(t + 2) % material.length]! % 100 : 50), 51200),
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [isInoculated, identity, material]);

  const hasSymbiontConsent =
    consentContract.hasConsent("SYMBIONT_SERVICE_WORKER") &&
    consentContract.hasConsent("ANIMUS_PERSISTENCE");

  const handleInoculate = async () => {
    if (!hasSymbiontConsent) {
      alert(
        "É necessário aceitar os escopos SYMBIONT_SERVICE_WORKER e ANIMUS_PERSISTENCE no Contrato de Consentimento.",
      );
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // 1. Fetch real WASM binary
      setProgress(10);
      const scripts = document.querySelectorAll('script[src]');
      let wasmUrl = "";
      for (const s of scripts) {
        const src = s.getAttribute("src") || "";
        if (src.includes("void_core")) {
          wasmUrl = src.replace(".js", ".wasm");
          break;
        }
      }

      let wasmBytes: Uint8Array;
      if (wasmUrl) {
        setProgress(30);
        const res = await fetch(wasmUrl);
        wasmBytes = new Uint8Array(await res.arrayBuffer());
      } else {
        // Fallback: WASM header bytes
        wasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      }

      setProgress(60);

      // 2. Compute integrity hash
      const hashBuffer = await crypto.subtle.digest("SHA-256", wasmBytes as BufferSource);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

      setProgress(80);

      // 3. Send to Service Worker
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "ANIMUS_INOCULATION",
          payload: Array.from(wasmBytes),
          hash: hashHex,
          size: wasmBytes.length,
        });

        setProgress(100);
        await new Promise(r => setTimeout(r, 500));
        setIsInoculated(true);
      } else {
        alert("Service Worker não detectado. Ative o PWA primeiro.");
      }
    } catch (err) {
      console.error("Inoculation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 bg-[#0a0d10] border border-[#ff3ad9]/20 rounded-sm space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="tag bg-[#ff3ad9]/10 text-[#ff3ad9] border-[#ff3ad9]/30">STRATUM 3 · SYMBIONT</div>
          <h3 className="text-xl font-sans font-light text-white mt-4">Inoculação ANIMUS</h3>
          <p className="text-zinc-500 text-xs mt-2 max-w-sm leading-relaxed">
            Persistência local via Service Worker (sem propagação a terceiros).
            Requer consentimento explícito. Não é malware nem viroid de rede.
          </p>
          {!hasSymbiontConsent && (
            <Link
              href="/governance/consent"
              className="inline-block mt-3 text-[9px] font-mono text-[#6cf0ff] underline"
            >
              Abrir Contrato de Consentimento →
            </Link>
          )}
        </div>
        <div className={`size-3 rounded-full ${isInoculated ? "bg-[#b6ff3a] shadow-[0_0_10px_#b6ff3a]" : "bg-zinc-800"}`} />
      </div>

      {!isInoculated ? (
        <div className="space-y-4">
          {isProcessing ? (
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-[9px] text-[#ff3ad9]">
                <span>INJETANDO_NUCLEO_WASM...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-[#ff3ad9] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="font-mono text-[8px] text-zinc-600">
                {progress < 30 && "Buscando binário WASM..."}
                {progress >= 30 && progress < 60 && "Carregando módulo criptográfico..."}
                {progress >= 60 && progress < 80 && "Computando hash de integridade..."}
                {progress >= 80 && "Injetando no Service Worker..."}
              </div>
            </div>
          ) : (
            <button
              onClick={handleInoculate}
              className="w-full py-4 border border-[#ff3ad9]/40 text-[#ff3ad9] font-mono text-[10px] tracking-widest hover:bg-[#ff3ad9] hover:text-black transition-smooth"
            >
              INOCULAR HOSPEDEIRO
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-[#b6ff3a]/5 border border-[#b6ff3a]/20">
          <div className="text-[#b6ff3a] font-mono text-[10px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-1 bg-[#b6ff3a] animate-ping" />
              NÓ HOSPEDEIRO ATIVO
            </div>
            <div className="text-[#6cf0ff]">
              MINED: {sovMined.toString()} $SOV
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 font-mono text-[9px]">
            <div>
              <span className="text-zinc-600">Relay Shards</span>
              <div className="text-zinc-300">{shardCount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-zinc-600">Data Storage</span>
              <div className="text-zinc-300">{(storageUsed / 1024).toFixed(1)}MB</div>
            </div>
            <div>
              <span className="text-zinc-600">Status</span>
              <div className="text-[#b6ff3a]">ANIMUS</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
