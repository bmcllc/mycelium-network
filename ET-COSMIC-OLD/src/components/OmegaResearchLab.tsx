import { useMemo, useState, useRef } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import {
  approximateNullSpaceScore,
  buildTraceCommitment,
  getNativeBoundaries,
  inspectAttestationReport,
  isDeepResearchWasmAvailable,
  makeReceiptProof,
} from "../omega/wasmDeepResearch";
import { hideInPixels, extractFromPixels } from "../omega/steganography";

const defaultMatrix = [
  [1, 0, 0, 0],
  [0, 2, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 4],
];

export default function OmegaResearchLab() {
  const { material } = useOmegaMaterial(256);
  // --- Existing state ---
  const [svdState, setSvdState] = useState<"idle" | "running" | "done">("idle");
  const [traceInput, setTraceInput] = useState("step_0: init\nstep_1: load_module\nstep_2: verify_attestation\nstep_3: execute");
  const [programId, setProgramId] = useState("zkvm_program_v1");
  const [svdResult, setSvdResult] = useState<{ dominantVector: number[]; nullScore: number; interpretation: string } | null>(null);
  const [sampleMatrix] = useState(defaultMatrix);
  const [attestationInput, setAttestationInput] = useState(
    "QUOTE\nMRENCLAVE=7f1a...\nNONCE=92ab...\nSIGNATURE=tee-attestation-sample"
  );

  // --- Stego State ---
  const [stegoMsg, setStegoMsg] = useState("VØID_SHARD_SECRET_DATA");
  const [stegoStatus, setStegoStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleHideInImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Gera imagem base (ruído ou padrão)
    const imageData = ctx.createImageData(200, 200);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const b = material ? material[(i / 4) % material.length]! : 128;
      imageData.data[i] = b;
      imageData.data[i + 1] = material ? material[(i / 4 + 1) % material.length]! : 64;
      imageData.data[i + 2] = material ? material[(i / 4 + 2) % material.length]! : 192;
      imageData.data[i + 3] = 255;
    }

    // 2. Esconde o dado via ANIMUS LSB
    const shardData = new TextEncoder().encode(stegoMsg);
    try {
      const infectedData = hideInPixels(imageData.data, shardData);
      imageData.data.set(infectedData);
      ctx.putImageData(imageData, 0, 0);
      setStegoStatus(`✓ Shard de ${shardData.length} bytes escondido na imagem.`);
    } catch (e) {
      setStegoStatus(`✗ Erro: ${e instanceof Error ? e.message : "Falha na esteganografia"}`);
    }
  };

  const handleExtractFromImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, 200, 200);
    try {
      const extracted = extractFromPixels(imageData.data);
      const msg = new TextDecoder().decode(extracted);
      setStegoStatus(`✓ Dado extraído: "${msg}"`);
    } catch (e) {
      setStegoStatus(`✗ Nenhum dado VØID encontrado.`);
    }
  };

  // ... (rest of logic)

  const boundaries = useMemo(() => getNativeBoundaries(), []);
  const traceLines = traceInput.split("\n").map((line) => line.trim()).filter(Boolean);
  const commitment = buildTraceCommitment(traceLines);
  const receipt = makeReceiptProof(traceLines, programId);
  const report = inspectAttestationReport(attestationInput);

  const runSvd = async () => {
    setSvdState("running");
    const result = await approximateNullSpaceScore(sampleMatrix);
    setSvdResult(result);
    setSvdState("done");
  };

  return (
    <div className="mt-12 border border-[#14181c] bg-black">
      <div className="grid lg:grid-cols-12 gap-px bg-[#14181c]">
        <div className="lg:col-span-4 bg-[#0a0d10] p-6 md:p-8">
          <div className="tag mb-4">ΩMEGA RESEARCH LAB · WASM SAFE ZONE</div>
          <h3 className="font-mono text-2xl text-zinc-100 mb-4">Estratos Profundos</h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Esta camada entrega protótipos executáveis em WebAssembly para pesquisa de SVD, commitments de zkVM e leitura de attestation reports.
            Artefatos de kernel, enclave e drivers de baixo nível permanecem explicitamente fora do escopo do browser.
          </p>
          <div className="grid gap-3">
            {boundaries.map((boundary) => (
              <div key={boundary.domain} className="border border-[#14181c] bg-black p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-mono text-xs text-zinc-200">{boundary.domain}</span>
                  <span className={`font-mono text-[9px] px-2 py-0.5 border ${
                    boundary.status === "researchable-in-browser"
                      ? "text-[#b6ff3a] border-[#b6ff3a]/30"
                      : boundary.status === "hybrid"
                      ? "text-[#6cf0ff] border-[#6cf0ff]/30"
                      : "text-[#ff3ad9] border-[#ff3ad9]/30"
                  }`}>
                    {boundary.status.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-zinc-600 leading-relaxed">{boundary.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 bg-black p-6 md:p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* ANIMUS STEGANOGRAPHY */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">ANIMUS · IMAGE STEGO (LSB)</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">ESTRATO 3</span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500 leading-relaxed mb-4">
                Esconda shards em imagens benignas usando o canal azul (LSB). 
                Isso torna o shard invisível para análise profunda de pacotes (DPI).
              </div>
              
              <div className="flex gap-4 mb-4">
                <canvas 
                  ref={canvasRef} 
                  width={200} height={200} 
                  className="size-32 bg-black border border-[#14181c]"
                />
                <div className="flex-1 space-y-2">
                  <input
                    value={stegoMsg}
                    onChange={e => setStegoMsg(e.target.value)}
                    className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-[10px] px-2 py-1.5 outline-none"
                    placeholder="Dado para esconder..."
                  />
                  <button
                    onClick={handleHideInImage}
                    className="w-full py-2 bg-[#b6ff3a] text-black font-mono text-[9px] hover:bg-white transition-colors"
                  >
                    HIDE SHARD IN IMAGE
                  </button>
                  <button
                    onClick={handleExtractFromImage}
                    className="w-full py-2 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[9px] hover:bg-[#b6ff3a]/10 transition-colors"
                  >
                    EXTRACT FROM IMAGE
                  </button>
                </div>
              </div>
              {stegoStatus && (
                <div className="p-2 bg-black border border-[#b6ff3a]/20 font-mono text-[10px] text-[#b6ff3a]">
                  {stegoStatus}
                </div>
              )}
            </div>

            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">STRATUM 0 · LLM SVD</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">
                  {isDeepResearchWasmAvailable() ? "WASM READY" : "WASM OFF"}
                </span>
              </div>
              <div className="font-mono text-[10px] text-zinc-500 leading-relaxed mb-4">
                Matriz de pesquisa 4×4 para estimar espaço nulo e direção dominante sem shipping de payload sensível.
              </div>
              <pre className="bg-black border border-[#14181c] p-3 text-[10px] text-zinc-500 overflow-auto">
{JSON.stringify(sampleMatrix, null, 2)}
              </pre>
              <button
                onClick={runSvd}
                className="mt-4 w-full border border-[#b6ff3a]/30 px-3 py-2 font-mono text-[10px] text-[#b6ff3a] hover:bg-[#b6ff3a]/10"
              >
                {svdState === "running" ? "RUNNING SVD..." : "RUN NULL-SPACE ESTIMATE"}
              </button>
              {svdResult && (
                <div className="mt-4 space-y-2 font-mono text-[10px]">
                  <div className="text-zinc-500">dominant_vector: <span className="text-zinc-300">[{svdResult.dominantVector.join(", ")}]</span></div>
                  <div className="text-zinc-500">null_score: <span className="text-[#b6ff3a]">{svdResult.nullScore}</span></div>
                  <div className="text-zinc-500 leading-relaxed">{svdResult.interpretation}</div>
                </div>
              )}
            </div>

            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="tag">STRATUM 6 · zkVM RECEIPT</span>
                <span className="font-mono text-[10px] text-[#6cf0ff]">CLIENT VERIFIER</span>
              </div>
              <input
                value={programId}
                onChange={(event) => setProgramId(event.target.value)}
                className="w-full bg-black border border-[#14181c] text-zinc-200 font-mono text-xs px-3 py-2 outline-none focus:border-[#6cf0ff]/50 mb-3"
              />
              <textarea
                value={traceInput}
                onChange={(event) => setTraceInput(event.target.value)}
                rows={5}
                className="w-full bg-black border border-[#14181c] text-zinc-200 font-mono text-xs px-3 py-2 outline-none focus:border-[#6cf0ff]/50"
              />
              <div className="mt-4 space-y-2 font-mono text-[10px]">
                <div className="text-zinc-500">trace_commitment: <span className="text-[#6cf0ff] break-all">{commitment.slice(0, 48)}...</span></div>
                <div className="text-zinc-500">receipt_seal: <span className="text-zinc-300 break-all">{receipt.seal.slice(0, 48)}...</span></div>
                <div className="text-zinc-500">steps: <span className="text-zinc-300">{receipt.steps}</span></div>
              </div>
            </div>
          </div>

          <div className="border border-[#14181c] bg-[#0a0d10] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="tag">STRATUM 2 · ATTESTATION INSPECTOR</span>
              <span className="font-mono text-[10px] text-[#ff3ad9]">REPORT PARSER</span>
            </div>
            <textarea
              value={attestationInput}
              onChange={(event) => setAttestationInput(event.target.value)}
              rows={5}
              className="w-full bg-black border border-[#14181c] text-zinc-200 font-mono text-xs px-3 py-2 outline-none focus:border-[#ff3ad9]/50"
            />
            <div className="mt-4 grid md:grid-cols-3 gap-3 font-mono text-[10px]">
              <div className="border border-[#14181c] bg-black p-3">
                <div className="text-zinc-600 mb-1">measurement</div>
                <div className={report.signals.hasMeasurement ? "text-[#b6ff3a]" : "text-zinc-500"}>
                  {report.signals.hasMeasurement ? "present" : "missing"}
                </div>
              </div>
              <div className="border border-[#14181c] bg-black p-3">
                <div className="text-zinc-600 mb-1">nonce/challenge</div>
                <div className={report.signals.hasNonce ? "text-[#b6ff3a]" : "text-zinc-500"}>
                  {report.signals.hasNonce ? "present" : "missing"}
                </div>
              </div>
              <div className="border border-[#14181c] bg-black p-3">
                <div className="text-zinc-600 mb-1">signature</div>
                <div className={report.signals.hasSignature ? "text-[#b6ff3a]" : "text-zinc-500"}>
                  {report.signals.hasSignature ? "present" : "missing"}
                </div>
              </div>
            </div>
            <div className="mt-4 font-mono text-[10px] text-zinc-500">
              digest: <span className="text-zinc-300 break-all">{report.digest.slice(0, 64)}...</span>
            </div>
            <div className="mt-2 font-mono text-[10px] text-zinc-500">{report.verdict}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
