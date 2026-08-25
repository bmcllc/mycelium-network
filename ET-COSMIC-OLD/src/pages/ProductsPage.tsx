import { Link } from "wouter";
import { PageShell } from "./PageShell";

const PRODUCTS = [
  {
    id: "core-sdk",
    name: "Core SDK",
    desc: "GhostID, PQC (ML-KEM/ML-DSA), QEL, Double Ratchet, UTXO",
    eur: "45,000",
    sov: "50",
    color: "#b6ff3a",
  },
  {
    id: "lusus-engine",
    name: "LUSUS Engine",
    desc: "Ising machine, Thomas-Fermi, Cavity-Planck, Chaos-Bell",
    eur: "120,000",
    sov: "250",
    color: "#00f0ff",
  },
  {
    id: "aqre-engine",
    name: "AQRE Engine",
    desc: "LSC, QRC topology, Paleo, Collapse algebra, Anacroclastia",
    eur: "95,000",
    sov: "250",
    color: "#00f0ff",
  },
  {
    id: "sovereign-economy",
    name: "Sovereign Economy",
    desc: "Ledger $SOV, marketplace, hosting revenue, mineração ética",
    eur: "85,000",
    sov: "250",
    color: "#ffd700",
  },
  {
    id: "void-stack",
    name: "VOID Sovereign Stack",
    desc: "Bridge, PCI, Silent Mesh, CDN, DAT settlement, SLA",
    eur: "165,000",
    sov: "2,500",
    color: "#b6ff3a",
  },
  {
    id: "imc-isossupra",
    name: "IMC / Isossupra",
    desc: "Ising mesh, acoustic room, chaos mesh, TF distributed, EaaS",
    eur: "120,000",
    sov: "2,500",
    color: "#00f0ff",
  },
  {
    id: "pqc-service",
    name: "PQC-as-a-Service",
    desc: "ML-KEM-1024 + ML-DSA-87 como API REST",
    eur: "38,000",
    sov: "250",
    color: "#b6ff3a",
  },
  {
    id: "lightning-payment",
    name: "Lightning Gateway",
    desc: "NWC, watchtower, faturação $SOV, integração LND",
    eur: "38,000",
    sov: "250",
    color: "#ffd700",
  },
  {
    id: "qrc-lab",
    name: "QRC Lab",
    desc: "Bruno Theory, tensor networks, WebGPU, PMU vHGPU",
    eur: "178,000",
    sov: "2,500",
    color: "#00f0ff",
  },
  {
    id: "pmu-governance",
    name: "PMU Governance",
    desc: "DAO, anti-Sybil, consent, Ethereum anchor, ZK voting",
    eur: "56,000",
    sov: "250",
    color: "#b6ff3a",
  },
];

export default function ProductsPage() {
  return (
    <PageShell title="Produtos" eyebrow="Protocol-First · 10 SKUs independentes">
      <p className="text-sm text-zinc-500 leading-relaxed max-w-xl mb-8">
        Cada produto é um conjunto de SKUs vendável independentemente.
        Ative via $SOV (auto-debit, sem contrato) ou EUR/ano (B2B).
      </p>

      {/* Tier info */}
      <div className="mb-10 p-4 border border-[#ffd700]/20 rounded-lg bg-[#ffd700]/5">
        <p className="text-xs text-[#ffd700] font-semibold mb-2">Tiers Protocol-First</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
          <div><span className="text-zinc-400">Citizen</span><br />50 $SOV/mês</div>
          <div><span className="text-zinc-400">Builder</span><br />250 $SOV/mês</div>
          <div><span className="text-zinc-400">Enterprise</span><br />2,500 $SOV/mês</div>
          <div><span className="text-zinc-400">Sovereign</span><br />25,000 $SOV/mês</div>
        </div>
      </div>

      {/* Product grid */}
      <div className="space-y-3">
        {PRODUCTS.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4 border border-zinc-900 rounded-lg hover:border-zinc-800 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200">{p.name}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{p.desc}</p>
            </div>
            <div className="flex items-center gap-4 ml-4 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">{p.eur} €/ano</p>
                <p className="text-xs font-semibold" style={{ color: p.color }}>
                  {p.sov} $SOV/mês
                </p>
              </div>
              <Link
                href={`/finance/payment?product=${p.id}`}
                className="px-3 py-1.5 text-[10px] font-semibold border rounded transition-all no-underline"
                style={{
                  borderColor: `${p.color}40`,
                  color: p.color,
                }}
              >
                ATIVAR
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Bundles */}
      <div className="mt-12 p-4 border border-violet-500/20 rounded-lg">
        <p className="text-xs text-violet-300 font-semibold mb-2">Bundles</p>
        <p className="text-[10px] text-zinc-600 mb-3">
          Combinações com desconto de 10-30%. Full Enterprise: todos os 10 produtos por 890,000 €/ano.
        </p>
        <Link
          href="/finance/payment?product=full-enterprise"
          className="inline-block px-4 py-2 text-[10px] font-semibold border border-violet-500/40 text-violet-300 rounded hover:bg-violet-500/10 transition-all no-underline"
        >
          FULL ENTERPRISE — 890,000 €/ano
        </Link>
      </div>

      {/* How to pay */}
      <div className="mt-12 p-4 border border-zinc-900 rounded-lg">
        <p className="text-xs text-zinc-400 font-semibold mb-3">Como pagar</p>
        <div className="space-y-2 text-[10px] text-zinc-600">
          <p>
            <span className="text-[#ffd700]">1.</span> Conectar wallet Lightning via NWC
            <span className="text-zinc-700 ml-1">(Alby, Blixt, Umbrel, LNbits)</span>
          </p>
          <p>
            <span className="text-[#ffd700]">2.</span> Ativar produto — $SOV debitado automaticamente do ledger
          </p>
          <p>
            <span className="text-[#ffd700]">3.</span> Saldo insuficiente → downgrade automático (sem multa, sem contrato)
          </p>
        </div>
        <Link
          href="/finance/payment"
          className="inline-block mt-4 px-4 py-2 text-[10px] font-semibold bg-[#ffd700] text-black rounded hover:bg-white transition-all no-underline"
        >
          CONECTAR WALLET
        </Link>
      </div>
    </PageShell>
  );
}
