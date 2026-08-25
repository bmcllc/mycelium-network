import { useState, useEffect } from "react";
import { aegisVault, type VaultState, type BiometricChallenge } from "../crypto/aegisVault";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function AegisVaultPanel() {
  const [vaults, setVaults] = useState<VaultState[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [challenge, setChallenge] = useState<BiometricChallenge | null>(null);
  const [selectedVault, setSelectedVault] = useState<string>("");
  const [encryptInput, setEncryptInput] = useState("");

  useEffect(() => {
    const refresh = () => {
      setVaults(aegisVault.getAllVaults());
      setStats(aegisVault.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) {
      setStatus("GHOSTID_REQUIRED");
      return;
    }
    const vault = aegisVault.createVault(identity, ["herdeiro_001"]);
    setSelectedVault(vault.id);
    setStatus(`Vault ${vault.id} criado com herdeiros`);
  };

  const handleChallenge = () => {
    if (!selectedVault) return;
    const ch = aegisVault.generateBiometricChallenge(selectedVault);
    if (ch) {
      setChallenge(ch);
      setStatus(`Desafio biométrico ${ch.challengeId} gerado`);
    }
  };

  const handleEncrypt = () => {
    if (!selectedVault || !encryptInput) return;
    const data = new TextEncoder().encode(encryptInput);
    const encrypted = aegisVault.encrypt(selectedVault, data);
    if (encrypted) {
      setStatus(`Dados cifrados: ${data.length}B → ${encrypted.length}B (chave XOR de N streams)`);
      setEncryptInput("");
    } else {
      setStatus("Vault inativo ou chave não derivada (aguarde convergência)");
    }
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="2.3"
        kicker="COFRE EFÊMERO"
        title={<>Aegis Vault<span className="text-[#b6ff3a]">.</span></>}
        description="O Cofre que Só Existe no Instante do Consenso. Chave privada é XOR de N streams de entropia que convergem em 500ms."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vault Control */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="tag">AEGIS VAULT</div>
            <span className="font-mono text-[10px] text-[#b6ff3a]">
              {vaults.length} VAULT(S)
            </span>
          </div>

          {status && (
            <div className="mb-3 p-2 bg-black border border-[#b6ff3a]/30 font-mono text-[10px] text-[#b6ff3a]">
              {status}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={handleCreate}
              className="py-2 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white"
            >
              CRIAR VAULT
            </button>
            <button
              onClick={handleChallenge}
              disabled={!selectedVault}
              className="py-2 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10 disabled:opacity-50"
            >
              DESAFIO BIOMÉTRICO
            </button>
          </div>

          {/* Vault List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {vaults.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVault(v.id)}
                className={`p-2 border text-[10px] font-mono cursor-pointer ${
                  selectedVault === v.id
                    ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/5"
                    : "border-[#14181c] bg-black hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-zinc-300">{v.id.slice(0, 20)}...</span>
                  <span className={v.isActive ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                    {v.isActive ? "ATIVO" : "INHERITED"}
                  </span>
                </div>
                <div className="text-zinc-600 mt-1">
                  herdeiros: {v.heirs.length} | streams: {v.entropyStreams.length}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Encrypt/Decrypt + Biometric */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">CIFRAR/DECIFRAR COM CONVERGÊNCIA</div>

          <div className="flex gap-2 mb-4">
            <input
              value={encryptInput}
              onChange={e => setEncryptInput(e.target.value)}
              placeholder="Dado para cifrar..."
              className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#b6ff3a]/50"
            />
            <button
              onClick={handleEncrypt}
              disabled={!selectedVault}
              className="px-4 py-2 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50"
            >
              CIFRAR
            </button>
          </div>

          {/* Biometric Challenge */}
          {challenge && (
            <div className="p-3 border border-[#ff3ad9]/30 bg-[#ff3ad9]/5 mb-4">
              <div className="tag mb-2">DESAFIO BIOMÉTRICO</div>
              <div className="text-[10px] font-mono text-zinc-400">
                ID: {challenge.challengeId}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">
                Padrão de vibração: {Array.from(challenge.pattern.slice(0, 8)).map(b => b.toString(16).padStart(2, "0")).join(" ")}...
              </div>
              <div className="text-[10px] font-mono text-zinc-600 mt-1">
                Expira em: {Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000))}s
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#b6ff3a]">{stats.activeVaults}</div>
                <div className="tag mt-1">ATIVOS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-3 text-center">
                <div className="font-mono text-xl text-[#ff3ad9]">{stats.inheritedVaults}</div>
                <div className="tag mt-1">INHERITED</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Herança Fantasma:</strong> Se a entropia biométrica sumir por 365 dias,
        os shards são distribuídos a GhostIDs herdeiros automaticamente.
        <span className="text-[#b6ff3a]"> A chave nunca existe em disco — apenas no instante do consenso.</span>
      </div>
    </section>
  );
}
