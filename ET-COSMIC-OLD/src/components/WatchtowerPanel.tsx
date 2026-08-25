import { useEffect, useRef, useState } from "react";
import {
  Watchtower,
  createWatchtowerRegistration,
  type BreachAlert,
  type WatchtowerRegistration,
} from "../crypto/watchtower";
import { deriveWatchtowerPayloads } from "../lib/moduleRealityBackend";
import { voidOrchestrator } from "../core/VoidOrchestrator";

const watchtower = new Watchtower();

export default function WatchtowerPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [registrations, setRegistrations] = useState<WatchtowerRegistration[]>([]);
  const [breaches, setBreaches] = useState<BreachAlert[]>([]);
  const [fundingOutpoint, setFundingOutpoint] = useState("");
  const [commitmentTxid, setCommitmentTxid] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  useEffect(() => {
    watchtower.start();
    setIsRunning(true);
    addLog("Watchtower iniciado (poll 30s)");

    watchtower.onBreach((alert: BreachAlert) => {
      setBreaches((prev) => [alert, ...prev]);
      addLog(`BREACH: canal ${alert.channelId.slice(0, 8)}... justiça: ${alert.justiceBroadcast}`);
    });

    return () => {
      watchtower.stop();
    };
  }, []);

  const handleRegister = () => {
    if (!fundingOutpoint || !commitmentTxid) return;

    const channelId = `ch_${fundingOutpoint.slice(0, 8)}`;
    const { monitor, justice } = deriveWatchtowerPayloads(channelId, commitmentTxid, fundingOutpoint);
    const rawPk = voidOrchestrator.getIdentity()?.publicKey;
    const clientPk =
      typeof rawPk === "string"
        ? rawPk
        : rawPk
          ? Array.from(rawPk)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
          : "client_pubkey";

    const reg = createWatchtowerRegistration(
      channelId,
      commitmentTxid,
      fundingOutpoint,
      clientPk,
      monitor,
      justice,
      1000,
      "watchtower_pubkey",
    );

    watchtower.register(reg);
    setRegistrations((prev) => [reg, ...prev]);
    addLog(`Registrado: ${fundingOutpoint.slice(0, 16)}...`);
    setFundingOutpoint("");
    setCommitmentTxid("");
  };

  return (
    <section id="watchtower-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ffd700]">§ 13.7</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffd700]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">WATCHTOWER</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            <span className="text-[#ffd700]">Watchtower</span> — Canal Monitor
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Monitora canais Lightning para breaches. Justice transactions broadcast automático.
            NOSTR kind 31350/31351.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">REGISTRAR CANAL</span>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className={`w-2 h-2 ${isRunning ? "bg-[#b6ff3a]" : "bg-red-500"}`} />
                <span className="text-zinc-400">{isRunning ? "ATIVO" : "PARADO"}</span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">FUNDING OUTPOINT (txid:vout)</span>
                <input
                  value={fundingOutpoint}
                  onChange={(e) => setFundingOutpoint(e.target.value)}
                  placeholder="aabb...:0"
                  className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ffd700]/50"
                />
              </div>
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">COMMITMENT TXID</span>
                <input
                  value={commitmentTxid}
                  onChange={(e) => setCommitmentTxid(e.target.value)}
                  placeholder="dead..."
                  className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#ffd700]/50"
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={!fundingOutpoint || !commitmentTxid}
              className={`w-full py-3 font-mono text-[10px] tracking-[0.2em] transition-all ${
                fundingOutpoint && commitmentTxid
                  ? "bg-[#ffd700] text-black hover:bg-white"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              REGISTRAR CANAL
            </button>

            {breaches.length > 0 && (
              <div className="mt-6">
                <span className="tag mb-3 block text-red-400">BREACHES DETECTADOS</span>
                {breaches.map((b, i) => (
                  <div key={i} className="p-3 bg-black border border-red-500/20 font-mono text-[10px] space-y-1 mb-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">canal</span>
                      <span className="text-red-400">{b.channelId.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">breach tx</span>
                      <span className="text-zinc-300">{b.breachTxid.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">justiça</span>
                      <span className={b.justiceBroadcast ? "text-[#b6ff3a]" : "text-red-400"}>
                        {b.justiceBroadcast ? "BROADCAST OK" : "FALHOU"}
                      </span>
                    </div>
                    {b.justiceTxid && (
                      <div className="text-[8px] text-zinc-500 break-all">
                        txid: {b.justiceTxid.slice(0, 32)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div>
              <span className="tag mb-3 block">REGISTROS ({registrations.length})</span>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar">
                {registrations.length === 0 ? (
                  <div className="font-mono text-[10px] text-zinc-600 italic">Nenhum canal registrado</div>
                ) : (
                  registrations.map((reg) => (
                    <div key={reg.id} className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">canal</span>
                        <span className="text-zinc-300">{reg.channelId.slice(0, 16)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">funding</span>
                        <span className="text-zinc-500 text-[8px]">{reg.fundingOutpoint.slice(0, 20)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">penalty</span>
                        <span className="text-[#b6ff3a]">{reg.breachPenaltySat} sats</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando...</div>
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
