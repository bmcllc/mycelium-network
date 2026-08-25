import { useState } from "react";
import {
  deriveMasterKey,
  createTestament,
  initiateRecovery,
  reconstructMasterKey,
  checkDeadManSwitch,
  heartbeat,
  hexSlice,
  type Testament,
  type RecoveryAttempt,
  type BiometricProfile,
  type RecoveryConfig,
} from "../crypto/cryptoTestament";

const DEFAULT_BIO: BiometricProfile = {
  keystrokePattern: [120, 95, 110, 130, 88, 105, 115],
  touchPressure: [0.4, 0.6, 0.5, 0.7, 0.3, 0.55],
  swipeVelocity: [450, 380, 520, 410, 470],
};

export default function CryptoTestamentLab() {
  const [passphrase, setPassphrase] = useState("minha-frase-secreta-vøid");
  const [bio] = useState<BiometricProfile>(DEFAULT_BIO);
  const [testament, setTestament] = useState<Testament | null>(null);
  const [masterKeyHex, setMasterKeyHex] = useState("");
  const [recoveryAttempt, setRecoveryAttempt] = useState<RecoveryAttempt | null>(null);
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [recoveredKeyHex, setRecoveredKeyHex] = useState("");
  const [selectedShards, setSelectedShards] = useState<number[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 60));
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDeriveMasterKey = () => {
    addLog("Derivando Master Key a partir de passphrase + biometria...");
    addLog(`Passphrase: "${passphrase}" (${passphrase.length} chars)`);
    addLog(`Biometria: ${bio.keystrokePattern.length} keystrokes, ${bio.touchPressure.length} pressões`);

    const mk = deriveMasterKey(passphrase, bio);
    const hex = hexSlice(mk, 64);
    setMasterKeyHex(hex);

    addLog(`Pipeline: SHA3-512(passphrase) → IKM`);
    addLog(`Pipeline: SHA3-256(biometrics_normalized) → salt`);
    addLog(`Pipeline: Argon2id(IKM, salt, 16MB, 3it) → seed`);
    addLog(`Pipeline: HKDF-SHA3-512(seed, salt, info) → DMK`);
    addLog(`✓ DMK derivada: 0x${hex}...`);
    addLog(`Mesma passphrase + biometria amanhã = mesma chave.`);
  };

  const handleCreateTestament = () => {
    if (!masterKeyHex) {
      addLog("Derive a Master Key primeiro!");
      return;
    }

    addLog("Criando Testamento Criptográfico (Shamir K=3, N=5)...");

    const mk = deriveMasterKey(passphrase, bio);
    const config: RecoveryConfig = {
      passphrase,
      biometrics: bio,
      totalShards: 5,
      threshold: 3,
      testamentTTLDays: 30,
      cooldownHours: 0,
      deadManDays: 90,
      heirPubKey: "heir_0xABCDEF",
    };

    const t = createTestament(mk, config);
    setTestament(t);

    addLog(`✓ Testamento criado: ${t.id}`);
    addLog(`  Shards: ${t.totalShards} (threshold: ${t.threshold})`);
    addLog(`  TTL: ${config.testamentTTLDays} dias`);
    addLog(`  Cooldown anti-coerção: ${config.cooldownHours}h`);
    addLog(`  Dead Man's Switch: ${config.deadManDays} dias`);

    for (const shard of t.shards) {
      addLog(`  Shard ${shard.index}: commit=${shard.commitment} → HCN ${shard.nodeId}`);
    }
  };

  const handleStartRecovery = () => {
    if (!testament) {
      addLog("Crie um testamento primeiro!");
      return;
    }

    addLog(`Iniciando recuperação com passphrase: "${recoveryPassphrase}"`);
    const attempt = initiateRecovery(recoveryPassphrase, bio, testament);

    if (attempt.status === "failed") {
      addLog("✗ RECUPERAÇÃO FALHOU: passphrase ou biometria incorreta!");
      setRecoveryAttempt(attempt);
      return;
    }

    addLog(`✓ Credenciais verificadas. Status: COLLECTING shards...`);
    if (testament.cooldownHours > 0) {
      const ends = new Date(attempt.cooldownEndsAt).toLocaleString();
      addLog(`  Cooldown anti-coerção: ${testament.cooldownHours}h (libera em ${ends})`);
    } else {
      addLog(`  Cooldown: 0h — reconstrução permitida após ${testament.threshold} shards`);
    }
    setRecoveryAttempt(attempt);
    setSelectedShards([]);
  };

  const handleCollectShard = (index: number) => {
    if (!recoveryAttempt || recoveryAttempt.status === "failed") return;

    const newSelected = selectedShards.includes(index)
      ? selectedShards.filter(i => i !== index)
      : [...selectedShards, index];

    setSelectedShards(newSelected);
    addLog(`Shard ${index} ${newSelected.includes(index) ? "coletado" : "removido"}. Total: ${newSelected.length}/${testament?.threshold || 3}`);
  };

  const handleReconstruct = () => {
    if (!recoveryAttempt || !testament) return;

    if (selectedShards.length < testament.threshold) {
      addLog(`Necessário ${testament.threshold} shards, tem ${selectedShards.length}`);
      return;
    }

    addLog(`Reconstruindo DMK a partir de ${selectedShards.length} shards...`);
    addLog(`Decifando shards via ChaCha20-Poly1305...`);
    addLog(`Interpolação de Lagrange sobre GF(256) (K=3)...`);

    const updatedAttempt = {
      ...recoveryAttempt,
      shardsCollected: selectedShards,
    };

    const result = reconstructMasterKey(updatedAttempt, testament);
    setRecoveryAttempt(result);

    if (result.status === "complete" && result.recoveredKey) {
      const hex = hexSlice(result.recoveredKey, 64);
      setRecoveredKeyHex(hex);
      addLog(`✓ CHAVE RECUPERADA COM SUCESSO!`);
      addLog(`  DMK original:    0x${masterKeyHex}...`);
      addLog(`  DMK recuperada:  0x${hex}...`);
      addLog(`  Match: ${hex === masterKeyHex ? "PERFEITO ✓" : "FALHA ✗"}`);
    } else if (result.status === "cooldown") {
      const remaining = Math.max(0, result.cooldownEndsAt - Date.now());
      addLog(`✗ Cooldown ativo — aguarde ${Math.ceil(remaining / 60000)} min`);
    } else {
      addLog(`✗ Recuperação falhou: ${result.status}`);
    }
  };

  const handleHeartbeat = () => {
    if (!testament) return;
    setTestament(heartbeat(testament));
    addLog("♥ Heartbeat registrado. Dead Man's Switch resetado.");
  };

  const handleCheckDeadMan = () => {
    if (!testament) return;
    const triggered = checkDeadManSwitch(testament);
    addLog(triggered
      ? "⚠ DEAD MAN'S SWITCH ATIVADO! Fundos serão liberados para o herdeiro."
      : "✓ Dead Man's Switch inativo. Heartbeat recente.");
  };

  return (
    <section className="border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[#14181c] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 6.0</span>
              <span className="h-px w-12 bg-[#b6ff3a]/40" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">CRYPTO TESTAMENT</span>
            </div>
            <h3 className="font-sans text-2xl text-zinc-100">
              Recuperação de Fundos <span className="text-[#b6ff3a]">"Zero Disco"</span>
            </h3>
          </div>
          {testament && (
            <div className="text-right">
              <div className="font-mono text-[10px] text-zinc-500">TESTAMENT</div>
              <div className="font-mono text-lg text-[#b6ff3a]">ACTIVE</div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Creation + Recovery */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Derive Master Key */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="tag">1. SEED PHRASE SUBCONSCIENTE</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">DMK DERIVATION</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-[9px] text-zinc-600 mb-1">PASSPHRASE MEMORIZADA</label>
                  <input
                    type="text"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2 outline-none focus:border-[#b6ff3a]/40"
                    placeholder="Uma frase que você possa lembrar amanhã..."
                  />
                </div>
                <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px] text-zinc-500">
                  <div className="mb-1 text-zinc-400">Perfil biométrico de referência (laboratório):</div>
                  <div>Keystroke intervals: [{bio.keystrokePattern.join(", ")}] ms</div>
                  <div>Touch pressure: [{bio.touchPressure.join(", ")}]</div>
                  <div>Swipe velocity: [{bio.swipeVelocity.join(", ")}] px/s</div>
                </div>
                <button
                  onClick={handleDeriveMasterKey}
                  className="w-full py-2.5 bg-[#b6ff3a] text-black font-mono text-xs tracking-wider hover:bg-white transition-colors"
                >
                  DERIVAR MASTER KEY (Argon2id + HKDF-SHA3-512)
                </button>
                {masterKeyHex && (
                  <div className="p-3 bg-black border border-[#b6ff3a]/20 font-mono text-xs">
                    <span className="text-zinc-500">DMK: </span>
                    <span className="text-[#b6ff3a]">0x{masterKeyHex}...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Create Testament */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="tag">2. TESTAMENTO CRIPTOGRÁFICO</span>
                <span className="font-mono text-[10px] text-zinc-500">SHAMIR K=3, N=5</span>
              </div>
              <button
                onClick={handleCreateTestament}
                disabled={!masterKeyHex}
                className="w-full py-2.5 border border-[#b6ff3a]/40 text-[#b6ff3a] font-mono text-xs tracking-wider hover:bg-[#b6ff3a]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                CRIAR TESTAMENTO (FRAGMENTAR DMK)
              </button>
              {testament && (
                <div className="mt-3 space-y-2">
                  {testament.shards.map(shard => (
                    <div key={shard.index} className="flex items-center justify-between p-2 bg-black border border-[#14181c] font-mono text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#b6ff3a]" />
                        <span className="text-zinc-300">Shard {shard.index}</span>
                      </div>
                      <span className="text-zinc-500">{shard.commitment}</span>
                      <span className="text-zinc-600">{shard.nodeId}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={handleHeartbeat} className="py-1.5 border border-zinc-700 text-zinc-400 font-mono text-[10px] hover:text-zinc-200">
                      ♥ HEARTBEAT
                    </button>
                    <button onClick={handleCheckDeadMan} className="py-1.5 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10">
                      CHECK DEAD MAN
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Recovery */}
            {testament && (
              <div className="border border-[#14181c] bg-[#0a0d10] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="tag">3. RECUPERAÇÃO (NOVO GHOSTID)</span>
                  <span className="font-mono text-[10px] text-[#6cf0ff]">RECONSTRUCT DMK</span>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={recoveryPassphrase}
                    onChange={e => setRecoveryPassphrase(e.target.value)}
                    className="w-full bg-black border border-[#14181c] text-zinc-300 font-mono text-xs px-3 py-2 outline-none focus:border-[#6cf0ff]/40"
                    placeholder="Digite a passphrase para recuperar..."
                  />
                  <button
                    onClick={handleStartRecovery}
                    className="w-full py-2 bg-[#6cf0ff]/20 text-[#6cf0ff] font-mono text-xs border border-[#6cf0ff]/30 hover:bg-[#6cf0ff]/30"
                  >
                    INICIAR RECUPERAÇÃO
                  </button>

                  {recoveryAttempt && recoveryAttempt.status !== "failed" && (
                    <div className="space-y-2">
                      <div className="font-mono text-[10px] text-zinc-400">
                        Selecione {testament.threshold} de {testament.totalShards} shards:
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {testament.shards.map(shard => (
                          <button
                            key={shard.index}
                            onClick={() => handleCollectShard(shard.index)}
                            className={`py-3 border font-mono text-xs text-center transition-colors ${
                              selectedShards.includes(shard.index)
                                ? "border-[#b6ff3a] bg-[#b6ff3a]/10 text-[#b6ff3a]"
                                : "border-[#14181c] text-zinc-500 hover:border-zinc-600"
                            }`}
                          >
                            S{shard.index}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleReconstruct}
                        disabled={selectedShards.length < testament.threshold}
                        className="w-full py-2 bg-[#b6ff3a] text-black font-mono text-xs tracking-wider hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        RECONSTRUIR MASTER KEY ({selectedShards.length}/{testament.threshold})
                      </button>
                    </div>
                  )}

                  {recoveryAttempt?.status === "failed" && (
                    <div className="p-3 border border-[#ff3ad9]/30 bg-[#ff3ad9]/5 font-mono text-sm text-[#ff3ad9]">
                      ✗ Passphrase ou biometria incorreta. Acesso negado.
                    </div>
                  )}

                  {recoveryAttempt?.status === "complete" && recoveredKeyHex && (
                    <div className="p-3 border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 font-mono text-xs space-y-1">
                      <div className="text-[#b6ff3a] font-bold">✓ CHAVE RECUPERADA COM SUCESSO!</div>
                      <div className="text-zinc-400">Original:    0x{masterKeyHex}...</div>
                      <div className="text-zinc-400">Recuperada:  0x{recoveredKeyHex}...</div>
                      <div className={masterKeyHex === recoveredKeyHex ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                        Match: {masterKeyHex === recoveredKeyHex ? "PERFEITO ✓" : "FALHA ✗"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Logs + Explainer */}
          <div className="lg:col-span-5 space-y-5">
            {/* Terminal Log */}
            <div className="border border-[#14181c] bg-black p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="tag">TESTAMENT LOG</span>
                <button onClick={() => setLogs([])} className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400">CLEAR</button>
              </div>
              <div className="h-72 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="border-l-2 border-[#14181c] pl-2">{l}</div>
                ))}
              </div>
            </div>

            {/* Architecture Explainer */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4 font-mono text-[10px] text-zinc-600 leading-relaxed space-y-4">
              <div>
                <span className="text-[#b6ff3a] font-bold">1. SEED SUBCONSCIENTE</span>
                <p className="mt-1">A DMK é derivada de passphrase + biometria via Argon2id(16MB) + HKDF-SHA3-512. Mesmos inputs = mesma chave. Nada é salvo em disco.</p>
              </div>
              <div>
                <span className="text-[#b6ff3a] font-bold">2. SHAMIR K=3/N=5</span>
                <p className="mt-1">A DMK é fragmentada em 5 shards (GF(256), grau 2). 3 quaisquer reconstroem a chave. Cada shard é cifrado com ChaCha20-Poly1305 e distribuído na HCN.</p>
              </div>
              <div>
                <span className="text-[#b6ff3a] font-bold">3. COOLDOWN 48H</span>
                <p className="mt-1">Anti-coerção: a recuperação tem delay de 48h. O GhostID original pode vetar durante este período.</p>
              </div>
              <div>
                <span className="text-[#b6ff3a] font-bold">4. DEAD MAN'S SWITCH</span>
                <p className="mt-1">Se nenhum heartbeat em 90 dias, os fundos são liberados automaticamente para o herdeiro pré-configurado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
