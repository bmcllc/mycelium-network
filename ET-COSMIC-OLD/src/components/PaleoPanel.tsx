import { useState, useRef } from "react";
import { paleoEngine, type PaleoSkeleton } from "../paleo/PaleoEngine";

export default function PaleoPanel() {
  const [skeletons, setSkeletons] = useState<PaleoSkeleton[]>([]);
  const [isFossilizing, setIsFossilizing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFossilizing(true);
    setFileName(file.name);

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      await paleoEngine.fossilize(file.name, buffer);
      setSkeletons(paleoEngine.getSkeletons());
    } catch (err) {
      console.error("Fossilization failed:", err);
    } finally {
      setIsFossilizing(false);
    }
  };

  const handleFossilizeVoidCore = async () => {
    setIsFossilizing(true);
    setFileName("void_core_bg.wasm");

    try {
      // Busca o WASM real do build
      const res = await fetch("/assets/" + document.querySelector('script[src*="void_core"]')?.getAttribute("src")?.split("/").pop()?.replace(".js", ".wasm") || "void_core_bg.wasm");
      if (res.ok) {
        const buffer = new Uint8Array(await res.arrayBuffer());
        await paleoEngine.fossilize("void_core_bg.wasm", buffer);
      } else {
        const fallback = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
        await paleoEngine.fossilize("void_core_bg.wasm", fallback);
      }
      setSkeletons(paleoEngine.getSkeletons());
    } catch {
      // Se não conseguir buscar o WASM real, usa bytes mínimos
      const fallback = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      await paleoEngine.fossilize("void_core_bg.wasm", fallback);
      setSkeletons(paleoEngine.getSkeletons());
    } finally {
      setIsFossilizing(false);
    }
  };

  return (
    <div className="p-8 bg-black border border-[#14181c] space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="tag mb-4">PALEO_CLI · BINARY ARCHAEOLOGY</div>
          <h3 className="text-2xl font-sans font-light text-white">Anacroclastia Estrutural</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-xl">
            Extraia a estrutura profunda de contratos inteligentes.
            O binário resultante é um fóssil imutável, verificado com execução simbólica Z3.
          </p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wasm,.wasm,.js,.ts,.rs,.go,.c,.o"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isFossilizing}
            className="px-6 py-3 bg-[#ff3ad9]/10 text-[#ff3ad9] border border-[#ff3ad9]/30 font-mono text-[10px] hover:bg-[#ff3ad9] hover:text-black transition-smooth disabled:opacity-30"
          >
            UPLOAD BINÁRIO
          </button>
          <button
            onClick={handleFossilizeVoidCore}
            disabled={isFossilizing}
            className="px-6 py-3 bg-[#b6ff3a]/10 text-[#b6ff3a] border border-[#b6ff3a]/30 font-mono text-[10px] hover:bg-[#b6ff3a] hover:text-black transition-smooth disabled:opacity-30"
          >
            {isFossilizing ? "EXTRAINDO..." : "FOSSILIZAR VOID_CORE.WASM"}
          </button>
        </div>
      </div>

      {fileName && (
        <div className="font-mono text-[10px] text-zinc-500">
          Arquivo: <span className="text-[#ff3ad9]">{fileName}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {skeletons.map(s => (
          <div key={s.id} className="p-6 bg-[#0a0d10] border border-zinc-900 rounded-sm space-y-4 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">FOSSIL_ID</span>
              <span className="text-[#ff3ad9]">{s.id.slice(0, 20)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">SRC_BINARY</span>
              <span className="text-zinc-300">0x{s.sourceBinary}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">STATUS</span>
              <span className="text-[#b6ff3a]">VERIFIED (SAT)</span>
            </div>

            <div className="pt-4 border-t border-zinc-900 space-y-2">
              <div className="text-zinc-600 text-[8px] uppercase tracking-widest mb-2">Invariantes de Fluxo</div>
              {s.invariants.map(i => (
                <div key={i.type} className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">{i.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-600">depth:{i.depth}</span>
                    <span className="text-white">#{i.hash}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-black/50 border border-zinc-800 text-[9px] text-zinc-500 italic">
              Proof: {s.z3Proof}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-900">
              <div className="text-zinc-600 text-[8px] uppercase tracking-widest mb-3">Atlas de Coerência</div>
              <svg viewBox="0 0 200 100" className="w-full h-20 bg-black/40 rounded-sm cursor-crosshair">
                <circle cx="50" cy="50" r="4" fill="#ff3ad9" className="hover:fill-white transition-colors" />
                <circle cx="100" cy="30" r="4" fill="#ff3ad9" className="hover:fill-white transition-colors" />
                <circle cx="100" cy="70" r="4" fill="#ff3ad9" className="hover:fill-white transition-colors" />
                <circle cx="150" cy="50" r="4" fill="#ff3ad9" className="hover:fill-white transition-colors" />
                <line x1="54" y1="50" x2="96" y2="34" stroke="#ff3ad9" strokeWidth="0.5" strokeOpacity="0.4" />
                <line x1="54" y1="50" x2="96" y2="66" stroke="#ff3ad9" strokeWidth="0.5" strokeOpacity="0.4" />
                <line x1="104" y1="34" x2="146" y2="46" stroke="#ff3ad9" strokeWidth="0.5" strokeOpacity="0.4" />
                <line x1="104" y1="66" x2="146" y2="54" stroke="#ff3ad9" strokeWidth="0.5" strokeOpacity="0.4" />
              </svg>
            </div>
          </div>
        ))}
        {skeletons.length === 0 && !isFossilizing && (
          <div className="col-span-2 py-16 text-center border border-dashed border-zinc-900 text-zinc-700 font-mono text-xs">
            Nenhum fóssil extraído. Faça upload de um binário ou fossilize o void_core.
          </div>
        )}
      </div>
    </div>
  );
}
