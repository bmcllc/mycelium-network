import { useState, useEffect } from "react";
import { mirageCompute, type MirageExecution } from "../crypto/mirageCompute";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function MirageComputePanel() {
  const [executions, setExecutions] = useState<MirageExecution[]>([]);
  const [enclaves, setEnclaves] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const refresh = () => {
      setExecutions(mirageCompute.getAllExecutions());
      setEnclaves(mirageCompute.getActiveEnclaves());
      setStats(mirageCompute.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) {
      setStatus("GHOSTID_REQUIRED — gere uma identidade primeiro");
      return;
    }

    setStatus("Fragmentando código e criando enclave efêmero...");
    const code = new TextEncoder().encode("console.log('Mirage Compute Executed')");
    const fragments = mirageCompute.fragmentCode(code, 3);

    try {
      const result = await mirageCompute.execute(fragments, [], identity, 50n);
      setStatus(`Execução ${result.id}: ${result.status} (${result.completedAt! - result.startedAt}ms)`);
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleFragment = () => {
    const code = new TextEncoder().encode("function compute() { return 42; }");
    const fragments = mirageCompute.fragmentCode(code, 3);
    setStatus(`Código fragmentado em ${fragments.length} fatias`);
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="2.2"
        kicker="EXECUÇÃO FANTASMA"
        title={<>Mirage Compute<span className="text-[#ff3ad9]">.</span></>}
        description="Computação onde ninguém sabe o que foi executado, onde nem por quem. Bytecode fragmentado, enclaves efêmeros, billing invisível."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">MIRAGE EXECUTION ENGINE</div>
          {status && (
            <div className="mb-3 p-2 bg-black border border-[#ff3ad9]/30 font-mono text-[10px] text-[#ff3ad9]">
              {status}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={handleFragment}
              className="py-2 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10"
            >
              FRAGMENTAR CÓDIGO
            </button>
            <button
              onClick={handleExecute}
              className="py-2 bg-[#ff3ad9] text-black font-mono text-[10px] hover:bg-white"
            >
              EXECUTAR EM ENCLAVE
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#ff3ad9]">{stats.totalExecutions}</div>
                <div className="tag mt-1">EXECUÇÕES</div>
              </div>
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#6cf0ff]">{stats.activeEnclaves}</div>
                <div className="tag mt-1">ENCLAVES ATIVOS</div>
              </div>
            </div>
          )}
        </div>

        {/* Active Enclaves */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">ENCLAVES EFÊMEROS (SGX/SEV — WASM REAL+)</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {enclaves.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center">
                Nenhum enclave ativo. Execute código acima.
              </div>
            ) : (
              enclaves.map((enclave: any) => (
                <div key={enclave.id} className="p-2 border border-[#ff3ad9]/20 bg-black">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#ff3ad9]">{enclave.id}</span>
                    <span className="text-[#b6ff3a]">ATIVO</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1">
                    expira em: {Math.max(0, Math.floor((enclave.expiresAt - Date.now()) / 1000))}s
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Executions */}
          <div className="mt-4">
            <div className="tag mb-2">EXECUÇÕES RECENTES</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {executions.slice(-5).reverse().map(exec => (
                <div key={exec.id} className="p-2 border border-[#14181c] bg-black text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">{exec.id.slice(0, 20)}...</span>
                    <span className={exec.status === "completed" ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                      {exec.status.toUpperCase()}
                    </span>
                  </div>
                  {exec.completedAt && (
                    <div className="text-zinc-600">
                      {exec.completedAt - exec.startedAt}ms | {exec.causalWitnesses.length} testemunhas
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Faturamento Invisível:</strong> UTXO fantasma embutido no shard de código paga o executor.
        <span className="text-[#ff3ad9]"> Nenhum nó sabe quem executou o quê.</span>
      </div>
    </section>
  );
}
