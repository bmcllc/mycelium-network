import { useRef, useState } from "react";
import { socialRecovery, type RecoveryScheme } from "../crypto/socialRecovery";

export default function SocialRecoveryPanel() {
  const [schemes, setSchemes] = useState<RecoveryScheme[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [totalShares, setTotalShares] = useState(5);
  const [selectedScheme, setSelectedScheme] = useState<string>("");
  const [recovered, setRecovered] = useState<Uint8Array | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleSplit = () => {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const guardianPks = Array.from({ length: totalShares }, () =>
      Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("")
    );
    const scheme = socialRecovery.splitSeed(seed, threshold, totalShares, guardianPks);
    setSchemes(socialRecovery.getSchemes());
    setSelectedScheme(scheme.id);
    addLog(`Scheme ${scheme.id.slice(0, 16)}: ${threshold}/${totalShares} Shamir split`);
  };

  const handleRecover = () => {
    if (!selectedScheme) return;
    const scheme = socialRecovery.getScheme(selectedScheme);
    if (!scheme) return;
    const shares = scheme.shares.slice(0, threshold);
    const result = socialRecovery.recoverSeed(selectedScheme, shares);
    if (result) {
      setRecovered(result);
      addLog(`Seed recuperada: ${Array.from(result.slice(0, 8)).map(b => b.toString(16).padStart(2, "0")).join("")}...`);
    } else {
      addLog("ERRO: Falha na recuperacao (hash mismatch)");
    }
  };

  return (
    <section id="social-recovery-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 13.2</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">SOCIAL RECOVERY</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Recuperacao <span className="text-[#6cf0ff]">Social</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Carteira multi-dispositivo via Shamir Secret Sharing. Divide seed em N shares;
            qualquer M de N podem recuperar. Shares enviados via NOSTR DMs criptografados.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">SHAMIR SPLIT</span>
              <span className="font-mono text-[10px] text-zinc-600">{schemes.length} scheme(s)</span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">THRESHOLD (M)</span>
                <span className="font-mono text-[10px] text-[#6cf0ff]">{threshold}</span>
              </div>
              <input
                type="range" min={2} max={10} value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">TOTAL SHARES (N)</span>
                <span className="font-mono text-[10px] text-[#6cf0ff]">{totalShares}</span>
              </div>
              <input
                type="range" min={3} max={15} value={totalShares}
                onChange={(e) => setTotalShares(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#6cf0ff]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleSplit}
                className="py-3 bg-[#6cf0ff] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                DIVIDIR SEED
              </button>
              <button
                onClick={handleRecover}
                disabled={!selectedScheme}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] tracking-[0.2em] hover:bg-[#b6ff3a]/10 disabled:opacity-50 transition-all"
              >
                RECUPERAR (M SHARES)
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {schemes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedScheme(s.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedScheme === s.id
                      ? "border-[#6cf0ff]/50 bg-[#6cf0ff]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-300">{s.id.slice(0, 20)}...</span>
                    <span className="text-[#6cf0ff]">{s.threshold}/{s.totalShares}</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    shares: {s.shares.length} | hash: {s.seedHash.slice(0, 16)}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {recovered && (
                <div>
                  <span className="tag mb-3 block">SEED RECUPERADA</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#b6ff3a]/20 font-mono text-[8px] text-[#b6ff3a] break-all leading-relaxed">
                    {Array.from(recovered).map(b => b.toString(16).padStart(2, "0")).join("")}
                  </div>
                </div>
              )}

              {selectedScheme && (() => {
                const scheme = socialRecovery.getScheme(selectedScheme);
                if (!scheme) return null;
                return (
                  <div>
                    <span className="tag mb-3 block">SCHEME SELECIONADO</span>
                    <div className="space-y-2">
                      {scheme.shares.map((share) => (
                        <div key={share.id} className="p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Share #{share.index}</span>
                            <span className="text-zinc-600">{share.id.slice(0, 12)}...</span>
                          </div>
                          <div className="text-zinc-700 mt-1 text-[8px]">
                            data: {Array.from(share.data.slice(0, 8)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">esquemas</span>
                  <span className="text-zinc-300">{schemes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">algoritmo</span>
                  <span className="text-[#6cf0ff]">Shamir SSS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">transporte</span>
                  <span className="text-zinc-300">NOSTR DM</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando operador...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-[#14181c] pl-2">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
