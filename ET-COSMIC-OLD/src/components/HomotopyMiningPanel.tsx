/**
 * HomotopyMining Panel — Mineração por Homotopia (Proof-of-Homotopia)
 *
 * Interface de mineração baseada em métricas Sobolev (H¹, H²)
 * e graus de liberdade topológicos.
 */

import { useState, useEffect, useRef } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { floatArrayFromMaterial, unit } from "../lib/moduleRealityBackend";
import {
  HomotopyMiner,
  homotopyMiner as homotopyMinerInstance,
  sobolevMetric,
  type SobolevMetric,
} from "../crypto/homotopyMining";

const getHomotopyMiner = () => homotopyMinerInstance;

export default function HomotopyMiningPanel() {
  const { material } = useOmegaMaterial(256);
  const [chain, setChain] = useState<ReturnType<HomotopyMiner["getChain"]>>([]);
  const [isMining, setIsMining] = useState(false);
  const [difficulty, setDifficulty] = useState(4);
  const [hashrate, setHashrate] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [sobolev, setSobolev] = useState<SobolevMetric | null>(null);
  const [chainValid, setChainValid] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const miner = getHomotopyMiner();

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const updateState = () => {
    setChain(miner.getChain());
    setChainValid(miner.validateChain(difficulty));
  };

  useEffect(() => {
    updateState();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [logs]);

  const generateField = (): number[] => {
    if (material) return floatArrayFromMaterial(material, 64, 1, 0);
    return new Array(64).fill(0);
  };

  const handleMine = async () => {
    if (isMining) return;
    setIsMining(true);
    setHashrate(0);
    addLog(`Mineração iniciada (dificuldade: ${difficulty})...`);

    const field = generateField();
    const metric = sobolevMetric(field);
    setSobolev(metric);
    addLog(`Campo gerado: H1=${metric.h1Norm.toFixed(4)}, H2=${metric.h2Norm.toFixed(4)}`);

    let iterations = 0;
    let tick = 0;
    const hashInterval = setInterval(() => {
      if (material) {
        iterations += Math.floor(unit(material, tick) * 500) + 100;
        setNonce(Math.floor(unit(material, tick + 1) * 1_000_000));
        tick = (tick + 2) % 64;
      }
      setHashrate(iterations);
    }, 100);

    // Executar mineração real em background
    setTimeout(() => {
      try {
        const block = miner.mineBlock(field, difficulty);
        addLog(
          `Bloco #${block.index} minerado! nonce=${block.nonce}, hash=${block.sobolevHash.substring(0, 16)}...`
        );
        setNonce(block.nonce);
        updateState();
      } catch (e: any) {
        addLog(`ERRO: ${e.message}`);
      } finally {
        clearInterval(hashInterval);
        setIsMining(false);
        setHashrate(0);
      }
    }, 50);
  };

  const formatHash = (hash: string): string => {
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const formatTimestamp = (ts: number): string => {
    return new Date(ts).toLocaleTimeString("pt-BR");
  };

  const latestBlock = chain.length > 0 ? chain[chain.length - 1] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#b6ff3a] font-mono">
            HOMOTOPY MINER
          </h1>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            PROOF-OF-HOMOTOPIA VIA SOBOLEV METRICS
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${
              chainValid ? "bg-[#b6ff3a] animate-pulse" : "bg-red-500"
            }`}
          />
          <span
            className={`text-[8px] font-mono ${
              chainValid ? "text-[#b6ff3a]" : "text-red-400"
            }`}
          >
            {chainValid ? "CADEIA VALIDA" : "CADEIA COMPROMETIDA"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Mining Stats + Controls */}
        <div className="space-y-4">
          {/* Mining Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-[#b6ff3a]">
                {hashrate.toLocaleString()}
              </div>
              <div className="text-[8px] text-zinc-500 font-mono">ITERACOES</div>
            </div>
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-[#6cf0ff]">
                {chain.length}
              </div>
              <div className="text-[8px] text-zinc-500 font-mono">
                BLOCOS
              </div>
            </div>
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-white">
                {difficulty}
              </div>
              <div className="text-[8px] text-zinc-500 font-mono">
                DIFICULDADE
              </div>
            </div>
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-[#ff3ad9]">
                {nonce.toLocaleString()}
              </div>
              <div className="text-[8px] text-zinc-500 font-mono">
                NONCE ATUAL
              </div>
            </div>
          </div>

          {/* Mine Button + Difficulty */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-3">
              CONTROLES DE MINERACAO
            </h2>
            <div className="mb-3">
              <label className="text-[8px] font-mono text-zinc-500 block mb-1">
                DIFICULDADE
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={difficulty}
                onChange={(e) => setDifficulty(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
                disabled={isMining}
              />
            </div>
            <button
              onClick={handleMine}
              disabled={isMining}
              className="w-full py-3 bg-[#b6ff3a] text-black font-mono text-sm font-bold rounded hover:bg-[#a3e635] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMining ? "MINERANDO..." : "MINERAR BLOCO"}
            </button>
            {isMining && (
              <div className="mt-2 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#b6ff3a] animate-pulse" />
                <span className="text-[8px] font-mono text-zinc-500">
                  Buscando nonce com prefixo {difficulty} zeros...
                </span>
              </div>
            )}
          </div>

          {/* Sobolev Metric */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-3">
              METRICA SOBOLEV
            </h2>
            {sobolev ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">Norma H1</span>
                  <span className="text-[#b6ff3a]">
                    {sobolev.h1Norm.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">Norma H2</span>
                  <span className="text-[#6cf0ff]">
                    {sobolev.h2Norm.toFixed(6)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[8px] font-mono text-zinc-600 mb-1">
                    HASH ESPECTRO
                  </div>
                  <div className="text-[8px] font-mono text-zinc-400 break-all bg-[#0c0e12] p-2 rounded">
                    {formatHash(sobolev.spectrumHash)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-700 text-xs font-mono py-4 text-center">
                Aguardando mineracao...
              </div>
            )}
          </div>
        </div>

        {/* Right: Blockchain Visualization */}
        <div className="lg:col-span-2 space-y-4">
          {/* Latest Block */}
          {latestBlock && (
            <div className="bg-[#080a0c] border border-[#b6ff3a]/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-1.5 rounded-full bg-[#b6ff3a] animate-pulse" />
                <h3 className="text-xs font-mono text-[#b6ff3a]">
                  ULTIMO BLOCO: #{latestBlock.index}
                </h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    INDEX
                  </div>
                  <div className="text-white font-mono text-sm">
                    {latestBlock.index}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    NONCE
                  </div>
                  <div className="text-white font-mono text-sm">
                    {latestBlock.nonce.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    TIMESTAMP
                  </div>
                  <div className="text-white font-mono text-sm">
                    {formatTimestamp(latestBlock.timestamp)}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    HASH
                  </div>
                  <div className="text-[#6cf0ff] font-mono text-sm break-all">
                    {formatHash(latestBlock.sobolevHash)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Block Chain */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-3">
              CADEIA DE BLOCOS HOMOTOPIA
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {chain
                .slice()
                .reverse()
                .map((block) => (
                  <div
                    key={block.index}
                    className="p-3 bg-[#0a0d10] border border-[#14181c] rounded"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#b6ff3a]/10 border border-[#b6ff3a]/20 flex items-center justify-center">
                          <span className="text-[8px] font-mono text-[#b6ff3a]">
                            {block.index}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500">
                          {block.index === 0 ? "GENESIS" : `BLOCO #${block.index}`}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-600">
                        {formatTimestamp(block.timestamp)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                      <div>
                        <span className="text-zinc-600">hash: </span>
                        <span className="text-zinc-400">
                          {formatHash(block.sobolevHash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-600">nonce: </span>
                        <span className="text-zinc-400">
                          {block.nonce.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {block.index > 0 && (
                      <div className="text-[8px] font-mono text-zinc-700 mt-1">
                        prev: {formatHash(block.previousHash)}
                      </div>
                    )}
                  </div>
                ))}
              {chain.length === 0 && (
                <div className="py-12 text-center text-zinc-700 font-mono text-xs italic uppercase tracking-widest">
                  Nenhum bloco minerado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Log */}
      <div
        className="mt-4 bg-[#080a0c] border border-[#14181c] rounded-lg p-3 h-36 overflow-y-auto"
        ref={logRef}
      >
        <h3 className="text-xs text-zinc-500 mb-2 font-mono">
          LOG DE MINERACAO
        </h3>
        {logs.length === 0 ? (
          <div className="text-zinc-600 text-xs font-mono">
            Aguardando mineracao...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-xs font-mono text-zinc-400 py-0.5">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
