import { useState, useEffect } from "react";
import { useVoid } from "../core/useVoid";
import { socialFabric, type SocialMessage } from "../social/SocialFabric";

export default function SocialFabricPanel() {
  const { identity } = useVoid();
  const [feed, setFeed] = useState<SocialMessage[]>([]);
  const [postContent, setPostContent] = useState("");
  const [activeThread, setActiveThread] = useState<string>("public_feed");
  const [recipient, setRecipient] = useState("");

  useEffect(() => {
    // Carrega o histórico da RAM ao montar ou trocar de thread
    setFeed([...socialFabric.getThread(activeThread)].reverse());

    const unsubscribe = socialFabric.subscribe((msg) => {
      // Atualiza o feed em tempo real se a mensagem pertencer à thread ativa
      if (activeThread === "public_feed" && !msg.recipientPubKey) {
        setFeed(prev => [msg, ...prev]);
      } else if (msg.senderPubKey === activeThread || msg.recipientPubKey === activeThread) {
        setFeed(prev => [msg, ...prev]);
      }
    });

    return unsubscribe;
  }, [activeThread]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent || !identity) return;

    if (activeThread === "public_feed") {
      await socialFabric.broadcastPublicPost(postContent, identity);
    } else {
      await socialFabric.sendDirectMessage(postContent, activeThread, identity);
    }
    setPostContent("");
  };

  const handleNewDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipient) {
      setActiveThread(recipient);
      setRecipient("");
    }
  };

  if (!identity) {
    return (
      <div className="p-8 border border-[#14181c] bg-[#0a0d10] text-center h-full flex flex-col justify-center">
        <div className="text-zinc-600 font-mono text-xs mb-2">ETΞRNET SOCIAL FABRIC</div>
        <div className="text-zinc-400 font-sans">Desperte um GhostID para acessar a malha social.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-px bg-[#14181c] border border-[#14181c] h-[600px]">
      {/* Sidebar - Threads */}
      <div className="col-span-4 bg-black flex flex-col">
        <div className="p-4 border-b border-[#14181c]">
          <div className="tag mb-4">SOCIAL FABRIC</div>
          <button 
            onClick={() => setActiveThread("public_feed")}
            className={`w-full text-left px-4 py-3 font-mono text-[10px] transition-colors ${activeThread === "public_feed" ? "bg-[#b6ff3a] text-black" : "text-zinc-400 hover:bg-[#14181c]"}`}
          >
            # PUBLIC_FEED
          </button>
        </div>
        
        <div className="p-4 border-b border-[#14181c]">
           <form onSubmit={handleNewDM} className="flex gap-2">
             <input 
               type="text"
               value={recipient}
               onChange={e => setRecipient(e.target.value)}
               placeholder="NOVA DM (PUBKEY)"
               className="flex-1 bg-[#0a0d10] border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-700"
             />
             <button type="submit" className="px-3 bg-zinc-800 text-zinc-300 text-[10px] font-mono hover:bg-zinc-700">+</button>
           </form>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar">
           {/* Lista de contatos (DM threads na memória) */}
           {Array.from(new Set(feed.filter(m => m.recipientPubKey).map(m => m.senderPubKey === identity.publicKey.toString() ? m.recipientPubKey : m.senderPubKey))).map(pk => (
              <button 
                key={pk as string}
                onClick={() => setActiveThread(pk as string)}
                className={`w-full text-left px-4 py-3 font-mono text-[10px] border-b border-[#14181c] transition-colors truncate ${activeThread === pk ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-black/50"}`}
              >
                @ {String(pk).slice(0,16)}...
              </button>
           ))}
        </div>
      </div>

      {/* Main Feed */}
      <div className="col-span-8 bg-[#0a0d10] flex flex-col relative">
        <div className="p-4 border-b border-[#14181c] bg-black/50 backdrop-blur-md absolute top-0 w-full z-10">
          <div className="font-mono text-[11px] text-[#b6ff3a]">
            {activeThread === "public_feed" ? "// BROADCAST PÚBLICO VIA QEL" : `// DM CRIPTOGRAFADA: ${activeThread.slice(0,12)}...`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-16 space-y-6 scrollbar flex flex-col-reverse">
          {feed.length === 0 ? (
            <div className="text-center text-zinc-600 font-mono text-[10px] italic py-12">
              Nenhum shard social decodificado nesta thread.
            </div>
          ) : (
            feed.map((msg) => {
              const isMine = msg.senderPubKey === Array.from(identity.publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div className="font-mono text-[8px] text-zinc-600 mb-1">
                    {isMine ? "YOU" : msg.senderPubKey.slice(0, 8)} · {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  <div className={`max-w-[80%] p-4 font-sans text-sm leading-relaxed ${isMine ? "bg-[#b6ff3a]/10 text-[#b6ff3a] border border-[#b6ff3a]/20" : "bg-black border border-[#14181c] text-zinc-300"}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-[#14181c] bg-black">
          <form onSubmit={handlePost} className="flex gap-3">
            <input
              type="text"
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder={activeThread === "public_feed" ? "Transmita para a malha (público)..." : "Envie mensagem segura..."}
              className="flex-1 bg-[#0a0d10] border border-[#14181c] px-4 py-3 text-sm font-sans text-zinc-200 outline-none focus:border-zinc-700 transition-colors"
            />
            <button 
              type="submit"
              className="px-6 bg-zinc-100 hover:bg-[#b6ff3a] text-black font-mono text-[10px] tracking-widest transition-colors"
            >
              ENVIAR
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
