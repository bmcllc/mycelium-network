/**
 * QRStocks Panel — Acoes Quantico-Relativisticas
 *
 * Exibe acoes em superposicao com amplitudes, ordem causal
 * e colapsos por mediacao.
 */

import { useState, useEffect, useRef } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { QRMarket, qrMarket as qrMarketInstance, superpositionValue } from "../crypto/qrStocks";

const getQRMarket = () => qrMarketInstance;

export default function QRStocksPanel() {
  const { material } = useOmegaMaterial(128);
  const [stocks, setStocks] = useState<ReturnType<QRMarket["getAllStocks"]>>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [measurementResult, setMeasurementResult] = useState<{
    collapsedPrice: number;
    collapsedVolume: number;
    probability: number;
    measuredAt: number;
  } | null>(null);

  // Form state
  const [newSymbol, setNewSymbol] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Order state
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderVolume, setOrderVolume] = useState("");

  // Log
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(getQRMarket().getAllStocks());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleCreateStock = () => {
    if (!newSymbol || !newPrice) {
      addLog("ERRO: Simbolo e preco sao obrigatorios");
      return;
    }
    try {
      const price = parseFloat(newPrice);
      getQRMarket().listStock(newSymbol.toUpperCase(), price);
      addLog(`Acao criada: ${newSymbol.toUpperCase()} (preco medio: ${price})`);
      setNewSymbol("");
      setNewPrice("");
      setStocks(getQRMarket().getAllStocks());
    } catch (e: any) {
      addLog(`ERRO: ${e.message}`);
    }
  };

  const handleMeasure = (symbol: string) => {
    try {
      const result = getQRMarket().measureStock(symbol, material ?? undefined);
      setMeasurementResult(result);
      addLog(`MEDICAO ${symbol}: preco=${result.collapsedPrice}, vol=${result.collapsedVolume}, prob=${(result.probability * 100).toFixed(1)}%`);
      setStocks(getQRMarket().getAllStocks());
    } catch (e: any) {
      addLog(`ERRO: ${e.message}`);
    }
  };

  const handleCreateOrder = () => {
    if (!selectedStock || !orderPrice || !orderVolume) {
      addLog("ERRO: Selecione acao, preco e volume");
      return;
    }
    try {
      const order = getQRMarket().submitOrder(
        selectedStock,
        orderSide,
        parseFloat(orderPrice),
        parseFloat(orderVolume)
      );
      addLog(`Ordem ${orderSide}: ${selectedStock} ${orderVolume} @ ${orderPrice} (amp: ${order.amplitude.toFixed(4)})`);
      setOrderPrice("");
      setOrderVolume("");
    } catch (e: any) {
      addLog(`ERRO: ${e.message}`);
    }
  };

  const getAmplitudeBars = (stock: ReturnType<QRMarket["getAllStocks"]>[0]) => {
    const entries = Array.from(stock.priceAmplitudes.entries());
    const maxAmp = Math.max(...entries.map(([, a]) => a * a));
    return entries.map(([price, amp]) => ({
      price,
      prob: amp * amp,
      pct: maxAmp > 0 ? (amp * amp) / maxAmp : 0,
    }));
  };

  const currentStock = selectedStock
    ? stocks.find((s) => s.symbol === selectedStock)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#6cf0ff] font-mono">
            QR STOCKS
          </h1>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            ACAO QUANTICO-RELATIVISTICA EM SUPERPOSICAO
          </div>
        </div>
        <div className="text-[8px] font-mono text-zinc-700 tracking-widest uppercase">
          CAUSAL ORDER BOOK
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Stock List + Amplitudes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create Stock Form */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-3">
              LISTAR NOVA ACAO
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="SIMBOLO (ex: ETBTC)"
                className="flex-1 bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300 placeholder-zinc-600"
              />
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Preco medio"
                className="w-32 bg-[#0c0e12] border border-[#14181c] rounded px-3 py-2 text-sm font-mono text-zinc-300 placeholder-zinc-600"
              />
              <button
                onClick={handleCreateStock}
                className="px-4 py-2 bg-[#6cf0ff] text-black font-mono text-xs font-bold rounded hover:bg-[#5adcee] transition-colors"
              >
                LISTAR
              </button>
            </div>
          </div>

          {/* Stocks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stocks.map((stock) => {
              const bars = getAmplitudeBars(stock);
              const value = superpositionValue(stock);
              const isSelected = selectedStock === stock.symbol;

              return (
                <div
                  key={stock.symbol}
                  className={`bg-[#080a0c] border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-[#6cf0ff]/40"
                      : "border-[#14181c] hover:border-zinc-700"
                  }`}
                  onClick={() => setSelectedStock(stock.symbol)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[#6cf0ff] font-mono text-sm font-bold">
                      {stock.symbol}
                    </div>
                    <div className="text-[8px] font-mono text-zinc-500">
                      SUPERPOSICAO
                    </div>
                  </div>

                  {/* Amplitude Bar Chart */}
                  <div className="space-y-1 mb-3">
                    {bars.map((bar) => (
                      <div key={bar.price} className="flex items-center gap-2">
                        <div className="text-[8px] font-mono text-zinc-500 w-12 text-right">
                          {bar.price.toFixed(2)}
                        </div>
                        <div className="flex-1 h-2 bg-[#0c0e12] rounded overflow-hidden">
                          <div
                            className="h-full bg-[#6cf0ff]/60 rounded transition-all duration-300"
                            style={{ width: `${bar.pct * 100}%` }}
                          />
                        </div>
                        <div className="text-[8px] font-mono text-zinc-500 w-10">
                          {(bar.prob * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-mono text-zinc-600">
                        VALOR ESPERADO
                      </div>
                      <div className="text-white font-mono text-sm">
                        {value.toFixed(4)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeasure(stock.symbol);
                      }}
                      className="px-3 py-1.5 bg-[#ff3ad9]/20 text-[#ff3ad9] border border-[#ff3ad9]/30 font-mono text-[10px] font-bold rounded hover:bg-[#ff3ad9]/30 transition-colors"
                    >
                      MEDIR
                    </button>
                  </div>
                </div>
              );
            })}
            {stocks.length === 0 && (
              <div className="col-span-2 py-16 text-center text-zinc-700 font-mono text-xs italic uppercase tracking-widest">
                Nenhuma acao listada
              </div>
            )}
          </div>

          {/* Measurement Result */}
          {measurementResult && (
            <div className="bg-[#080a0c] border border-[#ff3ad9]/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-1.5 rounded-full bg-[#ff3ad9] animate-pulse" />
                <h3 className="text-xs font-mono text-[#ff3ad9]">
                  COLAPSADO POR MEDIACAO
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    PRECO DEFINITO
                  </div>
                  <div className="text-white font-mono text-sm">
                    {measurementResult.collapsedPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    VOLUME DEFINITO
                  </div>
                  <div className="text-white font-mono text-sm">
                    {measurementResult.collapsedVolume}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-zinc-500">
                    PROBABILIDADE
                  </div>
                  <div className="text-[#b6ff3a] font-mono text-sm">
                    {(measurementResult.probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Book + Orders */}
        <div className="space-y-4">
          {/* Causal Order Book */}
          {currentStock && (
            <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
              <h2 className="text-xs font-mono text-zinc-400 mb-3">
                LIVRO CAUSAL — {currentStock.symbol}
              </h2>

              {/* Bids */}
              <div className="mb-3">
                <div className="text-[8px] font-mono text-[#b6ff3a] mb-2">
                  BIDS (COMPRA)
                </div>
                {currentStock.causalOrderBook.bids.length === 0 ? (
                  <div className="text-zinc-700 text-[8px] font-mono py-2">
                    Vazio
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentStock.causalOrderBook.bids.slice(0, 5).map((bid) => (
                      <div
                        key={bid.id}
                        className="flex justify-between text-[8px] font-mono py-1 border-b border-[#14181c]"
                      >
                        <span className="text-[#b6ff3a]">
                          {bid.price.toFixed(2)}
                        </span>
                        <span className="text-zinc-500">vol: {bid.volume}</span>
                        <span className="text-zinc-600">
                          amp: {bid.amplitude.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Asks */}
              <div>
                <div className="text-[8px] font-mono text-[#ff3ad9] mb-2">
                  ASKS (VENDA)
                </div>
                {currentStock.causalOrderBook.asks.length === 0 ? (
                  <div className="text-zinc-700 text-[8px] font-mono py-2">
                    Vazio
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentStock.causalOrderBook.asks.slice(0, 5).map((ask) => (
                      <div
                        key={ask.id}
                        className="flex justify-between text-[8px] font-mono py-1 border-b border-[#14181c]"
                      >
                        <span className="text-[#ff3ad9]">
                          {ask.price.toFixed(2)}
                        </span>
                        <span className="text-zinc-500">vol: {ask.volume}</span>
                        <span className="text-zinc-600">
                          amp: {ask.amplitude.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Order Form */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-3">
              ORDEM CAUSAL
            </h2>

            <div className="flex bg-[#0a0d10] p-1 rounded-sm border border-zinc-900 mb-3">
              <button
                onClick={() => setOrderSide("BUY")}
                className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${
                  orderSide === "BUY"
                    ? "bg-[#b6ff3a] text-black"
                    : "text-zinc-600"
                }`}
              >
                COMPRA
              </button>
              <button
                onClick={() => setOrderSide("SELL")}
                className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${
                  orderSide === "SELL"
                    ? "bg-[#ff3ad9] text-white"
                    : "text-zinc-600"
                }`}
              >
                VENDA
              </button>
            </div>

            <div className="space-y-2 mb-3">
              <div>
                <label className="text-[8px] font-mono text-zinc-500 block mb-1">
                  ACAO
                </label>
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-2 py-1.5 text-xs font-mono text-zinc-300"
                >
                  <option value="">Selecione...</option>
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-mono text-zinc-500 block mb-1">
                  PRECO
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-2 py-1.5 text-xs font-mono text-zinc-300 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="text-[8px] font-mono text-zinc-500 block mb-1">
                  VOLUME
                </label>
                <input
                  type="number"
                  step="1"
                  value={orderVolume}
                  onChange={(e) => setOrderVolume(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0c0e12] border border-[#14181c] rounded px-2 py-1.5 text-xs font-mono text-zinc-300 placeholder-zinc-600"
                />
              </div>
            </div>

            <button
              onClick={handleCreateOrder}
              className={`w-full py-2 font-mono text-xs font-bold rounded transition-colors ${
                orderSide === "BUY"
                  ? "bg-[#b6ff3a] text-black hover:bg-[#a3e635]"
                  : "bg-[#ff3ad9] text-white hover:bg-[#e035c2]"
              }`}
            >
              {orderSide === "BUY" ? "ENVIAR COMPRA" : "ENVIAR VENDA"}
            </button>
          </div>

          {/* Quantum Uncertainty Indicator */}
          <div className="bg-[#080a0c] border border-[#14181c] rounded-lg p-4">
            <h2 className="text-xs font-mono text-zinc-400 mb-2">
              INCERTEZA QUANTICA
            </h2>
            <div className="text-[8px] font-mono text-zinc-500 mb-2">
              Cada acao mantem multiplos precos simultaneamente.
              Medicao colapsa a superposicao em um resultado definido.
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#6cf0ff] animate-pulse" />
              <span className="text-[8px] font-mono text-[#6cf0ff]">
                SUPERPOSICAO ATIVA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Log */}
      <div className="mt-4 bg-[#080a0c] border border-[#14181c] rounded-lg p-3 h-40 overflow-y-auto" ref={logRef}>
        <h3 className="text-xs text-zinc-500 mb-2 font-mono">
          TERMINAL DE MEDIACAO
        </h3>
        {logs.length === 0 ? (
          <div className="text-zinc-600 text-xs font-mono">
            Aguardando operacoes...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-xs font-mono text-zinc-400 py-0.5">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
