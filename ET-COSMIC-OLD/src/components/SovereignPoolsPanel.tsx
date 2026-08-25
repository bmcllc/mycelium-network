import { useState, useEffect } from "react";
import { sovereignPools, type SIPPool, type HiddenProposal } from "../crypto/sovereignPools";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function SovereignPoolsPanel() {
  const [pools, setPools] = useState<SIPPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>("");
  const [proposals, setProposals] = useState<HiddenProposal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const refresh = () => {
      setPools(sovereignPools.getAllPools());
      if (selectedPool) {
        setProposals(sovereignPools.getProposals(selectedPool));
      }
      setStats(sovereignPools.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [selectedPool]);

  const handleCreatePool = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }

    sovereignPools.createPool(
      {
        name: `SIP-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        strategy: "Multi-asset sovereign yield",
        minInvestment: 100n,
        maxInvestors: 100,
        performanceFeeRate: 0.1,
        managementFeeRate: 0.02,
      },
      identity,
    );
    setStatus("Novo SIP Pool criado");
  };

  const handleInvest = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity || !selectedPool) return;
    try {
      sovereignPools.invest(selectedPool, 500n, identity);
      setStatus("Investimento de $500 realizado");
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleProposal = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity || !selectedPool) return;
    const strategy = new TextEncoder().encode("Yield farm 60% SOV + 40% ETBRL LP");
    sovereignPools.submitProposal(selectedPool, "Estratégia de yield farm", strategy, identity);
    setStatus("Proposta oculta submetida");
  };

  const handleVote = (proposalId: string, support: boolean) => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) return;
    sovereignPools.vote(proposalId, support, identity);
    setStatus(`Voto ZK: ${support ? "a favor" : "contra"}`);
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="3.3"
        kicker="FUNDOS SOBERANOS"
        title={<>Sovereign Pools<span className="text-[#b6ff3a]">.</span></>}
        description="Fundos com Gestor Fantasma. O SynthManager é um GhostID público cuja chave privada é gerada por threshold signature entre os cotistas."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pools */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="tag">SIP POOLS</div>
            <button
              onClick={handleCreatePool}
              className="px-3 py-1 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white"
            >
              + CRIAR
            </button>
          </div>

          {status && (
            <div className="mb-3 p-2 bg-black border border-[#b6ff3a]/30 font-mono text-[10px] text-[#b6ff3a]">
              {status}
            </div>
          )}

          <div className="space-y-2">
            {pools.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center border border-[#14181c] bg-black">
                Nenhum pool. Crie um acima.
              </div>
            ) : (
              pools.map(pool => (
                <div
                  key={pool.id}
                  onClick={() => setSelectedPool(pool.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedPool === pool.id
                      ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-200">{pool.config.name}</span>
                    <span className="text-[#b6ff3a]">NAV {pool.nav.toFixed(2)}</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    Assets: {pool.totalAssets} | Investidores: {pool.investorCount}
                  </div>
                </div>
              ))
            )}
          </div>

          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#b6ff3a]">{stats.totalPools}</div>
                <div className="tag mt-1">POOLS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#6cf0ff]">{stats.totalInvestors}</div>
                <div className="tag mt-1">INVESTIDORES</div>
              </div>
            </div>
          )}
        </div>

        {/* Proposals */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="tag">PROPOSTAS OCULTAS</div>
            <button
              onClick={handleProposal}
              disabled={!selectedPool}
              className="px-3 py-1 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10 disabled:opacity-50"
            >
              + PROPOSTA
            </button>
          </div>

          <div className="space-y-2">
            {proposals.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center border border-[#14181c] bg-black">
                Nenhuma proposta para este pool
              </div>
            ) : (
              proposals.map(prop => (
                <div key={prop.id} className="p-3 border border-[#ff3ad9]/20 bg-black">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-zinc-300">{prop.description}</span>
                    <span className={`${
                      prop.status === "approved" ? "text-[#b6ff3a]" :
                      prop.status === "rejected" ? "text-[#ff3ad9]" : "text-zinc-500"
                    }`}>
                      {prop.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] font-mono">
                    <span className="text-[#b6ff3a]">+{prop.votesFor}</span>
                    <span className="text-[#ff3ad9]">-{prop.votesAgainst}</span>
                    <span className="text-zinc-600">{prop.totalVoters} votantes</span>
                  </div>
                  {prop.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleVote(prop.id, true)}
                        className="flex-1 py-1 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] hover:bg-[#b6ff3a]/10"
                      >
                        VOTAR SIM
                      </button>
                      <button
                        onClick={() => handleVote(prop.id, false)}
                        className="flex-1 py-1 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10"
                      >
                        VOTAR NÃO
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invest */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">INVESTIR NO POOL</div>
          <button
            onClick={handleInvest}
            disabled={!selectedPool}
            className="w-full py-3 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50 mb-4"
          >
            INVESTIR $500 NO POOL SELECIONADO
          </button>

          <div className="p-3 border border-[#14181c] bg-black text-[10px] font-mono text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Incentivo Anti-Centralização:</strong> Taxa de performance
            é distribuída aos votantes da proposta vencedora — não a um gestor central.
          </div>
        </div>
      </div>
    </section>
  );
}
