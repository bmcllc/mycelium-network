import { useRef, useState } from "react";
import { ghostLocker, type GhostLocker, type LockerSlot, type NFCSeal } from "../crypto/ghostLocker";

export default function GhostLockerPanel() {
  const [lockers, setLockers] = useState<GhostLocker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<string>("");
  const [slots, setSlots] = useState<LockerSlot[]>([]);
  const [lastSeal, setLastSeal] = useState<NFCSeal | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => {
    setLockers(ghostLocker.getLockers());
    if (selectedLocker) {
      setSlots(ghostLocker.getLockerSlots(selectedLocker));
    }
  };

  const handleSelectLocker = (id: string) => {
    setSelectedLocker(id);
    setSlots(ghostLocker.getLockerSlots(id));
    const locker = ghostLocker.getLockers().find(l => l.id === id);
    addLog(`Locker selecionado: ${locker?.name} (${locker?.availableSlots}/${locker?.totalSlots} slots)`);
  };

  const handleReserve = () => {
    if (!selectedLocker) return;
    const purchaseId = `purch_${Date.now()}`;
    const slot = ghostLocker.reserveSlot(selectedLocker, purchaseId);
    if (slot) {
      refresh();
      addLog(`Slot reservado: ${slot.slotId} para ${purchaseId}`);
    } else {
      addLog("ERRO: nenhum slot disponivel");
    }
  };

  const handleGenerateSeal = () => {
    if (!selectedLocker) return;
    const privateKey = crypto.getRandomValues(new Uint8Array(32));
    const purchaseId = `purch_${Date.now()}`;
    const seal = ghostLocker.generateSeal(purchaseId, selectedLocker, privateKey);
    setLastSeal(seal);
    addLog(`Seal gerado: ${seal.sealId} (hash: ${seal.hash.slice(0, 16)}...)`);
  };

  const handleRelease = (slotId: string) => {
    const ok = ghostLocker.releasePackage(slotId);
    refresh();
    addLog(ok ? `Slot ${slotId} liberado` : "ERRO: falha ao liberar");
  };

  const handleVerifyIntegrity = () => {
    if (!selectedLocker) return;
    const results = ghostLocker.verifyAllIntegrity();
    const valid = results.filter(r => r.valid).length;
    addLog(`Integridade: ${valid}/${results.length} seals validos`);
  };

  return (
    <section id="ghost-locker-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">§ 13.13</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">GHOST LOCKER</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Locker <span className="text-[#b6ff3a]">Fantasma</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Armazenamento fisico com NFC. Compra gera seal criptografico (SHA3 + Ed25519),
            pacote em locker com tag NFC, destinatario verifica via ZK proof. Web NFC API.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">LOCKERS DISPONIVEIS</span>
              <span className="font-mono text-[10px] text-zinc-600">{lockers.length} lockers</span>
            </div>

            <div className="space-y-2 mb-6">
              {lockers.map((l) => (
                <div
                  key={l.id}
                  onClick={() => handleSelectLocker(l.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedLocker === l.id
                      ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-300">{l.name}</span>
                    <span className={l.isActive ? "text-[#b6ff3a]" : "text-zinc-600"}>
                      {l.isActive ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>{l.location}</span>
                    <span>{l.availableSlots}/{l.totalSlots} slots | NFC: {l.nfcEnabled ? "ON" : "OFF"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={handleReserve}
                disabled={!selectedLocker}
                className="py-3 bg-[#b6ff3a] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white disabled:opacity-50 transition-all"
              >
                RESERVAR SLOT
              </button>
              <button
                onClick={handleGenerateSeal}
                disabled={!selectedLocker}
                className="py-3 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ffd700]/10 disabled:opacity-50 transition-all"
              >
                GERAR SEAL
              </button>
              <button
                onClick={handleVerifyIntegrity}
                disabled={!selectedLocker}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 disabled:opacity-50 transition-all"
              >
                VERIFICAR ZK
              </button>
            </div>

            {selectedLocker && (
              <div>
                <span className="tag mb-3 block">SLOTS ({slots.length})</span>
                <div className="grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
                  {slots.map((s) => (
                    <div
                      key={s.slotId}
                      onClick={() => s.isOccupied && handleRelease(s.slotId)}
                      className={`p-2 border text-[9px] font-mono text-center cursor-pointer ${
                        s.isOccupied
                          ? "border-[#ffd700]/30 bg-[#ffd700]/5 text-[#ffd700]"
                          : "border-[#14181c] bg-black text-zinc-700"
                      }`}
                    >
                      {s.isOccupied ? "OCUPADO" : "LIVRE"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {lastSeal && (
                <div>
                  <span className="tag mb-3 block">ULTIMO NFC SEAL</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#ffd700]/20 font-mono text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">sealId</span>
                      <span className="text-[#ffd700]">{lastSeal.sealId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">purchase</span>
                      <span className="text-zinc-300">{lastSeal.purchaseId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">hash</span>
                      <span className="text-[#b6ff3a] text-[8px]">{lastSeal.hash.slice(0, 24)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">signature</span>
                      <span className="text-[#6cf0ff] text-[8px]">{lastSeal.signature.slice(0, 24)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">TTL</span>
                      <span className="text-zinc-300">48 horas</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLocker && (() => {
                const locker = lockers.find(l => l.id === selectedLocker);
                if (!locker) return null;
                return (
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                    <div className="tag mb-2">LOCKER INFO</div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">nome</span>
                      <span className="text-zinc-300">{locker.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">localizacao</span>
                      <span className="text-zinc-300">{locker.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">coords</span>
                      <span className="text-zinc-400">{locker.lat}, {locker.lng}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">slots</span>
                      <span className="text-[#b6ff3a]">{locker.availableSlots}/{locker.totalSlots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">NFC</span>
                      <span className={locker.nfcEnabled ? "text-[#b6ff3a]" : "text-zinc-600"}>
                        {locker.nfcEnabled ? "HABILITADO" : "DESABILITADO"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">hash</span>
                  <span className="text-zinc-300">SHA3-256</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">assinatura</span>
                  <span className="text-zinc-300">Ed25519</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">NFC API</span>
                  <span className="text-[#6cf0ff]">Web NDEFReader</span>
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
