import { useRef, useState } from "react";
import { acousticHandshake, type HandshakeSession } from "../crypto/acousticHandshake";

export default function AcousticHandshakePanel() {
  const [sessions, setSessions] = useState<HandshakeSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [encrypted, setEncrypted] = useState<Uint8Array | null>(null);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => setSessions(acousticHandshake.getSessions());

  const handleInitiate = () => {
    const session = acousticHandshake.initiate();
    setSelectedSession(session.id);
    refresh();
    addLog(`Handshake iniciado: ${session.id} (X25519 ephemeral)`);
  };

  const handleComplete = () => {
    if (!selectedSession) return;
    const session = acousticHandshake.getSession(selectedSession);
    if (!session || session.status !== "initiating") return;
    const remoteKey = crypto.getRandomValues(new Uint8Array(32));
    const ok = acousticHandshake.receiveRemoteKey(selectedSession, remoteKey);
    refresh();
    addLog(ok ? `ECDH completo: shared secret derivado (SHA3-256)` : "ERRO: falha no ECDH");
  };

  const handleEncrypt = () => {
    if (!selectedSession || !input) return;
    const data = new TextEncoder().encode(input);
    const enc = acousticHandshake.encrypt(selectedSession, data);
    if (enc) {
      setEncrypted(enc);
      addLog(`Encrypt: ${data.length}B -> ${enc.length}B (ChaCha20-Poly1305)`);
      setInput("");
    } else {
      addLog("ERRO: sessao nao completada");
    }
  };

  const handleDecrypt = () => {
    if (!selectedSession || !encrypted) return;
    const dec = acousticHandshake.decrypt(selectedSession, encrypted);
    if (dec) {
      const text = new TextDecoder().decode(dec);
      addLog(`Decrypt: "${text}"`);
    } else {
      addLog("ERRO: falha na descriptografia");
    }
  };

  return (
    <section id="acoustic-handshake-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ff3ad9]">§ 13.3</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ff3ad9]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">ACOUSTIC HANDSHAKE</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Handshake <span className="text-[#ff3ad9]">Acustico</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Troca de chaves via ultrassom (18-20kHz). X25519 ECDH real com chaves efemeras.
            Shared secret derivado via SHA3-256, cifrado com ChaCha20-Poly1305.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CONTROLE DE SESSAO</span>
              <span className="font-mono text-[10px] text-zinc-600">{sessions.length} sessao(oes)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={handleInitiate}
                className="py-3 bg-[#ff3ad9] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                INICIAR
              </button>
              <button
                onClick={handleComplete}
                disabled={!selectedSession}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] tracking-[0.2em] hover:bg-[#b6ff3a]/10 disabled:opacity-50 transition-all"
              >
                COMPLETAR ECDH
              </button>
              <button
                onClick={handleDecrypt}
                disabled={!encrypted}
                className="py-3 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] tracking-[0.2em] hover:bg-[#6cf0ff]/10 disabled:opacity-50 transition-all"
              >
                DECIFRAR
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mensagem para cifrar..."
                className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#ff3ad9]/50"
              />
              <button
                onClick={handleEncrypt}
                disabled={!selectedSession}
                className="px-4 py-2 bg-[#ff3ad9] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50 transition-all"
              >
                CIFRAR
              </button>
            </div>

            {encrypted && (
              <div className="p-3 bg-black border border-[#ff3ad9]/20 font-mono text-[8px] text-[#ff3ad9] break-all mb-4">
                {Array.from(encrypted.slice(0, 32)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                <span className="text-zinc-600 ml-2">({encrypted.length}B)</span>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedSession === s.id
                      ? "border-[#ff3ad9]/50 bg-[#ff3ad9]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-300">{s.id}</span>
                    <span className={
                      s.status === "completed" ? "text-[#b6ff3a]" :
                      s.status === "initiating" ? "text-[#ff3ad9]" : "text-zinc-600"
                    }>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    pubkey: {Array.from(s.localPublicKey.slice(0, 8)).map(b => b.toString(16).padStart(2, "0")).join("")}...
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {selectedSession && (() => {
                const s = acousticHandshake.getSession(selectedSession);
                if (!s) return null;
                return (
                  <div>
                    <span className="tag mb-3 block">SESSAO SELECIONADA</span>
                    <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">id</span>
                        <span className="text-zinc-300">{s.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">status</span>
                        <span className={s.status === "completed" ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                          {s.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">algoritmo</span>
                        <span className="text-[#6cf0ff]">X25519</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">cifra</span>
                        <span className="text-zinc-300">ChaCha20-Poly1305</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">shared secret</span>
                        <span className={s.sharedSecret ? "text-[#b6ff3a]" : "text-zinc-700"}>
                          {s.sharedSecret ? "DERIVADO" : "PENDENTE"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">remote key</span>
                        <span className={s.remotePublicKey ? "text-[#b6ff3a]" : "text-zinc-700"}>
                          {s.remotePublicKey ? "RECEBIDA" : "AGUARDANDO"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">sessoes</span>
                  <span className="text-zinc-300">{sessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">protocolo</span>
                  <span className="text-[#ff3ad9]">FSK 18-20kHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">transporte</span>
                  <span className="text-zinc-300">ultrassom</span>
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
