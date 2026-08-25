import { useState, useEffect } from "react";
import { econet, type EcoNetEntry, type ForgettingProof } from "../crypto/econet";
import SectionHeader from "./SectionHeader";

export default function EcoNetPanel() {
  const [entries, setEntries] = useState<EcoNetEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [forgettingProof, setForgettingProof] = useState<ForgettingProof | null>(null);

  useEffect(() => {
    const refresh = () => {
      setEntries(econet.getActiveEntries());
      setStats(econet.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStore = () => {
    if (!input.trim()) return;
    const data = new TextEncoder().encode(input);
    econet.store(data);
    setStatus(`Dado armazenado com decaimento temporal. Decay rate: 0.1%/hora`);
    setInput("");
  };

  const handleForget = (id: string) => {
    const proof = econet.forget(id);
    if (proof) {
      setForgettingProof(proof);
      setStatus(`Entry ${id} esquecida. Prova ZK de destruição gerada.`);
    }
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="2.1"
        kicker="MEMÓRIA DISTRIBUÍDA"
        title={<>EcoNet<span className="text-[#6cf0ff]">.</span></>}
        description="A Memória Distribuída que Esquece. Uma DHT sobre CRDTs com decaimento temporal entrópico. Dados se dissolvem como sinapses não reforçadas."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Input */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">ARMazenAR DADO COM DECAIMENTO</div>
          {status && (
            <div className="mb-3 p-2 bg-black border border-[#6cf0ff]/30 font-mono text-[10px] text-[#6cf0ff]">
              {status}
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStore()}
              placeholder="Digite o dado para armazenar..."
              className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#6cf0ff]/50"
            />
            <button
              onClick={handleStore}
              className="px-4 py-2 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white"
            >
              ARMAZENAR
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#6cf0ff]">{stats.totalEntries}</div>
                <div className="tag mt-1">TOTAL ENTRIES</div>
              </div>
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#b6ff3a]">{stats.activeEntries}</div>
                <div className="tag mt-1">ATIVAS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#ff3ad9]">{stats.decayedEntries}</div>
                <div className="tag mt-1">DECAÍDAS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-zinc-400">{(stats.avgSignificance * 100).toFixed(1)}%</div>
                <div className="tag mt-1">SIGNIFICÂNCIA</div>
              </div>
            </div>
          )}
        </div>

        {/* Active Entries */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">ENTRADAS ATIVAS (NÃO ESQUECIDAS)</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center">
                Nenhuma entrada ativa. Armazene dados acima.
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="p-2 border border-[#14181c] bg-black">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#6cf0ff]">{entry.id}</span>
                    <button
                      onClick={() => handleForget(entry.id)}
                      className="text-[#ff3ad9] hover:text-white"
                    >
                      ESQUECER
                    </button>
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] font-mono text-zinc-500">
                    <span>significância: {(entry.significance * 100).toFixed(1)}%</span>
                    <span>acessos: {entry.accessCount}</span>
                    <span>decay: {(entry.decayRate * 100).toFixed(2)}%/h</span>
                  </div>
                  {/* Barra de decaimento */}
                  <div className="mt-1 h-1 bg-[#14181c]">
                    <div
                      className="h-full bg-gradient-to-r from-[#6cf0ff] to-[#ff3ad9]"
                      style={{ width: `${entry.significance * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Forgetting Proof */}
      {forgettingProof && (
        <div className="mt-6 p-4 border border-[#ff3ad9]/30 bg-[#ff3ad9]/5">
          <div className="tag mb-2">PROVA DE ESQUECIMENTO (ZK)</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div><span className="text-zinc-500">ENTRY:</span> <span className="text-zinc-300">{forgettingProof.entryId}</span></div>
            <div><span className="text-zinc-500">PROOF:</span> <span className="text-[#ff3ad9]">{forgettingProof.proofHash}</span></div>
            <div><span className="text-zinc-500">DECAY:</span> <span className="text-zinc-300">{(forgettingProof.decayLevel * 100).toFixed(1)}%</span></div>
            <div><span className="text-zinc-500">IRRECOVERABLE:</span> <span className="text-[#b6ff3a]">SIM</span></div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Fossilização Inversa:</strong> Bits menos significativos são corrompidos progressivamente pela entropia ambientente.
        <span className="text-[#6cf0ff]"> Dados amados sobrevivem; dados esquecidos se dissolvem.</span>
        Provas de Esquecimento: Zero-Knowledge Proofs atestam que o dado não é mais recuperável.
      </div>
    </section>
  );
}
