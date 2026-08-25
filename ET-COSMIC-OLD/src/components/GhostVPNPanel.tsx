import { useState, useEffect } from "react";
import { ghostVPN, type GhostVPNSession } from "../crypto/ghostvpn";
import SectionHeader from "./SectionHeader";

export default function GhostVPNPanel() {
  const [session, setSession] = useState<GhostVPNSession | null>(null);
  const [layers, setLayers] = useState<{ name: string; active: boolean }[]>([]);
  const [mac, setMac] = useState<string | null>(null);
  const [_stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setSession(ghostVPN.getSession());
      setLayers(ghostVPN.getLayers());
      setMac(ghostVPN.getCurrentMAC());
      setStats(ghostVPN.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    setStatus("Iniciando GhostVPN...");
    try {
      const s = await ghostVPN.startSession((layer, step) => {
        setStatus(`Camada ${step}/7: ${layer}`);
      });
      setSession(s);
      setStatus(`Sessão ${s.id} ativa com ${s.layersActive} camadas`);
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    ghostVPN.stopSession();
    setSession(null);
    setStatus("Sessão encerrada e chaves destruídas.");
  };

  const handleRoute = async () => {
    try {
      const testData = new TextEncoder().encode("Packet fantasma ETΞRNET");
      const routed = await ghostVPN.route(testData);
      setStatus(`Pacote roteado: ${testData.length}B → ${routed.length}B (7 camadas)`);
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="7.1"
        kicker="VPN FANTASMA"
        title={<>GhostVPN<span className="text-[#b6ff3a]">.</span></>}
        description="A Fusão Primordial Hydra + VØID. Não mascara tráfego — dissolve a própria ideia de tráfego em fragmentos físicos, identidades efêmeras e caminhos que se apagam."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Control */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="tag">SESSÃO GHOSTVPN</div>
            <span className={`font-mono text-[10px] ${session ? "text-[#b6ff3a]" : "text-zinc-600"}`}>
              {session ? "ATIVA" : "INATIVA"}
            </span>
          </div>

          {status && (
            <div className="mb-3 p-2 bg-black border border-[#b6ff3a]/30 font-mono text-[10px] text-[#b6ff3a]">
              {status}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {session && (
              <>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">SESSION ID</span>
                  <span className="text-zinc-300">{session.id}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">BYTES ROTEADOS</span>
                  <span className="text-[#6cf0ff]">{session.bytesRouted}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">CAMADAS ATIVAS</span>
                  <span className="text-[#b6ff3a]">{session.layersActive}/7</span>
                </div>
              </>
            )}
            {mac && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-500">MAC EFÊMERO</span>
                <span className="text-[#ff3ad9]">{mac}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!session ? (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="py-2 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50"
              >
                {isStarting ? "INICIANDO..." : "INICIAR SESSÃO"}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="py-2 border border-red-500/30 text-red-400 font-mono text-[10px] hover:bg-red-500/10"
              >
                ENCERRAR SESSÃO
              </button>
            )}
            <button
              onClick={handleRoute}
              disabled={!session}
              className="py-2 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10 disabled:opacity-50"
            >
              ROTEAR PACOTE
            </button>
          </div>
        </div>

        {/* 7 Layers */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">7 CAMADAS DA GHOSTVPN</div>
          <div className="space-y-2">
            {layers.map((layer, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-2 border text-[10px] font-mono ${
                  layer.active
                    ? "border-[#b6ff3a]/30 bg-[#b6ff3a]/5"
                    : "border-[#14181c] bg-black"
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center border ${
                  layer.active ? "border-[#b6ff3a] text-[#b6ff3a]" : "border-zinc-700 text-zinc-600"
                }`}>
                  {i}
                </span>
                <span className={layer.active ? "text-zinc-200" : "text-zinc-600"}>
                  {layer.name}
                </span>
                <span className={`ml-auto ${layer.active ? "text-[#b6ff3a]" : "text-zinc-700"}`}>
                  {layer.active ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Princípio Fundamental:</strong> Valor e informação são indistinguíveis.
        Ambos trafegam fragmentados, por caminhos independentes, sem identidade persistente e sem ponto central de controle.
        <span className="text-[#b6ff3a]"> Zero log, zero disco, zero persistência.</span>
      </div>
    </section>
  );
}
