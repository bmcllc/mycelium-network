import { useState, useEffect } from "react";
import { chimeraExchange, type ChimeraPair, type ChimeraOrder, type ChimeraRound } from "../crypto/chimeraExchange";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function ChimeraExchangePanel() {
  const [pairs, setPairs] = useState<ChimeraPair[]>([]);
  const [selectedPair, setSelectedPair] = useState("SOV/ETBRL");
  const [orderBook, setOrderBook] = useState<ChimeraOrder[]>([]);
  const [rounds, setRounds] = useState<ChimeraRound[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderPrice, setOrderPrice] = useState("");

  useEffect(() => {
    const refresh = () => {
      setPairs(chimeraExchange.getAllPairs());
      setOrderBook(chimeraExchange.getOrderBook(selectedPair));
      setRounds(chimeraExchange.getRecentRounds(5));
      setStats(chimeraExchange.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 600);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const handleOrder = () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }
    const amount = parseFloat(orderAmount || "0");
    const price = parseFloat(orderPrice || "0");
    if (amount <= 0 || price <= 0) return;

    chimeraExchange.submitOrder(orderSide, selectedPair, amount, price, identity);
    setStatus(`Ordem ${orderSide} ${amount} @ $${price} submetida e fragmentada em shards`);
    setOrderAmount("");
    setOrderPrice("");
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="3.2"
        kicker="BOLSA DESCENTRALIZADA"
        title={<>Chimera Exchange<span className="text-[#ff3ad9]">.</span></>}
        description="A Bolsa que Concentra sem Centralizar. Matcher temporário eleito via VRF a cada 500ms. Custo zero de gas."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pairs */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">PARES DE TRADING</div>
          <div className="space-y-2">
            {pairs.map(pair => (
              <div
                key={pair.symbol}
                onClick={() => setSelectedPair(pair.symbol)}
                className={`p-3 border text-[10px] font-mono cursor-pointer ${
                  selectedPair === pair.symbol
                    ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/5"
                    : "border-[#14181c] bg-black hover:border-zinc-700"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-zinc-200">{pair.symbol}</span>
                  <span className="text-[#b6ff3a]">${pair.lastPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-zinc-600">Vol: ${pair.volume24h.toLocaleString()}</span>
                  <span className={pair.priceChange24h >= 0 ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                    {pair.priceChange24h >= 0 ? "+" : ""}{pair.priceChange24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#6cf0ff]">{stats.totalRounds}</div>
                <div className="tag mt-1">ROUNDS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#b6ff3a]">${stats.gasSavedTotal.toFixed(4)}</div>
                <div className="tag mt-1">GAS SAVED</div>
              </div>
            </div>
          )}
        </div>

        {/* Order Form */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">SUBMETER ORDEM CIFRADA</div>
          {status && (
            <div className="mb-3 p-2 bg-black border border-[#6cf0ff]/30 font-mono text-[10px] text-[#6cf0ff]">
              {status}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderSide("BUY")}
              className={`flex-1 py-2 font-mono text-[10px] ${
                orderSide === "BUY"
                  ? "bg-[#b6ff3a] text-black"
                  : "border border-[#b6ff3a]/30 text-[#b6ff3a]"
              }`}
            >
              COMPRAR
            </button>
            <button
              onClick={() => setOrderSide("SELL")}
              className={`flex-1 py-2 font-mono text-[10px] ${
                orderSide === "SELL"
                  ? "bg-[#ff3ad9] text-black"
                  : "border border-[#ff3ad9]/30 text-[#ff3ad9]"
              }`}
            >
              VENDER
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <input
              value={orderAmount}
              onChange={e => setOrderAmount(e.target.value)}
              placeholder="Quantidade"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <input
              value={orderPrice}
              onChange={e => setOrderPrice(e.target.value)}
              placeholder="Preço limite"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <button
              onClick={handleOrder}
              className="w-full py-2 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white"
            >
              SUBMETER ORDEM (FRAGMENTADA)
            </button>
          </div>

          {/* Recent Rounds */}
          <div className="tag mb-2">ROUNDS RECENTES (500ms CADA)</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {rounds.map(round => (
              <div key={round.roundId} className="p-2 border border-[#14181c] bg-black text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Round #{round.roundId}</span>
                  <span className="text-[#6cf0ff]">{round.matches.length} matches</span>
                </div>
                <div className="text-zinc-600">
                  Volume: ${round.totalVolume.toFixed(2)} | Gas saved: ${round.gasSaved.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Book */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">ORDER BOOK FRAGMENTADO</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {orderBook.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center">
                Nenhuma ordem para {selectedPair}
              </div>
            ) : (
              orderBook.slice().reverse().map(order => (
                <div key={order.id} className="p-2 border border-[#14181c] bg-black text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className={order.side === "BUY" ? "text-[#b6ff3a]" : "text-[#ff3ad9]"}>
                      {order.side}
                    </span>
                    <span className="text-zinc-400">{order.side === "BUY" ? "▲" : "▼"} [oculto]</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    {order.shards.length} shards | {order.isEncrypted ? "CIFRADO" : "ABERTO"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Anti-Diluição:</strong> Token de liquidez sintético ($CHIM) é criado e destruído a cada rodada.
        <span className="text-[#ff3ad9]"> Prova de Não-Front-Running via timestamps causais.</span>
      </div>
    </section>
  );
}
