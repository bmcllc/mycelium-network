import { useState, useEffect } from "react";
import { useVoid } from "../core/useVoid";
import { rwaManager, type TokenizedAsset } from "../crypto/rwaTokenization";
import { parseAmount, formatAmount } from "../crypto/utxo";
import { db } from "../storage/utxoStore";

import GhostIDSetup from "./GhostIDSetup";

export default function RwaTokenizationPanel() {
  const { identity, spawn } = useVoid();
  const [assets, setAssets] = useState<TokenizedAsset[]>([]);
  const [name, setName] = useState("");
  const [val, setVal] = useState("");
  const [category, setCategory] = useState<any>("REAL_ESTATE");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    setAssets(rwaManager.getAssets());
    const interval = setInterval(() => setAssets(rwaManager.getAssets()), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !name || !val) return;
    setIsRegistering(true);

    try {
      await rwaManager.registerAsset({
        name,
        category,
        description: `Ativo soberano registrado via malha ETΞRNET.`,
        valuation: parseAmount(val)
      }, identity);
      
      setName("");
      setVal("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleWitness = async (assetId: string) => {
    if (!identity) return;
    await rwaManager.signAsWitness(assetId, identity);
  };

  const handleFractionalize = async (assetId: string) => {
    if (!identity) return;
    try {
      const fractions = rwaManager.fractionalize(assetId, identity);
      for (const f of fractions) {
        await db.saveUTXO(f);
      }
      alert(`Ativo fracionado! ${fractions.length} novos UTXOs adicionados à sua carteira.`);
    } catch (e) {
      alert("Ativo ainda não possui testemunhas suficientes (Mínimo: 3).");
    }
  };

  if (!identity) {
    return (
      <GhostIDSetup
        onSpawn={spawn}
        moduleName="REAL WORLD ASSETS (RWA)"
        themeColor="#10b981"
      />
    );
  }

  return (
    <div className="space-y-12">
      {/* 1. Registration Form */}
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="space-y-6">
          <div className="tag">LAYER 1 · ASSET EMISSION</div>
          <h3 className="text-2xl font-sans font-light text-white">Tokenizar Bem Real</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Transforme propriedades físicas em ativos divisíveis. 
            Uma vez registrado, o sistema pedirá que nós vizinhos confirmem a posse do bem.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <input 
              type="text" 
              placeholder="Nome do Ativo (ex: Apartamento Centro)" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#0a0d10] border border-zinc-900 p-4 text-white font-sans outline-none focus:border-zinc-700 transition-smooth"
            />
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Valor Est. (◆)" 
                value={val}
                onChange={e => setVal(e.target.value)}
                className="w-full bg-[#0a0d10] border border-zinc-900 p-4 text-white font-sans outline-none focus:border-zinc-700 transition-smooth"
              />
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#0a0d10] border border-zinc-900 p-4 text-zinc-400 font-sans outline-none focus:border-zinc-700 transition-smooth"
              >
                <option value="REAL_ESTATE">Imóvel</option>
                <option value="VEHICLE">Veículo</option>
                <option value="COMMODITY">Ouro/Commodity</option>
              </select>
            </div>
            <button 
              disabled={isRegistering}
              className="w-full py-4 bg-[#b6ff3a] text-black font-sans font-bold rounded-sm hover:bg-white transition-smooth active:scale-[0.98]"
            >
              {isRegistering ? "REGISTRANDO FÓSSIL..." : "EMITIR TOKENS DO BEM"}
            </button>
          </form>
        </div>

        {/* 2. Active Assets List */}
        <div className="space-y-6">
          <div className="tag">PENDING_VERIFICATION</div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-none">
            {assets.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-900 text-zinc-700 font-mono text-xs italic">
                Nenhum ativo aguardando testemunhas.
              </div>
            ) : (
              assets.map(asset => (
                <div key={asset.metadata.id} className="p-6 bg-black border border-zinc-900 rounded-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-sans font-medium">{asset.metadata.name}</div>
                      <div className="text-[10px] font-mono text-zinc-600">{asset.metadata.id}</div>
                    </div>
                    <div className={`px-2 py-0.5 text-[8px] font-mono rounded-full border ${asset.isVerified ? "border-[#b6ff3a] text-[#b6ff3a]" : "border-yellow-900 text-yellow-600"}`}>
                      {asset.isVerified ? "VERIFICADO" : "AGUARDANDO TESTEMUNHAS"}
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-zinc-900 pt-4">
                    <div>
                      <div className="text-[9px] font-mono text-zinc-600 uppercase">Avaliação</div>
                      <div className="text-xl text-zinc-300 font-sans">◆ {formatAmount(asset.metadata.valuation)}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-[9px] font-mono text-zinc-600 uppercase">Testemunhas</div>
                       <div className="text-lg text-[#6cf0ff] font-mono">{asset.witnesses.length} / 3</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!asset.isVerified ? (
                      <button 
                        onClick={() => handleWitness(asset.metadata.id)}
                        className="flex-1 py-2 border border-[#6cf0ff]/40 text-[#6cf0ff] text-[10px] font-mono hover:bg-[#6cf0ff]/10 transition-smooth"
                      >
                        ASSINAR COMO TESTEMUNHA
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleFractionalize(asset.metadata.id)}
                        className="flex-1 py-2 bg-[#b6ff3a]/10 border border-[#b6ff3a]/40 text-[#b6ff3a] text-[10px] font-mono hover:bg-[#b6ff3a]/20 transition-smooth"
                      >
                        GERAR UTXOS (FRACIONAR)
                      </button>
                    )}
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
