import { useState, useEffect, useRef } from "react";
import { useVoid } from "../core/useVoid";
import { socialFabric, type SocialMessage } from "../social/SocialFabric";
import { chatStore, type ChatThread } from "../storage/chatStore";
import GhostIDSetup from "./GhostIDSetup";
import ContactList from "./ContactList";
import ChatBubble from "./ChatBubble";

type View = "threads" | "chat" | "contacts" | "settings";

export default function Messenger() {
  const { identity, spawn } = useVoid();
  const [view, setView] = useState<View>("threads");
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load threads from Dexie on mount
  useEffect(() => {
    if (!identity) return;
    chatStore.getThreads().then(setThreads);
  }, [identity]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThread || !identity) return;

    socialFabric.loadHistory(activeThread, 100).then(setMessages);
    chatStore.markAsRead(activeThread);

    const unsubscribe = socialFabric.subscribe((msg) => {
      const myPk = Array.from(identity.publicKey)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (
        msg.senderPubKey === activeThread ||
        msg.recipientPubKey === activeThread ||
        msg.senderPubKey === myPk
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return unsubscribe;
  }, [activeThread, identity]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show setup if no identity
  if (!identity) {
    return <GhostIDSetup onSpawn={spawn} />;
  }

  const myPk = Array.from(identity.publicKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeThread || !identity) return;

    await socialFabric.sendDirectMessage(input.trim(), activeThread, identity);
    setInput("");

    // Refresh threads
    chatStore.getThreads().then(setThreads);
  };

  const openThread = (threadId: string) => {
    setActiveThread(threadId);
    setView("chat");
  };

  const openContact = (pubkey: string) => {
    setActiveThread(pubkey);
    setView("chat");
  };

  // ─── Thread List View ───
  if (view === "threads") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f26]">
          <div className="flex items-center gap-2">
            <span className="text-[#a855f7] font-mono text-xs font-bold tracking-widest">
              VØID
            </span>
            <span className="text-zinc-600 font-mono text-[10px]">MESSENGER</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("contacts")}
              className="px-3 py-1.5 text-[10px] font-mono text-[#00ff41] border border-[#00ff41]/30 hover:bg-[#00ff41]/10 transition-colors"
            >
              + CONTATO
            </button>
            <button
              onClick={() => setView("settings")}
              className="px-3 py-1.5 text-[10px] font-mono text-zinc-500 border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              GHOST ID
            </button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="text-zinc-700 font-mono text-xs mb-2">
                NENHUM SHARD SOCIAL DECODIFICADO
              </div>
              <div className="text-zinc-600 text-sm">
                Adicione um contato para iniciar uma conversa criptografada.
              </div>
              <button
                onClick={() => setView("contacts")}
                className="mt-4 px-6 py-2 text-[10px] font-mono text-black bg-[#a855f7] hover:bg-[#a855f7]/80 transition-colors"
              >
                ADICIONAR PRIMEIRO CONTATO
              </button>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1a1f26] hover:bg-[#0a0d10] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] font-mono text-xs font-bold">
                  {thread.id.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-300 truncate">
                      {thread.id.slice(0, 16)}...
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {new Date(thread.lastTimestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-zinc-500 truncate">
                      {thread.lastMessage}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-[#a855f7] text-white text-[9px] font-mono flex items-center justify-center">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom status */}
        <div className="px-4 py-2 border-t border-[#1a1f26] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-600">
            {identity.handle} · QEL ACTIVE · DOUBLE RATCHET
          </span>
        </div>
      </div>
    );
  }

  // ─── Chat View ───
  if (view === "chat" && activeThread) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1f26]">
          <button
            onClick={() => setView("threads")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
          >
            ←
          </button>
          <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] font-mono text-[10px] font-bold">
            {activeThread.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-mono text-xs text-zinc-300">
              {activeThread.slice(0, 24)}...
            </div>
            <div className="text-[9px] font-mono text-[#00ff41]">
              E2EE · DOUBLE RATCHET · QEL
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-zinc-700 font-mono text-xs">
                SESSÃO CRIPTOGRAFADA INICIADA
              </div>
              <div className="text-zinc-600 text-[10px] mt-1">
                X3DH + Double Ratchet + ChaCha20-Poly1305
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isMine={msg.senderPubKey === myPk}
              />
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex gap-2 px-4 py-3 border-t border-[#1a1f26]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mensagem segura..."
            className="flex-1 bg-[#0a0d10] border border-[#1a1f26] px-4 py-2.5 text-sm text-zinc-200 font-sans outline-none focus:border-[#a855f7]/50 transition-colors placeholder:text-zinc-700"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#a855f7] hover:bg-[#a855f7]/80 text-black font-mono text-[10px] tracking-widest transition-colors"
          >
            ENVIAR
          </button>
        </form>
      </div>
    );
  }

  // ─── Contacts View ───
  if (view === "contacts") {
    return (
      <ContactList
        onBack={() => setView("threads")}
        onSelect={openContact}
        myPubKey={myPk}
      />
    );
  }

  // ─── Settings View ───
  if (view === "settings") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1f26]">
          <button
            onClick={() => setView("threads")}
            className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
          >
            ←
          </button>
          <span className="font-mono text-xs text-zinc-300">GHOST ID</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#a855f7]/20 border-2 border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] font-mono text-2xl font-bold">
              {identity.handle.slice(0, 2).toUpperCase()}
            </div>
            <div className="mt-3 font-mono text-sm text-[#a855f7]">
              {identity.handle}
            </div>
            <div className="text-[9px] font-mono text-zinc-600 mt-1">
              GHOST IDENTIDADE QUÂNTICA
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="border border-[#1a1f26] p-3">
              <div className="text-[9px] font-mono text-zinc-600 mb-1">
                CHAVE PÚBLICA (ED25519)
              </div>
              <div className="font-mono text-[10px] text-zinc-400 break-all">
                {myPk}
              </div>
            </div>

            <div className="border border-[#1a1f26] p-3">
              <div className="text-[9px] font-mono text-zinc-600 mb-1">
                ENTROPIA
              </div>
              <div className="font-mono text-[10px] text-zinc-400">
                {identity.entropyBits} bits · {identity.quantumVerified ? "QUÂNTICA VERIFICADA" : "CSPRNG"}
              </div>
            </div>

            <div className="border border-[#1a1f26] p-3">
              <div className="text-[9px] font-mono text-zinc-600 mb-1">
                PROTOCOLOS ATIVOS
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {["QEL", "X3DH", "DOUBLE RATCHET", "ChaCha20", "BLE", "NOSTR"].map(
                  (p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 text-[9px] font-mono text-[#00ff41] border border-[#00ff41]/20"
                    >
                      {p}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
