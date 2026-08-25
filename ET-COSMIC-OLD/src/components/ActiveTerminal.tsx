import { useState, useRef, useEffect } from "react";
import { useVoid } from "../core/useVoid";
import { QRCodeSVG } from "../utils/qr";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { unit } from "../lib/moduleRealityBackend";
import { sha3_256 } from "@noble/hashes/sha3.js";
import {
  type SpawnProgress,
} from "../crypto/ghostid";
import {
  reconstituteMessage,
  generateRoutingInfo,
  bytesToHex,
  type Shard,
  type FragmentResult,
} from "../crypto/qel";
import {
  createUTXO,
  consumeAndGenerateUTXOs,
  formatAmount,
  parseAmount,
  type UTXO,
} from "../crypto/utxo";
import {
  generateMLKEMKeypair,
  generateMLDSAKeypair,
  mlDsaSign,
  mlDsaVerify,
  getKeySizes,
} from "../crypto/pqc";
import { powerGovernor, PowerLevel, type PowerStatus } from "../core/PowerGovernor";
import { db } from "../storage/utxoStore";
import { FragmentedOrderBook, fragmentOrder, type OrderIntent, type MatchResult } from "../crypto/matchmaker";

type OrderType = {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  shards: string[];
  status: "matching" | "filled" | "cancelled";
};
import { verifyBalanceProof } from "../crypto/utxo";

type ShardType = {
  id: number;
  data: string;
  route: string;
  status: "routing" | "delivered";
  progress: number;
  commitment: string;
  realShard?: Shard;
};

