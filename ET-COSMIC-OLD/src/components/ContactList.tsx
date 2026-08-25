import { useState } from "react";

interface Props {
  onBack: () => void;
  onSelect: (pubkey: string) => void;
  myPubKey: string;
}

export default function ContactList({ onBack, onSelect, myPubKey }: Props) {
  const [inputPk, setInputPk] = useState("");
  const [error, setError] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pk = inputPk.trim().toLowerCase().replace(/^npub/, "");
    if (!pk || pk.length < 64) {
      setError("Chave pública inválida (mínimo 64 hex chars)");
      return;
    }
    if (pk === myPubKey) {
      setError("Não é possível adicionar a si mesmo");
      return;
    }

    onSelect(pk);
    setInputPk("");
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1f26]">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
        >
          ←
        </button>
        <span className="font-mono text-xs text-zinc-300">ADICIONAR CONTATO</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Add by pubkey */}
        <div>
          <div className="text-[10px] font-mono text-zinc-600 mb-3">
            ADICIONAR VIA CHAVE PÚBLICA
          </div>
          <form onSubmit={handleAdd} className="space-y-2">
            <input
              type="text"
              value={inputPk}
              onChange={(e) => {
                setInputPk(e.target.value);
                setError("");
              }}
              placeholder="Cole a chave pública Ed25519 (hex)..."
              className="w-full bg-[#0a0d10] border border-[#1a1f26] px-4 py-3 text-xs font-mono text-zinc-300 outline-none focus:border-[#a855f7]/50 transition-colors placeholder:text-zinc-700"
            />
            {error && (
              <div className="text-red-500 text-[10px] font-mono">{error}</div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-[#a855f7] hover:bg-[#a855f7]/80 text-black font-mono text-[10px] tracking-widest transition-colors"
            >
              CONECTAR
            </button>
          </form>
        </div>

        {/* QR Code section */}
        <div className="border border-[#1a1f26] p-4">
          <div className="text-[10px] font-mono text-zinc-600 mb-3">
            SEU QR CODE
          </div>
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 bg-white p-2 flex items-center justify-center">
              {/* Simple QR placeholder - in production use a QR library */}
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[#a855f7] font-mono text-[8px] mb-1">
                    GHOST ID
                  </div>
                  <div className="text-zinc-500 font-mono text-[6px] break-all px-2">
                    {myPubKey.slice(0, 32)}...
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-zinc-600 text-center">
              Peça para escanear para adicionar você como contato
            </div>
          </div>
        </div>

        {/* Your pubkey */}
        <div className="border border-[#1a1f26] p-3">
          <div className="text-[9px] font-mono text-zinc-600 mb-1">
            SUA CHAVE PÚBLICA
          </div>
          <div className="font-mono text-[9px] text-zinc-500 break-all">
            {myPubKey}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(myPubKey)}
            className="mt-2 px-3 py-1 text-[9px] font-mono text-[#00ff41] border border-[#00ff41]/20 hover:bg-[#00ff41]/10 transition-colors"
          >
            COPIAR
          </button>
        </div>
      </div>
    </div>
  );
}
