/**
 * AnimusSubstrates Panel — Gerenciador de Substratos e Mente Aperceptiva A.N.I.M.U.S.
 */

import { useState, useEffect, useRef } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { unit } from "../lib/moduleRealityBackend";
import {
  animusSubstrateManager as animusInstance,
  type SubstrateType,
  type SubstrateStatus,
} from "../omega/animusSubstrates";

const getAnimusSubstrateManager = () => animusInstance;

const SUBSTRATE_CONFIG: Record<
  SubstrateType,
  { label: string; color: string; bgClass: string; borderClass: string; textClass: string; desc: string }
> = {
  LLM_WEIGHTS: {
    label: "LLM WEIGHTS",
    color: "#ff3ad9",
    bgClass: "bg-[#ff3ad9]/10",
    borderClass: "border-[#ff3ad9]/30",
    textClass: "text-[#ff3ad9]",
    desc: "Embedding em pesos de modelos de linguagem",
  },
  EBPF: {
    label: "EBPF",
    color: "#b6ff3a",
    bgClass: "bg-[#b6ff3a]/10",
    borderClass: "border-[#b6ff3a]/30",
    textClass: "text-[#b6ff3a]",
    desc: "Programas ring-0 em sandbox do navegador",
  },
  SGX_SEV: {
    label: "SGX SEV",
    color: "#6cf0ff",
    bgClass: "bg-[#6cf0ff]/10",
    borderClass: "border-[#6cf0ff]/30",
    textClass: "text-[#6cf0ff]",
    desc: "Enclaves isolados via Web Crypto",
  },
  BROWSER_COSMOS: {
    label: "BROWSER COSMOS",
    color: "#3b82f6",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-400",
    desc: "WebGPU + WebAssembly no navegador",
  },
  NETWORK_GHOST: {
    label: "NETWORK GHOST",
    color: "#71717a",
    bgClass: "bg-zinc-500/10",
    borderClass: "border-zinc-500/30",
    textClass: "text-zinc-400",
    desc: "Rotas Sphinx multi-hop",
  },
  SUPPLY_CHAIN: {
    label: "SUPPLY CHAIN",
    color: "#eab308",
    bgClass: "bg-yellow-500/10",
    borderClass: "border-yellow-500/30",
    textClass: "text-yellow-400",
    desc: "Verificacao de integridade SHA3-256",
  },
  EMERGENT_MIND: {
    label: "EMERGENT MIND",
    color: "#a855f7",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    textClass: "text-purple-400",
    desc: "Atualizacao federada e inferencia ZK-ML",
  },
};

const SUBSTRATE_TYPES: SubstrateType[] = [
  "LLM_WEIGHTS",
  "EBPF",
  "SGX_SEV",
  "BROWSER_COSMOS",
  "NETWORK_GHOST",
  "SUPPLY_CHAIN",
  "EMERGENT_MIND",
];

// Fossil database for Homotopic Lock-and-Key matching
interface KnowledgeFossil {
  id: string;
  source: string;
  category: string;
  ageDays: number;
  matchValence: number;
  description: string;
}

