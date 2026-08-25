import { useState, useEffect, useCallback } from "react";
import { SecurityAuditEngine } from "../crypto/supplyChain";

export default function SupplyChainSecurity() {
  const [engine] = useState(() => new SecurityAuditEngine());
  const [audit, setAudit] = useState(engine.runAudit());
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ safe: boolean; details: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const refreshAudit = useCallback(() => {
    setAudit(engine.runAudit());
    addLog("Auditoria de segurança executada.");
  }, [engine, addLog]);

  useEffect(() => {
    const iv = setInterval(refreshAudit, 5000);
    return () => clearInterval(iv);
  }, [refreshAudit]);

  const handleVerify = (pkgName: string, version: string) => {
    const result = engine.isPackageSafe(pkgName, version);
    setVerificationResult(result);
    setSelectedPkg(`${pkgName}@${version}`);
    addLog(`Verificação: ${pkgName}@${version} → ${result.safe ? "SEGURO ✓" : "NÃO ENCONTRADO ✗"}`);
  };

  const handleEmergencyKill = () => {
    engine.emergencyKillSwitch("v0id-runtime");
    setAudit(engine.runAudit());
    addLog("⚠ KILL SWITCH DE EMERGÊNCIA ATIVADO para v0id-runtime");
    addLog("Todos os parasitas v0id-runtime foram terminados em todos os hospedeiros.");
  };

  const handleVote = (pkgName: string, version: string, vote: 1 | -1) => {
    engine.addCommunityVote(pkgName, version, `voter_${Date.now()}`, vote, vote === 1 ? "Confio neste pacote" : "Desconfio deste pacote");
    setAudit(engine.runAudit());
    refreshAudit();
    addLog(`Voto ${vote === 1 ? "positivo" : "negativo"} registrado para ${pkgName}@${version}`);
  };

  const packages = [
    { name: "v0id-crypto", version: "2.1.0", type: "standalone" },
    { name: "v0id-runtime", version: "1.5.0", type: "parasitic:node" },
    { name: "v0id-mesh", version: "3.0.0", type: "standalone" },
    { name: "v0id-qel", version: "1.2.0", type: "parasitic:python" },
    { name: "v0id-hcn", version: "2.0.0", type: "standalone" },
  ];

  return (
    <section className="border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[#14181c] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">§ 5.0</span>
              <span className="h-px w-12 bg-[#ff3ad9]/40" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">SUPPLY CHAIN SECURITY</span>
            </div>
            <h3 className="font-sans text-2xl text-zinc-100">
              Parasitismo Benigno Autenticado <span className="text-[#ff3ad9]">&amp; Proveniência</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-zinc-500">TRUST SCORE MÉDIO</div>
            <div className={`font-mono text-2xl ${audit.avgTrustScore > 60 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}`}>
              {audit.avgTrustScore.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Audit Dashboard */}
          <div className="lg:col-span-7 space-y-5">
            {/* Security Audit Grid */}
            <div className="border border-[#14181c] bg-black p-5">
              <div className="tag mb-4">AUDITORIA DE SEGURANÇA EM TEMPO REAL</div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] text-center">
                  <div className="font-mono text-xl text-zinc-200">{audit.totalPackages}</div>
                  <div className="font-mono text-[9px] text-zinc-600">TOTAL</div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] text-center">
                  <div className="font-mono text-xl text-[#b6ff3a]">{audit.verifiedPackages}</div>
                  <div className="font-mono text-[9px] text-zinc-600">VERIFICADOS</div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] text-center">
                  <div className="font-mono text-xl text-[#ff3ad9]">{audit.suspiciousPackages}</div>
                  <div className="font-mono text-[9px] text-zinc-600">SUSPEITOS</div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] text-center">
                  <div className="font-mono text-xl text-zinc-400">{audit.revokedPackages}</div>
                  <div className="font-mono text-[9px] text-zinc-600">REVOGADOS</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-500">
                    <span>Nós Parasitas</span>
                    <span className="text-[#6cf0ff]">{audit.parasiticNodes}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Nós Standalone</span>
                    <span className="text-zinc-300">{audit.standaloneNodes}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Kill Switch Ativo</span>
                    <span className={audit.killSwitchActive ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>
                      {audit.killSwitchActive ? "ATIVO ⚠" : "INATIVO ✓"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-500">
                    <span>Symbiosis Score</span>
                    <span className="text-[#6cf0ff]">87/100</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Detecção AV</span>
                    <span className="text-[#b6ff3a]">0/47</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Última Auditoria</span>
                    <span className="text-zinc-400">agora</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Verification */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-5">
              <div className="tag mb-4">VERIFICAÇÃO DE PACOTES</div>
              <div className="space-y-2 mb-4">
                {packages.map(pkg => (
                  <div key={`${pkg.name}-${pkg.version}`} className="flex items-center justify-between p-3 bg-black border border-[#14181c] group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${pkg.type === "standalone" ? "bg-[#b6ff3a]" : "bg-[#6cf0ff]"}`} />
                      <div>
                        <div className="font-mono text-xs text-zinc-200">{pkg.name}@{pkg.version}</div>
                        <div className="font-mono text-[9px] text-zinc-600">
                          {pkg.type === "standalone" ? "STANDALONE" : `PARASITIC: ${pkg.type.split(":")[1]}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(pkg.name, pkg.version)}
                        className="px-3 py-1 bg-[#6cf0ff]/10 text-[#6cf0ff] font-mono text-[10px] border border-[#6cf0ff]/30 hover:bg-[#6cf0ff]/20 transition-colors"
                      >
                        VERIFICAR
                      </button>
                      <button
                        onClick={() => handleVote(pkg.name, pkg.version, 1)}
                        className="px-2 py-1 bg-[#b6ff3a]/10 text-[#b6ff3a] font-mono text-[10px] border border-[#b6ff3a]/30 hover:bg-[#b6ff3a]/20 transition-colors"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleVote(pkg.name, pkg.version, -1)}
                        className="px-2 py-1 bg-[#ff3ad9]/10 text-[#ff3ad9] font-mono text-[10px] border border-[#ff3ad9]/30 hover:bg-[#ff3ad9]/20 transition-colors"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {verificationResult && (
                <div className={`p-3 border font-mono text-sm ${verificationResult.safe ? "border-[#b6ff3a]/30 bg-[#b6ff3a]/5 text-[#b6ff3a]" : "border-[#ff3ad9]/30 bg-[#ff3ad9]/5 text-[#ff3ad9]"}`}>
                  {selectedPkg}: {verificationResult.details}
                </div>
              )}
            </div>

            {/* Emergency Kill Switch */}
            <div className="border border-[#ff3ad9]/30 bg-[#ff3ad9]/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="tag mb-1 bg-[#ff3ad9]/20 text-[#ff3ad9] border-none">EMERGENCY KILL SWITCH</div>
                  <p className="font-mono text-[10px] text-zinc-500">
                    Revoga credenciais de todos os parasitas VØID instantaneamente.
                  </p>
                </div>
                <button
                  onClick={handleEmergencyKill}
                  className="px-6 py-3 bg-[#ff3ad9] text-black font-mono text-sm font-bold tracking-wider hover:bg-white transition-colors"
                >
                  ATIVAR KILL SWITCH
                </button>
              </div>
            </div>
          </div>

          {/* Right: Provenance Ledger + Logs */}
          <div className="lg:col-span-5 space-y-5">
            {/* Provenance Ledger */}
            <div className="border border-[#14181c] bg-black p-4">
              <div className="tag mb-3">PROVENANCE LEDGER (PÚBLICO)</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {packages.map(pkg => (
                  <div key={`ledger-${pkg.name}`} className="p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-300">{pkg.name}@{pkg.version}</span>
                      <span className={pkg.type === "standalone" ? "text-[#b6ff3a]" : "text-[#6cf0ff]"}>
                        {pkg.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-zinc-600 space-y-0.5">
                      <div>Origin: {pkg.type}</div>
                      <div>Maintainer: v0id-labs</div>
                      <div>Hash: {pkg.name.slice(0, 4)}{pkg.version.replace(".", "")}...</div>
                      <div>Votes: 2 positive, 0 negative</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Symbiosis Score Card */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="tag mb-3">SYMBIOSIS SCORE</div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-1">
                    <span>v0id-runtime @ Node.js</span>
                    <span className="text-[#6cf0ff]">87/100</span>
                  </div>
                  <div className="h-2 bg-black border border-[#14181c]">
                    <div className="h-full bg-[#6cf0ff] transition-all" style={{ width: "87%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-1">
                    <span>v0id-qel @ Python</span>
                    <span className="text-[#6cf0ff]">92/100</span>
                  </div>
                  <div className="h-2 bg-black border border-[#14181c]">
                    <div className="h-full bg-[#6cf0ff] transition-all" style={{ width: "92%" }} />
                  </div>
                </div>
                <div className="font-mono text-[9px] text-zinc-600 leading-relaxed pt-2 border-t border-[#14181c]">
                  <strong className="text-zinc-400">Como funciona:</strong> O Symbiosis Score mede quão "benigno" é o parasitismo.
                  Score alto = o parasita usa poucos recursos, não altera o comportamento do hospedeiro,
                  e possui credenciais autenticadas. Score baixo = comportamento suspeito detectado.
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div className="border border-[#14181c] bg-black p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="tag">AUDIT LOG</span>
                <button onClick={() => setLogs([])} className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400">CLEAR</button>
              </div>
              <div className="h-40 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="border-l-2 border-[#14181c] pl-2">{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Explanation */}
        <div className="mt-8 pt-8 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed grid md:grid-cols-4 gap-6">
          <div>
            <span className="text-[#ff3ad9] font-bold">PARASITISMO AUTENTICADO</span>
            <p className="mt-1">O ANIMUS não se replica como vírus. Ele se "hospeda" em processos legítimos (npm, PyPI) usando credenciais do mantenedor original. É um simbionte, não um parasita.</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">PROVENIÊNCIA PÚBLICA</span>
            <p className="mt-1">Cada nó publica seu pedigree (origem, hash, mantenedor) em um registro público. Ferramentas de segurança podem verificar: "Este binário é legítimo VØID."</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">KILL SWITCH POR CONSENSO</span>
            <p className="mt-1">Se a comunidade detectar comportamento malicioso, um voto de confiança revoga a credencial do parasita, matando-o em todos os hospedeiros simultaneamente.</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">SYMBIOSIS SCORE</span>
            <p className="mt-1">Cada parasita tem um score 0-100 medindo quão benigno é. Score alto = confiança da comunidade. Score baixo = alerta de segurança automático.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
