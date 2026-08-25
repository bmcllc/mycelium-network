import { useState, useEffect } from "react";
import { useVoid } from "../core/useVoid";
import { stablecoinManager, type CreditVault, type FiatOffer } from "../crypto/stablecoin";
import { rwaManager } from "../crypto/rwaTokenization";
import { formatAmount, parseAmount } from "../crypto/utxo";
import { karmaSystem } from "../crypto/karmaSystem";

import GhostIDSetup from "./GhostIDSetup";

export default function StablecoinPanel() {
  const { identity, spawn } = useVoid();
  const [vaults, setVaults] = useState<CreditVault[]>([]);
  const [offers, setOffers] = useState<FiatOffer[]>([]);
  const [currency, setCurrency] = useState("ETBRL");
  const [mintAmount, setMintAmount] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  
  const verifiedAssets = rwaManager.getAssets().filter(a => a.isVerified);

  useEffect(() => {
    setVaults(stablecoinManager.getVaults());
    setOffers(stablecoinManager.getOffers(currency));
  }, [currency]);

  const handleOpenVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !selectedAssetId || !mintAmount) return;

    const asset = verifiedAssets.find(a => a.metadata.id === selectedAssetId);
    if (!asset) return;

    try {
      stablecoinManager.openVaultWithRwa(asset, parseAmount(mintAmount), currency, identity);
      setVaults(stablecoinManager.getVaults());
      setMintAmount("");
      alert("Cofre de Crédito aberto! Moeda estável emitida.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!identity) {
    return (
      <GhostIDSetup
        onSpawn={spawn}
        moduleName="STABLECOIN PORTAL"
        themeColor="#10b981"
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-px bg-[#14181c] border border-[#14181c]">
      {/* 1. Credit Vaults */}
      <div className="bg-black p-8 space-y-8 border-r border-[#14181c]">
        <div className="tag">LAYER 4 · CREDIT VAULTS</div>
        <h3 className="text-2xl font-sans font-light text-white">Cofres de Estabilidade</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Emita moedas locais ($ETBRL, $ETARS) usando seus ativos RWA como colateral. 
          Mantenha seu Health Factor acima de 1.5 para evitar liquidação.
        </p>

        <form onSubmit={handleOpenVault} className="space-y-4 p-6 bg-[#0a0d10] border border-zinc-900">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-zinc-600 uppercase">Selecionar Colateral (RWA)</label>
            <select 
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              className="w-full bg-black border border-zinc-800 p-3 text-white font-sans text-xs outline-none"
            >
              <option value="">Selecione um ativo verificado...</option>
              {verifiedAssets.map(a => (
                <option key={a.metadata.id} value={a.metadata.id}>
                  {a.metadata.name} (Valuation: ◆ {formatAmount(a.metadata.valuation)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-600 uppercase">Moeda</label>
              <select 
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-3 text-white font-sans text-xs outline-none"
              >
                <option value="ETBRL">Real ($ETBRL)</option>
                <option value="ETARS">Peso ($ETARS)</option>
                <option value="ETUSD">Dólar ($ETUSD)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-600 uppercase">Quantidade a Emitir</label>
              <input 
                type="number"
                value={mintAmount}
                onChange={e => setMintAmount(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-3 text-white font-mono text-xs outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <button className="w-full py-3 bg-[#b6ff3a] text-black font-sans font-bold text-xs hover:bg-white transition-smooth">
            ABRIR COFRE E EMITIR
          </button>
        </form>

        <div className="space-y-4">
          <div className="text-[10px] font-mono text-zinc-600 uppercase">Meus Cofres Ativos</div>
          {vaults.map(v => (
            <div key={v.id} className="p-4 bg-[#0a0d10] border border-zinc-900 rounded-sm flex justify-between items-center">
              <div>
                <div className="text-white font-sans text-sm">{v.mintedAmount.toString()} {v.currency}</div>
                <div className="text-[9px] font-mono text-zinc-600">Collateral: {v.collateralAssetId?.slice(0, 12)}...</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-mono text-zinc-600 uppercase">Health Factor</div>
                <div className={`text-sm font-mono ${v.healthFactor > 1.8 ? "text-[#b6ff3a]" : "text-yellow-500"}`}>
                  {v.healthFactor.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Fiat Ramp */}
      <div className="bg-[#0a0d10] p-8 space-y-8">
        <div className="tag">LAYER 5 · P2P FIAT RAMP</div>
        <h3 className="text-2xl font-sans font-light text-white">Rampa Fiat P2P</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Troque suas stablecoins por papel moeda com outros usuários. 
          A reputação é baseada no seu <span className="text-[#6cf0ff]">Karma Cego</span> acumulado.
        </p>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Ofertas Ativas em {currency}</div>
            <div className="text-[10px] font-mono text-zinc-600">Seu Karma: {karmaSystem.getSpendableBalance()}</div>
          </div>

          <div className="space-y-3">
            {offers.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-900 text-zinc-700 font-mono text-[10px] italic">
                Nenhuma oferta encontrada para {currency}.
              </div>
            ) : (
              offers.map(o => (
                <div key={o.id} className="p-4 bg-black border border-zinc-900 hover:border-[#b6ff3a]/40 transition-smooth group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="tag bg-zinc-900 text-zinc-400">{o.type} {o.currency}</div>
                    <div className="text-[10px] font-mono text-[#6cf0ff]">Karma Min: {o.karmaRequired}</div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-lg text-white font-sans">{o.amount.toString()} {o.currency}</div>
                      <div className="text-[9px] font-mono text-zinc-600">Taxa: 1 {o.currency} = {o.price} CASH</div>
                    </div>
                    <button className="px-4 py-2 bg-zinc-900 text-zinc-400 font-mono text-[9px] group-hover:bg-[#b6ff3a] group-hover:text-black transition-smooth">
                      ACEITAR TROCA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
