import { useState } from "react";
import {
  createPedersenCommitment,
  createBalanceProof,
  verifyBalanceProof,
  createRangeProof,
  verifyRangeProof,
  compileHydraCircuit,
} from "../crypto/zkp";

export default function ZKPLab() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [proofResult, setProofResult] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const runProof = async () => {
    setIsProving(true);
    setProofResult(null);
    addLog("Iniciando prova ZK (HydraBalanceProof via WASM)...");

    try {
      // 1. Compilar circuito (compatibilidade)
      addLog("Inicializando WASM core...");
      const t0 = performance.now();
      await compileHydraCircuit();
      const compileTime = ((performance.now() - t0) / 1000).toFixed(1);
      addLog(`✓ WASM core pronto em ${compileTime}s`);

      // 2. Gerar Pedersen commitments de entrada (Σ = 100)
      addLog("Gerando 10 Pedersen commitments de entrada (Σ = 100)...");
      const inputBfs: Uint8Array[] = [];
      const inputCommitments: Uint8Array[] = [];
      for (let i = 0; i < 10; i++) {
        const value = i === 0 ? 100 : 0;
        const { commitment, blindingFactor } = createPedersenCommitment(value);
        inputBfs.push(blindingFactor);
        inputCommitments.push(commitment);
      }

      // 3. Gerar Pedersen commitments de saída (Σ = 100)
      addLog("Gerando 10 Pedersen commitments de saída (Σ = 100)...");
      const outputBfs: Uint8Array[] = [];
      const outputCommitments: Uint8Array[] = [];
      for (let i = 0; i < 10; i++) {
        const value = i === 0 ? 50 : i === 1 ? 50 : 0;
        const { commitment, blindingFactor } = createPedersenCommitment(value);
        outputBfs.push(blindingFactor);
        outputCommitments.push(commitment);
      }

      addLog("Restrição: Σ v_in === Σ v_out (100 === 100)");

      // 4. Gerar balance proof (WASM)
      addLog("Gerando balance proof (Pedersen homomorfismo)...");
      const t1 = performance.now();
      const balanceProof = createBalanceProof(inputBfs, outputBfs);
      const proveTime = ((performance.now() - t1) / 1000).toFixed(1);
      addLog(`✓ Balance proof gerado em ${proveTime}s`);
      addLog(`Proof r_diff: ${Array.from(balanceProof.rDiff).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("")}...`);

      // 5. Verificar balance proof
      const valid = verifyBalanceProof(inputCommitments, outputCommitments, balanceProof);
      addLog(`Verificação balance proof: ${valid ? "✓ VÁLIDO" : "✗ INVÁLIDO"}`);

      // 6. Gerar range proof (Bulletproofs) para o primeiro output
      addLog("Gerando Bulletproofs range proof...");
      const t2 = performance.now();
      const rangeProof = createRangeProof(50, outputBfs[0]);
      const rangeTime = ((performance.now() - t2) / 1000).toFixed(1);
      addLog(`✓ Range proof gerado em ${rangeTime}s`);
      addLog(`Proof size: ${rangeProof.proof.length} bytes`);

      // 7. Verificar range proof
      const rangeValid = verifyRangeProof(rangeProof.proof, rangeProof.commitment);
      addLog(`Verificação range proof: ${rangeValid ? "✓ VÁLIDO" : "✗ INVÁLIDO"}`);

      setProofResult(
        `Prova ZK completa! Balance: ${valid ? "OK" : "FAIL"}, Range: ${rangeValid ? "OK" : "FAIL"}`
      );
    } catch (err) {
      addLog(`✗ ERRO: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsProving(false);
    }
  };

  return (
    <section className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-2 font-mono text-[11px] tracking-[0.3em] uppercase text-[#b6ff3a]">
          § 4.0 ─────────────────────────────────
        </div>
        <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100">
          ZKP <span className="text-[#b6ff3a]">Lab</span>
        </h2>
        <p className="mt-4 text-zinc-400 text-base md:text-lg max-w-2xl">
          Provas de conhecimento zero via WASM/Rust — Pedersen Commitments + Bulletproofs.
        </p>

        <div className="mt-12 grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-8 bg-[#080a0c] p-4 md:p-6">
            <div className="font-mono text-[10px] text-zinc-500 mb-4">
              WASM HYDRA BALANCE PROOF
            </div>

            <button
              onClick={runProof}
              disabled={isProving}
              className="px-4 py-2 bg-[#b6ff3a] text-black font-mono text-[10px] tracking-[0.2em] uppercase disabled:opacity-50"
            >
              {isProving ? "Gerando prova..." : "Executar Prova ZK"}
            </button>

            {proofResult && (
              <div className="mt-4 p-3 border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 font-mono text-[10px] text-[#b6ff3a]">
                {proofResult}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-[#080a0c] p-4 md:p-6">
            <div className="font-mono text-[10px] text-zinc-500 mb-4">SPEC</div>
            <div className="space-y-2 font-mono text-[8px] text-zinc-400">
              <div>Commitment: C = r·G + v·H (curve25519)</div>
              <div>Range Proof: Bulletproofs (Rust crate)</div>
              <div>Balance: ΣC_in - ΣC_out = r_diff·G</div>
              <div>Generator H: independent (unknown log)</div>
            </div>
          </div>
        </div>

        <div className="mt-px bg-[#080a0c] p-4 max-h-48 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="font-mono text-[8px] text-zinc-500">{log}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
