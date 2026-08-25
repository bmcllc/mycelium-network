/**
 * ETΞRNET — Painel do PoW Faucet (Emissão por Trabalho Real)
 *
 * Interface para minerar tokens ETR via prova de trabalho SHA3-512.
 * Substitui o minerador fake por hashcash genuíno.
 */

import { useCallback, useRef, useState } from "react";
import { Zap, Coins, Clock, Cpu } from "lucide-react";
import { powFaucet, type FaucetChallenge, type FaucetStats } from "../crypto/powFaucet";

export default function PoWFaucetPanel() {
  const [stats, setStats] = useState<FaucetStats>(() => powFaucet.getStats());
  const [mining, setMining] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<FaucetChallenge | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastResult, setLastResult] = useState<"success" | "timeout" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 30));
  }, []);

  const refreshStats = useCallback(() => {
    setStats(powFaucet.getStats());
  }, []);

  const handleMine = useCallback(async () => {
    if (mining) return;

    setMining(true);
    setLastResult(null);
    setElapsed(0);

    // Cria desafio
    const challenge = powFaucet.createChallenge();
    setCurrentChallenge(challenge);
    addLog(`Desafio criado: ${challenge.id}`);
    addLog(`Dificuldade: ${challenge.difficulty} bits zero`);
    addLog(`SHA3-512(challenge || nonce) < 2^${256 - challenge.difficulty}`);

    // Timer para elapsed
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    addLog("Minerando... (pode levar 1-30s)");

    // Mine
    const solution = await powFaucet.mineChallenge(challenge.id);

    if (timerRef.current) clearInterval(timerRef.current);

    if (solution) {
      solution.solverPk = "local_user";
      const valid = powFaucet.verifySolution(solution);
      if (valid) {
        addLog(`SUCESSO! Nonce encontrado em ${Date.now() - startTimeRef.current}ms`);
        addLog(`Hash: ${Array.from(solution.hash.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);
        addLog(`Recompensa: ${challenge.reward} wei`);
        setLastResult("success");
      } else {
        addLog("ERRO: Solução inválida (inesperado)");
        setLastResult("timeout");
      }
    } else {
      addLog("Limite de tentativas atingido — tente novamente");
      setLastResult("timeout");
    }

    setCurrentChallenge(null);
    setMining(false);
    refreshStats();
  }, [mining, addLog, refreshStats]);

  const handleDifficultyChange = useCallback((d: number) => {
    powFaucet.setDifficulty(d);
    refreshStats();
  }, [refreshStats]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const ms2 = ms % 1000;
    return `${s}.${ms2.toString().padStart(3, '0')}s`;
  };

  return (
    <section id="pow-faucet" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 4.0</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">EMISSÃO POR TRABALHO</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            PoW <span className="text-[#b6ff3a]">Faucet</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Emissão de tokens ETR via prova de trabalho real — SHA3-512 hashcash.
            Sem ilusão de lucro: cada token exige CPU genuína.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Main */}
          <div className="lg:col-span-8 bg-[#0a0d10] p-6 md:p-8">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">DIFICULDADE</div>
                <div className="font-mono text-lg text-[#b6ff3a]">{stats.difficulty} bits</div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">RECOMPENSA</div>
                <div className="font-mono text-lg text-[#6cf0ff]">{stats.reward.toString()} wei</div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">TOTAL MINERADO</div>
                <div className="font-mono text-lg text-[#ffd700]">{stats.totalMined.toString()}</div>
              </div>
              <div className="p-3 bg-black border border-[#14181c]">
                <div className="font-mono text-[9px] text-zinc-500 mb-1">TEMPO MÉDIO</div>
                <div className="font-mono text-lg text-[#ff3ad9]">
                  {stats.averageSolveTimeMs > 0 ? formatMs(Math.round(stats.averageSolveTimeMs)) : "—"}
                </div>
              </div>
            </div>

            {/* Mining Controls */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">MINERAÇÃO</span>
                {mining && (
                  <span className="font-mono text-[10px] text-[#b6ff3a] animate-pulse">
                    MINERANDO... {formatMs(elapsed)}
                  </span>
                )}
              </div>

              {/* Dificuldade slider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[9px] text-zinc-500 w-20">DIFICULDADE:</span>
                <input
                  type="range"
                  min={12}
                  max={28}
                  step={1}
                  value={stats.difficulty}
                  onChange={(e) => handleDifficultyChange(Number(e.target.value))}
                  disabled={mining}
                  className="flex-1 h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#b6ff3a]"
                />
                <span className="font-mono text-[10px] text-[#b6ff3a] w-16 text-right">
                  {stats.difficulty} bits
                </span>
                <span className="font-mono text-[8px] text-zinc-600 w-24">
                  (~{Math.pow(2, stats.difficulty - 16).toFixed(0)}s estimado)
                </span>
              </div>

              <button
                onClick={handleMine}
                disabled={mining}
                className="w-full font-mono text-sm tracking-wider py-3 bg-[#b6ff3a] text-black hover:bg-[#b6ff3a]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {mining ? (
                  <>
                    <Cpu className="size-4 animate-spin" />
                    MINERANDO SHA3-512...
                  </>
                ) : (
                  <>
                    <Zap className="size-4" />
                    INICIAR MINERAÇÃO PoW
                  </>
                )}
              </button>
            </div>

            {/* Resultado */}
            {lastResult && (
              <div
                className={`mb-6 p-4 border ${
                  lastResult === "success"
                    ? "border-[#b6ff3a]/40 bg-[#b6ff3a]/5"
                    : "border-[#ff3ad9]/40 bg-[#ff3ad9]/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {lastResult === "success" ? (
                    <>
                      <Coins className="size-5 text-[#b6ff3a]" />
                      <span className="font-mono text-sm text-[#b6ff3a]">
                        TOKEN ETR MINERADO COM SUCESSO
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="size-5 text-[#ff3ad9]" />
                      <span className="font-mono text-sm text-[#ff3ad9]">
                        LIMITE DE TENTATIVAS — REDUZA A DIFICULDADE
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Desafio atual */}
            {currentChallenge && (
              <div className="mb-6 p-4 bg-black border border-[#6cf0ff]/30">
                <div className="font-mono text-[9px] text-zinc-500 mb-2">DESAFIO ATIVO</div>
                <div className="font-mono text-[10px] text-[#6cf0ff] break-all">
                  {Array.from(currentChallenge.challenge).map(b => b.toString(16).padStart(2, '0')).join('')}
                </div>
                <div className="mt-2 font-mono text-[9px] text-zinc-600">
                  Encontrar nonce tal que SHA3-512(desafio || nonce) comece com {currentChallenge.difficulty} bits zero
                </div>
              </div>
            )}

            {/* Logs */}
            <div>
              <span className="tag mb-2 block">LOGS</span>
              <div className="bg-black border border-[#14181c] p-3 h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="font-mono text-[10px] text-zinc-600">Aguardando ação...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="font-mono text-[10px] text-zinc-400 py-0.5">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 bg-black p-6 md:p-8">
            <span className="tag mb-3 block">COMO FUNCIONA</span>
            <div className="space-y-3 font-mono text-[10px] text-zinc-400">
              <div className="p-2 bg-[#0a0d10] border border-[#14181c]">
                <span className="text-[#b6ff3a]">1.</span> Servidor gera desafio aleatório (32 bytes)
              </div>
              <div className="p-2 bg-[#0a0d10] border border-[#14181c]">
                <span className="text-[#6cf0ff]">2.</span> Browser tenta nonces até encontrar hash com bits zero suficientes
              </div>
              <div className="p-2 bg-[#0a0d10] border border-[#14181c]">
                <span className="text-[#ff3ad9]">3.</span> Solução verificada: SHA3-512(challenge || nonce) {'<'} target
              </div>
              <div className="p-2 bg-[#0a0d10] border border-[#14181c]">
                <span className="text-[#ffd700]">4.</span> DAO emite UTXO de recompensa para o resolvedor
              </div>
            </div>

            <div className="mt-6 p-3 bg-[#0a0d10] border border-[#14181c]">
              <span className="font-mono text-[9px] text-zinc-500 block mb-2">FÓRMULA</span>
              <div className="font-mono text-[9px] text-[#b6ff3a]">
                SHA3-512(challenge || nonce) {'<'} 2^(256-difficulty)
              </div>
              <div className="mt-2 font-mono text-[8px] text-zinc-600">
                difficulty=20 → ~1M tentativas → ~1-3s no browser
              </div>
            </div>

            <div className="mt-6 p-3 bg-[#0a0d10] border border-[#14181c]">
              <span className="font-mono text-[9px] text-zinc-500 block mb-2">HASHCASH REAL</span>
              <ul className="space-y-1 font-mono text-[9px] text-zinc-600">
                <li>• SHA3-512 (NIST standard)</li>
                <li>• Nonce aleatório (crypto.getRandomValues)</li>
                <li>• Sem shortcut — CPU ou nada</li>
                <li>• Dificuldade ajustável pela DAO</li>
              </ul>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-400">Nota:</strong> Isso não é mineração de blockchain.
              É emissão social — tokens distribuídos por trabalho computacional real,
              sem promessa de lucro especulativo.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
