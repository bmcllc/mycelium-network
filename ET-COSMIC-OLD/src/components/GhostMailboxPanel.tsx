import { useRef, useState } from "react";
import { ghostMailboxManager, type GhostMailbox } from "../crypto/ghostMailbox";

export default function GhostMailboxPanel() {
  const [mailboxes, setMailboxes] = useState<GhostMailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string>("");
  const [sendFrom, setSendFrom] = useState("anonymous");
  const [sendBody, setSendBody] = useState("");
  const [decrypted, setDecrypted] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => setMailboxes(ghostMailboxManager.getAllMailboxes());

  const handleCreate = () => {
    const ghostId = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
    const mb = ghostMailboxManager.createMailbox(ghostId);
    setSelectedMailbox(mb.id);
    refresh();
    addLog(`Mailbox criada: ${mb.id.slice(0, 16)}... endereco: ${mb.anonymousAddress}`);
  };

  const handleSend = () => {
    if (!selectedMailbox || !sendBody) return;
    try {
      const msg = ghostMailboxManager.receive(selectedMailbox, sendFrom, sendBody);
      refresh();
      addLog(`Mensagem ${msg.id.slice(0, 12)} de "${sendFrom}" -> mailbox`);
      setSendBody("");
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRead = (messageId: string) => {
    if (!selectedMailbox) return;
    try {
      const text = ghostMailboxManager.read(selectedMailbox, messageId);
      setDecrypted(text);
      addLog(`Decrypt OK: "${text.slice(0, 40)}"`);
    } catch (e) {
      addLog(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDecay = () => {
    const removed = ghostMailboxManager.decay();
    refresh();
    addLog(`Decay: ${removed} mensagens expiradas removidas`);
  };

  const selected = selectedMailbox ? ghostMailboxManager.getMailbox(selectedMailbox) : null;

  return (
    <section id="ghost-mailbox-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#ffd700]">§ 13.10</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#ffd700]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">GHOST MAILBOX</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Mailbox <span className="text-[#ffd700]">Fantasma</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Mensagens anonimas e efemeras com ChaCha20-Poly1305. Endereco anonimo derivado do GhostID.
            Auto-decaimento: mensagens expiram e sao deletadas. Remetente irrastreavel.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">MAILBOXES</span>
              <span className="font-mono text-[10px] text-zinc-600">{mailboxes.length} ativas</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={handleCreate}
                className="py-3 bg-[#ffd700] text-black font-mono text-[10px] tracking-[0.2em] hover:bg-white transition-all"
              >
                CRIAR MAILBOX
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedMailbox}
                className="py-3 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] tracking-[0.2em] hover:bg-[#b6ff3a]/10 disabled:opacity-50 transition-all"
              >
                ENVIAR MSG
              </button>
              <button
                onClick={handleDecay}
                className="py-3 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ff3ad9]/10 transition-all"
              >
                DECAY
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={sendFrom}
                onChange={(e) => setSendFrom(e.target.value)}
                placeholder="Remetente..."
                className="w-32 bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#ffd700]/50"
              />
              <input
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                placeholder="Mensagem..."
                className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-[#ffd700]/50"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {mailboxes.map((mb) => (
                <div
                  key={mb.id}
                  onClick={() => setSelectedMailbox(mb.id)}
                  className={`p-3 border text-[10px] font-mono cursor-pointer ${
                    selectedMailbox === mb.id
                      ? "border-[#ffd700]/50 bg-[#ffd700]/5"
                      : "border-[#14181c] bg-black hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-300">{mb.id.slice(0, 20)}...</span>
                    <span className="text-[#ffd700]">{mb.messages.length} msgs</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    addr: {mb.anonymousAddress} | expira: {new Date(mb.expiryDate).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {selected && (
                <div>
                  <span className="tag mb-3 block">MAILBOX SELECIONADA</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">endereco anonimo</span>
                      <span className="text-[#ffd700]">{selected.anonymousAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">mensagens</span>
                      <span className="text-zinc-300">{selected.messages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">cifra</span>
                      <span className="text-[#6cf0ff]">ChaCha20-Poly1305</span>
                    </div>
                  </div>

                  {selected.messages.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selected.messages.map((msg) => (
                        <div key={msg.id} className="p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]">
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-400">de: {msg.from}</span>
                            <span className="text-zinc-600">{msg.id.slice(0, 12)}</span>
                          </div>
                          <button
                            onClick={() => handleRead(msg.id)}
                            className="w-full text-left py-1 px-2 bg-black border border-[#14181c] text-[#b6ff3a] text-[9px] hover:border-[#b6ff3a]/30 transition-all"
                          >
                            DECIFRAR ({msg.bodyEncrypted.length}B)
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {decrypted && (
                <div>
                  <span className="tag mb-3 block">MENSAGEM DECifrada</span>
                  <div className="p-3 bg-[#0a0d10] border border-[#b6ff3a]/20 font-mono text-[10px] text-[#b6ff3a]">
                    {decrypted}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">mailboxes</span>
                  <span className="text-zinc-300">{mailboxes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">TTL padrao</span>
                  <span className="text-zinc-300">24 horas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">msg TTL</span>
                  <span className="text-zinc-300">1 hora</span>
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
