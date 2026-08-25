import { useState, useEffect, useCallback, useRef } from "react";
import { ParasiticArchitecture as PA } from "../crypto/supplyChain";
import { animusBootstrap } from "../omega/AnimusBootstrap";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { parasiteHostFromMaterial } from "../lib/moduleRealityBackend";

export default function ParasiticArchitecture() {
  const { material } = useOmegaMaterial(128);
  const parasiteIdx = useRef(0);
  const [arch] = useState(() => new PA());
  const [stats, setStats] = useState(arch.getStats());
  const [hosts, setHosts] = useState<ReturnType<PA["getHosts"]>>(arch.getHosts());
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // --- ANIMUS INOCULATOR STATE ---
  const [isInoculating, setIsInoculating] = useState(false);
  const [inoculatedUrl, setInoculatedUrl] = useState<string | null>(null);
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 40));
  }, []);

  const handleInoculate = async () => {
    setIsInoculating(true);
    addLog("Iniciando Inoculação Stratum 3 (Ativo de Sistema)...");

    try {
      // 1. Prepara o payload do Orquestrador com dados reais
      const identity = voidOrchestrator.getIdentity();
      const payload = new TextEncoder().encode(JSON.stringify({
        version: "ΩMEGA-8.0",
        nodeId: identity?.handle || "ghost_core",
        publicKey: identity ? Array.from(identity.publicKey).map(b => b.toString(16).padStart(2, '0')).join('') : "",
        protocols: ["QEL", "HCN", "ANIMUS"],
        timestamp: Date.now(),
        entropyBits: identity?.entropyBits || 0
      }));

      // 2. Inocula no ícone do PWA
      const infectedBlob = await animusBootstrap.inoculate(payload, "/icon-512.png");
      const url = URL.createObjectURL(infectedBlob);
      setInoculatedUrl(url);

      // 3. Sincroniza com o Service Worker (Stratum 3 Persistence)
      await animusBootstrap.syncWithServiceWorker(payload);

      addLog("✓ Inoculação completa. Payload injetado em icon-512.png");
      addLog("✓ Sincronização Stratum 3 enviada ao Service Worker.");
      addLog("O VØID agora habita a imagem e o background do browser.");
    } catch (err) {
      addLog(`✗ Falha na inoculação: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsInoculating(false);
    }
  };

  // ... (rest of previous logic)

  const refresh = useCallback(() => {
    setStats(arch.getStats());
    setHosts(arch.getHosts());
  }, [arch]);

  useEffect(() => {
    const iv = setInterval(refresh, 4000);
    return () => clearInterval(iv);
  }, [refresh]);

  const handleRegisterParasite = () => {
    if (!material) {
      addLog("Aguardando entropia Ω…");
      return;
    }
    const newHost = parasiteHostFromMaterial(material, parasiteIdx.current++);
    arch.registerHost(newHost);
    setHosts(arch.getHosts());
    setStats(arch.getStats());
    addLog(`Parasita registado (Ω): ${newHost.parasiteName} @ ${newHost.hostName}`);
  };

  const handleKillParasite = (name: string) => {
    arch.activateKillSwitch(name);
    setHosts(arch.getHosts());
    setStats(arch.getStats());
    addLog(`Kill switch ativado para: ${name}`);
  };

  return (
    <section className="border-b border-[#14181c] bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[#14181c] pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 5.1</span>
              <span className="h-px w-12 bg-[#6cf0ff]/40" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">PARASITIC ARCHITECTURE</span>
            </div>
            <h3 className="font-sans text-2xl text-zinc-100">
              Arquitetura Simbiótica <span className="text-[#6cf0ff]">ANIMUS</span>
            </h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-zinc-500">SYMBIOSIS SCORE</div>
            <div className={`font-mono text-2xl ${stats.avgSymbiosis > 70 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}`}>
              {stats.avgSymbiosis}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Host Visualization & Inoculation */}
          <div className="lg:col-span-7 space-y-5">
            {/* ANIMUS INOCULATOR (New Section) */}
            <div className="border border-[#b6ff3a]/30 bg-[#0a0d10] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="tag !text-[#b6ff3a] !border-[#b6ff3a]/40">STRATUM 3 · ATIVO DE SISTEMA</span>
                <span className="font-mono text-[10px] text-[#b6ff3a]">INOCULATOR ENGINE</span>
              </div>
              <div className="flex gap-6">
                <div className="size-32 bg-black border border-[#14181c] relative flex items-center justify-center overflow-hidden">
                  <img 
                    src={inoculatedUrl || "/icon-512.png"} 
                    alt="Target Asset" 
                    className={`size-full object-cover transition-opacity ${isInoculating ? "opacity-20" : "opacity-100"}`}
                  />
                  {isInoculating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-8 border-2 border-[#b6ff3a] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {inoculatedUrl && (
                    <div className="absolute top-1 right-1 px-1 bg-[#b6ff3a] text-black font-mono text-[8px] animate-pulse">
                      INFECTED
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="font-mono text-[10px] text-zinc-500 leading-relaxed">
                    O ANIMUS pode habitar ativos do sistema (ícones, manifestos). 
                    Ao "Inocular", o payload do Orquestrador é injetado esteganograficamente 
                    no ícone do PWA e enviado para o Service Worker.
                  </div>
                  <button
                    onClick={handleInoculate}
                    disabled={isInoculating}
                    className="w-full py-2.5 bg-[#b6ff3a] text-black font-mono text-xs tracking-wider hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    {isInoculating ? "INOCULANDO..." : "INOCULAR SISTEMA (LSB)"}
                  </button>
                  {inoculatedUrl && (
                    <div className="font-mono text-[9px] text-[#b6ff3a]">
                      ✓ Ativo infectado ativo na sessão e persistido em background.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Host Cards */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-5">
              <div className="tag mb-4">HOSPEDEIROS &amp; PARASITAS ATIVOS</div>
              <div className="space-y-3">
                {hosts.map((host, i) => (
                  <div
                    key={i}
                    className={`p-4 bg-black border transition-all cursor-pointer ${
                      selectedHost === `${host.hostName}-${i}` ? "border-[#6cf0ff] bg-[#6cf0ff]/5" : "border-[#14181c]"
                    } ${host.killSwitch ? "opacity-50" : ""}`}
                    onClick={() => setSelectedHost(selectedHost === `${host.hostName}-${i}` ? null : `${host.hostName}-${i}`)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${host.killSwitch ? "bg-red-900" : host.isDetected ? "bg-yellow-600" : "bg-[#b6ff3a]"}`} />
                        <div>
                          <div className="font-mono text-sm text-zinc-200">
                            {host.hostName} <span className="text-zinc-600">v{host.hostVersion}</span>
                          </div>
                          <div className="font-mono text-[10px] text-[#6cf0ff]">
                            Parasita: {host.parasiteName}
                          </div>
                        </div>
                      </div>
                      {host.killSwitch && (
                        <span className="px-2 py-0.5 bg-red-900/30 text-red-400 font-mono text-[10px] border border-red-800/50">
                          KILLED
                        </span>
                      )}
                    </div>

                    {selectedHost === `${host.hostName}-${i}` && (
                      <div className="grid grid-cols-3 gap-3 font-mono text-[10px] text-zinc-500 border-t border-[#14181c] pt-3">
                        <div>
                          <div className="text-zinc-600">Recursos</div>
                          <div className="text-zinc-300">{host.resourceUsage.toFixed(1)}% CPU</div>
                        </div>
                        <div>
                          <div className="text-zinc-600">Integridade</div>
                          <div className={host.hostIntegrity === "VERIFIED" ? "text-[#b6ff3a]" : "text-yellow-400"}>
                            {host.hostIntegrity}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-600">Detecção AV</div>
                          <div className={host.isDetected ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>
                            {host.isDetected ? "DETECTADO" : "LIMPO"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Symbiosis bar */}
                    <div className="mt-3">
                      <div className="flex justify-between font-mono text-[9px] text-zinc-600 mb-1">
                        <span>Symbiosis Score</span>
                        <span>{arch.calculateSymbiosisScore(`${host.hostName}@${host.hostVersion}`)}/100</span>
                      </div>
                      <div className="h-1.5 bg-black border border-[#14181c]">
                        <div
                          className="h-full bg-[#6cf0ff] transition-all"
                          style={{
                            width: `${arch.calculateSymbiosisScore(`${host.hostName}@${host.hostVersion}`)}%`,
                            background: arch.calculateSymbiosisScore(`${host.hostName}@${host.hostVersion}`) > 70
                              ? "#6cf0ff"
                              : arch.calculateSymbiosisScore(`${host.hostName}@${host.hostVersion}`) > 40
                              ? "#ff3ad9"
                              : "#ff3ad9",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleRegisterParasite}
                className="py-3 bg-[#6cf0ff]/10 text-[#6cf0ff] font-mono text-xs border border-[#6cf0ff]/30 hover:bg-[#6cf0ff]/20 transition-colors"
              >
                REGISTAR PARASITA (Ω)
              </button>
              <button
                onClick={() => hosts.filter(h => !h.killSwitch).slice(0, 1).forEach(h => handleKillParasite(h.parasiteName))}
                className="py-3 bg-[#ff3ad9]/10 text-[#ff3ad9] font-mono text-xs border border-[#ff3ad9]/30 hover:bg-[#ff3ad9]/20 transition-colors"
              >
                KILL SWITCH (PRIMEIRO PARASITA)
              </button>
            </div>
          </div>

          {/* Right: Stats + Logs */}
          <div className="lg:col-span-5 space-y-5">
            {/* Stats */}
            <div className="border border-[#14181c] bg-black p-4">
              <div className="tag mb-3">ESTATÍSTICAS SIMBIÓTICAS</div>
              <div className="space-y-3">
                <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                  <div className="flex justify-between font-mono text-sm mb-1">
                    <span className="text-zinc-500">Total Hospedeiros</span>
                    <span className="text-zinc-200">{stats.totalHosts}</span>
                  </div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                  <div className="flex justify-between font-mono text-sm mb-1">
                    <span className="text-zinc-500">Nós Parasitas Ativos</span>
                    <span className="text-[#6cf0ff]">{stats.parasiticNodes}</span>
                  </div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                  <div className="flex justify-between font-mono text-sm mb-1">
                    <span className="text-zinc-500">Symbiosis Médio</span>
                    <span className={stats.avgSymbiosis > 70 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                      {stats.avgSymbiosis}/100
                    </span>
                  </div>
                  <div className="h-2 bg-black border border-[#14181c] mt-2">
                    <div
                      className="h-full bg-[#6cf0ff] transition-all"
                      style={{ width: `${stats.avgSymbiosis}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-[#0a0d10] border border-[#14181c]">
                  <div className="flex justify-between font-mono text-sm mb-1">
                    <span className="text-zinc-500">Kill Switch</span>
                    <span className={stats.killSwitchActive ? "text-[#ff3ad9]" : "text-[#b6ff3a]"}>
                      {stats.killSwitchActive ? "ATIVO ⚠" : "INATIVO ✓"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Diagram */}
            <div className="border border-[#14181c] bg-[#0a0d10] p-4">
              <div className="tag mb-3">DIAGRAMA SIMBIÓTICO</div>
              <div className="aspect-square w-full relative">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {/* Host circle */}
                  <circle cx="200" cy="200" r="140" fill="none" stroke="#14181c" strokeWidth="2" strokeDasharray="8 4" />
                  <text x="200" y="160" textAnchor="middle" fill="#5a6268" fontFamily="JetBrains Mono" fontSize="11" letterSpacing="2">HOSPEDEIRO</text>
                  <text x="200" y="180" textAnchor="middle" fill="#6cf0ff" fontFamily="JetBrains Mono" fontSize="9">(npm / PyPI / Docker)</text>

                  {/* Parasite circle inside */}
                  <circle cx="200" cy="200" r="80" fill="#0a0d10" stroke="#ff3ad9" strokeWidth="1.5" opacity="0.8" />
                  <text x="200" y="190" textAnchor="middle" fill="#ff3ad9" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1">ANIMUS</text>
                  <text x="200" y="210" textAnchor="middle" fill="#ff3ad9" fontFamily="JetBrains Mono" fontSize="8" opacity="0.7">(Parasita)</text>

                  {/* Connection arrows */}
                  <line x1="280" y1="200" x2="340" y2="140" stroke="#b6ff3a" strokeWidth="1" markerEnd="url(#arrowGreen)" />
                  <text x="350" y="135" fill="#b6ff3a" fontFamily="JetBrains Mono" fontSize="8">Credencial</text>

                  <line x1="280" y1="200" x2="340" y2="200" stroke="#6cf0ff" strokeWidth="1" markerEnd="url(#arrowBlue)" />
                  <text x="350" y="195" fill="#6cf0ff" fontFamily="JetBrains Mono" fontSize="8">Proveniência</text>

                  <line x1="280" y1="200" x2="340" y2="260" stroke="#ff3ad9" strokeWidth="1" markerEnd="url(#arrowRed)" />
                  <text x="350" y="255" fill="#ff3ad9" fontFamily="JetBrains Mono" fontSize="8">Kill Switch</text>

                  {/* Arrow markers */}
                  <defs>
                    <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#b6ff3a" />
                    </marker>
                    <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#6cf0ff" />
                    </marker>
                    <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#ff3ad9" />
                    </marker>
                  </defs>
                </svg>
              </div>
              <div className="font-mono text-[9px] text-zinc-600 leading-relaxed mt-2">
                O ANIMUS vive DENTRO de processos legítimos. Não é um vírus — é um simbionte.
                Precisa do hospedeiro para sobreviver. Credenciais autenticadas garantem rastreabilidade.
              </div>
            </div>

            {/* Logs */}
            <div className="border border-[#14181c] bg-black p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="tag">SIMBIOSE LOG</span>
                <button onClick={() => setLogs([])} className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400">CLEAR</button>
              </div>
              <div className="h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className="border-l-2 border-[#14181c] pl-2">{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Explanation */}
        <div className="mt-8 pt-8 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed grid md:grid-cols-3 gap-6">
          <div>
            <span className="text-[#ff3ad9] font-bold">PARASITISMO ≠ MALWARE</span>
            <p className="mt-1">Diferença fundamental: malware se replica autonomamente e esconde sua presença. O ANIMUS se hospeda em processos legítimos com credenciais autenticadas e publica seu pedigree publicamente.</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">PROVENIÊNCIA PÚBLICA</span>
            <p className="mt-1">Cada instância do ANIMUS registra sua origem, hash do binário e credencial do mantenedor em um ledger público. Qualquer ferramenta de segurança pode verificar: "Este é VØID legítimo."</p>
          </div>
          <div>
            <span className="text-[#ff3ad9] font-bold">KILL SWITCH DEMOCRÁTICO</span>
            <p className="mt-1">Se a comunidade detectar comportamento malicioso, um voto de confiança revoga a credencial do parasita. O kill switch é ativado por consenso, não por uma autoridade central.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
