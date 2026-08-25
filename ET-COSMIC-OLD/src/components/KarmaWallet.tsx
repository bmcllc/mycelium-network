import { useEffect, useState } from "react";
import { karmaSystem, type BlindKarmaToken, type KarmaWallet } from "../crypto/karmaSystem";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { hcnSignatureFromMaterial } from "../lib/moduleRealityBackend";

export default function KarmaWalletPanel() {
  const { material } = useOmegaMaterial(128);
  const [wallet, setWallet] = useState<KarmaWallet>({
    spendableTokens: [],
    pendingTokens: [],
    totalBalance: 0,
    lastRotation: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const refresh = () => {
    karmaSystem.loadFromStorage();
    setWallet(karmaSystem.getWallet());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000); // Auto-refresh a cada 5s
    return () => clearInterval(interval);
  }, []);

  const handleMint = () => {
    if (!material) {
      setStatus("Aguardando entropia Ω…");
      return;
    }
    const sig = hcnSignatureFromMaterial(material);
    const amount = 10 + (material[0]! % 20);
    karmaSystem.mintKarmaToken(amount, sig);
    setStatus(`+${amount} karma (assinatura HCN derivada de Ω)`);
    refresh();
  };

  const handleConfirm = () => {
    const pendingIds = wallet.pendingTokens.map((t) => t.id);
    if (pendingIds.length === 0) {
      setStatus("Nenhum token pendente para confirmar");
      return;
    }
    karmaSystem.confirmTokens(pendingIds);
    setStatus(`${pendingIds.length} tokens confirmados e movidos para spendable`);
    refresh();
  };

  const handleBlindExport = async () => {
    if (wallet.spendableTokens.length === 0) {
      setStatus("Nenhum karma spendable para exportar");
      return;
    }
    setIsExporting(true);
    try {
      const exportData = karmaSystem.blindForExport();
      const blob = await karmaSystem.exportToFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `void_karma_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Blinded ${exportData.tokens.reduce((s, t) => s + t.amount, 0)} Karma exportado! GhostID pode morrer em segurança.`);
      refresh();
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setStatus("Selecione um arquivo de Karma");
      return;
    }
    try {
      const balance = await karmaSystem.importFromFile(importFile);
      setStatus(`Karma importado com sucesso! Novo saldo: ${balance}`);
      setShowImport(false);
      setImportFile(null);
      refresh();
    } catch (e) {
      setStatus(`Import falhou: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleUnblind = () => {
    const newBalance = karmaSystem.unblindForNewSession();
    setStatus(`Karma desblindado para nova sessão! Saldo: ${newBalance}`);
    refresh();
  };

  const handleRotate = () => {
    karmaSystem.rotateEpoch();
    setStatus("Epoch rotacionada — tokens remintados com novo anonimato");
    refresh();
  };

  const bytesToHex = (arr: Uint8Array) =>
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);

  return (
    <div className="border border-[#14181c] bg-[#0a0d10] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="tag">KARMA CEGO E TRANSFERÍVEL (BKT)</div>
        <span className="font-mono text-[10px] text-[#ff3ad9]">
          ZK Tokens · Cross-Session
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-[#14181c] bg-black p-3 text-center">
          <div className="font-mono text-2xl text-[#b6ff3a]">{wallet.totalBalance}</div>
          <div className="tag mt-1">SPENDABLE KARMA</div>
        </div>
        <div className="border border-[#14181c] bg-black p-3 text-center">
          <div className="font-mono text-2xl text-[#6cf0ff]">{wallet.pendingTokens.length}</div>
          <div className="tag mt-1">PENDING TOKENS</div>
        </div>
        <div className="border border-[#14181c] bg-black p-3 text-center">
          <div className="font-mono text-2xl text-[#ff3ad9]">{wallet.spendableTokens.length}</div>
          <div className="tag mt-1">BLIND TOKENS</div>
        </div>
      </div>

      {status && (
        <div className="mb-4 p-2 bg-black border border-[#b6ff3a]/30 font-mono text-[10px] text-[#b6ff3a]">
          {status}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <button
          onClick={handleMint}
          className="py-2 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white transition-colors"
        >
          MINT KARMA (HCN)
        </button>
        <button
          onClick={handleConfirm}
          disabled={wallet.pendingTokens.length === 0}
          className="py-2 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10 disabled:opacity-50"
        >
          CONFIRM PENDING
        </button>
        <button
          onClick={handleBlindExport}
          disabled={isExporting || wallet.spendableTokens.length === 0}
          className="py-2 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10 disabled:opacity-50"
        >
          {isExporting ? "BLINDING..." : "BLIND & EXPORT"}
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="py-2 border border-[#b6ff3a]/30 text-[#b6ff3a] font-mono text-[10px] hover:bg-[#b6ff3a]/10"
        >
          IMPORT KARMA
        </button>
      </div>

      {showImport && (
        <div className="mb-4 p-3 border border-[#14181c] bg-black">
          <input
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="w-full mb-2 text-[10px] text-zinc-400"
          />
          <button
            onClick={handleImport}
            disabled={!importFile}
            className="w-full py-2 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white disabled:opacity-50"
          >
            IMPORTAR PARA NOVA SESSÃO
          </button>
        </div>
      )}

      {wallet.spendableTokens.length > 0 && (
        <button
          onClick={handleUnblind}
          className="w-full mb-4 py-2 border border-[#6cf0ff]/50 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10"
        >
          UNBLIND PARA NOVO GHOSTID (REVELAR KARMA)
        </button>
      )}

      <button
        onClick={handleRotate}
        className="w-full py-2 border border-zinc-700 text-zinc-500 font-mono text-[10px] hover:border-zinc-500 hover:text-zinc-300"
      >
        ROTACIONAR EPOCH (REFRESH ANONIMATO)
      </button>

      {/* Token List */}
      <div className="mt-5 space-y-2 max-h-48 overflow-y-auto">
        {[...wallet.spendableTokens, ...wallet.pendingTokens].map((token: BlindKarmaToken) => (
          <div
            key={token.id}
            className={`p-2 border text-[10px] font-mono ${
              wallet.spendableTokens.includes(token)
                ? "border-[#b6ff3a]/20 bg-black"
                : "border-[#6cf0ff]/20 bg-[#0a0d10]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={wallet.spendableTokens.includes(token) ? "text-[#b6ff3a]" : "text-[#6cf0ff]"}>
                {token.id}
              </span>
              <span className="text-zinc-400">{token.amount} KARMA</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1 text-zinc-600">
              <div>commit: {bytesToHex(token.commitment)}...</div>
              <div>nullifier: {token.nullifier.slice(0, 16)}...</div>
            </div>
            <div className="mt-1 text-zinc-700">
              epoch: {token.epoch} | status: {wallet.spendableTokens.includes(token) ? "SPENDABLE" : "PENDING"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
        <strong className="text-zinc-400">Paradoxo Resolvido:</strong> GhostIDs morrem, mas Karma persiste via 
        <span className="text-[#b6ff3a]"> Blind Karma Tokens (BKT)</span>. Tokens são blindados antes da morte do ID, 
        exportados offline, e unblinded em novas sessões — mantendo economia de longo prazo sem violar efemeridade.
      </div>
    </div>
  );
}
