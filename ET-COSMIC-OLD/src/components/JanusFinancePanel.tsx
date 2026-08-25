import { useState, useEffect } from "react";
import { janusFinance, type JanusBalance, type VirtualCard, type StatementLine } from "../crypto/janusFinance";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function JanusFinancePanel() {
  const [balance, setBalance] = useState<JanusBalance | null>(null);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [statement, setStatement] = useState<StatementLine[]>([]);
  const [_stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [pixAmount, setPixAmount] = useState("");
  const [pixKey, setPixKey] = useState("");

  const refresh = () => {
    const identity = voidOrchestrator.getIdentity();
    if (identity) {
      setBalance(janusFinance.calculateBalance(identity));
      setStatement(janusFinance.getStatement(identity.handle));
    }
    setCards(janusFinance.getActiveCards());
    setStats(janusFinance.getStats());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }
    const amount = BigInt(Math.floor(parseFloat(depositAmount || "0") * 10000));
    if (amount <= 0n) return;
    janusFinance.deposit(amount, identity);
    setStatus(`Depósito: R$ ${depositAmount} registrado`);
    setDepositAmount("");
    refresh();
  };

  const handlePIX = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }
    const amount = BigInt(Math.floor(parseFloat(pixAmount || "0") * 10000));
    if (amount <= 0n) return;
    try {
      const recipientKey = crypto.getRandomValues(new Uint8Array(32));
      const { proof } = janusFinance.createPIX(amount, recipientKey, identity);
      setStatus(`PIX enviado! Prova ZK: ${proof.slice(0, 16)}...`);
      setPixAmount("");
      refresh();
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCard = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }
    const amount = BigInt(50 * 10000); // R$ 50
    const card = janusFinance.generateVirtualCard(amount, "BRL", identity);
    setStatus(`Cartão ****${card.number.slice(-4)} gerado (expira em 1h)`);
    refresh();
  };

  const formatBRL = (amount: bigint) => {
    return `R$ ${(Number(amount) / 10000).toFixed(2)}`;
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="3.1"
        kicker="BANCO DE DUAS FACES"
        title={<>Janus Finance<span className="text-[#6cf0ff]">.</span></>}
        description="Experiência de neobank sem custódia central. Saldo em reais, extrato limpo, PIX e cartão virtual — mas cada ativo é um UTXO fantasma."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">SALDO (HALLUCINATION ENGINE)</div>
          {status && (
            <div className="mb-3 p-2 bg-black border border-[#6cf0ff]/30 font-mono text-[10px] text-[#6cf0ff]">
              {status}
            </div>
          )}

          <div className="border border-[#14181c] bg-black p-4 text-center mb-4">
            <div className="font-mono text-3xl text-[#b6ff3a]">
              {balance ? formatBRL(balance.available) : "R$ 0.00"}
            </div>
            <div className="tag mt-2">DISPONÍVEL</div>
            {balance && (
              <div className="text-[10px] font-mono text-zinc-500 mt-1">
                {balance.utxoCount} UTXOs subjacentes
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <input
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="Valor depósito (BRL)"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <button
              onClick={handleDeposit}
              className="w-full py-2 bg-[#b6ff3a] text-black font-mono text-[10px] hover:bg-white"
            >
              DEPOSITAR
            </button>
          </div>

          <div className="space-y-2">
            <input
              value={pixAmount}
              onChange={e => setPixAmount(e.target.value)}
              placeholder="Valor PIX (BRL)"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <input
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="Chave PIX destinatário"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <button
              onClick={handlePIX}
              className="w-full py-2 border border-[#6cf0ff]/30 text-[#6cf0ff] font-mono text-[10px] hover:bg-[#6cf0ff]/10"
            >
              ENVIAR PIX (ZK PROOF)
            </button>
          </div>
        </div>

        {/* Virtual Cards */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="tag">CARTÕES VIRTUAIS</div>
            <button
              onClick={handleCard}
              className="px-3 py-1 bg-[#ff3ad9] text-black font-mono text-[10px] hover:bg-white"
            >
              + GERAR
            </button>
          </div>

          <div className="space-y-2">
            {cards.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center border border-[#14181c] bg-black">
                Nenhum cartão ativo
              </div>
            ) : (
              cards.map(card => (
                <div key={card.id} className="p-3 border border-[#ff3ad9]/20 bg-black">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#ff3ad9]">**** **** **** {card.number.slice(-4)}</span>
                    <span className="text-[#b6ff3a]">ATIVO</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1">
                    CVV: {card.cvv} | Exp: {card.expiryDate}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    Limite: {formatBRL(card.limit)} {card.currency}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-700">
                    Expira em: {Math.max(0, Math.floor((card.expiresAt - Date.now()) / 60000))}min
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Statement */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">EXTRATO (PROVAS ZK)</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {statement.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center">
                Nenhuma transação
              </div>
            ) : (
              statement.slice().reverse().map(line => (
                <div key={line.id} className="p-2 border border-[#14181c] bg-black text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className={line.type === "CREDIT" ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                      {line.type === "CREDIT" ? "+" : "-"}{formatBRL(line.amount)}
                    </span>
                    <span className="text-zinc-600">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-zinc-500 mt-1">{line.description}</div>
                  <div className="text-zinc-700 mt-1">proof: {line.zkProof.slice(0, 16)}...</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Fachada Regulatória:</strong> Entidade legal offshore assina atestados de conformidade
        sem deter fundos. O usuário vê R$ 500; por baixo são UTXOs fantasma com Pedersen Commitments.
      </div>
    </section>
  );
}
