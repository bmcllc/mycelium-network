import { useState } from "react";
import { Link } from "wouter";
import { PageShell } from "./PageShell";

type Tab = "overview" | "products" | "revenue" | "protocol" | "pricing";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "products", label: "Produtos" },
  { id: "revenue", label: "Receita" },
  { id: "protocol", label: "Protocol-First" },
  { id: "pricing", label: "Preços" },
];

export default function BusinessModelPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <PageShell title="Modelo de Negócio" eyebrow="Sabor Quântico™ · Protocol-First">
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[10px] font-semibold rounded whitespace-nowrap transition-all ${
              tab === t.id
                ? "bg-[#b6ff3a] text-black"
                : "border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "revenue" && <RevenueTab />}
      {tab === "protocol" && <ProtocolTab />}
      {tab === "pricing" && <PricingTab />}
    </PageShell>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Filosofia</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Sem contratos de 50 páginas. Sem departamento jurídico a travar o deal.
          Só: <span className="text-[#b6ff3a]">código executável</span> +{" "}
          <span className="text-[#ffd700]">liquidez $SOV</span> +{" "}
          <span className="text-[#00f0ff]">prova criptográfica</span> de valor entregue.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Posicionamento: Sabor Quântico™</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          Não vendemos hardware quântico nem promessas impossíveis. Vendemos o que funciona{" "}
          <span className="text-zinc-200">hoje</span>, com estética e rigor de laboratório.
        </p>
        <div className="space-y-2">
          {[
            ["Simulação quântica", "Tensor networks LUSUS-Q / QRC em CPU/GPU clássico", "Reproduzíveis, auditáveis, on-prem"],
            ["Entropia quântica", "ETERNET hybrid + fallback CSPRNG documentado", "GhostID com trilha PMU — zero marketing falso"],
            ["Mesh descentralizada", "Browsers P2P + VPS simbiótico + Silent Mesh", "Entrada grátis, escala paga"],
            ["SLA enterprise", "Stake + heartbeats + slash automático", "Emforcement em código, não em tribunal"],
          ].map(([promise, reality, advantage]) => (
            <div key={promise} className="p-3 border border-zinc-900 rounded text-[10px]">
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">{promise}</span>
                <span className="text-[#b6ff3a]">{advantage}</span>
              </div>
              <p className="text-zinc-300">{reality}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border border-[#ffd700]/20 rounded-lg bg-[#ffd700]/5">
        <p className="text-xs text-[#ffd700] font-semibold mb-2">Regra de Ouro</p>
        <p className="text-sm text-zinc-300">
          O repositório <span className="text-zinc-100 font-semibold">nunca fecha</span>.
          Quem paga compra direito de uso fechado + SLA + isenção de copyleft nos artefatos contratados
          — não o monorepo.
        </p>
      </section>
    </div>
  );
}

function ProductsTab() {
  const products = [
    { name: "Core SDK", desc: "GhostID, PQC, QEL, Double Ratchet, UTXO", eur: "45K", sov: "50" },
    { name: "LUSUS Engine", desc: "Ising, Thomas-Fermi, Cavity-Planck, Chaos-Bell", eur: "120K", sov: "250" },
    { name: "AQRE Engine", desc: "LSC, QRC topology, Paleo, Collapse algebra", eur: "95K", sov: "250" },
    { name: "Sovereign Economy", desc: "Ledger $SOV, marketplace, hosting, mineração", eur: "85K", sov: "250" },
    { name: "VOID Stack", desc: "Bridge, PCI, Silent Mesh, CDN, DAT, SLA", eur: "165K", sov: "2,500" },
    { name: "IMC / Isossupra", desc: "Ising mesh, acoustic room, chaos mesh, EaaS", eur: "120K", sov: "2,500" },
    { name: "PQC-as-a-Service", desc: "ML-KEM-1024 + ML-DSA-87 como API REST", eur: "38K", sov: "250" },
    { name: "Lightning Gateway", desc: "NWC, watchtower, faturação $SOV", eur: "38K", sov: "250" },
    { name: "QRC Lab", desc: "Bruno Theory, tensor networks, WebGPU, PMU", eur: "178K", sov: "2,500" },
    { name: "PMU Governance", desc: "DAO, anti-Sybil, consent, Ethereum anchor", eur: "56K", sov: "250" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">10 Produtos Independentes</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Cada produto é um conjunto de SKUs vendável independentemente.
          Aceita $SOV (auto-debit) ou EUR/ano (B2B).
        </p>
      </section>

      <div className="space-y-2">
        {products.map((p, i) => (
          <div key={p.name} className="flex items-center justify-between p-3 border border-zinc-900 rounded">
            <div>
              <p className="text-sm text-zinc-200">{i + 1}. {p.name}</p>
              <p className="text-[10px] text-zinc-600">{p.desc}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-[10px] text-zinc-500">{p.eur} €/ano</p>
              <p className="text-xs text-[#ffd700] font-semibold">{p.sov} $SOV/mês</p>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Bundles Comerciais</h2>
        <div className="space-y-2">
          {[
            ["SOVEREIGN-CITIZEN", "Core + PMU Gov", "89,000", "~20%"],
            ["CRYPTO-LAB", "Core + PQC + PMU Gov", "198,000", "~15%"],
            ["FINANCE-NODE", "Core + Lightning", "245,000", "~10%"],
            ["RESEARCH-INSTITUTE", "AQRE + QRC + LUSUS", "320,000", "~20%"],
            ["FULL-ENTERPRISE", "Todos os 10", "890,000", "~30%"],
            ["WHITE-LABEL-OEM", "Full + white-label", "1,200,000", "—"],
          ].map(([name, includes, price, discount]) => (
            <div key={name} className="flex items-center justify-between p-3 border border-violet-500/20 rounded">
              <div>
                <p className="text-xs text-violet-300 font-semibold">{name}</p>
                <p className="text-[10px] text-zinc-600">{includes}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-zinc-200">{price} €/ano</p>
                <p className="text-[10px] text-[#b6ff3a]">{discount}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/products"
        className="inline-block px-4 py-2 text-[10px] font-semibold bg-[#b6ff3a] text-black rounded hover:bg-white transition-all no-underline"
      >
        VER PRODUTOS → ATIVAR
      </Link>
    </div>
  );
}

function RevenueTab() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">5 Camadas de Receita</h2>
        <div className="space-y-3">
          {[
            { layer: "1. Licença B2B", mech: "VITE_B2B_SKUS + contrato comercial", margin: "Alta", scale: "Por cliente/ano" },
            { layer: "2. Setup", mech: "22% ACV ano 1 (deploy, MDM, workshop)", margin: "Muito alta", scale: "One-shot" },
            { layer: "3. Taxa protocolo", mech: "VITE_PROTOCOL_ROYALTY_BPS + mínimo anual", margin: "Média-alta", scale: "Com volume" },
            { layer: "4. Serviços", mech: "Build white-label, auditoria PMU, archive", margin: "Alta", scale: "Por projeto" },
            { layer: "5. Premium", mech: "OEM, arquivo teoria, FULL-ENTERPRISE", margin: "Muito alta", scale: "Ticket alto" },
          ].map((r) => (
            <div key={r.layer} className="p-3 border border-zinc-900 rounded">
              <p className="text-xs text-[#b6ff3a] font-semibold mb-1">{r.layer}</p>
              <p className="text-[10px] text-zinc-300 mb-1">{r.mech}</p>
              <div className="flex gap-4 text-[10px] text-zinc-600">
                <span>Margem: {r.margin}</span>
                <span>Escala: {r.scale}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Pools de Liquidez</h2>
        <div className="space-y-2">
          {[
            ["POOL-QUANTUM ⭐", "Compressão tensor LUSUS-Q / QRC", "4.5%"],
            ["POOL-COMPUTE", "CPU/GPU/WASM workers", "2.5%"],
            ["POOL-AI", "Inferência soberana", "3.2%"],
            ["POOL-STORAGE", "Shards Anderson localization", "1.8%"],
            ["POOL-IDENTITY", "GhostID efêmero", "1.2%"],
          ].map(([name, desc, fee]) => (
            <div key={name} className="flex items-center justify-between p-3 border border-zinc-900 rounded">
              <div>
                <p className="text-xs text-[#ffd700] font-semibold">{name}</p>
                <p className="text-[10px] text-zinc-600">{desc}</p>
              </div>
              <span className="text-xs text-[#b6ff3a] font-mono">{fee}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border border-zinc-900 rounded-lg">
        <h3 className="text-sm font-sans text-zinc-100 mb-3">Projeção Ilustrativa (3 clientes)</h3>
        <div className="space-y-2 text-[10px]">
          {[
            ["A — Fintech", "€245K", "€125K", "€81K", "€451K"],
            ["B — OEM", "€1.2M", "€250K", "€319K", "€1.77M"],
            ["C — Sovereign", "€89K", "€36K", "€28K", "€153K"],
          ].map(([client, license, protocol, setup, total]) => (
            <div key={client} className="flex items-center justify-between p-2 border border-zinc-900 rounded">
              <span className="text-zinc-400 w-24">{client}</span>
              <span className="text-zinc-500">Licença: {license}</span>
              <span className="text-zinc-500">Protocolo: {protocol}</span>
              <span className="text-zinc-500">Setup: {setup}</span>
              <span className="text-[#b6ff3a] font-semibold">Total: {total}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          Recorrente ano 2 (A+B): €370K + €1.45M ≈ €1.82M/ano sem novo setup.
        </p>
      </section>
    </div>
  );
}

function ProtocolTab() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Protocol-First: Sem Burocracia</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          O modelo principal não usa contratos de 50 páginas. Usa{" "}
          <span className="text-[#ffd700]">código executável</span> +{" "}
          <span className="text-[#b6ff3a]">ledger $SOV</span> +{" "}
          <span className="text-[#00f0ff]">prova criptográfica</span>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Tiers $SOV</h2>
        <div className="space-y-2">
          {[
            { tier: "Citizen", price: "50 $SOV/mês", desc: "100 req/h, experimentar Sabor Quântico" },
            { tier: "Builder", price: "250 $SOV/mês", desc: "1000 req/h, fila prioritária" },
            { tier: "Enterprise", price: "2,500 $SOV/mês", desc: "Pools dedicados, SLA code-based" },
            { tier: "Sovereign", price: "25,000 $SOV/mês", desc: "Air-gap, AMM custom, white-label" },
          ].map((t) => (
            <div key={t.tier} className="p-3 border border-[#ffd700]/20 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#ffd700] font-semibold">{t.tier}</span>
                <span className="text-xs text-zinc-200 font-mono">{t.price}</span>
              </div>
              <p className="text-[10px] text-zinc-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">DAT — Dynamic Access Token</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Cada euro ou $SOV gasto compra capacidade verificável, não PDF de licença.
        </p>
        <div className="p-3 bg-zinc-950 rounded font-mono text-[10px] text-zinc-400 leading-relaxed">
          <p>Cliente → mint DAT → consome recurso → µSOV debitado</p>
          <p>→ provedor pago → taxa protocolo → tesouraria</p>
          <p className="text-[#b6ff3a]">→ reputação sobe → preço cai automaticamente</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Dual Token: $DMC-U + $DMC-G</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-3 border border-[#00f0ff]/20 rounded">
            <p className="text-xs text-[#00f0ff] font-semibold mb-1">$DMC-U (Utility)</p>
            <p className="text-[10px] text-zinc-400">Emissão elástica. Gerada por Proof-of-Data. Queimada após uso. 8 tipos de trabalho útil.</p>
          </div>
          <div className="p-3 border border-violet-500/20 rounded">
            <p className="text-xs text-violet-300 font-semibold mb-1">$DMC-G (Governance)</p>
            <p className="text-[10px] text-zinc-400">Emissão fixa (100M). Distribuída por Proof-of-Connectivity. Uptime, peers, traffic.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">SwiftChain</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Stablecoins locais (sBRL, sUSD, sEUR, sGBP) com liquidez P2P.
          Pagamento internacional em minutos, não dias.
        </p>
        <div className="p-3 bg-zinc-950 rounded font-mono text-[10px] text-zinc-400">
          <p>Usuário → PIX para LP → LP emite sBRL → compra produto</p>
          <p>→ taxa 0.1% → treasury $SOV</p>
        </div>
      </section>

      <Link
        href="/mesh/liquidity"
        className="inline-block px-4 py-2 text-[10px] font-semibold bg-[#ffd700] text-black rounded hover:bg-white transition-all no-underline"
      >
        VER LIQUIDITY MESH
      </Link>
    </div>
  );
}

function PricingTab() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Taxa de Protocolo</h2>
        <div className="space-y-2">
          {[
            { profile: "Comunidade", bps: "10", min: "0", note: "Default código" },
            { profile: "Growth comercial", bps: "15", min: "€12,000", note: "" },
            { profile: "Enterprise finance", bps: "25–50", min: "€36,000", note: "Contrato" },
            { profile: "Sovereign / banco", bps: "50 + auditoria", min: "€120,000+", note: "" },
          ].map((r) => (
            <div key={r.profile} className="flex items-center justify-between p-3 border border-zinc-900 rounded">
              <div>
                <p className="text-xs text-zinc-200">{r.profile}</p>
                {r.note && <p className="text-[10px] text-zinc-600">{r.note}</p>}
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-[#ffd700] font-mono">{r.bps} bps</p>
                <p className="text-[10px] text-zinc-500">Mín: {r.min}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          Fórmula: receita = max(mínimo, volume_€ × bps / 10,000)
        </p>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">Setup (Ano 1)</h2>
        <div className="space-y-2">
          {[
            ["Setup geral", "22% do ACV", "Deploy, integração LND/NWC, 1 workshop"],
            ["VOID-305", "€28,000", "Build CI white-label"],
            ["VOID-306", "€35,000", "APK MDM Android"],
            ["VOID-308", "€85,000", "Licença arquivo teoria"],
            ["VOID-319", "€12,000", "Enterprise success"],
          ].map(([name, price, desc]) => (
            <div key={name} className="flex items-center justify-between p-3 border border-zinc-900 rounded">
              <div>
                <p className="text-xs text-zinc-200">{name}</p>
                <p className="text-[10px] text-zinc-600">{desc}</p>
              </div>
              <span className="text-xs text-[#b6ff3a] font-mono shrink-0 ml-4">{price}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-sans text-zinc-100 mb-3">ICP — Cliente Ideal</h2>
        <div className="space-y-2">
          {[
            ["Fintech / exchange", "FINANCE-NODE + bps 25", "€400K–€1.2M"],
            ["Governança / DAO", "AMP-GOVERNANCE + FULL", "€500K–€1.5M"],
            ["Soberano / telco", "WHITE-LABEL-OEM", "€1.5M–€4M (3 anos)"],
            ["Laboratório", "RESEARCH-INSTITUTE", "€320K + arquivo"],
            ["PME messenger", "SOVEREIGN-CITIZEN", "€89K + setup €20K"],
          ].map(([icp, bundle, revenue]) => (
            <div key={icp} className="flex items-center justify-between p-3 border border-zinc-900 rounded">
              <div>
                <p className="text-xs text-zinc-200">{icp}</p>
                <p className="text-[10px] text-zinc-600">{bundle}</p>
              </div>
              <span className="text-xs text-[#ffd700] font-mono shrink-0 ml-4">{revenue}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border border-[#b6ff3a]/20 rounded-lg bg-[#b6ff3a]/5">
        <p className="text-xs text-[#b6ff3a] font-semibold mb-2">Simulador CLI</p>
        <div className="font-mono text-[10px] text-zinc-400 space-y-1">
          <p>npm run b2b:revenue -- SOVEREIGN-CITIZEN</p>
          <p>npm run b2b:revenue -- FULL-ENTERPRISE --volume-eur=50000000 --bps=25</p>
          <p>npm run b2b:list -- FINANCE-NODE</p>
        </div>
      </section>

      <Link
        href="/finance/payment"
        className="inline-block px-4 py-2 text-[10px] font-semibold bg-[#ffd700] text-black rounded hover:bg-white transition-all no-underline"
      >
        CONECTAR WALLET → ATIVAR
      </Link>
    </div>
  );
}
