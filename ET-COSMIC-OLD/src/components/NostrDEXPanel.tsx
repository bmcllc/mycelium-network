import { useMemo, useRef, useState } from "react";
import { nostrDEX, type DEXTrade, type OrderBookSnapshot } from "../crypto/nostrDEX";
import ProtocolRoyaltyDisclosure from "./ProtocolRoyaltyDisclosure";
import {
  computeProtocolRoyalty,
  dexNotionalToSat,
} from "../protocol/sovereignty/protocolRoyalty";

export default function NostrDEXPanel() {
  const [pair, setPair] = useState("ETR/BRL");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(10);
  const [price, setPrice] = useState(42.5);
  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null);
  const [trades, setTrades] = useState<DEXTrade[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [protocolFeeAck, setProtocolFeeAck] = useState(false);
  const logRef = useRef<string[]>([]);

  const royaltyPreview = useMemo(() => {
    const notionalSat = dexNotionalToSat(amount, price);
    return { notionalSat, split: computeProtocolRoyalty(notionalSat, "dex") };
  }, [amount, price]);

  const mustAckProtocolFee =
    royaltyPreview.split.enabled && royaltyPreview.notionalSat > 0;
  const canConfirmOrder = !mustAckProtocolFee || protocolFeeAck;

  const addLog = (msg: string) => {
    logRef.current = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...logRef.current].slice(0, 40);
    setLogs([...logRef.current]);
  };

  const refresh = () => {
    setOrderBook(nostrDEX.getOrderBook(pair));
    setTrades(nostrDEX.getTrades(20));
  };

  const handleCreateOrder = () => {
    if (!canConfirmOrder) return;
    const makerPk = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
    const commitment = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, "0")).join("");
    const order = nostrDEX.createOrder(side, pair, amount, price, makerPk, commitment);
    refresh();
    addLog(`Ordem: ${side.toUpperCase()} ${amount} ${pair} @ ${price} (${order.id.slice(0, 12)})`);
  };

  const handleMatch = () => {
    const matched = nostrDEX.matchOrders(pair);
    refresh();
    addLog(`Match: ${matched.length} trade(s) executado(s) para ${pair}`);
  };

  return (
    <section id="nostr-dex-panel" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#6cf0ff]">§ 13.8</span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#6cf0ff]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">NOSTR DEX</span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Bolsa <span className="text-[#6cf0ff]">Descentralizada</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Order book distribuido via eventos NOSTR (kind 31215/31216). Ordens assinadas,
            matching local, liquidacao com UTXOs cegos. Sem custodia, sem intermediario.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          <div className="lg:col-span-7 bg-[#0a0d10] p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="tag">CRIAR ORDEM</span>
              <span className="font-mono text-[10px] text-zinc-600">
                {nostrDEX.getOpenOrders().length} abertas | {nostrDEX.getTrades().length} trades
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {nostrDEX.getPairs().map((p) => (
                <button
                  key={p}
                  onClick={() => { setPair(p); refresh(); }}
                  className={`py-2 font-mono text-[10px] border transition-all ${
                    pair === p
                      ? "border-[#6cf0ff]/50 bg-[#6cf0ff]/10 text-[#6cf0ff]"
                      : "border-[#14181c] text-zinc-600 hover:border-zinc-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2 font-mono text-[10px] border transition-all ${
                    side === s
                      ? s === "buy"
                        ? "border-[#b6ff3a]/50 bg-[#b6ff3a]/10 text-[#b6ff3a]"
                        : "border-[#ff3ad9]/50 bg-[#ff3ad9]/10 text-[#ff3ad9]"
                      : "border-[#14181c] text-zinc-600"
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">AMOUNT</span>
                <input
                  type="number" value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  className="w-full bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-[#6cf0ff]/50"
                />
              </div>
              <div>
                <span className="font-mono text-[9px] text-zinc-600 mb-1 block">PRICE</span>
                <input
                  type="number" step="0.01" value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <ProtocolRoyaltyDisclosure
                split={royaltyPreview.split}
                contextLabel={`Trade nocional: ~${royaltyPreview.notionalSat.toLocaleString("pt-PT")} sat (${amount} × ${price} ${pair})`}
                requireAck
                acknowledged={protocolFeeAck}
                onAckChange={setProtocolFeeAck}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={handleCreateOrder}
                disabled={!canConfirmOrder}
                className={`py-3 font-mono text-[10px] tracking-[0.2em] transition-all ${
                  canConfirmOrder
                    ? "bg-[#6cf0ff] text-black hover:bg-white"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {mustAckProtocolFee && !protocolFeeAck
                  ? "ACEITE A TAXA ACIMA"
                  : "CRIAR ORDEM"}
              </button>
              <button
                onClick={handleMatch}
                className="py-3 border border-[#ffd700]/30 text-[#ffd700] font-mono text-[10px] tracking-[0.2em] hover:bg-[#ffd700]/10 transition-all"
              >
                MATCH ORDERS
              </button>
            </div>

            {orderBook && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-mono text-[9px] text-[#b6ff3a] mb-2 block">BIDS (compra)</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {orderBook.bids.slice(0, 5).map((b, i) => (
                      <div key={i} className="flex justify-between font-mono text-[9px] text-zinc-500">
                        <span>{b.amount.toFixed(2)}</span>
                        <span className="text-[#b6ff3a]">{b.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {orderBook.bids.length === 0 && <div className="text-zinc-700 text-[9px]">vazio</div>}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-[#ff3ad9] mb-2 block">ASKS (venda)</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {orderBook.asks.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex justify-between font-mono text-[9px] text-zinc-500">
                        <span>{a.amount.toFixed(2)}</span>
                        <span className="text-[#ff3ad9]">{a.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {orderBook.asks.length === 0 && <div className="text-zinc-700 text-[9px]">vazio</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-black p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {orderBook && (
                <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                  <div className="tag mb-2">{pair} — ORDER BOOK</div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">last price</span>
                    <span className="text-[#6cf0ff]">{orderBook.lastPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">spread</span>
                    <span className="text-zinc-300">{orderBook.spread.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">bids</span>
                    <span className="text-[#b6ff3a]">{orderBook.bids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">asks</span>
                    <span className="text-[#ff3ad9]">{orderBook.asks.length}</span>
                  </div>
                </div>
              )}

              {trades.length > 0 && (
                <div>
                  <span className="tag mb-3 block">TRADES RECENTES</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {trades.slice(0, 10).map((t) => (
                      <div key={t.id} className="p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[9px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">{t.amount.toFixed(2)} @ {t.price.toFixed(2)}</span>
                          <span className="text-zinc-600">{t.pair}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600">kind ordem</span>
                  <span className="text-[#6cf0ff]">31215</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">kind trade</span>
                  <span className="text-[#6cf0ff]">31216</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">liquidacao</span>
                  <span className="text-zinc-300">UTXO Pedersen</span>
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
