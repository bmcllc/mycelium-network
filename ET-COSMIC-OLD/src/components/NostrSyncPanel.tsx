import { useRef, useState } from "react";
import { nostrSync, type SyncedTransaction } from "../crypto/nostrSync";

export default function NostrSyncPanel() {
  const [connected, setConnected] = useState(false);
  const [syncedTxs, setSyncedTxs] = useState<SyncedTransaction[]>([]);
  const [relays, setRelays] = useState<string[]>([]);
  const [nullifierCount, setNullifierCount] = useState(0);
  const [newRelay, setNewRelay] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => {
    setConnected(nostrSync.isConnected());
    setSyncedTxs(nostrSync.getSyncedTransactions());
    setRelays(nostrSync.getRelays());
    setNullifierCount(nostrSync.getNullifierCount());
  };

  const handleConnect = () => {
    nostrSync.connect();
    refresh();
    addLog(`Conectado a ${nostrSync.getRelays().length} relays NOSTR`);
  };

  const handleDisconnect = () => {
    nostrSync.disconnect();
    refresh();
    addLog("Desconectado dos relays");
  };

  const handleAddRelay = () => {
    if (!newRelay) return;
    nostrSync.addRelay(newRelay);
    refresh();
    addLog(`Relay adicionado: ${newRelay}`);
    setNewRelay("");
  };

  const handleRemoveRelay = (url: string) => {
    nostrSync.removeRelay(url);
    refresh();
    addLog(`Relay removido: ${url}`);
  };

  return (
    <section id="nostr-sync-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 13.12</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">NOSTR SYNC</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Sincronizacao <span className="text-[#6cf0ff]">NOSTR</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Camada de sincronizacao de transacoes ETRNET via NOSTR mesh. Kind 31214 com tag eternet_tx.
            Detecao de double-spend via nullifiers, broadcast para todos os relays.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CONTROLE DE CONEXAO</span>
              <span className={`font-mono text-[10px] ${connected ? "text-[#b6ff3a]" : "text-zinc-600"}`}>
                {connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleConnect}
                disabled={connected}
                className="py-3 bg-[#6cf0ff] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white disabled:opacity-50 transition-all"
              >
                CONECTAR
              </button>
              <button
                onClick={handleDisconnect}
                disabled={!connected}
                className="py-3 border border-red-500/30 text-red-400 font-mono text-[10px] tracking-[0.2em] hover:bg-red-500/10 disabled:opacity-50 transition-all"
              >
                DESCONECTAR
              </button>
            </div>

            <div className="mb-6">
              <span className="tag mb-3 block">GERENCIAR RELAYS</span>
              <div className="flex gap-2 mb-3">
                <input
                  value={newRelay}
                  onChange={(e) => setNewRelay(e.target.value)}
                  placeholder="wss://relay.example.com"
                  className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#6cf0ff]/50"
                />
                <button
                  onClick={handleAddRelay}
                  className="px-4 py-2 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white transition-all"
                >
                  ADD
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {relays.map((r) => (
                  <div key={r} className="flex items-center justify-between p-2 bg-black border border-[#14181c] font-mono text-[10px]">
                    <span className="text-zinc-400 truncate flex-1 mr-2">{r}</span>
                    <button
                      onClick={() => handleRemoveRelay(r)}
                      className="text-red-400 hover:text-red-300 text-[9px]"
                    >
                      REMOVER
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {syncedTxs.length > 0 && (
              <div>
                <span className="tag mb-3 block">TRANSACOES SINCRONIZADAS ({syncedTxs.length})</span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {syncedTxs.slice(0, 10).map((tx) => (
                    <div key={tx.txId} className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-300">{tx.txId.slice(0, 20)}...</span>
                        <span className={tx.valid ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                          {tx.valid ? "VALIDA" : "REJEITADA"}
                        </span>
                      </div>
                      <div className="text-zinc-600 text-[8px]">
                        relay: {tx.relaySource} | v: {tx.data.version} | nullifiers: {tx.data.nullifiers.length}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="tag mb-2">STATUS</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">estado</span>
                  <span className={connected ? "text-[#b6ff3a]" : "text-zinc-600"}>
                    {connected ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">relays</span>
                  <span className="text-[#6cf0ff]">{relays.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">tx sincronizadas</span>
                  <span className="text-zinc-300">{syncedTxs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">nullifiers</span>
                  <span className="text-[#ff3ad9]">{nullifierCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">public key</span>
                  <span className="text-zinc-400 text-[8px]">{nostrSync.getPublicKey().slice(0, 16)}...</span>
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="tag mb-2">PROTOCOLO</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">kind tx</span>
                  <span className="text-[#6cf0ff]">31214</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">tag</span>
                  <span className="text-zinc-300">eternet_tx</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">biblioteca</span>
                  <span className="text-zinc-300">nostr-tools</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">validacao</span>
                  <span className="text-zinc-300">nullifier store</span>
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                <div className="text-zinc-500 leading-relaxed">
                  Cada no escuta transacoes de outros nos e retransmite as proprias.
                  Nullifiers previnem double-spend. Transacoes invalidas sao rejeitadas silenciosamente.
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
