import { useRef, useState } from "react";
import { buildSphinxPacket, peelSphinxLayer, SPHINX_PAYLOAD_SIZE, type SphinxPacket } from "../crypto/sphinx";

export default function SphinxMixnetPanel() {
  const [packet, setPacket] = useState<SphinxPacket | null>(null);
  const [layers, setLayers] = useState(3);
  const [input, setInput] = useState("");
  const [peeled, setPeeled] = useState<Uint8Array | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const handleBuild = () => {
    const data = new TextEncoder().encode(input || "Sphinx packet ETRNET");
    const routeKey = crypto.getRandomValues(new Uint8Array(32));
    const sphinxPacket = buildSphinxPacket(data, routeKey);
    setPacket(sphinxPacket);
    setPeeled(null);
    addLog(`Pacote Sphinx: ${data.length}B -> payload ${sphinxPacket.payload.length}B (fixo ${SPHINX_PAYLOAD_SIZE}B)`);
  };

  const handlePeel = () => {
    if (!packet) return;
    const nodeKey = crypto.getRandomValues(new Uint8Array(32));
    const result = peelSphinxLayer(packet, nodeKey);
    if (result) {
      setPeeled(result);
      addLog(`Peel: ${result.length}B extraidos (camada removida)`);
    } else {
      addLog("Peel falhou: chave incorreta ou dados corrompidos");
    }
  };

  const handleMultiLayer = () => {
    const data = new TextEncoder().encode(input || `Camada ${layers} do onion`);
    let currentData = data;
    const keys: Uint8Array[] = [];
    for (let i = 0; i < layers; i++) {
      keys.push(crypto.getRandomValues(new Uint8Array(32)));
    }
    let currentPacket = buildSphinxPacket(currentData, keys[0]!);
    for (let i = 1; i < layers; i++) {
      currentPacket = buildSphinxPacket(currentPacket.payload, keys[i]!);
    }
    setPacket(currentPacket);
    addLog(`Onion ${layers} camadas: ${data.length}B -> ${currentPacket.payload.length}B`);
  };

  return (
    <section id="sphinx-mixnet-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 13.4</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">SPHINX MIXNET</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Pacotes <span className="text-[#b6ff3a]">Sphinx</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Formato de pacote para roteamento anonimo. Shards QEL encapsulados em tamanho fixo
            com ChaCha20-Poly1305 em camadas (onion routing). Indistinguibilidade de trafego.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CONSTRUTOR DE PACOTES</span>
              <span className="font-mono text-[10px] text-zinc-600">payload fixo: {SPHINX_PAYLOAD_SIZE}B</span>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Dados para encapsular..."
                className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#b6ff3a]/50"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-zinc-500">CAMADAS ONION</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">{layers}</span>
              </div>
              <input
                type="range" min={1} max={7} value={layers}
                onChange={(e) => setLayers(parseInt(e.target.value))}
                className="w-full h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#b6ff3a]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={handleBuild}
                className="py-3 bg-[#b6ff3a] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                BUILD PACKET
              </button>
              <button
                onClick={handlePeel}
                disabled={!packet}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 disabled:opacity-50 transition-all"
              >
                PEEL LAYER
              </button>
              <button
                onClick={handleMultiLayer}
                className="py-3 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9]/10 transition-all"
              >
                MULTI-ONION
              </button>
            </div>

            {packet && (
              <div className="p-4 bg-black border border-[#14181c] font-mono text-[10px] space-y-2">
                <div className="tag mb-2">PACOTE ATUAL</div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">header</span>
                  <span className="text-zinc-400">{packet.header.length}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">payload</span>
                  <span className="text-[#b6ff3a]">{packet.payload.length}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">mac</span>
                  <span className="text-zinc-400">{packet.mac.length}B</span>
                </div>
                <div className="pt-1 border-t border-[#14181c] text-[8px] text-zinc-600 break-all">
                  header: {Array.from(packet.header.slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {peeled && (
                <div>
                  <span className="tag mb-3 block">PAYLOAD DECODIFICADO</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#b6ff3a]/20 font-mono text-[10px]">
                    <div className="text-zinc-300 mb-2">{new TextDecoder().decode(peeled)}</div>
                    <div className="text-[8px] text-zinc-600 break-all">
                      hex: {Array.from(peeled.slice(0, 24)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="tag mb-3 block">PROTOCOLO SPHINX</span>
                <div className="space-y-2">
                  {["Header (nonce + ephemeral key)", "Payload (tamanho fixo)", "MAC (SHA3-256 integrity)", "Onion layers (ChaCha20-Poly1305)"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                      <span className="w-4 h-4 flex items-center justify-center border border-[#b6ff3a]/30 text-[#b6ff3a] text-[8px]">{i}</span>
                      <span className="text-zinc-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">payload fixo</span>
                  <span className="text-[#b6ff3a]">{SPHINX_PAYLOAD_SIZE}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">cifra</span>
                  <span className="text-zinc-300">ChaCha20-Poly1305</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">integridade</span>
                  <span className="text-zinc-300">SHA3-256</span>
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
