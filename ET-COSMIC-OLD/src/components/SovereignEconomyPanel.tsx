/**
 * VOID-710 — Economia $SOV: hospedagem, binários, mineração ética (arsenal IMC).
 */

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import {
  defaultAccountId,
  fetchBalance,
  fetchHistory,
  publishBinaryArtifact,
  listBinaryArtifacts,
  buyBinary,
  registerHostSite,
  reportHostingTraffic,
  registerEthicalMiner,
  runEthicalWork,
  fetchMiningRewards,
} from "../economy/sovEconomyClient";
import { estimateCpuPct, lscAllowsWork, BROWSER_LIMITS } from "../silentMesh/lscResourceGuard";

type Tab = "wallet" | "hosting" | "binaries" | "mining";

export default function SovereignEconomyPanel() {
  const [tab, setTab] = useState<Tab>("wallet");
  const [accountId] = useState(defaultAccountId);
  const [balanceSov, setBalanceSov] = useState(0);
  const [history, setHistory] = useState<Array<{ type: string; amountMicro: number; channel?: string }>>([]);
  const [log, setLog] = useState<string[]>([]);
  const [binName, setBinName] = useState("");
  const [binPrice, setBinPrice] = useState("1");
  const [binPlatform, setBinPlatform] = useState("linux-amd64");
  const [artifacts, setArtifacts] = useState<Array<{ artifactId: string; name: string; priceSov: number }>>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Record<string, number>>({});

  const push = (m: string) => setLog((l) => [m, ...l].slice(0, 14));

  const refresh = useCallback(async () => {
    const b = await fetchBalance(accountId);
    setBalanceSov(b.balanceSov);
    const h = await fetchHistory(accountId);
    setHistory(h.entries ?? []);
    const arts = await listBinaryArtifacts();
    setArtifacts(arts.artifacts ?? []);
    const rw = await fetchMiningRewards();
    setRewards(rw.rewardsMicro ?? {});
  }, [accountId]);

  useEffect(() => {
    void refresh().catch((e) => push(String(e)));
  }, [refresh]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "wallet", label: "Carteira SOV" },
    { id: "hosting", label: "Hospedagem" },
    { id: "binaries", label: "Binários" },
    { id: "mining", label: "Mineração ética" },
  ];

  return (
    <section className="space-y-8">
      <SectionHeader
        tag="VOID-710 · 703 · 704 · 705"
        title="Economia Soberana $SOV"
        subtitle="Moeda pela malha: hospedar sites, vender software, minerar com arsenal IMC — sem danificar hardware."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 font-mono text-[10px] rounded border ${
              tab === t.id
                ? "border-[#b6ff3a] text-[#b6ff3a] bg-[#b6ff3a]/10"
                : "border-zinc-800 text-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 border border-[#1a1f26] rounded-lg font-mono text-[10px] text-zinc-500">
        Conta: <span className="text-zinc-300">{accountId}</span> · Saldo:{" "}
        <span className="text-[#b6ff3a] text-sm">{balanceSov.toFixed(6)} SOV</span> · Taxa protocolo 10 bps
      </div>

      {tab === "wallet" && (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {history.map((e, i) => (
            <div key={i} className="flex justify-between text-[10px] text-zinc-600">
              <span>
                {e.type} · {e.channel ?? "—"}
              </span>
              <span className={e.type === "credit" ? "text-[#b6ff3a]" : "text-red-400"}>
                {(e.amountMicro / 1_000_000).toFixed(6)} SOV
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="text-zinc-700">Sem movimentos — comece por hospedar, vender ou minerar.</p>}
        </div>
      )}

      {tab === "hosting" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            VOID-704: donos de sites ganham SOV por visitantes e tráfego servido na malha (VOID-700). Sem custo AWS.
          </p>
          <button
            type="button"
            className="px-3 py-2 text-xs font-mono border border-[#6cf0ff]/40 text-[#6cf0ff] rounded"
            onClick={async () => {
              const s = await registerHostSite(accountId, location.origin);
              setSiteId(s.siteId);
              push(`Site ${s.siteId} registado`);
            }}
          >
            Registar este site como hospedeiro
          </button>
          {siteId && (
            <button
              type="button"
              className="ml-2 px-3 py-2 text-xs font-mono border border-zinc-700 text-zinc-400 rounded"
              onClick={async () => {
                const r = await reportHostingTraffic(siteId, { visitors: 100, bytesServed: 50_000_000 });
                push(`Tráfego creditado: ${(r.creditedMicro / 1_000_000).toFixed(6)} SOV`);
                await refresh();
              }}
            >
              Simular 100 visitantes
            </button>
          )}
        </div>
      )}

      {tab === "binaries" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">VOID-703: venda qualquer binário/software — hash SHA-256, preço em SOV.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              className="bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
              placeholder="Nome"
              value={binName}
              onChange={(e) => setBinName(e.target.value)}
            />
            <input
              className="bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
              placeholder="Preço SOV"
              value={binPrice}
              onChange={(e) => setBinPrice(e.target.value)}
            />
            <input
              className="bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300"
              value={binPlatform}
              onChange={(e) => setBinPlatform(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="px-3 py-2 text-xs font-mono text-[#b6ff3a] border border-[#b6ff3a]/30 rounded"
            onClick={async () => {
              const a = await publishBinaryArtifact({
                name: binName || "void-node",
                priceSov: parseFloat(binPrice) || 0,
                platform: binPlatform,
                sellerId: accountId,
              });
              push(`Publicado ${a.artifactId} @ ${a.priceSov} SOV`);
              await refresh();
            }}
          >
            Publicar binário
          </button>
          <div className="space-y-2 mt-4">
            {artifacts.map((a) => (
              <div key={a.artifactId} className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-400">
                  {a.name} · {a.priceSov} SOV
                </span>
                <button
                  type="button"
                  className="text-[#6cf0ff]"
                  onClick={async () => {
                    const r = await buyBinary(a.artifactId, accountId);
                    if (r.error) push(r.error);
                    else push(`Compra OK → ${r.downloadUrl ?? "download"}`);
                    await refresh();
                  }}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "mining" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            VOID-705: arsenal IMC (Ising, Thomas-Fermi, CDN) — nunca hash vazio. LSC protege CPU/RAM.
          </p>
          <pre className="text-[9px] text-zinc-600">
            {Object.entries(rewards)
              .map(([k, v]) => `${k}: ${(v / 1_000_000).toFixed(6)} SOV`)
              .join("\n")}
          </pre>
          <button
            type="button"
            className="px-3 py-2 text-xs font-mono border border-[#b6ff3a]/40 text-[#b6ff3a] rounded"
            onClick={async () => {
              const w = `miner-${accountId.slice(-8)}`;
              await registerEthicalMiner(w, accountId);
              setWorkerId(w);
              push(`Worker ${w} registado`);
            }}
          >
            Registar worker ético
          </button>
          {workerId && (
            <button
              type="button"
              className="ml-2 px-3 py-2 text-xs font-mono border border-zinc-700 text-zinc-300 rounded"
              onClick={async () => {
                const guard = await lscAllowsWork(BROWSER_LIMITS);
                if (!guard.ok) {
                  push(`LSC bloqueou: ${guard.reason}`);
                  return;
                }
                const r = await runEthicalWork(workerId, {
                  accountId,
                  type: "ising",
                  cpuPct: estimateCpuPct(),
                });
                if (r.action === "throttle") push(`Throttle: ${r.reason}`);
                else push(`Job Ising +${((r.creditedMicro ?? 0) / 1_000_000).toFixed(6)} SOV`);
                await refresh();
              }}
            >
              Executar Ising (útil)
            </button>
          )}
        </div>
      )}

      {log.length > 0 && (
        <pre className="font-mono text-[10px] text-zinc-600 p-3 bg-black/30 rounded max-h-28 overflow-y-auto">
          {log.join("\n")}
        </pre>
      )}
    </section>
  );
}
