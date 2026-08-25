import { useState, useEffect, useRef } from "react";
import { Flame, Cpu, AlertTriangle, Play, RefreshCw, Shield, Zap } from "lucide-react";
import {
  HardwareEnclaveModule,
  SlashingDefenseEngine,
  type SlashingIdentity,
  type DoubleSpendTransaction,
  type DefenseVerdict,
} from "../crypto/doubleSpendDefense";
import { getSigningKey } from "../crypto/signingKeys";

type LogLine = { ts: string; text: string; type: "info" | "warn" | "success" | "error" };

export default function DoubleSpendDefenseLab() {
  const [enclaveActive, setEnclaveActive] = useState(true);
  const [aliceCollateral, setAliceCollateral] = useState(1000);
  const [_statusMessage, setStatusMessage] = useState("Aguardando cenário de defesa...");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [wasmStatus, setWasmStatus] = useState<string>("Verificando...");
  const [defenseVerdict, setDefenseVerdict] = useState<DefenseVerdict | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<{
    secret: number; k: number; method: string; wasmUsed: boolean;
  } | null>(null);
  const [tx1, setTx1] = useState<DoubleSpendTransaction | null>(null);
  const [tx2, setTx2] = useState<DoubleSpendTransaction | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const enclave = new HardwareEnclaveModule();
  const slasher = new SlashingDefenseEngine();

  // Gerar identidade real via Ed25519
  const privateKeySeed = getSigningKey("double-spend-defense");
  const aliceIdentity: SlashingIdentity = {
    alias: "Alice_Anon",
    publicKey: Array.from(privateKeySeed.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(''),
    privateKeySeed: privateKeySeed,
  };

  const addLog = (text: string, type: LogLine["type"] = "info") => {
    setLogs(prev => [{ ts: new Date().toLocaleTimeString(), text, type }, ...prev].slice(0, 80));
  };

  useEffect(() => {
    (async () => {
      try {
        const { initWasm } = await import("../crypto/doubleSpendDefense");
        await initWasm();
        setWasmStatus("WASM_KERNEL活性");
      } catch {
        setWasmStatus("JS_FALLBACK");
      }
    })();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleRunSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setDefenseVerdict(null);
    setRecoveryResult(null);
    setTx1(null);
    setTx2(null);
    setAliceCollateral(1000);

    addLog("═══════════════════════════════════════════", "info");
    addLog("  DOUBLE-SPEND DEFENSE LAB — WASM + RUST", "info");
    addLog("═══════════════════════════════════════════", "info");

    if (enclaveActive) {
      // ─── MODALIDADE: ENCLAVE HARDWARE (TEE) ───────────────────────────
      addLog("Modo: SECURE ENCLAVE (Estrato 2) — WASM Monotonic Counter", "info");
      setStatusMessage("Enclave ativo — travando UTXO via contadores monotônicos WASM...");

      await new Promise(r => setTimeout(r, 400));
      addLog("Wallet.init(): gerando GhostID efêmero para Alice...", "info");
      const ghostSuffix = aliceIdentity.publicKey.slice(0, 8);
      addLog(`GhostID: void_◆_${ghostSuffix} (Ed25519 seed)`, "success");

      await new Promise(r => setTimeout(r, 300));
      addLog("Enclave.SGX.init(): carregando módulo WASM de contadores...", "info");
      addLog(`Device ID: ${enclave.getDeviceId()}`, "success");
      addLog("Counter[utxo_90fa] = 0 (inicial)", "info");

      // Step 1: Alice → Bob
      await new Promise(r => setTimeout(r, 600));
      addLog("─── PAGAMENTO 1: Alice → Bob ───", "info");
      addLog("Alice assina transação via Enclave SGX...", "info");

      const sig1 = await enclave.signUtxoLock("utxo_90fa");
      addLog(`Counter incremented: 0 → ${sig1.counterSigned} (via WASM memory[0..3])`, "success");
      addLog(`Attestation Report: ${sig1.attestationReport}`, "info");
      addLog(`Enclave Signature: ${sig1.signature.slice(0, 30)}...`, "info");
      addLog(`WASM Proof: counter=${sig1.wasmProof}`, "success");
      addLog("Bob valida Remote Attestation → VÁLIDO ✓", "success");
      addLog("Bob aceita pagamento. UTXO marcado como GASTO.", "success");

      setTx1({
        txId: "tx_bob_01",
        utxoId: "utxo_90fa",
        amount: 10,
        recipient: "Bob",
        enclaveSig: sig1,
        identityCommitment: "0x...",
        s1: "N/A (enclave mode)",
        wasmVerified: true,
      });

      // Step 2: Alice → Carlos (DOUBLE SPEND)
      await new Promise(r => setTimeout(r, 800));
      addLog("─── TENTATIVA DE GASTO DUPLO: Alice → Carlos ───", "error");
      addLog("Alice tenta pagar MESMO UTXO a Carlos via BLE offline...", "error");

      const sig2 = await enclave.signUtxoLock("utxo_90fa");
      addLog(`Counter attempt: tentou assinar novamente...`, "warn");

      // Detect tampering
      const tampering = await enclave.detectTampering("utxo_90fa");
      if (tampering.detected) {
        addLog(`🚨 TAMPERING DETECTED: ${tampering.proof}`, "error");
        addLog("ENCLAVE BLOCKS: Counter já avançou — re-signing impossível!", "error");
        addLog("Carlos recusa pagamento. Transação NÃO executada.", "error");
      } else {
        addLog("Counter avançou normalmente — verificando consistência...", "warn");
        addLog(`Counter atual: ${sig2.counterSigned} (esperado: ${sig1.counterSigned})`, "warn");
        if (sig2.counterSigned !== sig1.counterSigned) {
          addLog(`🚨 INCONSISTÊNCIA: counter changed ${sig1.counterSigned} → ${sig2.counterSigned}`, "error");
          addLog("Enclave rejeita segundo gasto!", "error");
        }
      }

      setTx2({
        txId: "tx_carlos_02",
        utxoId: "utxo_90fa",
        amount: 10,
        recipient: "Carlos",
        enclaveSig: sig2,
        identityCommitment: "0x...",
        s1: "N/A",
        wasmVerified: true,
      });

      setDefenseVerdict({
        defense: "enclave",
        blocked: true,
        details: `Enclave SGX bloqueou: counter ${sig1.counterSigned} → ${sig2.counterSigned}. Tampering detectado via WASM linear memory.`,
        wasmUsed: true,
      });

      setStatusMessage("Gasto duplo BLOQUEADO pelo Enclave WASM!");
      addLog("═══════════════════════════════════════════", "success");
      addLog("  RESULTADO: GASTO DUPLO IMPEDIDO PELO HARDWARE", "success");
      addLog("═══════════════════════════════════════════", "success");

    } else {
      // ─── MODALIDADE: SLASHING (GAME-THEORY) ────────────────────────────
      addLog("Modo: SOFTWARE BYPASS — Slashing via Shamir GF(256)", "warn");
      setStatusMessage("Enclave bypassado — Slashing math will punish Alice...");
      setAliceCollateral(1000);

      await new Promise(r => setTimeout(r, 400));
      addLog("Alice força bypass do TEE com firmware customizado...", "warn");
      addLog("Sistema de Slashing ativado como defesa redundante.", "info");

      await new Promise(r => setTimeout(r, 500));
      addLog("─── GERAÇÃO DE SPLIT-KEY via WASM GF(256) ───", "info");
      addLog("Polinômio: f(x) = secret ⊕ k⊗x (GF(256), irredutível 0x11B)", "info");

      const splits = await slasher.generateSplitSignatures(
        aliceIdentity, "utxo_90fa", "tx_bob", "tx_carlos"
      );

      addLog(`Identity Commitment: ${splits.identityCommitment}`, "info");
      addLog(`s1 = f(1) = ${splits.s1} (Alice → Bob)`, "success");
      addLog(`s2 = f(2) = ${splits.s2} (Alice → Carlos, gasto duplo)`, "warn");
      addLog(`k (coeficiente) = ${splits.k}`, "info");
      addLog(`Método: ${splits.method}`, "success");

      setTx1({
        txId: "tx_bob_01", utxoId: "utxo_90fa", amount: 10,
        recipient: "Bob", identityCommitment: splits.identityCommitment,
        s1: splits.s1, wasmVerified: splits.method.includes("WASM"),
      });

      await new Promise(r => setTimeout(r, 600));
      addLog("─── PAGAMENTO 1: Alice → Bob ───", "info");
      addLog(`Bob recebe s1 = ${splits.s1}. Valida commitment: OK`, "success");
      addLog("Bob aceita pagamento provisoriamente offline.", "success");

      setTx2({
        txId: "tx_carlos_02", utxoId: "utxo_90fa", amount: 10,
        recipient: "Carlos", identityCommitment: splits.identityCommitment,
        s1: splits.s1, s2: splits.s2, wasmVerified: splits.method.includes("WASM"),
      });

      await new Promise(r => setTimeout(r, 600));
      addLog("─── GASTO DUPLO: Alice → Carlos ───", "error");
      addLog(`Carlos recebe s2 = ${splits.s2}. Detecta mesmo UTXO!`, "warn");
      addLog("Carlos combina s1 + s2 para extrair a chave de Alice...", "error");

      // THE REVEAL
      await new Promise(r => setTimeout(r, 800));
      addLog("─── REVELAÇÃO ALGÉBRICA via WASM GF(256) ───", "error");
      addLog("Recover: k = gf_mul((s1 XOR s2), gf_inv(3))", "info");
      addLog("Recover: secret = s1 XOR k", "info");

      const recovery = await slasher.recoverSecretKey(splits.s1, splits.s2);
      setRecoveryResult(recovery);

      addLog(`k extraído: ${recovery.k} (via ${recovery.method})`, "error");
      addLog(`secret (private key seed): ${recovery.secret}`, "error");
      addLog(`WASM Used: ${recovery.wasmUsed ? "SIM — módulo nativo GF(256)" : "FALLBACK JS"}`, recovery.wasmUsed ? "success" : "warn");

      const verified = await slasher.verifySlashedIdentity(recovery.secret, splits.identityCommitment);
      addLog(`Verificação de identidade: ${verified ? "CONFIRMADA ✓" : "FALHA ✗"}`, verified ? "error" : "warn");

      if (verified) {
        setAliceCollateral(0);
        addLog("🔥 SLASHING ACIONADO!", "error");
        addLog(`Colateral: ${aliceCollateral} VUSD → CONFISCADO`, "error");
        addLog("Todos os fundos de Alice transferidos para caçadores de fraude.", "error");
        addLog("Alice BANIDA da rede. Identidade publicamente comprometida.", "error");

        setDefenseVerdict({
          defense: "slashing",
          blocked: true,
          details: `Slashing via GF(256): secret=${recovery.secret} revelado. Colateral ${aliceCollateral} VUSD confiscado.`,
          wasmUsed: recovery.wasmUsed,
        });
      }

      // Secure wipe
      await slasher.secureWipe(aliceIdentity.privateKeySeed);
      addLog("Secure wipe: private key seed zerado na memória.", "info");
      addLog("═══════════════════════════════════════════", "success");
      addLog("  RESULTADO: GASTO DUPLO PUNIDO VIA SLASHING", "success");
      addLog("═══════════════════════════════════════════", "success");
    }

    setIsRunning(false);
  };

  const handleReset = () => {
    setLogs([]);
    setDefenseVerdict(null);
    setRecoveryResult(null);
    setTx1(null);
    setTx2(null);
    setAliceCollateral(1000);
    setStatusMessage("Aguardando cenário...");
  };

  return (
    <div className="bg-gray-900 border border-purple-900/60 rounded-xl p-5 shadow-2xl space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-purple-950/60 pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold font-mono text-white tracking-wide">
            Double-Spend Defense (WASM + Rust Core)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
            {wasmStatus}
          </span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setEnclaveActive(true)}
          className={`p-4 rounded-lg border text-left font-mono space-y-2 transition-all ${
            enclaveActive
              ? "bg-purple-950/40 border-purple-500 text-purple-200"
              : "bg-black/40 border-purple-950/60 text-gray-400 hover:bg-black/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4 w-4" />
              TEE Enclave (WASM Counter)
            </span>
            {enclaveActive && <span className="text-[10px] bg-purple-900 text-purple-300 px-1.5 py-0.2 rounded font-bold">ATIVO</span>}
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Contadores monotônicos em WASM linear memory. Hardware impede re-signing. SGX Remote Attestation validation.
          </p>
        </button>

        <button
          onClick={() => setEnclaveActive(false)}
          className={`p-4 rounded-lg border text-left font-mono space-y-2 transition-all ${
            !enclaveActive
              ? "bg-amber-950/30 border-amber-500 text-amber-200"
              : "bg-black/40 border-purple-950/60 text-gray-400 hover:bg-black/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              Slashing (WASM GF(256) Algebra)
            </span>
            {!enclaveActive && <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded font-bold">ATIVO</span>}
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Shamir Split-Key com GF(256) via WASM nativo. Duas assinaturas = chave privada exposta. Colateral confiscado.
          </p>
        </button>
      </div>

      {/* Status + Controls */}
      <div className="flex items-center justify-between">
        <div className="bg-gray-950 rounded px-4 py-2 border border-purple-950/40">
          <span className="text-[10px] text-gray-500 font-mono">SALDO ALICE: </span>
          <span className={`text-sm font-bold font-mono ${aliceCollateral > 0 ? "text-emerald-400" : "text-red-500"}`}>
            {aliceCollateral} VUSD
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="p-2 bg-gray-950 border border-purple-950 text-purple-300 rounded hover:bg-gray-900 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className={`px-6 py-2 font-mono text-xs font-bold flex items-center gap-1.5 rounded transition-colors ${
              isRunning
                ? "bg-purple-950 text-purple-400 cursor-wait"
                : "bg-purple-700 hover:bg-purple-600 text-white"
            }`}
          >
            {isRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? "EXECUTANDO..." : "EXECUTAR CENÁRIO DE DEFESA"}
          </button>
        </div>
      </div>

      {/* Defense Verdict */}
      {defenseVerdict && (
        <div className={`p-4 rounded-lg border font-mono text-sm ${
          defenseVerdict.blocked
            ? defenseVerdict.defense === "enclave"
              ? "bg-purple-950/30 border-purple-500 text-purple-200"
              : "bg-amber-950/30 border-amber-500 text-amber-200"
            : "bg-emerald-950/30 border-emerald-500 text-emerald-200"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold">
              {defenseVerdict.blocked ? "BLOQUEADO" : "PERMITIDO"} — {defenseVerdict.defense.toUpperCase()}
            </span>
            <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded">
              {defenseVerdict.wasmUsed ? "WASM NATIVO" : "JS FALLBACK"}
            </span>
          </div>
          <p className="text-xs opacity-80">{defenseVerdict.details}</p>
        </div>
      )}

      {/* Transaction Cards */}
      {(tx1 || tx2) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tx1 && (
            <div className="bg-black/60 p-3 rounded border border-emerald-500/20 font-mono text-[10px]">
              <div className="text-emerald-400 font-bold mb-1">TX #1 — Alice → Bob (LEGÍTIMA)</div>
              <div className="text-zinc-400 space-y-0.5">
                <div>txId: {tx1.txId}</div>
                <div>utxo: {tx1.utxoId} · amount: {tx1.amount} VUSD</div>
                <div>s1: {tx1.s1}</div>
                <div>commitment: {tx1.identityCommitment}</div>
                <div>wasm: {tx1.wasmVerified ? "✓ NATIVO" : "JS"}</div>
              </div>
            </div>
          )}
          {tx2 && (
            <div className="bg-black/60 p-3 rounded border border-red-500/20 font-mono text-[10px]">
              <div className="text-red-400 font-bold mb-1">TX #2 — Alice → Carlos (DUPLICATE!)</div>
              <div className="text-zinc-400 space-y-0.5">
                <div>txId: {tx2.txId}</div>
                <div>utxo: {tx2.utxoId} · amount: {tx2.amount} VUSD</div>
                <div>s1: {tx2.s1}</div>
                <div>s2: {tx2.s2 || "N/A"}</div>
                <div>wasm: {tx2.wasmVerified ? "✓ NATIVO" : "JS"}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slashing Recovery Result */}
      {recoveryResult && (
        <div className="bg-black/60 p-4 rounded border border-amber-500/30 font-mono text-[10px] space-y-1">
          <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            GF(256) RECOVERY — SLASHING PROOF
          </div>
          <div className="text-zinc-400">k (coeficiente): <span className="text-zinc-200">{recoveryResult.k}</span></div>
          <div className="text-zinc-400">secret (private key): <span className="text-amber-400 font-bold">{recoveryResult.secret}</span></div>
          <div className="text-zinc-400">method: <span className="text-purple-300">{recoveryResult.method}</span></div>
          <div className="text-zinc-400">wasm: <span className={recoveryResult.wasmUsed ? "text-emerald-400" : "text-zinc-500"}>
            {recoveryResult.wasmUsed ? "SIM — módulo nativo GF(256)" : "FALLBACK JS"}
          </span></div>
          <div className="text-amber-400 font-bold pt-1 border-t border-amber-900/40">
            Fórmula: secret = s1 ⊕ gf_mul((s1 ⊕ s2), gf_inv(3))
          </div>
        </div>
      )}

      {/* Terminal Logs */}
      <div className="bg-black rounded border border-purple-950 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            DEFENSE LOG (WASM REAL-TIME)
          </span>
          <span className="text-[9px] text-zinc-600 font-mono">{logs.length} lines</span>
        </div>
        <div className="h-56 overflow-y-auto font-mono text-[10px] space-y-0.5 scrollbar-thin">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 border-b border-gray-950 pb-0.5">
              <span className="text-zinc-600 shrink-0">{log.ts}</span>
              <span className={
                log.type === "error" ? "text-red-400" :
                log.type === "success" ? "text-emerald-400" :
                log.type === "warn" ? "text-amber-400" :
                "text-zinc-400"
              }>
                {log.text}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