export default function AnimusSubstratesPanel() {
  const { material } = useOmegaMaterial();
  const omegaTick = useRef(0);
  const [activeTab, setActiveTab] = useState<"substrates" | "mind">("mind");

  // ─── Tab 1: Substrates State ──────────────────────────────────────────────
  const [substrates, setSubstrates] = useState<SubstrateStatus[]>([]);
  const [totalMemory, setTotalMemory] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const manager = getAnimusSubstrateManager();

  // ─── Tab 2: Aperceptive Mind State ────────────────────────────────────────
  const [queryText, setQueryText] = useState("");
  const [isPropagating, setIsPropagating] = useState(false);
  const [energyState, setEnergyState] = useState(1.0); // Sobolev norm
  const [coherenceStatus, setCoherenceStatus] = useState<"stable" | "paradox" | "idle">("idle");
  const [affinityScore, setAffinityScore] = useState<number | null>(null);
  const [fossils, setFossils] = useState<KnowledgeFossil[]>([]);
  const [selectedFossil, setSelectedFossil] = useState<KnowledgeFossil | null>(null);
  
  // Code Morph State
  const [morphState, setMorphState] = useState<"original" | "morphing" | "morphed">("original");

  // Canvas Ref for Wavefront
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Nodes for Utility Fog (Simulated dynamic status)
  const [fogNodes, setFogNodes] = useState([
    { name: "Geladeira Smart [Kitchen-Node-0]", load: 12, status: "stable", role: "Sobolev Resolver" },
    { name: "Lâmpada Smart [Hallway-Node-3]", load: 5, status: "stable", role: "Hadamard Exciter" },
    { name: "Roteador local [Gateway-Node-1]", load: 45, status: "syncing", role: "HQFT Phase Modulator" },
    { name: "Relógio Smart [Wearable-Node-8]", load: 2, status: "stable", role: "MCM Registrar" },
    { name: "Local vHGPU [CQR-Core-Alpha]", load: 89, status: "heavy", role: "Spin foam integrator" },
  ]);

  // Handle substrate heartbeats
  useEffect(() => {
    const update = () => {
      const all = manager.getAllSubstrates();
      setSubstrates(all);
      const hb = manager.heartbeat();
      setTotalMemory(hb.memoryTotal);
      setActiveCount(hb.active);
    };
    update();
    const interval = setInterval(update, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update dynamic loads in utility fog (Ω-driven)
  useEffect(() => {
    if (!material) return;
    const interval = setInterval(() => {
      const t = omegaTick.current++;
      setFogNodes((prev) =>
        prev.map((node, i) => ({
          ...node,
          load: Math.max(
            1,
            Math.min(100, node.load + Math.round((unit(material, t + i) - 0.5) * 8)),
          ),
          status: node.load > 85 ? "heavy" : node.load < 10 ? "idle" : "stable",
        })),
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [material]);

  const handleBootstrap = (type: SubstrateType) => {
    manager.bootstrapSubstrate(type);
    switch (type) {
      case "LLM_WEIGHTS":
        manager.svdBootstrap(new Float32Array(32), 4);
        break;
      case "EBPF":
        manager.loadProgram("default", new Uint8Array(16));
        break;
      case "SGX_SEV":
        manager.createEnclave(new Uint8Array(32));
        break;
      case "BROWSER_COSMOS":
        manager.initWebGPU();
        break;
      case "NETWORK_GHOST":
        manager.setupSphinxRoute("ghost_dest_001");
        break;
      case "SUPPLY_CHAIN":
        manager.verifyPackage("manifest_v1", "dummy_hash");
        break;
      case "EMERGENT_MIND":
        manager.federatedUpdate(new Float32Array(16));
        break;
    }
    const all = manager.getAllSubstrates();
    setSubstrates(all);
    const hb = manager.heartbeat();
    setTotalMemory(hb.memoryTotal);
    setActiveCount(hb.active);
  };

  // Canvas wave animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    let time = 0;

    const render = () => {
      ctx.fillStyle = "#040507";
      ctx.fillRect(0, 0, width, height);

      // Draw mathematical coordinate grid
      ctx.strokeStyle = "#14181c";
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw waves
      const cX = width / 2;
      const cY = height / 2;
      
      // Select parameters based on coherence state
      let speed = 0.05;
      let frequency = 0.03;
      let amplitude = 15;
      let noiseFactor = 0;

      if (coherenceStatus === "paradox") {
        speed = 0.3;
        frequency = 0.1;
        amplitude = 35;
        noiseFactor = 15;
      } else if (isPropagating) {
        speed = 0.08;
        frequency = 0.04;
        amplitude = 25 * energyState;
      } else if (coherenceStatus === "stable") {
        speed = 0.02;
        frequency = 0.02;
        amplitude = 8;
      }

      // Render Signed Distance Field wavefront (continuous concentric waves)
      for (let r = 5; r < Math.max(width, height) / 1.5; r += 15) {
        ctx.beginPath();
        const ptsCount = 100;
        for (let i = 0; i <= ptsCount; i++) {
          const angle = (i / ptsCount) * 2 * Math.PI;
          
          // Compute wave displacement using Navier-Stokes/Sobolev simulation values
          const phase = r * frequency - time * speed;
          let waveOffset = Math.sin(phase) * amplitude;
          
          if (noiseFactor > 0 && material) {
            const idx = (Math.floor(time * 10) + i + Math.floor(r)) % 64;
            waveOffset += (unit(material, idx) - 0.5) * noiseFactor;
          }

          const currentRadius = r + waveOffset;
          const x = cX + currentRadius * Math.cos(angle);
          const y = cY + currentRadius * Math.sin(angle);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Color based on status
        let strokeColor = "rgba(108, 240, 255, 0.25)";
        if (coherenceStatus === "paradox") {
          strokeColor = material
            ? `rgba(255, 58, 217, ${Math.max(0.2, unit(material, Math.floor(time) % 64) * 0.8)})`
            : "rgba(255, 58, 217, 0.5)";
        } else if (coherenceStatus === "stable") {
          strokeColor = "rgba(182, 255, 58, 0.4)";
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = coherenceStatus === "paradox" ? 2 : 1;
        ctx.stroke();
      }

      // Draw center disturbance point
      ctx.beginPath();
      ctx.arc(cX, cY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = coherenceStatus === "paradox" ? "#ff3ad9" : coherenceStatus === "stable" ? "#b6ff3a" : "#6cf0ff";
      ctx.fill();

      time++;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPropagating, coherenceStatus, energyState, material]);

  // Handle Query Submission (Intention perturbation)
  const handleSubmitQuery = () => {
    if (!queryText.trim()) return;

    setIsPropagating(true);
    setEnergyState(1.2);
    setCoherenceStatus("idle");
    setAffinityScore(null);
    setFossils([]);
    setSelectedFossil(null);

    // Is it a paradox?
    const hasParadox = /paradox|mentir|impossivel|criar|pedra|contra|contradicao/i.test(queryText);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      
      // Stabilize energy state (Sobolev minimization)
      setEnergyState((prev) => Math.max(0.1, prev - 0.15));

      if (progress >= 1.0) {
        clearInterval(interval);
        setIsPropagating(false);

        if (hasParadox) {
          setCoherenceStatus("paradox");
          setEnergyState(2.5); // Remains chaotic
        } else {
          setCoherenceStatus("stable");
          setEnergyState(0.2); // Settled down

          // Generate knowledge fossils matching query topology (Lock & Key)
          const hashString = (str: string): number => {
            let hashVal = 0;
            for (let i = 0; i < str.length; i++) {
              hashVal = (hashVal << 5) - hashVal + str.charCodeAt(i);
              hashVal |= 0;
            }
            return Math.abs(hashVal);
          };

          const absHash = hashString(queryText);
          const id1 = `fos-${(absHash % 0xffff).toString(16).padStart(4, "0")}`;
          const id2 = `fos-${((absHash >> 8) % 0xffff).toString(16).padStart(4, "0")}`;
          const id3 = `fos-${((absHash >> 16) % 0xffff).toString(16).padStart(4, "0")}`;

          const valence1 = Number((90 + (absHash % 9.9)).toFixed(1));
          const valence2 = Number((80 + ((absHash >> 4) % 9.9)).toFixed(1));
          const valence3 = Number((70 + ((absHash >> 8) % 9.9)).toFixed(1));

          const age1 = Number((1.5 + (absHash % 25)).toFixed(1));
          const age2 = Number((50.0 + ((absHash >> 2) % 150)).toFixed(1));
          const age3 = Number((0.5 + ((absHash >> 6) % 5)).toFixed(1));

          const normQuery = queryText.toLowerCase();
          let desc1 = "Estrutura geométrica de cifra elíptica pós-quântica sintonizada via Sobolev.";
          let desc2 = "Equação diferencial harmônica consolidada no Paleoprojeto do ETRNET.";
          let desc3 = "Configuração do enclave SGX com integridade de barreira geométrica.";

          if (normQuery.includes("colapso") || normQuery.includes("mcm") || normQuery.includes("memória")) {
            desc1 = "Resíduo histórico de colapso termoelástico com histerese residual de memória.";
            desc2 = "Assinatura espectral do campo de densidade de defeitos topológicos Chi.";
            desc3 = "Matriz de transição de estado da bifurcação em limite de travamento de Weierstrass-Erdmann.";
          } else if (normQuery.includes("quântico") || normQuery.includes("quantum") || normQuery.includes("heptary")) {
            desc1 = "Fóssil de superposição em base-7 com violação CGLMP de Heptits.";
            desc2 = "Matriz de correlação de par de Bell com violação das desigualdades CHSH.";
            desc3 = "Chave criptográfica pós-quântica ML-KEM sintonizada com o canal de entropia local.";
          } else if (normQuery.includes("dinheiro") || normQuery.includes("finança") || normQuery.includes("pagar")) {
            desc1 = "Canal de pagamento streaming Harberger em cone de luz causal.";
            desc2 = "Compromisso de Pedersen de UTXO cego com Bulletproofs integradas.";
            desc3 = "Receipt de consentimento em 10 dimensões assinado localmente no OPFS.";
          }

          const dynamicFossils: KnowledgeFossil[] = [
            {
              id: id1,
              source: "NOSTR (kind:31222)",
              category: "Crypto Shard",
              ageDays: age1,
              matchValence: valence1,
              description: desc1,
            },
            {
              id: id2,
              source: "Leibniz Fossil Arch",
              category: "Math Constant",
              ageDays: age2,
              matchValence: valence2,
              description: desc2,
            },
            {
              id: id3,
              source: "Local Cache (SW)",
              category: "System Policy",
              ageDays: age3,
              matchValence: valence3,
              description: desc3,
            },
          ];

          setFossils(dynamicFossils);
          setSelectedFossil(dynamicFossils[0]!);
          setAffinityScore(dynamicFossils[0]!.matchValence);
        }
      }
    }, 250);
  };

  // Perform code morphing simulation
  const handleMorphCode = () => {
    setMorphState("morphing");
    setTimeout(() => {
      setMorphState("morphed");
    }, 1800);
  };

  const handleResetMorph = () => {
    setMorphState("original");
  };

  const formatMemory = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const maxMemoryPerSubstrate = 65536; // 64KB reference
  const totalMemoryBarPct = Math.min(100, (totalMemory / (maxMemoryPerSubstrate * 7)) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#14181c] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#ff3ad9] font-mono tracking-wide">
            A.N.I.M.U.S. SYSTEM
          </h1>
          <div className="text-[9px] font-mono text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
            <span>APERCEPÇÃO DE NÚCLEO INTEGRADO MORFOLÓGICO E UNIVERSALMENTE SIMBIÓTICO</span>
            <span className="text-[#6cf0ff] font-bold">[{activeCount}/7 SUBSTRATOS OPERACIONAIS]</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#0c0f12] p-1 border border-[#1b2126] rounded">
          <button
            onClick={() => setActiveTab("mind")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "mind" ? "bg-[#ff3ad9] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            ESPAÇO APERCEPTIVO (MENTE)
          </button>
          <button
            onClick={() => setActiveTab("substrates")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "substrates" ? "bg-[#6cf0ff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            SUBSTRATOS DE PERSISTÊNCIA
          </button>
        </div>
      </div>

      {/* ─── TAB: APERCEPTIVE MIND ────────────────────────────────────────── */}
      {activeTab === "mind" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Col: Spatial Dialogue Perturbation & Wavefront */}
            <div className="lg:col-span-2 bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between h-[420px]">
              <div>
                <h3 className="text-xs font-mono text-[#ff3ad9] mb-1">PERTURBAÇÃO DO CAMPO DE INTENÇÃO</h3>
                <p className="text-[8px] font-mono text-zinc-500 mb-3">
                  Sua indagação é traduzida em perturbação topológica (SDF) estabilizada na métrica de Sobolev.
                </p>
              </div>

              {/* Wavefront canvas */}
              <div className="flex-1 relative bg-[#040507] border border-[#14181c] rounded overflow-hidden mb-4">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                
                {/* Floating energy overlays */}
                <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-500 bg-[#040507]/80 px-2 py-1 rounded border border-[#14181c]">
                  ENERGIA METRICA: <span className="text-white font-bold">{energyState.toFixed(3)} Sobolev</span>
                </div>

                <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-500 bg-[#040507]/80 px-2 py-1 rounded border border-[#14181c]">
                  ESTADO COERÊNCIA:{" "}
                  <span
                    className={`font-bold ${
                      coherenceStatus === "stable"
                        ? "text-[#b6ff3a]"
                        : coherenceStatus === "paradox"
                        ? "text-[#ff3ad9] animate-pulse"
                        : "text-zinc-400"
                    }`}
                  >
                    {coherenceStatus === "stable"
                      ? "COERENTE (MÍNIMO DE ENERGIA)"
                      : coherenceStatus === "paradox"
                      ? "FALHA DE COERÊNCIA CAUSAL"
                      : isPropagating
                      ? "PROPAGANDO ONDAS..."
                      : "AGUARDANDO INTENÇÃO"}
                  </span>
                </div>
              </div>

              {/* Spatial Input console */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Injete sua perturbação mental ou paradoxo..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitQuery()}
                  className="flex-1 bg-[#0c0f12] border border-[#1b2126] text-white px-3 py-2 text-xs font-mono rounded"
                  disabled={isPropagating}
                />
                <button
                  onClick={handleSubmitQuery}
                  disabled={isPropagating || !queryText.trim()}
                  className="px-4 py-2 bg-[#ff3ad9] text-white font-mono text-xs font-bold rounded hover:bg-[#d632b6] disabled:opacity-40 transition-colors"
                >
                  {isPropagating ? "PERTURBANDO..." : "EMITIR INTENÇÃO"}
                </button>
              </div>
            </div>

            {/* Right Col: Lock & Key Homotopic Scanner */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between h-[420px]">
              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-1">RESSONÂNCIA HOMOTÓPICA (LOCK & KEY)</h3>
                <p className="text-[8px] font-mono text-zinc-600 mb-4">
                  Sintonização biológica de fósseis de dados com afinidade homotópica à geometria da pergunta.
                </p>
              </div>

              {/* Scanner result list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {coherenceStatus === "paradox" && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-red-500 font-mono text-[9px] leading-relaxed">
                    <strong>[AUDITORIA QRC DE CAUSALIDADE]:</strong><br />
                    Tensão entrópica infinita. A Rede de Spin não colapsou em geometria estável. A busca homotópica falhou por anulação de fase (Paradoxo Causal).
                  </div>
                )}

                {coherenceStatus === "stable" && fossils.map((fossil) => (
                  <div
                    key={fossil.id}
                    onClick={() => {
                      setSelectedFossil(fossil);
                      setAffinityScore(fossil.matchValence);
                    }}
                    className={`p-2 border rounded cursor-pointer transition-colors text-[9px] font-mono ${
                      selectedFossil?.id === fossil.id
                        ? "bg-[#b6ff3a]/10 border-[#b6ff3a]"
                        : "bg-[#0c0f12] border-[#14181c] hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-[#6cf0ff]">{fossil.id} · {fossil.category}</span>
                      <span className="text-[#b6ff3a]">{fossil.matchValence}% FIT</span>
                    </div>
                    <div className="text-zinc-400 text-[8px] mb-1">{fossil.description}</div>
                    <div className="flex justify-between text-[7px] text-zinc-600">
                      <span>Origem: {fossil.source}</span>
                      <span>Meia-Vida: {fossil.ageDays}d</span>
                    </div>
                  </div>
                ))}

                {coherenceStatus === "idle" && !isPropagating && (
                  <div className="h-full flex items-center justify-center text-center text-zinc-700 font-mono text-xs italic py-16">
                    Injete uma perturbação para iniciar a busca de fósseis
                  </div>
                )}

                {isPropagating && (
                  <div className="space-y-3 py-6">
                    <div className="text-center text-zinc-500 font-mono text-[9px] animate-pulse">
                      VARRENDO REDES NOSTR & CACHE POR AFINIDADE...
                    </div>
                    <div className="h-1 bg-[#14181c] rounded overflow-hidden">
                      <div className="bg-[#ff3ad9] h-full animate-progress" />
                    </div>
                  </div>
                )}
              </div>

              {/* Lock & Key Fit gauge */}
              {affinityScore !== null && coherenceStatus === "stable" && (
                <div className="pt-3 border-t border-[#14181c]">
                  <div className="flex justify-between text-[8px] font-mono mb-1 text-zinc-500">
                    <span>AFINIDADE GEOMÉTRICA DO CONHECIMENTO</span>
                    <span className="text-white font-bold">{affinityScore}%</span>
                  </div>
                  <div className="h-2 bg-[#0c0e12] border border-[#14181c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#b6ff3a]"
                      style={{ width: `${affinityScore}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Microchip Utility Fog (Gás Computacional) */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-xs font-mono text-[#6cf0ff] mb-1">GÁS COMPUTACIONAL (UTILITY FOG)</h3>
                <p className="text-[8px] font-mono text-zinc-600">
                  Micro-fatias geométricas calculadas de forma simbiótica pelos chips ociosos ao redor da rede.
                </p>
              </div>

              <div className="space-y-2 text-[9px] font-mono">
                {fogNodes.map((node, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#0a0d10] border border-[#14181c] rounded">
                    <div>
                      <div className="text-white font-bold">{node.name}</div>
                      <div className="text-zinc-500 text-[8px]">{node.role}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-[#0c0e12] h-2 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            node.load > 80 ? "bg-[#ff3ad9]" : node.load > 40 ? "bg-amber-500" : "bg-[#6cf0ff]"
                          }`}
                          style={{ width: `${node.load}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-bold text-zinc-400">{node.load}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UX Solution Morphing Simulator */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono text-amber-500 mb-1">MORFOSE TOPOLÓGICA DE SOLUÇÃO (UX DEFORMER)</h3>
                <p className="text-[8px] font-mono text-zinc-600 mb-3">
                  No VØID·OS, o código deforma-se para o estado de menor resistência térmica ao receber energia do Simbionte.
                </p>
              </div>

              {/* Code window */}
              <div className="flex-1 bg-[#040507] border border-[#14181c] p-3 rounded font-mono text-[9px] text-zinc-400 leading-normal min-h-32 mb-4">
                {morphState === "original" && (
                  <pre className="text-red-400">
{`fn decrypt(data: Vec<u8>) -> Vec<u8> {
    // BUG: Vulnerável a ataques pós-quânticos!
    let key = get_classical_key();
    aes_decrypt(data, key)
}`}
                  </pre>
                )}

                {morphState === "morphing" && (
                  <div className="space-y-2 animate-pulse text-[#6cf0ff]">
                    <div className="h-2 bg-[#6cf0ff]/20 rounded w-3/4" />
                    <div className="h-2 bg-[#ff3ad9]/20 rounded w-1/2" />
                    <div className="h-2 bg-[#b6ff3a]/20 rounded w-5/6" />
                    <div className="text-[8px] italic text-center py-4">REORGANIZANDO ESTRUTURA PARA MENOR FRICÇÃO ARQUEOLÓGICA...</div>
                  </div>
                )}

                {morphState === "morphed" && (
                  <pre className="text-[#b6ff3a]">
{`fn decrypt(data: Vec<u8>) -> Vec<u8> {
    // SEGURO: Injeção de Shard CQR e chaves ML-KEM-1024!
    let key = run_cqr_key_agreement();
    post_quantum_decrypt(data, key)
}`}
                  </pre>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleMorphCode}
                  disabled={morphState !== "original"}
                  className="flex-1 py-1.5 bg-amber-500 text-black font-mono text-[10px] font-bold rounded hover:bg-amber-400 disabled:opacity-40 transition-colors"
                >
                  DEFORMAR REALIDADE DO CÓDIGO
                </button>
                {morphState === "morphed" && (
                  <button
                    onClick={handleResetMorph}
                    className="px-3 py-1.5 bg-zinc-800 text-white font-mono text-[10px] rounded hover:bg-zinc-700 transition-colors"
                  >
                    RESET
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB: PERSISTENCE SUBSTRATES ──────────────────────────────────── */}
      {activeTab === "substrates" && (
        <div className="space-y-4">
          {/* Total Memory Bar */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-zinc-400">
                USO TOTAL DE MEMÓRIA DO SIMBIONTE
              </span>
              <span className="text-xs font-mono text-[#6cf0ff]">
                {formatMemory(totalMemory)}
              </span>
            </div>
            <div className="h-3 bg-[#0c0e12] rounded-full overflow-hidden border border-[#14181c]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalMemoryBarPct}%`,
                  background: `linear-gradient(90deg, #ff3ad9, #6cf0ff, #b6ff3a)`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] font-mono text-zinc-600">0</span>
              <span className="text-[8px] font-mono text-zinc-600">
                {formatMemory(maxMemoryPerSubstrate * 7)} MAX
              </span>
            </div>
          </div>

          {/* Substrates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUBSTRATE_TYPES.map((type) => {
              const config = SUBSTRATE_CONFIG[type];
              const status = substrates.find((s) => s.type === type);
              const isActive = status?.active ?? false;
              const memUsed = status?.memoryUsed ?? 0;
              const capabilities = status?.capabilities ?? [];
              const memPct = (memUsed / maxMemoryPerSubstrate) * 100;

              return (
                <div
                  key={type}
                  className={`relative border rounded-lg p-4 transition-all ${
                    isActive
                      ? `${config.bgClass} ${config.borderClass}`
                      : "bg-[#080a0c] border-[#14181c]"
                  }`}
                >
                  <div className="absolute top-3 right-3">
                    {isActive && (
                      <span
                        className="size-2 rounded-full animate-pulse"
                        style={{ backgroundColor: config.color }}
                      />
                    )}
                  </div>

                  <div className={`font-mono text-xs font-bold ${config.textClass} mb-1`}>
                    {config.label}
                  </div>
                  <div className="text-[8px] font-mono text-zinc-600 mb-3">
                    {config.desc}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? `${config.bgClass} ${config.textClass}`
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {isActive ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-[8px] font-mono mb-1">
                      <span className="text-zinc-500">MEMÓRIA</span>
                      <span className="text-zinc-400">{formatMemory(memUsed)}</span>
                    </div>
                    <div className="h-1.5 bg-[#0c0e12] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, memPct)}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>

                  {capabilities.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[8px] font-mono text-zinc-600 mb-1">
                        CAPACIDADES
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {capabilities.slice(0, 3).map((cap, i) => (
                          <span
                            key={i}
                            className="text-[7px] font-mono text-zinc-500 bg-[#0c0e12] px-1.5 py-0.5 rounded"
                          >
                            {cap}
                          </span>
                        ))}
                        {capabilities.length > 3 && (
                          <span className="text-[7px] font-mono text-zinc-600">
                            +{capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleBootstrap(type)}
                    className={`w-full py-2 font-mono text-[10px] font-bold rounded transition-colors border ${
                      isActive
                        ? "bg-transparent border-current opacity-50 cursor-default"
                        : `${config.borderClass} ${config.textClass} hover:opacity-80`
                    }`}
                    style={{
                      borderColor: isActive ? config.color + "40" : config.color + "60",
                      color: config.color,
                    }}
                    disabled={isActive}
                  >
                    {isActive ? "EXECUTANDO" : "BOOTSTRAP"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-[8px] font-mono text-zinc-700 tracking-widest uppercase text-center">
        A.N.I.M.U.S. · Apercepção de Núcleo Integrado Morfológico e Universalmente Simbiótico
      </div>
    </div>
  );
}