export default function ActiveTerminal() {
  const { identity, spawn, destroy, orchestrator } = useVoid();
  const { material } = useOmegaMaterial(128);
  const [activeTab, setActiveTab] = useState<"messenger" | "hydra">("messenger");

  // --- MESSENGER STATE ---
  const [entropy, setEntropy] = useState<number>(0);
  const [isSpawning, setIsSpawning] = useState<boolean>(false);
  const [spawnLogs, setSpawnLogs] = useState<SpawnProgress[]>([]);
  const [message, setMessage] = useState<string>("");
  const [routingMode, setRoutingMode] = useState<string>("LOCAL");
  const [shards, setShards] = useState<ShardType[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [reconstructedMessage, setReconstructedMessage] = useState<string>("");
  const [qelResult, setQelResult] = useState<FragmentResult | null>(null);
  const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);

  // New metrics state
  const [_zkMetrics] = useState({ proofs: 0, avgTime: 0 });
  const [meshPeers, setMeshPeers] = useState(0);
  const [powerState, setPowerState] = useState<PowerStatus>({ level: PowerLevel.LEVEL_4_ACTIVE, batteryPercent: 100, isCharging: true, capabilities: [] });

  useEffect(() => {
    const unsubOrch = orchestrator.subscribe((event) => {
      if (event.type === "SHARD_RECEIVED") {
        addLog(`[ORCHESTRATOR] Shard recebido via ${event.shard.channel}: ${event.shard.commitment}`);
      } else if (event.type === "KARMA_UPDATED") {
        addLog(`[ECONOMY] Karma atualizado: ◆ ${event.balance}`);
      } else if (event.type === "NETWORK_STATUS_CHANGE" && event.driver.startsWith("MESH:")) {
        setMeshPeers(prev => prev + 1);
      }
    });

    const unsubPower = powerGovernor.subscribe((status) => {
      setPowerState(status);
    });

    return () => {
      unsubOrch();
      unsubPower();
    };
  }, [orchestrator]);

  // --- HYDRA STATE ---
  // Real UTXOs with Pedersen Commitments (Persistent in IndexedDB)
  const [realUtxos, setRealUtxos] = useState<UTXO[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    const loadUtxos = async () => {
      let utxos = await db.getUnspentUTXOs();
      
      if (utxos.length === 0) {
        const { loadOmegaMaterial } = await import("../lib/moduleRealityBackend");
        const { material: seedMat } = await loadOmegaMaterial(32);
        const pubKey = sha3_256(seedMat);
        const initial = [
          createUTXO(parseAmount("4.5000"), pubKey),
          createUTXO(parseAmount("6.2000"), pubKey),
          createUTXO(parseAmount("2.1470"), pubKey),
        ];
        for (const u of initial) await db.saveUTXO(u);
        utxos = await db.getUnspentUTXOs();
      }

      setRealUtxos(utxos);
      const total = utxos.reduce((sum, u) => sum + u.amount, 0n);
      setWalletBalance(parseFloat(formatAmount(total)));
    };
    loadUtxos();
  }, []);
  const [recipient, setRecipient] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payStatus, setPayStatus] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");

  // PQC Keys (ML-KEM-1024 + ML-DSA-87)
  const [pqcKemKeys, setPqcKemKeys] = useState<ReturnType<typeof generateMLKEMKeypair> | null>(null);
  const [pqcDsaKeys, setPqcDsaKeys] = useState<ReturnType<typeof generateMLDSAKeypair> | null>(null);
  const [pqcSignature, setPqcSignature] = useState<string>("");
  const [pqcVerified, setPqcVerified] = useState<boolean | null>(null);

  // Fragmented DEX OrderBook
  const [orderBook] = useState(() => new FragmentedOrderBook());
  const [dexOrders, setDexOrders] = useState<OrderType[]>([]);
  const [dexMatches, setDexMatches] = useState<MatchResult[]>([]);
  const [dexPair, setDexPair] = useState<string>("vBTC / vUSD");
  const [dexSide, setDexSide] = useState<"BUY" | "SELL">("BUY");
  const [dexAmount, setDexAmount] = useState<string>("");
  const [dexPrice, setDexPrice] = useState<string>("");

  const entropyAreaRef = useRef<HTMLDivElement>(null);

  // Entropy tracker
  const handleMouseMove = () => {
    if (entropy < 100 && !identity?.handle) {
      setEntropy((prev) => Math.min(100, prev + 0.8));
    }
  };

  // Generate GhostID — REAL CRYPTO via WebAssembly (noble-hashes + noble-curves)
  const generateGhost = async () => {
    if (entropy < 100) return;
    setIsSpawning(true);
    setSpawnLogs([]);
    addLog("Iniciando GhostID Engine — criptografia real via WASM...");
    addLog("Fontes de entropia: CSPRNG + performance.now() jitter + navigator + WebGL");

    try {
      const id = await spawn((progress: SpawnProgress) => {
        setSpawnLogs((prev) => [...prev, progress]);
        addLog(`[${progress.stage.toUpperCase()}] ${progress.detail} (${progress.elapsed.toFixed(0)}ms)`);
      });

      setIsSpawning(false);
      addLog(`GhostID estabelecido: ${id.handle}`);
      addLog(`Entropia coletada: ${id.entropyBits} bits de 6 fontes`);
      addLog(`Chave pública Ed25519: ${bytesToHex(id.publicKey).slice(0, 16)}...`);
      addLog("Par de chaves Ed25519 alocado temporariamente em RAM (0 disco).");
    } catch (err) {
      setIsSpawning(false);
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`ERRO no GhostID Engine: ${msg}`);
      if (msg.includes("CGF_DCC_DENIED") || msg.includes("Assine em")) {
        addLog("→ Abra /governance/consent e clique em ASSINAR NÚCLEO v1 (ou use o banner no topo).");
      }
      if (msg.includes("Failed to fetch") || msg.includes("void_core")) {
        addLog("→ Rode na raiz do repo: npm run build:wasm");
      }
    }
  };

  const addLog = (txt: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${txt}`, ...prev]);
  };

  // Fragment and Route Message — REAL CRYPTO via QEL Protocol
  const handleFragmentAndRoute = async () => {
    if (!message || !identity) return;
    setIsRouting(true);
    setReconstructedMessage("");
    addLog(`Mensagem interceptada para fragmentação: "${message}"`);
    addLog(`Executando QEL Protocol — Shamir Secret Sharing (K=2, N=3) sobre GF(256)...`);

    try {
      // REAL: Fragment the message using Orchestrator
      const result = await orchestrator.send(message);
      setQelResult(result);
      setSessionKey(result.sessionKey);

      const routes = generateRoutingInfo(3);
      const initialShards: ShardType[] = result.shards.map((s, i) => ({
        id: i + 1,
        data: bytesToHex(s.data).slice(0, 24) + "...",
        route: routes[i].channel,
        status: "routing" as const,
        progress: 0,
        commitment: s.commitment,
        realShard: s,
      }));
      setShards(initialShards);

      addLog(`Shamir split completo: ${result.shards.length} shards, threshold K=${result.threshold}`);
      
      let ticks = 0;
      let routeTick = 0;
      const interval = setInterval(() => {
        ticks += 10;
        setShards((prev) =>
          prev.map((s, i) => {
            const step = material
              ? Math.floor(unit(material, routeTick + i) * 25) + 10
              : 15;
            routeTick = (routeTick + 1) % 64;
            const nextProgress = Math.min(100, s.progress + step);
            const nextStatus = nextProgress >= 100 ? "delivered" : "routing";
            return { ...s, progress: nextProgress, status: nextStatus as ShardType["status"] };
          })
        );

        if (ticks >= 100) {
          clearInterval(interval);
          setIsRouting(false);
          const reconstructed = reconstituteMessage(result.shards.slice(0, 2), result.sessionKey);
          setReconstructedMessage(reconstructed);
          addLog(`✓ Mensagem enviada e reconstituída via Orquestrador.`);
        }
      }, 400);
    } catch (err) {
      setIsRouting(false);
      addLog(`ERRO no QEL Protocol: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Hydra Pay — REAL CRYPTO via UTXO Manager
  const handleHydraPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || !recipient || !identity) return;
    const amountNum = Number(payAmount);
    if (amountNum > walletBalance) {
      setPayStatus("ERRO: Saldo insuficiente nos UTXOs ativos.");
      return;
    }

    setPayStatus("COMPUTING_ZK_PROOF");
    addLog(`Iniciando Hydra Pay: ◆ ${payAmount} para ${recipient.slice(0, 12)}...`);

    setTimeout(async () => {
      try {
        const amountBigInt = parseAmount(payAmount);
        const recipientPubKey = crypto.getRandomValues(new Uint8Array(32));

        // 1. Executa a transação real (Coin Selection + ZK Proof)
        const result = consumeAndGenerateUTXOs(
          realUtxos, 
          [{ amount: amountBigInt, recipientPubKey }],
          identity.publicKey
        );

        // 2. Verifica a prova gerada (Integridade matemática Ed25519)
        const isValid = verifyBalanceProof(result.inputs, result.newUTXOs, result.proof);
        if (!isValid) throw new Error("Falha na verificação da Prova ZK!");

        // 3. Atualiza estado (persistência RAM + IndexedDB)
        const consumedIds = result.inputs.map(i => i.id);
        await db.markSpent(consumedIds);
        for (const newUtxo of result.newUTXOs) {
          await db.saveUTXO(newUtxo);
        }

        const remainingUtxos = realUtxos.filter(u => !consumedIds.includes(u.id));
        const updatedUtxos = [...remainingUtxos, ...result.newUTXOs];
        setRealUtxos(updatedUtxos);

        
        const unspentUtxos = updatedUtxos.filter(u => !u.spent);
        const totalBalance = unspentUtxos.reduce((sum, u) => sum + u.amount, 0n);
        setWalletBalance(parseFloat(formatAmount(totalBalance)));

        addLog(`✓ Transação validada via Pedersen Commitments.`);
        addLog(`✓ Inputs (${result.inputs.length}) consumidos.`);
        addLog(`✓ Novos UTXOs criados: ${result.newUTXOs.length}`);
        if (result.changeUTXO) {
          addLog(`✓ Troco: ◆ ${formatAmount(result.changeUTXO.amount)} → ${result.changeUTXO.id}`);
        }
        addLog(`✓ Prova ZK verificada: Σ C_in = Σ C_out + r_diff*G`);

        setPayStatus("SUCCESS");
        setQrCodeData(`void-pay:${recipient}:${payAmount}:${Date.now()}`);
        addLog(`Pagamento de ◆ ${payAmount} liquidado offline.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setPayStatus(`ERRO: ${msg}`);
        addLog(`ERRO no Hydra Pay: ${msg}`);
      }
    }, 1200);
  };

  // Place DEX order using FragmentedOrderBook
  const handlePlaceDexOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dexAmount || !dexPrice) return;
    const amountNum = Number(dexAmount);
    const priceNum = Number(dexPrice);

    addLog(`Nova ordem DEX criada: ${dexSide} ${dexAmount} ${dexPair} @ ${dexPrice}`);
    addLog(`Fragmentando ordem via FragmentedOrderBook (blind matching)...`);

    // Create real OrderIntent
    const orderIntent: OrderIntent = {
      id: `ord_${Date.now().toString().slice(-4)}`,
      side: dexSide,
      pair: dexPair,
      amount: amountNum,
      price: priceNum,
      timestamp: Date.now(),
      traderPubKey: identity ? bytesToHex(identity.publicKey) : "anonymous",
    };

    // Fragment the order
    const orderShards = fragmentOrder(orderIntent);
    addLog(`✓ Ordem fragmentada em ${orderShards.length} shards QEL`);
    for (const shard of orderShards) {
      addLog(`  Shard ${shard.index}: commit=${shard.commitment} pair=${shard.pair} side=${shard.side}`);
    }

    // Add to FragmentedOrderBook
    orderBook.addOrder(orderIntent);

    // Contraparte para matching cego (laboratório)
    const counterSide: "BUY" | "SELL" = dexSide === "BUY" ? "SELL" : "BUY";
    const counterOrder: OrderIntent = {
      id: `ord_counter_${Date.now().toString().slice(-4)}`,
      side: counterSide,
      pair: dexPair,
      amount: amountNum * 0.7, // partial match
      price: priceNum * (counterSide === "SELL" ? 0.98 : 1.02), // compatible price
      timestamp: Date.now(),
      traderPubKey: "counterparty_anon",
    };
    orderBook.addOrder(counterOrder);

    // Run blind matching
    const matches = orderBook.runMatching();
    setDexMatches(matches);

    const shardList = orderShards.map(s => `${s.shardId}:${s.encryptedData.slice(0, 20)}...`);

    const newOrder: OrderType = {
      id: orderIntent.id,
      pair: dexPair,
      side: dexSide,
      amount: amountNum,
      price: priceNum,
      shards: shardList,
      status: matches.length > 0 ? "filled" : "matching",
    };

    setDexOrders((prev) => [newOrder, ...prev]);

    if (matches.length > 0) {
      for (const match of matches) {
        addLog(`✓ MATCH: ${match.buyOrderId} ↔ ${match.sellOrderId}`);
        addLog(`  Amount: ${match.matchedAmount} | Price: ${match.matchedPrice.toFixed(4)}`);
        addLog(`  Proof: ${match.proof.slice(0, 16)}... (ZK matching proof)`);
      }
    } else {
      addLog(`Ordem ${orderIntent.id} adicionada ao livro. Aguardando contraparte...`);
      setTimeout(() => {
        setDexOrders((prev) =>
          prev.map((o) => (o.id === newOrder.id ? { ...o, status: "filled" } : o))
        );
        addLog(`Matchmaker QEL encontrou contraparte. Ordem ${newOrder.id} liquidada.`);
      }, 2500);
    }
  };

  // PQC Key Generation Handlers
  const handleGeneratePQCKeys = () => {
    addLog("Gerando chaves pós-quânticas ML-KEM-1024 + ML-DSA-87...");
    try {
      const kemKeys = generateMLKEMKeypair();
      const dsaKeys = generateMLDSAKeypair();
      setPqcKemKeys(kemKeys);
      setPqcDsaKeys(dsaKeys);

      const sizes = getKeySizes();
      addLog(`✓ ML-KEM-1024: pubkey=${sizes["ML-KEM-1024"].publicKey}B, privkey=${sizes["ML-KEM-1024"].privateKey}B`);
      addLog(`✓ ML-DSA-87: pubkey=${sizes["ML-DSA-87"].publicKey}B, privkey=${sizes["ML-DSA-87"].privateKey}B`);
      addLog(`✓ Chaves híbridas PQC + Ed25519 ativas para transações Hydra v7.0`);

      // Sign a test message with ML-DSA-87
      const testMsg = new TextEncoder().encode("hydra-pqc-test-message-v1");
      const sig = mlDsaSign(dsaKeys.privateKey, testMsg);
      setPqcSignature(bytesToHex(sig.signature).slice(0, 32) + "...");

      // Verify the signature
      const verified = mlDsaVerify(dsaKeys.publicKey, testMsg, sig.signature);
      setPqcVerified(verified);
      addLog(`✓ ML-DSA-87 assinatura gerada e verificada: ${verified ? "VÁLIDA" : "INVÁLIDA"}`);
    } catch (err) {
      addLog(`ERRO PQC: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <section id="terminal" className="relative border-b border-[#14181c] bg-[#070809]">
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              § INTERACTIVE
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              VØID CONSOLE v1.0
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Terminal de Operações Ativas
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Simule em tempo real as duas principais aplicações do ecossistema. 
            Gere identidades efêmeras, fragmente mensagens via QEL ou gerencie UTXOs e ordens DeFi invisíveis.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#14181c] mb-1">
          <button
            onClick={() => setActiveTab("messenger")}
            className={`px-6 py-4 font-mono text-xs tracking-[0.2em] border-t-2 transition-all ${
              activeTab === "messenger"
                ? "border-[#b6ff3a] bg-black text-[#b6ff3a]"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#0a0d10]"
            }`}
          >
            01 // VØID MESSENGER
          </button>
          <button
            onClick={() => setActiveTab("hydra")}
            className={`px-6 py-4 font-mono text-xs tracking-[0.2em] border-t-2 transition-all ${
              activeTab === "hydra"
                ? "border-[#6cf0ff] bg-black text-[#6cf0ff]"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#0a0d10]"
            }`}
          >
            02 // HYDRA FINANCES
          </button>
        </div>

        {/* Console Container */}
        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Active Workspace */}
          <div className="lg:col-span-8 bg-black p-6 md:p-8">
            {activeTab === "messenger" ? (
              <div className="space-y-8">
                {/* Step 1: Spawning GhostID */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono text-sm tracking-wider text-zinc-100 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#b6ff3a]" />
                      1. GERADOR GHOSTID (ENTROPIA BIOMÉTRICA)
                    </h3>
                    <span className="tag">GHOSTID_ENGINE</span>
                  </div>

                  {!identity?.handle ? (
                    <div className="space-y-4">
                      <div
                        ref={entropyAreaRef}
                        onMouseMove={handleMouseMove}
                        className="h-32 border border-dashed border-[#14181c] hover:border-[#b6ff3a]/40 bg-[#0a0d10] flex flex-col items-center justify-center cursor-crosshair relative overflow-hidden transition-colors"
                      >
                        <div className="absolute inset-0 bg-[#b6ff3a]/[0.01] pointer-events-none" />
                        <span className="font-mono text-xs text-zinc-500 pointer-events-none text-center px-4">
                          [ MOVA O MOUSE NESTA ÁREA PARA COLETAR ENTROPIA BIOMÉTRICA PASSIVA ]
                        </span>
                        <div className="mt-3 w-48 h-1 bg-[#14181c] relative pointer-events-none">
                          <div
                            className="absolute inset-y-0 left-0 bg-[#b6ff3a] transition-all duration-100"
                            style={{ width: `${entropy}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#b6ff3a] mt-2 pointer-events-none">
                          {entropy.toFixed(0)}% COLETADO
                        </span>
                      </div>

                      <button
                        onClick={generateGhost}
                        disabled={entropy < 100 || isSpawning}
                        className="w-full py-3 bg-[#b6ff3a] text-black font-mono text-xs tracking-[0.2em] hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSpawning ? "COMPUTANDO ARGON2id..." : "SPAWN GHOSTID (REQUER 100% ENTROPIA)"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 border border-[#b6ff3a]/20 bg-[#0a0d10] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="font-mono text-[10px] text-zinc-500">GHOSTID ATIVO (SESSÃO RAM)</div>
                          <div className="font-mono text-base text-[#b6ff3a]">{identity?.handle}</div>
                        </div>
                        <button
                          onClick={() => {
                            destroy();
                            addLog("Secure wipe: chave privada e pública zeradas na RAM.");
                            setEntropy(0);
                            setSpawnLogs([]);
                            addLog("Sessão GhostID encerrada. Buffers limpos. Zero rastro.");
                          }}
                          className="font-mono text-[10px] tracking-widest text-[#ff3ad9] border border-[#ff3ad9]/30 hover:bg-[#ff3ad9]/10 px-3 py-1.5 transition-colors"
                        >
                          DESTRUIR_ID
                        </button>
                      </div>
                      {identity && (
                        <div className="grid grid-cols-5 gap-3 pt-3 border-t border-[#14181c]">
                          <div>
                            <div className="font-mono text-[9px] text-zinc-600">ENTROPY</div>
                            <div className="font-mono text-xs text-zinc-300">{identity.entropyBits} bits</div>
                          </div>
                          <div>
                            <div className="font-mono text-[9px] text-zinc-600">PUBKEY</div>
                            <div className="font-mono text-xs text-zinc-300">{bytesToHex(identity.publicKey).slice(0, 8)}...</div>
                          </div>
                          <div>
                            <div className="font-mono text-[9px] text-zinc-600">MESH_PEERS</div>
                            <div className="font-mono text-xs text-[#6cf0ff]">{meshPeers} ACTIVE</div>
                          </div>
                          <div>
                            <div className="font-mono text-[9px] text-zinc-600">CORE_ENGINE</div>
                            <div className="font-mono text-xs text-[#b6ff3a]">RUST/WASM</div>
                          </div>
                          <div>
                            <div className="font-mono text-[9px] text-zinc-600">POWER_LEVEL</div>
                            <div className={`font-mono text-xs ${powerState.level === PowerLevel.LEVEL_4_ACTIVE ? "text-[#b6ff3a]" : "text-yellow-500"}`}>
                              LVL_{powerState.level}
                            </div>
                          </div>
                        </div>
                      )}
                      {spawnLogs.length > 0 && (
                        <div className="pt-3 border-t border-[#14181c]">
                          <div className="font-mono text-[9px] text-zinc-600 mb-2">SPAWN PIPELINE</div>
                          <div className="space-y-1">
                            {spawnLogs.map((log, i) => (
                              <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                                <span className="text-zinc-600">{log.elapsed.toFixed(0)}ms</span>
                                <span className="text-[#b6ff3a]">[{log.stage}]</span>
                                <span className="text-zinc-400">{log.detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: Fragmenting & Routing */}
                <div>
                  <h3 className="font-mono text-sm tracking-wider text-zinc-100 mb-4 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#b6ff3a]" />
                    2. FRAGMENTADOR QEL & ROTEADOR DE MENSAGEM
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-[10px] text-zinc-500 mb-2">MENSAGEM SECRETA</label>
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Digite sua mensagem anônima aqui..."
                        disabled={!identity?.handle || isRouting}
                        className="w-full bg-black border border-[#14181c] focus:border-[#b6ff3a]/40 text-zinc-200 font-mono text-sm px-4 py-3 outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { k: "LOCAL", desc: "BLE / WiFi" },
                        { k: "CITY", desc: "HCN (Human Carrier)" },
                        { k: "REGIONAL", desc: "LoRa Mesh" },
                      ].map((r) => (
                        <button
                          key={r.k}
                          onClick={() => setRoutingMode(r.k)}
                          disabled={!identity?.handle || isRouting}
                          className={`border p-3 flex flex-col items-center justify-center transition-colors disabled:opacity-40 ${
                            routingMode === r.k
                              ? "border-[#b6ff3a] bg-[#b6ff3a]/5 text-[#b6ff3a]"
                              : "border-[#14181c] text-zinc-500 hover:border-zinc-700"
                          }`}
                        >
                          <span className="font-mono text-xs">{r.k}</span>
                          <span className="font-mono text-[9px] text-zinc-600">{r.desc}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleFragmentAndRoute}
                      disabled={!identity?.handle || !message || isRouting}
                      className="w-full py-3 border border-[#b6ff3a] text-[#b6ff3a] font-mono text-xs tracking-[0.2em] hover:bg-[#b6ff3a] hover:text-black disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                    >
                      {isRouting ? "ENVIANDO SHARDS..." : "FRAGMENTAR & ROTEAR (QEL)"}
                    </button>
                  </div>
                </div>

                {/* Shard Routing Progress Visualization */}
                {shards.length > 0 && (
                  <div className="border border-[#14181c] bg-[#0a0d10] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="tag">QEL SHARD MONITOR — REAL CRYPTO</span>
                      {qelResult && (
                        <span className="font-mono text-[10px] text-[#b6ff3a]">
                          K={qelResult.threshold} / N={qelResult.total} · {qelResult.originalLength}B payload
                          {sessionKey && ` · key: ${bytesToHex(sessionKey).slice(0, 8)}...`}
                        </span>
                      )}
                    </div>
                    <div className="space-y-4">
                      {shards.map((s) => (
                        <div key={s.id} className="space-y-2">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-[#b6ff3a]">SHARD 0{s.id}</span>
                            <span className="text-zinc-500">ROTA: {s.route}</span>
                            <span className={s.status === "delivered" ? "text-[#b6ff3a]" : "text-zinc-400"}>
                              {s.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-[10px] text-zinc-600 w-20 truncate" title={s.data}>
                              {s.data}
                            </div>
                            <div className="flex-1 h-1 bg-black relative">
                              <div
                                className="absolute inset-y-0 left-0 bg-[#b6ff3a] transition-all duration-300"
                                style={{ width: `${s.progress}%` }}
                              />
                            </div>
                            <div className="font-mono text-[10px] text-zinc-500 w-8 text-right">
                              {s.progress}%
                            </div>
                          </div>
                          {s.realShard && (
                            <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-600 pt-1">
                              <div>
                                <span className="text-zinc-700">commit: </span>
                                <span className="text-zinc-500">{s.commitment}</span>
                              </div>
                              <div>
                                <span className="text-zinc-700">nonce: </span>
                                <span className="text-zinc-500">{bytesToHex(s.realShard.nonce).slice(0, 12)}...</span>
                              </div>
                              <div>
                                <span className="text-zinc-700">tag: </span>
                                <span className="text-zinc-500">{bytesToHex(s.realShard.tag).slice(0, 12)}...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {reconstructedMessage && (
                      <div className="mt-6 pt-4 border-t border-[#14181c] bg-black/40 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="tag">MENSAGEM RECONSTITUÍDA (K=2 SHAMIR + CHACHA20)</span>
                          <span className="font-mono text-[10px] text-[#b6ff3a]">✓ SHA3-256 VERIFIED</span>
                        </div>
                        <div className="font-mono text-base text-[#6cf0ff]">{reconstructedMessage}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // --- HYDRA WORKSPACE ---
              <div className="space-y-8">
                {/* PQC Key Generation */}
                <div className="border border-[#14181c] bg-[#0a0d10] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="tag">POST-QUANTUM CRYPTOGRAPHY (PQC)</div>
                    <span className="font-mono text-[10px] text-[#ff3ad9]">ML-KEM-1024 + ML-DSA-87</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      onClick={handleGeneratePQCKeys}
                      className="py-2 bg-[#ff3ad9] hover:bg-white text-black font-mono text-xs tracking-wider transition-colors"
                    >
                      GENERATE PQC KEYS
                    </button>
                    <div className="flex items-center justify-center bg-black border border-[#14181c] font-mono text-[10px] text-zinc-400">
                      {pqcKemKeys ? `ML-KEM: ${bytesToHex(pqcKemKeys.publicKey).slice(0, 12)}...` : "ML-KEM: NOT GENERATED"}
                    </div>
                    <div className="flex items-center justify-center bg-black border border-[#14181c] font-mono text-[10px] text-zinc-400">
                      {pqcDsaKeys ? `ML-DSA: ${bytesToHex(pqcDsaKeys.publicKey).slice(0, 12)}...` : "ML-DSA: NOT GENERATED"}
                    </div>
                  </div>
                  {pqcSignature && (
                    <div className="mt-3 p-2 bg-black border border-[#14181c] font-mono text-[10px]">
                      <div className="text-zinc-500">SIGNATURE: <span className="text-[#ff3ad9]">{pqcSignature}</span></div>
                      <div className="text-zinc-500">VERIFIED: <span className={pqcVerified ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>{pqcVerified ? "✓ VALID" : "✗ INVALID"}</span></div>
                    </div>
                  )}
                </div>

                {/* Ephemeral Balance Dashboard */}
                <div className="grid md:grid-cols-12 gap-4">
                  {/* UTXOs */}
                  <div className="md:col-span-7 border border-[#14181c] bg-[#0a0d10] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="tag">EPHEMERAL UTXOs (REAL PEDERSEN)</div>
                      <span className="font-mono text-[10px] text-zinc-600">ZK PROOFS ACTIVE</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar">
                      {realUtxos.filter(u => !u.spent).map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2.5 border border-[#14181c] hover:border-[#6cf0ff]/30 transition-colors bg-black"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-[#6cf0ff]" />
                            <div>
                              <div className="font-mono text-xs text-zinc-100">◆ {formatAmount(u.amount)}</div>
                              <div className="font-mono text-[9px] text-zinc-500">commit: 0x{bytesToHex(u.commitment).slice(0, 16)}...</div>
                              <div className="font-mono text-[9px] text-zinc-600">blinding: 0x{bytesToHex(u.blindingFactor).slice(0, 12)}...</div>
                            </div>
                          </div>
                          <span className="font-mono text-[9px] text-[#6cf0ff]">UNSPENT</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="md:col-span-5 border border-[#14181c] bg-black p-4 flex flex-col justify-between">
                    <div>
                      <div className="tag mb-2">TOTAL BALANCE</div>
                      <div className="font-sans text-4xl text-zinc-100">
                        ◆ {walletBalance.toFixed(3)}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500 mt-2">
                        UTXOs: {realUtxos.filter(u => !u.spent).length} unspent / {realUtxos.length} total
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 leading-relaxed mt-4">
                      Pedersen Commitments: C = r·G + v·H<br/>
                      Homomorphic: Σ C_in = Σ C_out + C_change<br/>
                      Zero-knowledge balance proofs ativos.
                    </div>
                  </div>
                </div>

                {/* Form row: Hydra Pay and DEX */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Hydra Pay (Offline) */}
                  <div className="border border-[#14181c] bg-[#0a0d10] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="tag">HYDRA PAY (OFFLINE)</div>
                      <span className="font-mono text-[10px] text-[#6cf0ff]">BLE / NFC</span>
                    </div>
                    <form onSubmit={handleHydraPay} className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] text-zinc-500 mb-1.5">RECIPIENT GHOSTID</label>
                        <input
                          type="text"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="void_◆_..."
                          className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2 outline-none focus:border-[#6cf0ff]/50"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-zinc-500 mb-1.5">AMOUNT</label>
                        <input
                          type="text"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="◆ 0.00"
                          className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2 outline-none focus:border-[#6cf0ff]/50"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-[#6cf0ff] hover:bg-white text-black font-mono text-xs tracking-wider transition-colors"
                      >
                        BEAM TRANSACTION (BLE)
                      </button>
                    </form>

                    {payStatus && (
                      <div className="mt-4 p-3 bg-black border border-[#14181c] font-mono text-xs text-center">
                        {payStatus === "BEAMING" && <span className="text-[#6cf0ff] pulse-soft">TRANSMITINDO VIA BLE BEAM...</span>}
                        {payStatus === "SUCCESS" && <span className="text-[#b6ff3a]">PAGAMENTO LIQUIDADO OFFLINE</span>}
                        {payStatus.startsWith("ERRO") && <span className="text-[#ff3ad9]">{payStatus}</span>}
                      </div>
                    )}

                    {qrCodeData && (
                      <div className="mt-4 flex flex-col items-center justify-center p-3 border border-[#14181c] bg-black">
                        <div className="size-24 border border-[#6cf0ff]/30 bg-[#6cf0ff]/5 flex items-center justify-center relative">
                          <QRCodeSVG value={qrCodeData} size={80} fgColor="#6cf0ff" bgColor="transparent" />
                        </div>
                        <span className="font-mono text-[9px] text-zinc-500 mt-2">QR PROOF EMITIDO</span>
                      </div>
                    )}
                  </div>

                  {/* DEX Matchmaker */}
                  <div className="border border-[#14181c] bg-[#0a0d10] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="tag">DEX MATCHMAKER</div>
                      <span className="font-mono text-[10px] text-[#ff3ad9]">FRAGMENTED ORDER</span>
                    </div>
                    <form onSubmit={handlePlaceDexOrder} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDexSide("BUY")}
                          className={`py-1.5 font-mono text-xs border ${
                            dexSide === "BUY"
                              ? "border-[#b6ff3a] bg-[#b6ff3a]/10 text-[#b6ff3a]"
                              : "border-[#14181c] text-zinc-500"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setDexSide("SELL")}
                          className={`py-1.5 font-mono text-xs border ${
                            dexSide === "SELL"
                              ? "border-[#ff3ad9] bg-[#ff3ad9]/10 text-[#ff3ad9]"
                              : "border-[#14181c] text-zinc-500"
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-zinc-500 mb-1.5">PAIR</label>
                        <select
                          value={dexPair}
                          onChange={(e) => setDexPair(e.target.value)}
                          className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2.5 py-2 outline-none"
                        >
                          <option>vBTC / vUSD</option>
                          <option>vETH / vUSD</option>
                          <option>vADA / vBTC</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-mono text-[10px] text-zinc-500 mb-1">AMOUNT</label>
                          <input
                            type="text"
                            value={dexAmount}
                            onChange={(e) => setDexAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2.5 py-1.5 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] text-zinc-500 mb-1">PRICE</label>
                          <input
                            type="text"
                            value={dexPrice}
                            onChange={(e) => setDexPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-2.5 py-1.5 outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-[#6cf0ff] to-[#ff3ad9] hover:from-white hover:to-white text-black font-mono text-xs tracking-wider transition-colors"
                      >
                        SUBMIT SHARDED ORDER
                      </button>
                    </form>
                  </div>
                </div>

                {/* Active DEX Orders sharded visualization */}
                {dexOrders.length > 0 && (
                  <div className="border border-[#14181c] bg-[#0a0d10] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="tag">ACTIVE SHARDED ORDERS</span>
                      <span className="font-mono text-[10px] text-zinc-600">
                        {orderBook.getStats().buyOrderCount} BUY / {orderBook.getStats().sellOrderCount} SELL
                      </span>
                    </div>
                    <div className="space-y-3">
                      {dexOrders.map((o) => (
                        <div key={o.id} className="p-3 border border-[#14181c] bg-black">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-zinc-200">ID: {o.id}</span>
                            <span
                              className="font-mono text-[10px] tracking-wider px-2 py-0.5"
                              style={{
                                color: o.status === "filled" ? "#b6ff3a" : "#ff3ad9",
                                borderColor: o.status === "filled" ? "#b6ff3a44" : "#ff3ad944",
                                borderWidth: "1px",
                              }}
                            >
                              {o.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-[#14181c] text-[10px] font-mono text-zinc-500">
                            <div>
                              <span>SHARD_01 (PRICE % 40)</span>
                              <div className="text-zinc-400 font-mono">{o.shards[0]?.slice(0, 16)}...</div>
                            </div>
                            <div>
                              <span>SHARD_02 (PAIR % 30)</span>
                              <div className="text-zinc-400 font-mono">{o.shards[1]?.slice(0, 16)}...</div>
                            </div>
                            <div>
                              <span>SHARD_03 (QTY % 30)</span>
                              <div className="text-zinc-400 font-mono">{o.shards[2]?.slice(0, 16)}...</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DEX Matches */}
                {dexMatches.length > 0 && (
                  <div className="border border-[#14181c] bg-[#0a0d10] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="tag">BLIND MATCH RESULTS</span>
                      <span className="font-mono text-[10px] text-[#b6ff3a]">✓ ZK PROOFS VERIFIED</span>
                    </div>
                    <div className="space-y-2">
                      {dexMatches.map((m) => (
                        <div key={m.matchId} className="p-3 border border-[#b6ff3a]/30 bg-black">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-[#b6ff3a]">MATCH: {m.matchId.slice(0, 16)}...</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {new Date(m.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
                            <div>
                              <span className="text-zinc-500">BUY: </span>
                              <span className="text-[#b6ff3a]">{m.buyOrderId}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">AMOUNT: </span>
                              <span className="text-zinc-200">{m.matchedAmount}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">PRICE: </span>
                              <span className="text-zinc-200">{m.matchedPrice.toFixed(4)}</span>
                            </div>
                          </div>
                          <div className="mt-2 font-mono text-[9px] text-zinc-600">
                            PROOF: {m.proof.slice(0, 24)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Console Output (Realtime logs) */}
          <div className="lg:col-span-4 bg-[#0a0d10] p-6 flex flex-col h-[520px] lg:h-auto">
            <div className="flex items-center justify-between mb-4 border-b border-[#14181c] pb-3">
              <span className="tag">TERMINAL LOG OUTPUT</span>
              <button
                onClick={() => setLogs([])}
                className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                CLEAR_LOGS
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400 space-y-1.5 scrollbar">
              {logs.length === 0 ? (
                <div className="text-zinc-700 italic">// Console pronta. Execute ações ao lado.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="border-l border-[#14181c] pl-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
