import { useState, useEffect } from "react";
import { phantomShopper, type GhostPurchase, type GhostLocker, type Marketplace } from "../crypto/phantomShopper";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import SectionHeader from "./SectionHeader";

export default function PhantomShopperPanel() {
  const [purchases, setPurchases] = useState<GhostPurchase[]>([]);
  const [lockers, setLockers] = useState<GhostLocker[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [selectedMarketplace, setSelectedMarketplace] = useState("AliExpress");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCurrency, setItemCurrency] = useState("USD");

  useEffect(() => {
    const refresh = () => {
      setPurchases(phantomShopper.getAllPurchases());
      setLockers(phantomShopper.getLockers());
      setMarketplaces(phantomShopper.getSupportedMarketplaces());
      setStats(phantomShopper.getStats());
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = async () => {
    const identity = voidOrchestrator.getIdentity();
    if (!identity) { setStatus("GHOSTID_REQUIRED"); return; }
    const price = parseFloat(itemPrice || "0");
    if (price <= 0 || !itemName) return;

    try {
      setStatus("Ativando GhostVPN + gerando cartão virtual...");
      const purchase = await phantomShopper.purchase(
        selectedMarketplace,
        itemName,
        price,
        itemCurrency,
        identity,
      );
      setStatus(`Compra fantasma ${purchase.id} realizada! NFC: ${purchase.nfcSeal.slice(0, 16)}...`);
      setItemName("");
      setItemPrice("");
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDecay = () => {
    const decayed = phantomShopper.decayHistory();
    setStatus(`${decayed} histórico(s) decaído(s) (30 dias)`);
  };

  return (
    <section className="px-6 md:px-16 py-20 border-t border-[#14181c]">
      <SectionHeader
        index="4.1"
        kicker="COMÉRCIO INVISÍVEL"
        title={<>Phantom Shopper<span className="text-[#6cf0ff]">.</span></>}
        description="Comprar em eBay, AliExpress, Shopee, Buyee sem jamais revelar identidade, localização real ou método de pagamento pessoal."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Form */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">NOVA COMPRA FANTASMA</div>
          {status && (
            <div className="mb-3 p-2 bg-black border border-[#6cf0ff]/30 font-mono text-[10px] text-[#6cf0ff]">
              {status}
            </div>
          )}

          <div className="mb-3">
            <div className="tag mb-2">MARKETPLACE</div>
            <div className="grid grid-cols-2 gap-1">
              {marketplaces.map(m => (
                <button
                  key={m.name}
                  onClick={() => setSelectedMarketplace(m.name)}
                  className={`py-1 text-[10px] font-mono ${
                    selectedMarketplace === m.name
                      ? "bg-[#b6ff3a] text-black"
                      : "border border-[#14181c] text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Nome do item"
              className="w-full bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
            />
            <div className="flex gap-2">
              <input
                value={itemPrice}
                onChange={e => setItemPrice(e.target.value)}
                placeholder="Preço"
                className="flex-1 bg-black border border-[#14181c] px-3 py-2 text-[10px] font-mono text-zinc-300 placeholder:text-zinc-700"
              />
              <select
                value={itemCurrency}
                onChange={e => setItemCurrency(e.target.value)}
                className="bg-black border border-[#14181c] px-2 py-2 text-[10px] font-mono text-zinc-300"
              >
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <button
              onClick={handlePurchase}
              className="w-full py-3 bg-[#6cf0ff] text-black font-mono text-[10px] hover:bg-white"
            >
              COMPRAR INVISIVELMENTE
            </button>
          </div>

          <button
            onClick={handleDecay}
            className="w-full py-2 border border-[#ff3ad9]/30 text-[#ff3ad9] font-mono text-[10px] hover:bg-[#ff3ad9]/10"
          >
            DECAY HISTÓRICO (30 DIAS)
          </button>
        </div>

        {/* Ghost Lockers */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">GHOST LOCKERS (ENTREGA ANÔNIMA)</div>
          <div className="space-y-2">
            {lockers.map(locker => (
              <div key={locker.id} className="p-3 border border-[#14181c] bg-black">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-zinc-200">{locker.name}</span>
                  <span className="text-[#b6ff3a]">{locker.availableSlots}/{locker.totalSlots}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-1">
                  {locker.location} | NFC: {locker.nfcEnabled ? "SIM" : "NÃO"}
                </div>
                <div className="mt-1 h-1 bg-[#14181c]">
                  <div
                    className="h-full bg-[#b6ff3a]"
                    style={{ width: `${(locker.availableSlots / locker.totalSlots) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purchases */}
        <div className="border border-[#14181c] bg-[#0a0d10] p-5">
          <div className="tag mb-4">COMPRAS FANTASMA</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {purchases.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 text-center">
                Nenhuma compra realizada
              </div>
            ) : (
              purchases.slice().reverse().map(p => (
                <div key={p.id} className="p-2 border border-[#14181c] bg-black text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-300">{p.itemDescription.slice(0, 20)}</span>
                    <span className="text-[#6cf0ff]">{p.currency} {p.itemPrice}</span>
                  </div>
                  <div className="text-zinc-600 mt-1">
                    {p.marketplace} | Cartão: ****{p.virtualCardLast4} | NFC: {p.nfcSeal.slice(0, 8)}...
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-zinc-700">{p.deliveryAddress}</span>
                    <span className={
                      p.status === "completed" ? "text-[#b6ff3a]" :
                      p.status === "delivered" ? "text-[#6cf0ff]" : "text-zinc-500"
                    }>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#6cf0ff]">{stats.totalPurchases}</div>
                <div className="tag mt-1">COMPRAS</div>
              </div>
              <div className="border border-[#14181c] bg-black p-2 text-center">
                <div className="font-mono text-lg text-[#b6ff3a]">${stats.totalSpent.toFixed(2)}</div>
                <div className="tag mt-1">TOTAL GASTO</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 border border-[#14181c] bg-[#0a0d10] font-mono text-[10px] text-zinc-500 leading-relaxed">
        <strong className="text-zinc-400">Três Pilares:</strong> Máscara de Rede (GhostVPN) + Máscara de Pagamento (Janus Finance)
        + Máscara de Entrega (Ghost Lockers).
        <span className="text-[#6cf0ff]"> Nenhum nome, nenhum endereço, nenhum IP verdadeiro jamais apareceram.</span>
      </div>
    </section>
  );
}
