import { useState, useEffect, useCallback } from "react";
import {
  ShardValidator,
  minePoW,
  computeVDF,
  calculateSpamCost,
  type PoWProof,
  type VDFProof,
  type NetworkHealth,
} from "../crypto/antiSybil";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { deriveHexId, sybilInvalidProofs } from "../lib/moduleRealityBackend";

export default function AntiSybilLab() {
  const { material } = useOmegaMaterial(256);
  const [validator] = useState(() => new ShardValidator());
  const [health, setHealth] = useState<NetworkHealth>({
    totalShards: 0, acceptedShards: 0, rejectedShards: 0,
    avgPoWTimeMs: 0, currentDifficulty: 2, activeGhostIds: 0,
    storagePressure: 0, spamDetected: 0,
  });

  // PoW mining state
  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [lastPoW, setLastPoW] = useState<PoWProof | null>(null);
  const [lastVDF, setLastVDF] = useState<VDFProof | null>(null);

  // Simulation state
  const [simRunning, setSimRunning] = useState(false);
  const [legitShards, setLegitShards] = useState(0);
  const [spamShards, setSpamShards] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Economic analysis
  const spamCost = calculateSpamCost(1_000_000, 3, 1000, 1000);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 60));
  }, []);

  const refreshHealth = useCallback(() => {
    setHealth(validator.getHealth());
  }, [validator]);

  // Auto-refresh health
  useEffect(() => {
    const iv = setInterval(refreshHealth, 2000);
    return () => clearInterval(iv);
  }, [refreshHealth]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMinePoW = async () => {
    setIsMining(true);
    setMiningProgress(0);
    addLog("Iniciando mineração PoW para shard QEL...");

    const ghostId = material
      ? `void_◆_${deriveHexId(material, "ghost", 0, 4)}`
      : "void_◆_legit";
    const commitment = `commit_${Date.now()}`;
    const difficulty = validator.getDifficulty();

    addLog(`Dificuldade atual da rede: ${difficulty} zeros hex`);

    // Simulate progressive mining with UI updates
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 30));
      setMiningProgress((i + 1) * 5);
    }

    const proof = await minePoW(ghostId, commitment, difficulty);
    setLastPoW(proof);
    addLog(`✓ PoW minerado! Nonce: ${proof.nonce} | Iterações: ${proof.iterations}`);
    addLog(`  Hash: ${proof.hash.slice(0, 20)}... | Tempo: ${proof.elapsedMs.toFixed(1)}ms`);

    // Compute VDF
    addLog("Computando VDF sequencial (não paralelizável)...");
    const vdf = computeVDF(commitment, 1000, `challenge_${Date.now()}`);
    setLastVDF(vdf);
    addLog(`✓ VDF completo! ${vdf.iterations} iterações | ${vdf.elapsedMs.toFixed(1)}ms`);

    // Validate
    const result = validator.validateShard(ghostId, commitment, proof, vdf);
    if (result.accepted) {
      addLog(`✓ Shard ACEITO pela rede! PoW + VDF + Rate Limit válidos.`);
    } else {
      addLog(`✗ Shard REJEITADO: ${result.reason}`);
    }

    setIsMining(false);
    refreshHealth();
  };

  const handleStartSpamSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    setLegitShards(0);
    setSpamShards(0);
    addLog("=== INICIANDO ATAQUE SYBIL (Ω) ===");
    addLog("Cenário: 1 usuário legítimo vs. 10.000 bots de spam");

    let legitCount = 0;
    let spamCount = 0;
    let spamRejected = 0;
    const totalTicks = 50;
    let tick = 0;

    const interval = setInterval(async () => {
      tick++;

      // Legitimate user: 1 shard every 2 ticks, proper PoW + VDF
      if (tick % 2 === 0) {
        const ghostId = `legit_user_001`;
        const commitment = `legit_${Date.now()}_${tick}`;
        const difficulty = validator.getDifficulty();
        const pow = await minePoW(ghostId, commitment, difficulty, 500000);
        const vdf = computeVDF(commitment, 500, `ch_${tick}`);
        const res = validator.validateShard(ghostId, commitment, pow, vdf);
        if (res.accepted) legitCount++;
      }

      // Spam bot army: provas inválidas determinísticas (Ω) — devem ser rejeitadas
      for (let b = 0; b < 200; b++) {
        const commitment = `spam_${Date.now()}_${b}`;
        const botId = material
          ? `bot_${deriveHexId(material, commitment, b, 4)}`
          : `bot_${b}`;
        const difficulty = validator.getDifficulty();
        const invalid =
          material != null
            ? sybilInvalidProofs(material, commitment, difficulty, b)
            : {
                pow: {
                  nonce: 0,
                  hash: "00",
                  difficulty,
                  timestamp: Date.now(),
                  iterations: 1,
                  elapsedMs: 1,
                },
                vdf: {
                  input: commitment,
                  result: "00",
                  iterations: 1,
                  elapsedMs: 1,
                  challenge: "00",
                },
              };
        const res = validator.validateShard(botId, commitment, invalid.pow, invalid.vdf);
        if (!res.accepted) spamRejected++;
        spamCount++;
      }

      setLegitShards(legitCount);
      setSpamShards(spamCount);
      refreshHealth();

      if (tick >= totalTicks) {
        clearInterval(interval);
        setSimRunning(false);
        addLog("=== ATAQUE SYBIL CONCLUÍDO ===");
        addLog(`Shards legítimos aceitos: ${legitCount}`);
        addLog(`Shards de spam rejeitados: ${spamRejected} / ${spamCount}`);
        addLog(`Taxa de rejeição de spam: ${((spamRejected / Math.max(1, spamCount)) * 100).toFixed(1)}%`);
        addLog(`Dificuldade final da rede: ${validator.getDifficulty()}`);
      }
    }, 100);
  };

  const handleReset = () => {
    validator.reset();
    setLegitShards(0);
    setSpamShards(0);
    setLastPoW(null);
    setLastVDF(null);
    setLogs([]);
    refreshHealth();
    addLog("Validador resetado. Rede limpa.");
  };

  return (
    <section className="border border-[#14181c] bg-[#070809]">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-[#14181c] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">§ 4.0</span>
              <span className="h-px w-12 bg-[#ff3ad9]/40" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">ANTI-SYBIL / ANTI-SPAM</span>
            </div>
            <h3 className="font-sans text-2xl text-zinc-100">
              Defesa contra Spam na Fragmentação <span className="text-[#ff3ad9]">QEL</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-zinc-500">DIFICULDADE DA REDE</div>
            <div className="font-mono text-2xl text-[#ff3ad9]">{health.currentDifficulty}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Network Health + Controls */}
          <div className="lg:col-span-5 space-y-5">
            {/* Network Health Dashboard */}
            <div className="border border-[#14181c] bg-black p-4">
              <div className="tag mb-3">SAÚDE DA REDE</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border border-[#14181c] text-center">
                  <div className="font-mono text-lg text-[#b6ff3a]">{health.acceptedShards}</div>
                  <div className="tag">ACEITOS</div>
                </div>
                <div className="p-2 border border-[#14181c] text-center">
                  <div className="font-mono text-lg text-[#ff3ad9]">{health.rejectedShards}</div>
                  <div className="tag">REJEITADOS</div>
                </div>
                <div className="p-2 border border-[#14181c] text-center">
                  <div className="font-mono text-lg text-zinc-300">{health.activeGhostIds}</div>
                  <div className="tag">GHOSTIDs</div>
                </div>
                <div className="p-2 border border-[#14181c] text-center">
                  <div className="font-mono text-lg text-[#6cf0ff]">{health.spamDetected}</div>
                  <div className="tag">SPAM BLOQ.</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>Storage Pressure</span>
                  <span className={health.storagePressure > 80 ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>{health.storagePressure.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-[#14181c]">
                  <div className="h-full bg-[#b6ff3a] transition-all" style={{ width: `${Math.min(100, health.storagePressure)}%`, background: health.storagePressure > 80 ? "#ff3ad9" : "#b6ff3a" }} />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-zinc-500">
                  <span>Avg PoW Time</span>
                  <span className="text-zinc-300">{health.avgPoWTimeMs.toFixed(0)}ms</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="tag mb-3">CONTROLES</div>
              <div className="space-y-2">
                <button
                  onClick={handleMinePoW}
                  disabled={isMining}
                  className="w-full py-2.5 bg-[#b6ff3a] text-black font-mono text-xs tracking-wider hover:bg-white disabled:opacity-50 transition-colors"
                >
                  {isMining ? `MINERANDO PoW... ${miningProgress}%` : "MINERAR PoW + VDF PARA SHARD"}
                </button>
                <button
                  onClick={handleStartSpamSim}
                  disabled={simRunning}
                  className="w-full py-2.5 border border-[#ff3ad9]/40 text-[#ff3ad9] font-mono text-xs tracking-wider hover:bg-[#ff3ad9]/10 disabled:opacity-50 transition-colors"
                >
                  {simRunning ? "ATAQUE EM CURSO..." : "EXECUTAR ATAQUE SYBIL (10K BOTS Ω)"}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2 border border-zinc-700 text-zinc-500 font-mono text-xs hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  RESETAR REDE
                </button>
              </div>
            </div>

            {/* Economic Cost */}
            <div className="border border-[#14181c] bg-black p-4">
              <div className="tag mb-3">CUSTO ECONÔMICO DO SPAM</div>
              <div className="space-y-2 font-mono text-[10px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Shards/hora (ataque):</span>
                  <span className="text-[#ff3ad9]">1.000.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Dificuldade PoW:</span>
                  <span>{spamCost.totalCpuHours > 100 ? "3" : "2"}</span>
                </div>
                <div className="flex justify-between">
                  <span>CPU total (horas):</span>
                  <span className="text-[#ff3ad9]">{spamCost.totalCpuHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>CPU/dispositivo:</span>
                  <span>{spamCost.cpuHoursPerDevice}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Drain bateria/dispositivo:</span>
                  <span className="text-[#ff3ad9]">{spamCost.batteryDrainPercent}%</span>
                </div>
                <div className="flex justify-between border-t border-[#14181c] pt-2">
                  <span>Custo estimado (USD):</span>
                  <span className="text-[#ff3ad9] font-bold">${spamCost.estimatedCostUSD}</span>
                </div>
              </div>
              <div className="mt-3 font-mono text-[9px] text-zinc-600 leading-relaxed">
                Para 1M shards/hora com dificuldade 3, um atacante precisa de {spamCost.totalCpuHours}h de CPU contínua.
                Em 1000 smartphones, isso drena {spamCost.batteryDrainPercent}% da bateria por hora — inviável.
              </div>
            </div>
          </div>

          {/* Right: Mining Viz + Simulation Results + Logs */}
          <div className="lg:col-span-7 space-y-5">
            {/* PoW Mining Visualization */}
            {(isMining || lastPoW) && (
              <div className="border border-[#14181c] bg-[#0a0d10] p-4">
                <div className="tag mb-3">MINERAÇÃO PoW + VDF</div>
                {isMining && (
                  <div className="mb-3">
                    <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-1">
                      <span>Progresso</span>
                      <span>{miningProgress}%</span>
                    </div>
                    <div className="h-2 bg-black border border-[#14181c]">
                      <div className="h-full bg-[#b6ff3a] transition-all" style={{ width: `${miningProgress}%` }} />
                    </div>
                  </div>
                )}
                {lastPoW && (
                  <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                    <div className="bg-black p-2 border border-[#14181c]">
                      <div className="text-zinc-600">PoW RESULT</div>
                      <div className="text-[#b6ff3a] mt-1">Nonce: {lastPoW.nonce}</div>
                      <div className="text-zinc-400">Hash: {lastPoW.hash.slice(0, 24)}...</div>
                      <div className="text-zinc-400">Difficulty: {lastPoW.difficulty}</div>
                      <div className="text-zinc-400">Time: {lastPoW.elapsedMs.toFixed(1)}ms</div>
                    </div>
                    {lastVDF && (
                      <div className="bg-black p-2 border border-[#14181c]">
                        <div className="text-zinc-600">VDF RESULT</div>
                        <div className="text-[#6cf0ff] mt-1">Iterations: {lastVDF.iterations}</div>
                        <div className="text-zinc-400">Result: {lastVDF.result.slice(0, 24)}...</div>
                        <div className="text-zinc-400">Time: {lastVDF.elapsedMs.toFixed(1)}ms</div>
                        <div className="text-zinc-400">Challenge: {lastVDF.challenge.slice(0, 16)}...</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Simulation Results */}
            {(legitShards > 0 || spamShards > 0) && (
              <div className="border border-[#14181c] bg-black p-4">
                <div className="tag mb-3">RESULTADO DO ATAQUE SYBIL</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 border border-[#b6ff3a]/20">
                    <div className="font-mono text-xl text-[#b6ff3a]">{legitShards}</div>
                    <div className="font-mono text-[9px] text-zinc-500">LEGIT ACCEPTED</div>
                  </div>
                  <div className="text-center p-2 border border-[#ff3ad9]/20">
                    <div className="font-mono text-xl text-[#ff3ad9]">{spamShards}</div>
                    <div className="font-mono text-[9px] text-zinc-500">SPAM ATTEMPTS</div>
                  </div>
                  <div className="text-center p-2 border border-[#6cf0ff]/20">
                    <div className="font-mono text-xl text-[#6cf0ff]">
                      {spamShards > 0 ? ((health.spamDetected / spamShards) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="font-mono text-[9px] text-zinc-500">SPAM BLOCKED</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-zinc-500 leading-relaxed">
                  O usuário legítimo enviou {legitShards} shards com PoW+VDF válidos — todos aceitos.
                  O exército de {spamShards} bots de spam foi bloqueado porque:
                  (1) PoW falso não satisfaz dificuldade, (2) VDF falso falha verificação sequencial,
                  (3) Rate limit por GhostID esgota créditos após poucos shards.
                </div>
              </div>
            )}

            {/* Terminal Logs */}
            <div className="border border-[#14181c] bg-black p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="tag">VALIDATOR LOG</span>
                <button onClick={() => setLogs([])} className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400">CLEAR</button>
              </div>
              <div className="h-48 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="border-l-2 border-[#14181c] pl-2">{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Explanation */}
        <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed grid md:grid-cols-3 gap-6">
          <div>
            <span className="text-[#ff3ad9] font-bold">1. DYNAMIC PoW (HASHCASH)</span>
            <p className="mt-1">Cada shard QEL exige PoW com dificuldade ajustada pela carga da rede. Dificuldade cresce logaritmicamente com shards/segundo. Alvo: ~500ms de CPU por shard em dispositivo médio.</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">2. VDF SEQUENCIAL</span>
            <p className="mt-1">Verifiable Delay Function com N iterações sequenciais de SHA3-256. Não paralelizável — prova que o remetente realmente gastou tempo (e bateria). Cada iteração depende da anterior.</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">3. RATE LIMITING + ECONOMIA</span>
            <p className="mt-1">Token bucket por GhostID: créditos regeneram a 1/s, custo de 5 por shard, bônus de 10 por VDF válido. Spam em massa exige {spamCost.totalCpuHours}h de CPU — custo de ${spamCost.estimatedCostUSD} para 1M shards.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
