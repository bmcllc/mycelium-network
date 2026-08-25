import { useState, useEffect, useMemo } from "react";
import { useVoid } from "../core/useVoid";
import { FragmentedOrderBook, type OrderIntent, type MatchResult, type OrderSide } from "../crypto/matchmaker";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { deriveHexId } from "../lib/moduleRealityBackend";

const orderBook = new FragmentedOrderBook();

import GhostIDSetup from "./GhostIDSetup";
import ProtocolRoyaltyDisclosure from "./ProtocolRoyaltyDisclosure";
import {
  computeProtocolRoyalty,
  dexNotionalToSat,
} from "../protocol/sovereignty/protocolRoyalty";

export default function DEXPanel() {
  const { identity, spawn } = useVoid();
  const { material } = useOmegaMaterial(64);
  const [side, setSide] = useState<OrderSide>("BUY");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [pair, setPair] = useState("vBTC/vUSD");
  
  const [stats, setStats] = useState(orderBook.getStats());
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [protocolFeeAck, setProtocolFeeAck] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const priceNum = parseFloat(price) || 0;
  const royaltyPreview = useMemo(() => {
    const notionalSat = dexNotionalToSat(amtNum, priceNum);
    return { notionalSat, split: computeProtocolRoyalty(notionalSat, "dex") };
  }, [amtNum, priceNum]);

  const mustAckProtocolFee =
    royaltyPreview.split.enabled && royaltyPreview.notionalSat > 0;
  const canPlaceOrder = !mustAckProtocolFee || protocolFeeAck;

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(orderBook.getStats());
      setMatches([...orderBook.getMatches()].reverse());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !amount || !price || !canPlaceOrder) return;

    const order: OrderIntent = {
      id: material
        ? `order_${Date.now()}_${deriveHexId(material, "dex", Date.now() % 64, 4)}`
        : `order_${Date.now()}`,
      side,
      pair,
      amount: parseFloat(amount),
      price: parseFloat(price),
      timestamp: Date.now(),
      traderPubKey: Array.from(identity.publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
    };

    orderBook.addOrder(order);
    setAmount("");
    setPrice("");
    setStats(orderBook.getStats());
  };

  const handleRunMatching = () => {
    setIsMatching(true);
    setTimeout(() => {
      orderBook.runMatching();
      setIsMatching(false);
      setStats(orderBook.getStats());
      setMatches([...orderBook.getMatches()].reverse());
    }, 1500);
  };

  if (!identity) {
    return (
      <GhostIDSetup
        onSpawn={spawn}
        moduleName="DUAL-MODE EXCHANGE (DEX)"
        themeColor="#b6ff3a"
      />
    );
  }

  return (
    <div className="grid md:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
      {/* 1. Terminal de Ordens */}
      <div className="col-span-4 bg-black p-8 border-r border-[#14181c]">
        <div className="tag mb-6">LAYER 2 · DUAL-MODE EXCHANGE</div>
        <h3 className="text-xl font-sans font-light text-white mb-6">Nova Ordem</h3>
        
        <form onSubmit={handlePlaceOrder} className="space-y-6">
          <div className="flex bg-[#0a0d10] p-1 rounded-sm border border-zinc-900">
            <button 
              type="button"
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2 text-[10px] font-mono transition-colors ${side === "BUY" ? "bg-[#b6ff3a] text-black" : "text-zinc-600"}`}
            >
              COMPRA
            </button>
            <button 
              type="button"
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2 text-[10px] font-mono transition-colors ${side === "SELL" ? "bg-red-500 text-white" : "text-zinc-600"}`}
            >
              VENDA
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-mono text-zinc-600 mb-2 uppercase">Par de Ativos</label>
              <select 
                value={pair}
                onChange={e => setPair(e.target.value)}
                className="w-full bg-[#0a0d10] border border-zinc-900 p-3 text-white font-sans text-sm outline-none"
              >
                <option value="vBTC/vUSD">vBTC / vUSD</option>
                <option value="vETH/vUSD">vETH / vUSD</option>
                <option value="HYDRA/vUSD">HYDRA / vUSD</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-mono text-zinc-600 mb-2 uppercase">Quantidade</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-[#0a0d10] border border-zinc-900 p-3 text-white font-mono text-xs outline-none focus:border-zinc-700"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-zinc-600 mb-2 uppercase">Preço Limite</label>
                <input 
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-[#0a0d10] border border-zinc-900 p-3 text-white font-mono text-xs outline-none focus:border-zinc-700"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <ProtocolRoyaltyDisclosure
              split={royaltyPreview.split}
              contextLabel={
                royaltyPreview.notionalSat > 0
                  ? `Ordem ${side}: ~${royaltyPreview.notionalSat.toLocaleString("pt-PT")} sat nocional`
                  : "Preencha quantidade e preço"
              }
              requireAck
              acknowledged={protocolFeeAck}
              onAckChange={setProtocolFeeAck}
            />
          </div>

          <button 
            type="submit"
            disabled={!canPlaceOrder}
            className={`w-full py-4 font-sans font-bold text-xs tracking-widest transition-smooth ${
              !canPlaceOrder
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : side === "BUY"
                  ? "bg-[#b6ff3a] text-black hover:bg-white"
                  : "bg-red-500 text-white hover:bg-red-400"
            }`}
          >
            {mustAckProtocolFee && !protocolFeeAck
              ? "ACEITE A TAXA TRANSPARENTE"
              : "LANÇAR ORDEM FRAGMENTADA"}
          </button>
        </form>

        <div className="mt-12 p-6 bg-[#0a0d10] border border-zinc-900 border-dashed">
          <div className="text-[10px] font-mono text-zinc-500 mb-4">// QEL FRAGMENTATION STATUS</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-zinc-600">Shard 0 (Price 40%)</span>
              <span className="text-[#b6ff3a]">READY</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-zinc-600">Shard 1 (Price 30%)</span>
              <span className="text-[#b6ff3a]">READY</span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-zinc-600">Shard 2 (Price 30%)</span>
              <span className="text-[#b6ff3a]">READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Order Book & Matching */}
      <div className="col-span-8 bg-[#0a0d10] flex flex-col">
        <div className="p-8 border-b border-[#14181c] flex justify-between items-center bg-black/20">
          <div>
            <h3 className="text-white font-sans font-light">Mecanismo de Matching Cego</h3>
            <div className="text-[10px] font-mono text-zinc-600 mt-1 uppercase">
              {stats.buyOrderCount} Compras · {stats.sellOrderCount} Vendas em {stats.pairs.length} pares
            </div>
          </div>
          <button 
            onClick={handleRunMatching}
            disabled={isMatching || (stats.buyOrderCount === 0 && stats.sellOrderCount === 0)}
            className="px-6 py-3 bg-white text-black font-mono text-[10px] font-bold hover:bg-[#b6ff3a] disabled:opacity-30 transition-smooth"
          >
            {isMatching ? "PROCESSANDO MATCHING..." : "EXECUTAR MATCHING P2P"}
          </button>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-px bg-[#14181c] overflow-hidden">
          {/* Order Stats */}
          <div className="bg-[#0a0d10] p-8 overflow-y-auto scrollbar-none">
            <div className="tag mb-6">ATIVIDADE DA MALHA</div>
            <div className="space-y-4">
              {stats.pairs.map(p => (
                <div key={p} className="p-4 bg-black border border-zinc-900 rounded-sm">
                  <div className="text-[#b6ff3a] font-mono text-[10px] mb-2">{p}</div>
                  <div className="flex justify-between text-xs font-sans text-zinc-400">
                    <span>Profundidade</span>
                    <span className="text-white">fragmentada</span>
                  </div>
                </div>
              ))}
              {stats.pairs.length === 0 && (
                <div className="py-20 text-center text-zinc-700 font-mono text-[10px] italic uppercase tracking-widest">
                  Aguardando ordens...
                </div>
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="bg-[#0a0d10] p-8 overflow-y-auto scrollbar-none border-l border-[#14181c]">
            <div className="tag mb-6">HISTÓRICO DE EXECUÇÃO (BLIND)</div>
            <div className="space-y-3">
              {matches.map(m => (
                <div key={m.matchId} className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-sm animate-fade-in">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[9px] font-mono text-zinc-500">{m.matchId}</div>
                    <div className="text-[9px] font-mono text-[#b6ff3a]">ZK_VERIFIED</div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white font-sans text-sm">{m.matchedAmount} UNITS</div>
                      <div className="text-zinc-500 font-mono text-[10px]">@ ◆ {m.matchedPrice}</div>
                    </div>
                    <div className="text-[8px] font-mono text-zinc-700">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="py-20 text-center text-zinc-700 font-mono text-[10px] italic uppercase tracking-widest">
                  Nenhum match recente
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
