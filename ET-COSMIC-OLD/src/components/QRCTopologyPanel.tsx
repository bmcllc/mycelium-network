import { useState, useCallback, useEffect, useRef } from "react";
import {
  collapseHashFromMaterial,
  loadOmegaMaterial,
  unit,
} from "../lib/moduleRealityBackend";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import {
  computeReebGraph,
  persistenceDiagram,
  eulerCharacteristic,
  detectTopologicalChange,
  type ReebGraph,
  type PersistenceDiagram,
} from "../crypto/topologyTracker";
import {
  computeFrechetDerivative,
  sobolevNorm,
  principalCurvatures,
} from "../crypto/differentialCore";
import {
  runSpinEvolution,
  runQuantumSwitchSimulation,
  validateQuantumTheorems,
  type SpinEvolutionResult,
  type QuantumSwitchSimulationResult,
  type TheoremValidationResult,
} from "../crypto/quantumBridge";

export default function QRCTopologyPanel() {
  const { material } = useOmegaMaterial(256);
  const opTick = useRef(0);
  const [activeTab, setActiveTab] = useState<"topology" | "spin" | "switch" | "theorems" | "operators">("topology");

  // ─── Tab 1: Topology (Existing) ──────────────────────────────────────────
  const [reebGraph, setReebGraph] = useState<ReebGraph | null>(null);
  const [persistenceDiag, setPersistenceDiag] = useState<PersistenceDiagram | null>(null);
  const [prevPersistenceDiag, setPrevPersistenceDiag] = useState<PersistenceDiagram | null>(null);
  const [eulerChar, setEulerChar] = useState<number | null>(null);
  const [topoChanged, setTopoChanged] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [curvatures, setCurvatures] = useState<{ k1: number; k2: number } | null>(null);
  const [sobolev, setSobolev] = useState<number | null>(null);
  const [frechet, setFrechet] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<number[]>([]);

  // ─── Tab 2: Spin Networks (New) ───────────────────────────────────────────
  const [nQubits, setNQubits] = useState<number>(4);
  const [spinSteps, setSpinSteps] = useState<number>(3);
  const [spinResult, setSpinResult] = useState<SpinEvolutionResult | null>(null);
  const [isSpinEvolving, setIsSpinEvolving] = useState<boolean>(false);

  // ─── Tab 3: Quantum Switch (New) ──────────────────────────────────────────
  const [switchOps, setSwitchOps] = useState<Array<{ name: string; gate: string }>>([
    { name: "Op_A", gate: "H" },
    { name: "Op_B", gate: "X" },
    { name: "Op_C", gate: "Z" },
  ]);
  const [newOpName, setNewOpName] = useState("");
  const [newOpGate, setNewOpGate] = useState("H");
  const [switchSteps, setSwitchSteps] = useState<number>(100);
  const [switchResult, setSwitchResult] = useState<QuantumSwitchSimulationResult | null>(null);
  const [isSwitchSimulating, setIsSwitchSimulating] = useState<boolean>(false);
  const [switchCollapsed, setSwitchCollapsed] = useState<boolean>(false);

  // ─── Tab 4: Theorem Validation (New) ──────────────────────────────────────
  const [theoremResult, setTheoremResult] = useState<TheoremValidationResult | null>(null);
  const [isValidatingTheorems, setIsValidatingTheorems] = useState<boolean>(false);

  // ─── Tab 5: Collapse Operators & LSC (New) ────────────────────────────────
  const [stressLevel, setStressLevel] = useState<number>(0.0);
  const [collapseCount, setCollapseCount] = useState<number>(0);
  const [lastCollapseHash, setLastCollapseHash] = useState<string>("");
  const [operatorHistory, setOperatorHistory] = useState<Array<{ op: string; detail: string; timestamp: string }>>([]);
  const [lscFeedback, setLscFeedback] = useState<number>(1.0); // G(C_epsilon) saturation

  // ─── Actions ──────────────────────────────────────────────────────────────

  const generateRandomSDF = (): number[] => {
    const n = 64;
    const values = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * 2 * Math.PI;
      values[i] =
        Math.sin(t * 2) * 0.4 +
        Math.cos(t * 3.7) * 0.3 +
        Math.sin(t * 5.1) * 0.2 +
        (material ? (unit(material, i) - 0.5) * 0.1 : 0);
    }
    return values;
  };

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const values = generateRandomSDF();
      setFieldValues(values);

      const graph = computeReebGraph(values, 16);
      setReebGraph(graph);

      const diag = persistenceDiagram(graph);
      if (persistenceDiag) {
        setPrevPersistenceDiag(persistenceDiag);
      }
      setPersistenceDiag(diag);

      const chi = eulerCharacteristic(diag);
      setEulerChar(chi);

      if (prevPersistenceDiag) {
        setTopoChanged(detectTopologicalChange(prevPersistenceDiag, diag));
      } else {
        setTopoChanged(false);
      }

      const evalFn = (p: number[]): number => {
        const x = p[0] ?? 0;
        return Math.sin(x * 2) * 0.4 + Math.cos(x * 3.7) * 0.3;
      };
      const dir = [1, 0];
      const pt = [1.0, 0.0];
      const deriv = computeFrechetDerivative(evalFn, pt, dir);
      setFrechet(deriv.norm);

      const curv = principalCurvatures(evalFn, pt);
      setCurvatures({ k1: curv.k1, k2: curv.k2 });

      const norm = sobolevNorm(values, 1);
      setSobolev(norm);

      setIsAnalyzing(false);
    }, 300);
  }, [persistenceDiag, prevPersistenceDiag, material]);

  const handleEvolveSpin = async () => {
    setIsSpinEvolving(true);
    try {
      const res = await runSpinEvolution(nQubits, spinSteps);
      setSpinResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSpinEvolving(false);
    }
  };

  const handleSimulateSwitch = async () => {
    setIsSwitchSimulating(true);
    setSwitchCollapsed(false);
    try {
      const res = await runQuantumSwitchSimulation(switchOps, switchSteps);
      setSwitchResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitchSimulating(false);
    }
  };

  const handleCollapseSwitch = () => {
    if (!switchResult) return;
    setSwitchCollapsed(true);
  };

  const handleAddOp = () => {
    if (!newOpName) return;
    setSwitchOps([...switchOps, { name: newOpName.replace(/\s+/g, "_"), gate: newOpGate }]);
    setNewOpName("");
  };

  const handleRemoveOp = (index: number) => {
    setSwitchOps(switchOps.filter((_, i) => i !== index));
  };

  const handleValidateTheoremsAction = async () => {
    setIsValidatingTheorems(true);
    try {
      const res = await validateQuantumTheorems();
      setTheoremResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidatingTheorems(false);
    }
  };

  // MCM Operators logic
  const handleOperatorAccumulate = () => {
    const t = opTick.current++;
    const delta = Number((material ? unit(material, t) * 0.4 + 0.1 : 0.2).toFixed(4));
    const newStress = Number((stressLevel + delta).toFixed(4));
    setStressLevel(newStress);

    // Calculate LSC Saturation feedback loop: G(C_epsilon) = 1 / (1 + stressLevel^2)
    const feedback = Number((1.0 / (1.0 + Math.pow(newStress, 2))).toFixed(4));
    setLscFeedback(feedback);

    setOperatorHistory((prev) => [
      {
        op: "â",
        detail: `Acúmulo de Tensão Relativística. Delta: +${delta}. Tensão Atual: ${newStress}. Sat LSC G(C): ${feedback}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleOperatorRelease = () => {
    if (stressLevel <= 0.0) return;
    const t = opTick.current++;
    const delta = Number((material ? unit(material, t) * 0.3 + 0.05 : 0.1).toFixed(4));
    const newStress = Math.max(0.0, Number((stressLevel - delta).toFixed(4)));
    setStressLevel(newStress);

    const feedback = Number((1.0 / (1.0 + Math.pow(newStress, 2))).toFixed(4));
    setLscFeedback(feedback);

    setOperatorHistory((prev) => [
      {
        op: "r̂",
        detail: `Liberação de Flutuação da Rede. Delta: -${delta}. Tensão Atual: ${newStress}. Sat LSC G(C): ${feedback}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleOperatorCollapse = () => {
    void (async () => {
      const mat = material ?? (await loadOmegaMaterial(128)).material;
      const hash = collapseHashFromMaterial(mat, stressLevel);
      setLastCollapseHash(hash);
      setCollapseCount((c) => c + 1);
      setStressLevel(0.0);
      setLscFeedback(1.0);
      setOperatorHistory((prev) => [
        {
          op: "ĉ",
          detail: `Colapso com Memória executado. Hash gerado: ${hash}. Resíduo de tensão redefinido para 0.`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);
    })();
  };

  // Run on mount
  useEffect(() => {
    handleAnalyze();
    handleEvolveSpin();
    handleSimulateSwitch();
    handleValidateTheoremsAction();
  }, []);

  // SVG rendering for Reeb graph
  const renderReebGraph = () => {
    if (!reebGraph || reebGraph.nodes.length === 0) return null;
    const svgW = 400;
    const svgH = 200;
    const padding = 30;

    const values = reebGraph.nodes.map((n) => n.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const nodePositions = reebGraph.nodes.map((node) => ({
      id: node.id,
      x: padding + ((node.value - minVal) / range) * (svgW - 2 * padding),
      y: svgH / 2 + Math.sin(node.id * 1.3) * (svgH / 2 - padding),
      persistence: node.persistence,
    }));

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48">
        {reebGraph.edges.map((edge, i) => {
          const from = nodePositions.find((n) => n.id === edge.from);
          const to = nodePositions.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`e${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#3f3f46"
              strokeWidth="1.5"
              opacity={0.6}
            />
          );
        })}
        {nodePositions.map((np) => (
          <g key={`n${np.id}`}>
            <circle
              cx={np.x}
              cy={np.y}
              r={Math.max(3, Math.min(8, np.persistence * 20 + 3))}
              fill="#6cf0ff"
              opacity={0.8}
            />
            <circle
              cx={np.x}
              cy={np.y}
              r={Math.max(3, Math.min(8, np.persistence * 20 + 3)) + 3}
              fill="none"
              stroke="#6cf0ff"
              strokeWidth="0.5"
              opacity={0.3}
            />
          </g>
        ))}
        <text x={svgW / 2} y={svgH - 5} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="monospace">
          NIVEL DE SUPERFICIE
        </text>
      </svg>
    );
  };

  // SVG rendering for Persistence Diagram
  const renderPersistenceDiagram = () => {
    if (!persistenceDiag || persistenceDiag.pairs.length === 0) return null;
    const svgW = 400;
    const svgH = 200;
    const padding = 30;

    const allBirths = persistenceDiag.pairs.map((p) => p.birth);
    const allDeaths = persistenceDiag.pairs.map((p) => p.death);
    const minVal = Math.min(...allBirths, ...allDeaths);
    const maxVal = Math.max(...allBirths, ...allDeaths);
    const range = maxVal - minVal || 1;

    const scaleX = (v: number) => padding + ((v - minVal) / range) * (svgW - 2 * padding);
    const scaleY = (v: number) => svgH - padding - ((v - minVal) / range) * (svgH - 2 * padding);

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48">
        <line
          x1={scaleX(minVal)}
          y1={scaleY(minVal)}
          x2={scaleX(maxVal)}
          y2={scaleY(maxVal)}
          stroke="#3f3f46"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        {persistenceDiag.pairs.map((pair, i) => {
          const cx = scaleX(pair.birth);
          const cy = scaleY(pair.death);
          const color = pair.dimension === 0 ? "#b6ff3a" : "#ff3ad9";
          return (
            <g key={`p${i}`}>
              <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.8} />
              <circle cx={cx} cy={cy} r={7} fill="none" stroke={color} strokeWidth="0.5" opacity={0.3} />
            </g>
          );
        })}
        <text x={svgW / 2} y={svgH - 5} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="monospace">
          NASCIMENTO (BIRTH)
        </text>
        <text
          x={8}
          y={svgH / 2}
          textAnchor="middle"
          fill="#52525b"
          fontSize="8"
          fontFamily="monospace"
          transform={`rotate(-90, 8, ${svgH / 2})`}
        >
          MORTE (DEATH)
        </text>
        <circle cx={svgW - 60} cy={15} r={3} fill="#b6ff3a" />
        <text x={svgW - 53} y={18} fill="#52525b" fontSize="7" fontFamily="monospace">H0</text>
        <circle cx={svgW - 35} cy={15} r={3} fill="#ff3ad9" />
        <text x={svgW - 28} y={18} fill="#52525b" fontSize="7" fontFamily="monospace">H1</text>
      </svg>
    );
  };

  // SVG rendering for Spin network loop
  const renderSpinNetwork = () => {
    if (!spinResult) return null;
    const svgW = 400;
    const svgH = 220;
    const cX = svgW / 2;
    const cY = svgH / 2 - 10;
    const r = 60;

    const nodePositions = spinResult.nodes.map((node, i) => {
      const angle = (i / spinResult.nodes.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: node.id,
        x: cX + r * Math.cos(angle),
        y: cY + r * Math.sin(angle),
        spin: node.spin,
        valence: node.valence,
      };
    });

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-52">
        {/* Draw Faces as shaded polygons if available */}
        {spinResult.faces.map((face, index) => {
          const pts = face.vertices
            .map((vId) => nodePositions.find((np) => np.id === vId))
            .filter(Boolean) as Array<{ x: number; y: number }>;
          if (pts.length < 3) return null;
          const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <polygon
              key={`face-${index}`}
              points={pointsStr}
              fill="#b6ff3a"
              fillOpacity="0.05"
              stroke="#b6ff3a"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Draw Edges */}
        {spinResult.edges.map((edge, i) => {
          const from = nodePositions.find((n) => n.id === edge.from_node);
          const to = nodePositions.find((n) => n.id === edge.to_node);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`edge-${i}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#ff3ad9" strokeWidth="1" opacity={0.8} />
              <text x={midX} y={midY - 4} fill="#ff3ad9" fontSize="6" fontFamily="monospace" textAnchor="middle">
                j={edge.spin}
              </text>
            </g>
          );
        })}

        {/* Draw Nodes */}
        {nodePositions.map((np) => (
          <g key={`spin-node-${np.id}`}>
            <circle cx={np.x} cy={np.y} r={6} fill="#080a0c" stroke="#6cf0ff" strokeWidth="1.5" />
            <text x={np.x} y={np.y + 2} fill="#6cf0ff" fontSize="5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              {np.id.replace("n", "")}
            </text>
          </g>
        ))}

        <text x={svgW / 2} y={svgH - 12} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="monospace">
          REDE DE SPIN: {spinResult.nodes.length} NÓS | {spinResult.edges.length} ARESTAS
        </text>
      </svg>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#14181c] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#6cf0ff] font-mono tracking-wide">
            QRC RELATIVISTIC DASHBOARD
          </h1>
          <div className="text-[9px] font-mono text-zinc-500 mt-1">
            SISTEMA DE ECOSSISTEMA COMPUTAÇÃO PÓS-QUÂNTICA RELATIVÍSTICA EMULADA
          </div>
        </div>

        {/* Tabs controller */}
        <div className="flex flex-wrap gap-1 bg-[#0c0f12] p-1 border border-[#1b2126] rounded">
          <button
            onClick={() => setActiveTab("topology")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "topology" ? "bg-[#6cf0ff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            TOPOLOGIA
          </button>
          <button
            onClick={() => setActiveTab("spin")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "spin" ? "bg-[#ff3ad9] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            REDE DE SPIN
          </button>
          <button
            onClick={() => setActiveTab("switch")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "switch" ? "bg-[#b6ff3a] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            SWITCH QUÂNTICO
          </button>
          <button
            onClick={() => setActiveTab("theorems")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "theorems" ? "bg-[#6cf0ff] text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            TEOREMAS
          </button>
          <button
            onClick={() => setActiveTab("operators")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
              activeTab === "operators" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            ÁLGEBRA MCM
          </button>
        </div>
      </div>

      {/* ─── TAB: TOPOLOGY ─────────────────────────────────────────────────── */}
      {activeTab === "topology" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#080a0c] border border-[#14181c] p-3 rounded">
            <span className="text-[10px] font-mono text-zinc-500">Métrica de campos de distância assinados espectrais</span>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-1.5 bg-[#6cf0ff] text-black font-mono text-[10px] font-bold rounded hover:bg-[#5adcee] disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? "ANALISANDO..." : "ANALISAR TOPOLOGIA"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h2 className="text-xs font-mono text-zinc-400 mb-2">GRAFO DE REEB</h2>
              <div className="text-[8px] font-mono text-zinc-600 mb-3">Componentes conexos dos conjuntos de nível</div>
              {reebGraph && reebGraph.nodes.length > 0 ? (
                renderReebGraph()
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-700 font-mono text-xs italic">
                  Clique "ANALISAR" para gerar
                </div>
              )}
            </div>

            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h2 className="text-xs font-mono text-zinc-400 mb-2">DIAGRAMA DE PERSISTÊNCIA</h2>
              <div className="text-[8px] font-mono text-zinc-600 mb-3">Pares nascimento-morte de features topológicas</div>
              {persistenceDiag && persistenceDiag.pairs.length > 0 ? (
                renderPersistenceDiagram()
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-700 font-mono text-xs italic">
                  Clique "ANALISAR" para gerar
                </div>
              )}
            </div>

            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h2 className="text-xs font-mono text-zinc-400 mb-2">CARACTERÍSTICA DE EULER</h2>
              {eulerChar !== null ? (
                <div className="flex items-center gap-4 py-4">
                  <div className="text-3xl font-mono font-bold text-white">{eulerChar}</div>
                  <div>
                    <div className="text-[8px] font-mono text-zinc-500">GÊNUS ESTIMADO</div>
                    <div className="text-sm font-mono text-[#b6ff3a]">g = {Math.max(0, Math.round((2 - eulerChar) / 2))}</div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-700 font-mono text-xs italic">Aguardando análise</div>
              )}
              <div className="mt-3 pt-3 border-t border-[#14181c] flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${topoChanged ? "bg-[#ff3ad9] animate-pulse" : "bg-[#b6ff3a]"}`} />
                <span className={`text-[8px] font-mono font-bold ${topoChanged ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}`}>
                  {topoChanged ? "GENUS ALTERADO" : "ESTÁVEL"}
                </span>
              </div>
            </div>

            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h2 className="text-xs font-mono text-zinc-400 mb-2">GEOMETRIA DIFERENCIAL</h2>
              <div className="space-y-2 text-[10px] font-mono">
                <div className="flex justify-between p-2 bg-[#0a0d10] border border-[#14181c] rounded">
                  <span className="text-zinc-500">CURVATURA GAUSSIANA (k1*k2)</span>
                  <span className="text-white">{curvatures ? (curvatures.k1 * curvatures.k2).toFixed(6) : "--"}</span>
                </div>
                <div className="flex justify-between p-2 bg-[#0a0d10] border border-[#14181c] rounded">
                  <span className="text-zinc-500">NORMA SOBOLEV H1</span>
                  <span className="text-[#b6ff3a]">{sobolev !== null ? sobolev.toFixed(6) : "--"}</span>
                </div>
                <div className="flex justify-between p-2 bg-[#0a0d10] border border-[#14181c] rounded">
                  <span className="text-zinc-500">DERIVADA DE FRÉCHET</span>
                  <span className="text-[#ff3ad9]">{frechet !== null ? frechet.toFixed(6) : "--"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SDF Values (when available) */}
          {fieldValues.length > 0 && (
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h3 className="text-xs font-mono text-zinc-400 mb-2">
                CAMPO SDF AMOSTRADO (64 valores)
              </h3>
              <div className="flex items-end gap-[2px] h-16">
                {fieldValues.map((v, i) => {
                  const normalized = (v + 1) / 2;
                  const isNeg = v < 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${normalized * 100}%`,
                        backgroundColor: isNeg ? "#ff3ad940" : "#6cf0ff40",
                        borderTop: `1px solid ${isNeg ? "#ff3ad9" : "#6cf0ff"}`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[7px] font-mono text-zinc-600 mt-1">
                <span>0</span>
                <span>#6cf0ff: positivo | #ff3ad9: negativo</span>
                <span>63</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: SPIN NETWORKS ─────────────────────────────────────────────── */}
      {activeTab === "spin" && (
        <div className="space-y-4">
          <div className="bg-[#080a0c] border border-[#14181c] p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-[8px] font-mono text-zinc-500 mb-1">NÚMERO DE QUBITS (NÓS)</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={nQubits}
                  onChange={(e) => setNQubits(parseInt(e.target.value))}
                  className="bg-[#0c0f12] border border-[#1b2126] text-white px-2 py-1 text-xs font-mono w-24 rounded"
                />
              </div>
              <div>
                <label className="block text-[8px] font-mono text-zinc-500 mb-1">PASSOS DE TEMPO (SPIN FOAM)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={spinSteps}
                  onChange={(e) => setSpinSteps(parseInt(e.target.value))}
                  className="bg-[#0c0f12] border border-[#1b2126] text-white px-2 py-1 text-xs font-mono w-24 rounded"
                />
              </div>
            </div>
            <button
              onClick={handleEvolveSpin}
              disabled={isSpinEvolving}
              className="px-4 py-2 bg-[#ff3ad9] text-white font-mono text-xs font-bold rounded hover:bg-[#d632b6] disabled:opacity-50 transition-colors"
            >
              {isSpinEvolving ? "EVOLUINDO REDE..." : "EVOLUIR REDE (PACHNER MOVES)"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Visualizer */}
            <div className="lg:col-span-2 bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-1">PROJEÇÃO GEOMÉTRICA DA ESPUMA DE SPIN</h3>
                <p className="text-[8px] font-mono text-zinc-600 mb-4">Simulação 3D projetada em 2D. Faces pontilhadas representam triangulações da espuma.</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                {spinResult ? renderSpinNetwork() : <div className="text-zinc-700 font-mono text-xs italic">Nenhum resultado gerado</div>}
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-mono text-zinc-400">MÉTRICAS DA ESPUMA DE SPIN</h3>
              {spinResult ? (
                <div className="space-y-3 text-[10px] font-mono">
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded">
                    <span className="text-zinc-500 block mb-1">AMPLITUDE TOTAL DA TRANSIÇÃO</span>
                    <span className="text-lg font-bold text-[#6cf0ff]">{spinResult.amplitude.toFixed(6)}</span>
                  </div>

                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded">
                    <span className="text-zinc-500 block mb-1">ESTATÍSTICAS DA REDE</span>
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <div>Nós: {spinResult.nodes.length}</div>
                      <div>Arestas: {spinResult.edges.length}</div>
                      <div>Vértices Foam: {spinResult.vertices.length}</div>
                      <div>Faces Áreas: {spinResult.faces.length}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded">
                    <span className="text-zinc-500 block mb-1">HISTÓRICO DE MOVIMENTOS DE PACHNER</span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[8px]">
                      {spinResult.vertices.map((v, i) => (
                        <div key={i} className="text-[#b6ff3a]">
                          Passo {i + 1}: Movimento 2-3 de spins [{v.spins?.join(", ")}] para [{v.new_edges?.join(", ")}]
                        </div>
                      ))}
                      {spinResult.vertices.length === 0 && <div className="text-zinc-600">Nenhum movimento registrado nos passos atuais.</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-700 font-mono text-xs italic">Aguardando dados</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: QUANTUM SWITCH ────────────────────────────────────────────── */}
      {activeTab === "switch" && (
        <div className="space-y-4">
          <div className="bg-[#080a0c] border border-[#14181c] p-4 rounded-lg">
            <h3 className="text-xs font-mono text-zinc-400 mb-3">FILA DE OPERAÇÕES CAUSAIS</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {switchOps.map((op, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#0c0f12] border border-[#1b2126] px-2.5 py-1 rounded text-xs font-mono">
                  <span className="text-[#b6ff3a]">{op.name}</span>
                  <span className="text-zinc-500">({op.gate})</span>
                  <button onClick={() => handleRemoveOp(i)} className="text-red-500 hover:text-red-400 font-bold ml-1">×</button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Nome da Operação"
                value={newOpName}
                onChange={(e) => setNewOpName(e.target.value)}
                className="bg-[#0c0f12] border border-[#1b2126] text-white px-2 py-1.5 text-xs font-mono rounded"
              />
              <select
                value={newOpGate}
                onChange={(e) => setNewOpGate(e.target.value)}
                className="bg-[#0c0f12] border border-[#1b2126] text-white px-2 py-1.5 text-xs font-mono rounded"
              >
                <option value="H">Hadamard (H)</option>
                <option value="X">Pauli-X (Not)</option>
                <option value="Y">Pauli-Y</option>
                <option value="Z">Pauli-Z</option>
              </select>
              <button onClick={handleAddOp} className="px-3 py-1.5 bg-zinc-800 text-white font-mono text-xs font-bold rounded hover:bg-zinc-700 transition-colors">
                + ADICIONAR
              </button>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Shots:</span>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={switchSteps}
                  onChange={(e) => setSwitchSteps(parseInt(e.target.value) || 100)}
                  className="bg-[#0c0f12] border border-[#1b2126] text-white px-2 py-1 text-xs font-mono w-16 rounded"
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={handleSimulateSwitch}
                disabled={isSwitchSimulating}
                className="px-4 py-2 bg-[#b6ff3a] text-black font-mono text-xs font-bold rounded hover:bg-[#a3e635] disabled:opacity-50 transition-colors"
              >
                {isSwitchSimulating ? "EXECUTANDO SWITCH..." : "EXECUTAR SWITCH QUÂNTICO (Ω)"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Visualizer Causal Superposition */}
            <div className="lg:col-span-2 bg-[#080a0c] border border-[#14181c] rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-mono text-zinc-400">PROBABILIDADE DE ORDEM CAUSAL</h3>
              {switchResult ? (
                <div className="space-y-4 font-mono text-[10px]">
                  {switchResult.orders.map((order, i) => {
                    const prob = switchResult.probabilities[i] ?? 0;
                    const amp = switchResult.amplitudes[i] ?? "0";
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#6cf0ff]">{order.join(" ➔ ")}</span>
                          <span className="text-zinc-500">Amplitude: {amp}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-[#0c0f12] border border-[#1b2126] h-3.5 rounded overflow-hidden">
                            <div className="bg-[#b6ff3a] h-full" style={{ width: `${prob * 100}%` }} />
                          </div>
                          <span className="w-12 text-right font-bold text-white">{(prob * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-[#14181c] pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-[8px] text-zinc-500">MEDIR E COLAPSAR CAUSALIDADE</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">Força o switch a decidir uma ordem causal clássica baseada em probabilidades quânticas.</div>
                    </div>
                    <button
                      onClick={handleCollapseSwitch}
                      disabled={switchCollapsed}
                      className="px-4 py-2 bg-amber-500 text-black font-mono text-xs font-bold rounded hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                      {switchCollapsed ? "MEDIDO & COLAPSADO" : "REALIZAR MEDIÇÃO"}
                    </button>
                  </div>

                  {switchCollapsed && switchResult.measurement && (
                    <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded text-amber-500 text-[10px]">
                      <strong>[COLAPSO DE CAUSALIDADE EMULADA]:</strong><br />
                      Ordem clássica emergente: <span className="text-amber-400 font-bold">{switchResult.measurement.collapsed_order.join(" ➔ ")}</span><br />
                      Probabilidade da transição: <span className="text-amber-400 font-bold">{(switchResult.measurement.probability * 100).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-700 font-mono text-xs italic">Simule o Switch Quântico para visualizar</div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 space-y-4 text-[10px] font-mono">
              <h3 className="text-xs font-mono text-zinc-400">ESTADO DO DISPOSITIVO SWITCH</h3>
              {switchResult ? (
                <div className="space-y-2">
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded">
                    <span className="text-zinc-500 block mb-1">ENTROPIA DA ORDEM CAUSAL</span>
                    <span className="text-lg font-bold text-white">{switchResult.stats.entropy.toFixed(4)} Sh</span>
                  </div>

                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded space-y-1">
                    <span className="text-zinc-500 block">ESTADO DE CAUSALIDADE</span>
                    <div>Superposto: <span className={switchResult.stats.is_superposed ? "text-[#b6ff3a]" : "text-zinc-500"}>{switchResult.stats.is_superposed ? "SIM" : "NÃO"}</span></div>
                    <div>Canais Causalmente Ativos: {switchResult.stats.num_possible_orders}</div>
                  </div>

                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] rounded space-y-1">
                    <span className="text-zinc-500 block">CONDIÇÕES DE HILBERT</span>
                    <div>Unitário: <span className={switchResult.causality.unitary ? "text-green-500" : "text-red-500"}>{switchResult.causality.unitary ? "APROVADO" : "FALHA"}</span></div>
                    <div>Não Degenerado: <span className={switchResult.causality.non_degenerate ? "text-green-500" : "text-red-500"}>{switchResult.causality.non_degenerate ? "APROVADO" : "FALHA"}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-700 font-mono text-xs italic">Aguardando execução</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: THEOREMS ─────────────────────────────────────────────────── */}
      {activeTab === "theorems" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#080a0c] border border-[#14181c] p-3 rounded">
            <span className="text-[10px] font-mono text-zinc-500">Auditoria formal dos teoremas fundamentais do ecossistema CQR</span>
            <button
              onClick={handleValidateTheoremsAction}
              disabled={isValidatingTheorems}
              className="px-4 py-1.5 bg-[#6cf0ff] text-black font-mono text-[10px] font-bold rounded hover:bg-[#5adcee] disabled:opacity-50 transition-colors"
            >
              {isValidatingTheorems ? "EXECUTANDO AUDITORIA..." : "EXECUTAR VALIDAÇÃO DOS TEOREMAS"}
            </button>
          </div>

          {theoremResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Theorem 1 */}
              <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-zinc-500">TEOREMA 1</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${theoremResult.theorem1_pachner.holds ? "bg-green-950 text-green-400 border border-green-800" : "bg-red-950 text-red-400 border border-red-800"}`}>
                      {theoremResult.theorem1_pachner.holds ? "VALIDADO" : "FALHA"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mb-2">{theoremResult.theorem1_pachner.theorem}</h3>
                  <p className="text-[10px] font-mono text-zinc-400 mb-4">{theoremResult.theorem1_pachner.note}</p>
                </div>
                <div className="pt-3 border-t border-[#14181c] text-[9px] font-mono space-y-1 text-zinc-500">
                  <div>Confiança: <span className="text-white font-bold">{(theoremResult.theorem1_pachner.confidence * 100).toFixed(1)}%</span></div>
                  <div>Triangulação Delta Edges: {theoremResult.theorem1_pachner.evidence.delta_edges}</div>
                  <div>Invariante Preservado: {theoremResult.theorem1_pachner.evidence.converged ? "SIM" : "NÃO"}</div>
                </div>
              </div>

              {/* Theorem 2 */}
              <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-zinc-500">TEOREMA 2</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${theoremResult.theorem2_holographic.holds ? "bg-green-950 text-green-400 border border-green-800" : "bg-red-950 text-red-400 border border-red-800"}`}>
                      {theoremResult.theorem2_holographic.holds ? "VALIDADO" : "FALHA"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mb-2">{theoremResult.theorem2_holographic.theorem}</h3>
                  <p className="text-[10px] font-mono text-zinc-400 mb-4">{theoremResult.theorem2_holographic.note}</p>
                </div>
                <div className="pt-3 border-t border-[#14181c] text-[9px] font-mono space-y-1 text-zinc-500">
                  <div>Compressão MERA Fidelidade: <span className="text-white font-bold">{(theoremResult.theorem2_holographic.confidence * 100).toFixed(2)}%</span></div>
                  <div>Conservação de Energia: {theoremResult.theorem2_holographic.evidence.energy_preserved ? "PRESERVADA" : "DESVIADA"}</div>
                  <div>Dimensão de Ligação Alvo: {theoremResult.theorem2_holographic.evidence.target_bond_dim}</div>
                </div>
              </div>

              {/* Theorem 3 */}
              <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-zinc-500">TEOREMA 3</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${theoremResult.theorem3_causality.holds ? "bg-green-950 text-green-400 border border-green-800" : "bg-red-950 text-red-400 border border-red-800"}`}>
                      {theoremResult.theorem3_causality.holds ? "VALIDADO" : "FALHA"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white font-mono mb-2">{theoremResult.theorem3_causality.theorem}</h3>
                  <p className="text-[10px] font-mono text-zinc-400 mb-4">{theoremResult.theorem3_causality.note}</p>
                </div>
                <div className="pt-3 border-t border-[#14181c] text-[9px] font-mono space-y-1 text-zinc-500">
                  <div>Fração Dominante Medida: <span className="text-white font-bold">{(theoremResult.theorem3_causality.confidence * 100).toFixed(1)}%</span></div>
                  <div>Redução de Entropia: {theoremResult.theorem3_causality.evidence.entropy_reduction?.toFixed(4)} bits</div>
                  <div>Decaimento Monotônico: {theoremResult.theorem3_causality.evidence.monotonic_entropy ? "SIM" : "NÃO"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-[#080a0c] border border-[#14181c] rounded-lg text-zinc-700 font-mono text-xs italic">
              Aguardando execução da validação formal
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: MCM ALGEBRA OPERATORS ─────────────────────────────────────── */}
      {activeTab === "operators" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Control Panel */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-mono text-zinc-400">OPERADORES DE COLAPSO (â, r̂, ĉ)</h3>
              <p className="text-[9px] font-mono text-zinc-500 leading-normal">
                Implementa a Mecânica de Colapsos com Memória. A tensão acumula via operador de excitação <strong>â</strong>, flutua via operador de relaxamento <strong>r̂</strong>, e colapsa com registro histórico via operador <strong>ĉ</strong>.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleOperatorAccumulate}
                  className="w-full py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/60 font-mono text-xs font-bold rounded transition-colors flex items-center justify-between px-3"
                >
                  <span>OPERADOR EXCITAÇÃO â</span>
                  <span>Acumula Tensão</span>
                </button>

                <button
                  onClick={handleOperatorRelease}
                  disabled={stressLevel <= 0.0}
                  className="w-full py-2 bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border border-blue-900/60 disabled:opacity-30 font-mono text-xs font-bold rounded transition-colors flex items-center justify-between px-3"
                >
                  <span>OPERADOR RELAXAMENTO r̂</span>
                  <span>Libera Tensão</span>
                </button>

                <button
                  onClick={handleOperatorCollapse}
                  className="w-full py-2 bg-green-950/20 hover:bg-green-950/40 text-green-400 border border-green-900/60 font-mono text-xs font-bold rounded transition-colors flex items-center justify-between px-3"
                >
                  <span>OPERADOR COLAPSO ĉ</span>
                  <span>Colapso com Memória</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#14181c] text-[10px] font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tensão Acumulada:</span>
                  <span className="text-white font-bold">{stressLevel.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Colapsos Registrados:</span>
                  <span className="text-white font-bold">{collapseCount}</span>
                </div>
                {lastCollapseHash && (
                  <div className="text-[8px] text-[#b6ff3a] break-all border border-[#b6ff3a]/20 p-2 bg-[#b6ff3a]/5 rounded">
                    Último Hash: {lastCollapseHash}
                  </div>
                )}
              </div>
            </div>

            {/* LSC Feedback Loop Gauge */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-2">SATURAÇÃO LSC RELATIVÍSTICA</h3>
                <p className="text-[8px] font-mono text-zinc-600 mb-4">Mapeamento da retroalimentação G(C_epsilon). Satura conforme o acúmulo de estresse geométrico do bulk.</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {/* Circular indicator simulating gauge */}
                <div className="relative size-32 rounded-full border-4 border-[#1b2126] flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#b6ff3a] border-r-[#b6ff3a] border-b-transparent border-l-transparent animate-spin-slow opacity-60" style={{ animationDuration: `${lscFeedback * 6}s` }} />
                  <div className="text-center font-mono">
                    <div className="text-2xl font-bold text-white">{(lscFeedback * 100).toFixed(1)}%</div>
                    <div className="text-[6px] text-zinc-500 uppercase tracking-widest mt-1">LSC_SATURATION</div>
                  </div>
                </div>
                <div className="w-full text-center text-[10px] font-mono text-zinc-400">
                  G(C_ε) = {lscFeedback.toFixed(4)}
                </div>
              </div>

              <div className="text-[8px] font-mono text-zinc-500 bg-[#0a0d10] p-2 border border-[#14181c] rounded leading-normal">
                <em>* Nota Física:</em> Se G(C_ε) atingir 0%, a holofricção satura o motor, interrompendo as flutuações e exigindo colapso ĉ para redefinição de estado.
              </div>
            </div>

            {/* Operator logs */}
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4 flex flex-col">
              <h3 className="text-xs font-mono text-zinc-400 mb-2">REGISTRO DE OPERADORES</h3>
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1">
                {operatorHistory.map((item, i) => (
                  <div key={i} className="p-2 bg-[#0a0d10] border border-[#14181c] rounded text-[8px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className={`px-1 rounded font-bold ${item.op === "â" ? "bg-red-950 text-red-400" : item.op === "r̂" ? "bg-blue-950 text-blue-400" : "bg-green-950 text-green-400"}`}>
                        Op {item.op}
                      </span>
                      <span className="text-zinc-600">{item.timestamp}</span>
                    </div>
                    <div className="text-zinc-400 leading-normal">{item.detail}</div>
                  </div>
                ))}
                {operatorHistory.length === 0 && (
                  <div className="h-full flex items-center justify-center text-zinc-700 font-mono text-xs italic py-16">
                    Nenhum operador executado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-[8px] font-mono text-zinc-700 tracking-widest uppercase text-center">
        QRC · PÓS-COMPUTAÇÃO QUÂNTICA EMULADA EM ESCALA RELATIVÍSTICA
      </div>
    </div>
  );
}
