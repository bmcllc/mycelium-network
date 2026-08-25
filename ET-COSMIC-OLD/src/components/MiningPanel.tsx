/**
 * VØID Mining Panel — Interface de mineração crypto
 */

import { useState, useEffect, useRef } from "react";
import { Cpu, Zap, Pause, Play, Activity, Coins, Clock, Wifi, WifiOff } from "lucide-react";
import { cryptoMiner, type MiningStats } from "../crypto/cryptoMiner";

export default function MiningPanel() {
  const [stats, setStats] = useState<MiningStats>({
    hashrate: 0,
    sharesFound: 0,
    sharesAccepted: 0,
    sharesRejected: 0,
    earnings: 0,
    uptime: 0,
    isRunning: false,
    pool: "",
    algorithm: "",
  });
  const [proxyUrl, setProxyUrl] = useState("ws://localhost:8443");
  const [poolUrl, setPoolUrl] = useState("gulf.moneroocean.stream");
  const [poolPort, setPoolPort] = useState("10128");
  const [walletAddress, setWalletAddress] = useState("");
  const [workerName, setWorkerName] = useState("void-node-001");
  const [algorithm, setAlgorithm] = useState<"randomx" | "kawpow" | "ethash" | "argon2">("randomx");
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const statsInterval = useRef<number | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    return () => {
      if (statsInterval.current) clearInterval(statsInterval.current);
      cryptoMiner.stop();
    };
  }, []);

  const updateStats = () => {
    setStats(cryptoMiner.getStats());
  };

  const handleConnect = async () => {
    if (!walletAddress) {
      addLog("ERRO: Insira o endereço da carteira");
      return;
    }

    addLog(`Conectando a ${poolUrl}:${poolPort}...`);

    const success = await cryptoMiner.init({
      proxyUrl,
      poolUrl,
      poolPort: parseInt(poolPort),
      walletAddress,
      workerName,
      algorithm,
    });

    if (success) {
      setConnected(true);
      addLog(`Conectado! Pool: ${poolUrl}`);
      addLog(`Carteira: ${walletAddress.slice(0, 12)}...`);
      addLog(`Worker: ${workerName}`);
    } else {
      addLog("ERRO: Falha ao conectar ao pool");
    }
  };

  const handleStart = () => {
    cryptoMiner.start();
    addLog("Mineração iniciada!");
    statsInterval.current = window.setInterval(updateStats, 1000);
  };

  const handleStop = () => {
    cryptoMiner.stop();
    if (statsInterval.current) clearInterval(statsInterval.current);
    addLog("Mineração parada");
    updateStats();
  };

  const formatHashrate = (hs: number): string => {
    if (hs >= 1000000) return `${(hs / 1000000).toFixed(2)} MH/s`;
    if (hs >= 1000) return `${(hs / 1000).toFixed(2)} KH/s`;
    return `${hs} H/s`;
  };

  const formatUptime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${s % 60}s`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#b6ff3a] mb-6 flex items-center gap-2">
        <Cpu className="size-6" />
        VØID MINER
      </h1>

      {/* Configuração do Pool */}
      <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 mb-4">
        <h2 className="text-sm font-mono text-zinc-400 mb-3">CONFIGURAÇÃO DO POOL</h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Proxy WebSocket</label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="ws://localhost:8443"
              className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
              disabled={stats.isRunning}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Pool URL</label>
            <input
              type="text"
              value={poolUrl}
              onChange={(e) => setPoolUrl(e.target.value)}
              className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
              disabled={stats.isRunning}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Porta do Pool (TCP/Stratum)</label>
            <input
              type="text"
              value={poolPort}
              onChange={(e) => setPoolPort(e.target.value)}
              className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
              disabled={stats.isRunning}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-zinc-500 block mb-1">Endereço da Carteira</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="4xxxxx... (Monero) ou RXxxx... (Ravencoin)"
            className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300 placeholder-zinc-600"
            disabled={stats.isRunning}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Worker</label>
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
              disabled={stats.isRunning}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Algoritmo</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as any)}
              className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300"
              disabled={stats.isRunning}
            >
              <option value="randomx">RandomX (Monero)</option>
              <option value="kawpow">KAWPOW (Ravencoin)</option>
              <option value="ethash">Ethash (Ethereum Classic)</option>
              <option value="argon2">Argon2 (VØID)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={stats.isRunning || connected}
          className="w-full bg-[#b6ff3a] text-black font-mono text-sm py-2 rounded hover:bg-[#a3e635] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connected ? "CONECTADO" : "CONECTAR AO POOL"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
          <Zap className="size-5 text-[#b6ff3a] mx-auto mb-1" />
          <div className="text-lg font-mono text-[#b6ff3a]">{formatHashrate(stats.hashrate)}</div>
          <div className="text-xs text-zinc-500">HASHRATE</div>
        </div>
        <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
          <Activity className="size-5 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-mono text-blue-400">{stats.sharesAccepted}</div>
          <div className="text-xs text-zinc-500">SHARES ACEITAS</div>
        </div>
        <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
          <Coins className="size-5 text-yellow-400 mx-auto mb-1" />
          <div className="text-lg font-mono text-yellow-400">{stats.earnings.toFixed(6)}</div>
          <div className="text-xs text-zinc-500">GANHOS</div>
        </div>
        <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 text-center">
          <Clock className="size-5 text-zinc-400 mx-auto mb-1" />
          <div className="text-lg font-mono text-zinc-300">{formatUptime(stats.uptime)}</div>
          <div className="text-xs text-zinc-500">UPTIME</div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleStart}
          disabled={!connected || stats.isRunning}
          className="flex-1 bg-green-600 text-white font-mono text-sm py-3 rounded flex items-center justify-center gap-2 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="size-4" />
          INICIAR MINERAÇÃO
        </button>
        <button
          onClick={handleStop}
          disabled={!stats.isRunning}
          className="flex-1 bg-red-600/20 text-red-400 border border-red-600/30 font-mono text-sm py-3 rounded flex items-center justify-center gap-2 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pause className="size-4" />
          PARAR
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-4 text-sm font-mono">
        {connected ? (
          <>
            <Wifi className="size-4 text-green-400" />
            <span className="text-green-400">CONECTADO</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">{stats.pool}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">{stats.algorithm}</span>
          </>
        ) : (
          <>
            <WifiOff className="size-4 text-zinc-600" />
            <span className="text-zinc-600">DESCONECTADO</span>
          </>
        )}
      </div>

      {/* Logs */}
      <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-3 h-48 overflow-y-auto">
        <h3 className="text-xs text-zinc-500 mb-2">LOGS</h3>
        {logs.length === 0 ? (
          <div className="text-zinc-600 text-xs font-mono">Aguardando ação...</div>
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
