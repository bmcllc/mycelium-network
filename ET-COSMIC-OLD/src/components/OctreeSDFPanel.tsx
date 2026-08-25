import { useRef, useState } from "react";
import { OctreeSDF, type OctreeNode, type AABB } from "../crypto/octreeSdf";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { point3FromMaterial, unit } from "../lib/moduleRealityBackend";

export default function OctreeSDFPanel() {
  const { material } = useOmegaMaterial(128);
  const insertRef = useRef(0);
  const [tree, setTree] = useState<OctreeNode | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [leafCount, setLeafCount] = useState(0);
  const [maxDepth, setMaxDepth] = useState(4);
  const [evalPoint, setEvalPoint] = useState<[number, number, number]>([0.5, 0.5, 0.5]);
  const [evalResult, setEvalResult] = useState<number | null>(null);
  const [serialized, setSerialized] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const octreeRef = useRef(new OctreeSDF());

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const countNodes = (node: OctreeNode): { total: number; leaves: number } => {
    let total = 1;
    let leaves = node.isLeaf ? 1 : 0;
    if (node.children) {
      for (const child of node.children) {
        const c = countNodes(child);
        total += c.total;
        leaves += c.leaves;
      }
    }
    return { total, leaves };
  };

  const handleBuild = () => {
    const bounds: AABB = { min: [-1, -1, -1], max: [1, 1, 1] };
    // Sphere SDF: distance to unit sphere
    const sdfFn = (p: number[]) => Math.sqrt(p[0]! ** 2 + p[1]! ** 2 + p[2]! ** 2) - 0.8;
    const root = octreeRef.current.buildFromFunction(sdfFn, bounds, maxDepth);
    setTree(root);
    const counts = countNodes(root);
    setNodeCount(counts.total);
    setLeafCount(counts.leaves);
    addLog(`Octree construida: ${counts.total} nos, ${counts.leaves} folhas, depth=${maxDepth}`);
  };

  const handleEvaluate = () => {
    if (!tree) return;
    const val = octreeRef.current.evaluate(tree, evalPoint);
    setEvalResult(val);
    addLog(`SDF([${evalPoint.join(",")}]) = ${val.toFixed(6)}`);
  };

  const handleSerialize = () => {
    if (!tree) return;
    const buffer = octreeRef.current.serialize(tree);
    setSerialized(buffer.length);
    addLog(`Serializado: ${buffer.length}B (magic: 0x${Array.from(buffer.slice(0, 4)).map(b => b.toString(16)).join("")})`);
  };

  const handleDeserialize = () => {
    if (!tree) return;
    const buffer = octreeRef.current.serialize(tree);
    const restored = octreeRef.current.deserialize(buffer);
    const counts = countNodes(restored);
    addLog(`Deserializado: ${counts.total} nos restaurados (verificacao OK)`);
  };

  const handleInsert = () => {
    if (!tree || !material) return;
    const i = insertRef.current++ * 3;
    const point = point3FromMaterial(material, i);
    octreeRef.current.insert(tree, point, unit(material, i + 48), maxDepth);
    const counts = countNodes(tree);
    setNodeCount(counts.total);
    setLeafCount(counts.leaves);
    addLog(`Insert: ponto [${point.map(p => p.toFixed(2)).join(",")}] -> ${counts.total} nos`);
  };

  return (
    <section id="octree-sdf-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">§ 13.11</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ff3ad9]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">OCTREE SDF</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Octree <span className="text-[#ff3ad9]">SDF</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Representacao hierarquica de campos de distancia assinados via octree adaptativa.
            Renderizacao SDF, colisao, compressao de geometria e PoW via traverse.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CONSTRUTOR OCTREE</span>
              <span className="font-mono text-[10px] text-zinc-600">{nodeCount} nos | {leafCount} folhas</span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">MAX DEPTH</span>
                <span className="font-mono text-[10px] text-[#ff3ad9]">{maxDepth}</span>
              </div>
              <input
                type="range" min={1} max={8} value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#ff3ad9]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={handleBuild}
                className="py-3 bg-[#ff3ad9] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                BUILD SPHERE
              </button>
              <button
                onClick={handleInsert}
                disabled={!tree}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] hover:bg-[#b6ff3a]/10 disabled:opacity-50 transition-all"
              >
                INSERT POINT
              </button>
              <button
                onClick={handleSerialize}
                disabled={!tree}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10 disabled:opacity-50 transition-all"
              >
                SERIALIZE
              </button>
            </div>

            <div className="mb-6">
              <span className="font-mono text-[9px] text-zinc-600 mb-2 block">AVALIAR PONTO</span>
              <div className="flex gap-2">
                {(["x", "y", "z"] as const).map((axis, i) => (
                  <div key={axis} className="flex-1">
                    <span className="font-mono text-[8px] text-zinc-600">{axis}</span>
                    <input
                      type="number" step="0.1" value={evalPoint[i]}
                      onChange={(e) => {
                        const next = [...evalPoint] as [number, number, number];
                        next[i] = parseFloat(e.target.value) || 0;
                        setEvalPoint(next);
                      }}
                      className="w-full bg-black border border-[#14181c] px-2 py-1 text-[10px] font-mono text-zinc-300 focus:outline-none"
                    />
                  </div>
                ))}
                <button
                  onClick={handleEvaluate}
                  disabled={!tree}
                  className="self-end px-3 py-1 bg-[#ff3ad9] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50 transition-all"
                >
                  SDF
                </button>
              </div>
              {evalResult !== null && (
                <div className="mt-2 p-2 bg-black border border-[#ff3ad9]/20 font-mono text-[10px] flex justify-between">
                  <span className="text-zinc-600">SDF</span>
                  <span className={evalResult < 0 ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>{evalResult.toFixed(6)}</span>
                </div>
              )}
            </div>

            {serialized > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px]">
                  <div className="text-zinc-600 mb-1">Serializado</div>
                  <div className="text-[#6cf0ff]">{serialized}B</div>
                </div>
                <button
                  onClick={handleDeserialize}
                  className="p-3 bg-black border border-[#b6ff3a]/20 font-mono text-[10px] text-[#b6ff3a] hover:bg-[#b6ff3a]/5 transition-all"
                >
                  DESERIALIZE (verificar)
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="tag mb-3 block">ESTRUTURA OCTREE</span>
                <div className="space-y-2">
                  {[
                    { name: "AABB Bounds", desc: "min/max 3D do subespaco", color: "#ff3ad9" },
                    { name: "SDF Value", desc: "Distancia assinada no centro", color: "#b6ff3a" },
                    { name: "Children (8)", desc: "8 octantes ou flag de folha", color: "#6cf0ff" },
                    { name: "Depth", desc: "Profundidade na arvore", color: "#ffd700" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                      <span className="w-2 h-2" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="text-zinc-300">{item.name}</div>
                        <div className="text-zinc-600 text-[8px]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">SDF teste</span>
                  <span className="text-zinc-300">esfera r=0.8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">bounds</span>
                  <span className="text-zinc-300">[-1,1]^3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">serializacao</span>
                  <span className="text-[#6cf0ff]">SDFO magic</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">variacao threshold</span>
                  <span className="text-zinc-300">10% size</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c]">
              <div className="tag mb-3">TERMINAL OUTPUT</div>
              <div className="h-40 overflow-y-auto font-mono text-[8px] text-zinc-500 space-y-1 scrollbar">
                {logs.length === 0 ? (
                  <div className="italic">// Aguardando operador...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l border-[#14181c] pl-2">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
