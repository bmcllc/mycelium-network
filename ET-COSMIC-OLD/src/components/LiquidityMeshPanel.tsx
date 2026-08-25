import { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ACCESS_TIERS,
  LIQUIDITY_POOLS,
  computeReputationPrice,
  mintDat,
  estimateDatProtocolFee,
  type LiquidityPoolId,
} from "../protocol/liquidity";
import { getSovereigntyPolicy } from "../protocol/sovereignty/etrnetSovereignty";
import { computeProtocolRoyalty } from "../protocol/sovereignty/protocolRoyalty";
import { defaultAccountId, fetchBalance } from "../economy/sovEconomyClient";
import {
  mintDatApi,
  consumeDatApi,
  registerProviderApi,
  fetchBootstrapStatus,
} from "../mesh/liquidityMeshClient";

export default function LiquidityMeshPanel() {
  const policy = getSovereigntyPolicy();
  const [poolId, setPoolId] = useState<LiquidityPoolId>("POOL-COMPUTE");
  const [reputation, setReputation] = useState(72);
  const [units, setUnits] = useState(10);
  const [accountId] = useState(defaultAccountId);
  const [balanceSov, setBalanceSov] = useState<number | null>(null);
  const [liveDatId, setLiveDatId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<{ phaseActive: boolean; slotsRemaining: number; bonusMultiplier: number } | null>(null);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  const [apiBusy, setApiBusy] = useState(false);

  const refreshBalance = useCallback(async () => {
    try {
      const b = await fetchBalance(accountId);
      setBalanceSov(b.balanceSov);
    } catch {
      setBalanceSov(null);
    }
  }, [accountId]);

  useEffect(() => {
    refreshBalance();
    fetchBootstrapStatus()
      .then((s) => setBootstrap(s))
      .catch(() => setBootstrap(null));
  }, [refreshBalance]);

  const handleMintLive = async () => {
    setApiBusy(true);
    setApiMsg(null);
    try {
      const { dat } = await mintDatApi({
        resourceId: "mesh-node-live",
        poolId,
        reputationScore: reputation,
        tier: "builder",
      });
      setLiveDatId(dat.datId);
      setApiMsg(`DAT mintado: ${dat.datId}`);
    } catch (e) {
      setApiMsg(e instanceof Error ? e.message : "Erro mint");
    } finally {
      setApiBusy(false);
    }
  };

  const handleRegisterProvider = async () => {
    setApiBusy(true);
    setApiMsg(null);
    try {
      const { provider } = await registerProviderApi({ accountId, poolId });
      setProviderId(provider.providerId);
      setApiMsg(
        provider.bootstrapEligible
          ? `Provedor ${provider.providerId} — elegível bootstrap`
          : `Provedor ${provider.providerId}`,
      );
      const s = await fetchBootstrapStatus();
      setBootstrap(s);
    } catch (e) {
      setApiMsg(e instanceof Error ? e.message : "Erro registo");
    } finally {
      setApiBusy(false);
    }
  };

  const handleConsume = async () => {
    if (!liveDatId || !providerId) {
      setApiMsg("Mint DAT + registe provedor primeiro");
      return;
    }
    setApiBusy(true);
    setApiMsg(null);
    try {
      const r = await consumeDatApi({
        datId: liveDatId,
        consumerId: accountId,
        providerId,
        units,
      });
      setApiMsg(
        `Consumido: ${r.grossMicro} µSOV bruto · bonus bootstrap ${r.bootstrapBonusMicro} µSOV`,
      );
      await refreshBalance();
    } catch (e) {
      setApiMsg(e instanceof Error ? e.message : "Erro consume");
    } finally {
      setApiBusy(false);
    }
  };

  const pricing = useMemo(
    () => computeReputationPrice({ poolId, reputationScore: reputation, units, demandFactor: 1.1 }),
    [poolId, reputation, units],
  );

  const sampleDat = useMemo(
    () => mintDat({ resourceId: "mesh-node-demo", poolId, reputationScore: reputation, tier: "builder" }),
    [poolId, reputation],
  );

  const protocolFee = useMemo(() => estimateDatProtocolFee(sampleDat, units), [sampleDat, units]);
  const royaltySample = useMemo(() => computeProtocolRoyalty(100_000, "dex"), []);

  return (
    <section className="space-y-8 font-mono text-sm">
      <div>
        <p className="text-[10px] tracking-[0.3em] text-violet-400 uppercase">Protocol-First B2B</p>
        <h2 className="mt-2 text-2xl text-zinc-100 font-sans font-light">Liquidity Mesh</h2>
        <p className="mt-2 text-zinc-500 max-w-2xl leading-relaxed">
          Sem contratos, sem jurídico, sem vendas. Código + incentivos $SOV + prova criptográfica.
          Cada <strong className="text-zinc-400">DAT</strong> (Dynamic Access Token) é consumido pay-per-use.
        </p>
      </div>

      <div className="border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 p-4 rounded space-y-3">
        <h3 className="text-[10px] text-[#b6ff3a] tracking-widest">SETTLEMENT LIVE (ledger SOV)</h3>
        <p className="text-[11px] text-zinc-500">
          Conta: <span className="text-zinc-400">{accountId}</span>
          {balanceSov != null && (
            <> · saldo: <span className="text-[#b6ff3a]">{balanceSov.toFixed(4)} SOV</span></>
          )}
        </p>
        {bootstrap && (
          <p className="text-[10px] text-zinc-600">
            Bootstrap: {bootstrap.phaseActive ? "activo" : "encerrado"} · {bootstrap.slotsRemaining} slots · {bootstrap.bonusMultiplier}× bonus
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={apiBusy}
            onClick={handleMintLive}
            className="px-3 py-1.5 text-[10px] border border-violet-800 text-violet-300 hover:bg-violet-950/30 disabled:opacity-50"
          >
            Mint DAT (API)
          </button>
          <button
            type="button"
            disabled={apiBusy}
            onClick={handleRegisterProvider}
            className="px-3 py-1.5 text-[10px] border border-zinc-700 text-zinc-400 hover:bg-zinc-900 disabled:opacity-50"
          >
            Registar provedor
          </button>
          <button
            type="button"
            disabled={apiBusy}
            onClick={handleConsume}
            className="px-3 py-1.5 text-[10px] border border-[#b6ff3a]/50 text-[#b6ff3a] hover:bg-[#b6ff3a]/10 disabled:opacity-50"
          >
            Consumir DAT → débito SOV
          </button>
        </div>
        {liveDatId && <p className="text-[10px] text-zinc-600">DAT activo: {liveDatId}</p>}
        {apiMsg && <p className="text-[10px] text-zinc-400">{apiMsg}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-[#1a1f26] p-4 rounded space-y-3">
          <h3 className="text-[10px] text-zinc-500 tracking-widest">SIMULADOR AMM</h3>
          <label className="block text-xs text-zinc-400">
            Pool
            <select
              className="mt-1 w-full bg-[#0a0d10] border border-zinc-800 p-2 text-zinc-200"
              value={poolId}
              onChange={(e) => setPoolId(e.target.value as LiquidityPoolId)}
            >
              {LIQUIDITY_POOLS.map((p) => (
                <option key={p.id} value={p.id}>{p.id} — {p.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Reputação (0–100): {reputation}
            <input
              type="range"
              min={0}
              max={100}
              value={reputation}
              onChange={(e) => setReputation(Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Unidades
            <input
              type="number"
              min={1}
              value={units}
              onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full bg-[#0a0d10] border border-zinc-800 p-2"
            />
          </label>
          <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-900">
            <p>preço_base × rep × demanda = <span className="text-[#b6ff3a]">{pricing.unitPriceMicro.toLocaleString()} µSOV</span>/un</p>
            <p>Total: <span className="text-[#b6ff3a]">{pricing.totalMicro.toLocaleString()} µSOV</span></p>
            <p>Taxa pool (protocolo): <span className="text-violet-300">{protocolFee.toLocaleString()} µSOV</span></p>
          </div>
        </div>

        <div className="border border-violet-900/30 bg-violet-950/10 p-4 rounded space-y-2">
          <h3 className="text-[10px] text-violet-300 tracking-widest">DAT DEMO</h3>
          <pre className="text-[10px] text-zinc-500 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(sampleDat, null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] text-zinc-500 tracking-widest mb-3">LIQUIDITY POOLS</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="text-zinc-600 border-b border-zinc-900">
                <th className="py-2 pr-4">Pool</th>
                <th className="py-2 pr-4">Recursos</th>
                <th className="py-2 pr-4">Taxa</th>
                <th className="py-2">Base µSOV/un</th>
              </tr>
            </thead>
            <tbody>
              {LIQUIDITY_POOLS.map((p) => (
                <tr key={p.id} className="border-b border-zinc-900/50 text-zinc-400">
                  <td className="py-2 pr-4 text-violet-300">{p.id}</td>
                  <td className="py-2 pr-4">{p.resources}</td>
                  <td className="py-2 pr-4">{(p.protocolFeeBps / 100).toFixed(2)}%</td>
                  <td className="py-2">{p.basePriceMicroPerUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] text-zinc-500 tracking-widest mb-3">TIERS AUTO-EXECUTÁVEIS ($SOV/mês)</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ACCESS_TIERS.map((t) => (
            <div key={t.id} className="border border-[#1a1f26] p-3 rounded">
              <p className="text-zinc-200 text-xs">{t.label}</p>
              <p className="text-[#b6ff3a] text-lg mt-1">{t.monthlySov} SOV</p>
              <p className="text-[10px] text-zinc-600 mt-1">{t.benefit}</p>
              <p className="text-[10px] text-zinc-700">
                {t.rateLimitPerHour ? `${t.rateLimitPerHour} req/h` : "ilimitado"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#b6ff3a]/20 bg-[#b6ff3a]/5 p-4 rounded text-xs text-zinc-400">
        <p>
          Taxa global protocolo: {policy.protocolRoyaltyBps} bps · tesouraria{" "}
          {policy.treasuryNpub ? "configurada" : "— configure VITE_ETRNET_TREASURY_NPUB"}
        </p>
        <p className="mt-1 text-zinc-600">{royaltySample.disclosure}</p>
        <Link href="/governance/sovereignty" className="inline-block mt-3 text-[#b6ff3a] hover:underline text-[10px]">
          /governance/sovereignty →
        </Link>
      </div>

      <p className="text-[10px] text-zinc-700">
        Filosofia: contratos são bugs — código + cryptoeconomia. Docs: docs/PROTOCOL-FIRST-MESH.md
      </p>
    </section>
  );
}
