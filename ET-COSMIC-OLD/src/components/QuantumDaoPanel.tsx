/**
 * ETΞRNET — Painel da QuantumDAO (Governança Quântica Pura)
 *
 * Interface completa para governança descentralizada:
 * - Propostas (criar, votar, finalizar, executar)
 * - Votação quadrática (previne plutocracia)
 * - Delegação parcial de votos
 * - Tesouro comunitário com multi-sig
 * - Métricas de governança em tempo real
 *
 * Referência: "O Livro do ETRNET" — Path 3: Governança Quântica
 */

import { useCallback, useMemo, useState } from "react";
import {
  quantumDAO,
  type Proposal,
  type ProposalCategory,
  type ProposalStatus,
} from "../crypto/quantumDAO";
import {
  communityTreasury,
  type AllocationCategory,
} from "../crypto/communityTreasury";
import { voidOrchestrator } from "../core/VoidOrchestrator";
import { governanceKeysFromMaterial, loadOmegaMaterial } from "../lib/moduleRealityBackend";

function voterPubkey(): string {
  const pk = voidOrchestrator.getIdentity()?.publicKey;
  if (!pk) return "ghost_anon";
  if (typeof pk === "string") return pk;
  return Array.from(pk)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ProposalCategory, string> = {
  treasury: "TESOURO",
  parameter: "PARÂMETRO",
  upgrade: "UPGRADE",
  emergency: "EMERGÊNCIA",
  community: "COMUNIDADE",
};

const CATEGORY_COLORS: Record<ProposalCategory, string> = {
  treasury: "#6cf0ff",
  parameter: "#b6ff3a",
  upgrade: "#ff3ad9",
  emergency: "#ff4444",
  community: "#ffd700",
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "PENDENTE",
  active: "ATIVA",
  passed: "APROVADA",
  rejected: "REJEITADA",
  executed: "EXECUTADA",
  expired: "EXPIRADA",
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  pending: "#888",
  active: "#6cf0ff",
  passed: "#b6ff3a",
  rejected: "#ff3ad9",
  executed: "#ffd700",
  expired: "#555",
};

const TREASURY_CATS: AllocationCategory[] = [
  "development",
  "community",
  "security",
  "research",
  "reserve",
  "grants",
];

const TREASURY_LABELS: Record<AllocationCategory, string> = {
  development: "DEV",
  community: "COMUNIDADE",
  security: "SEGURANÇA",
  research: "PESQUISA",
  reserve: "RESERVA",
  grants: "GRANTS",
};

const TREASURY_COLORS: Record<AllocationCategory, string> = {
  development: "#6cf0ff",
  community: "#b6ff3a",
  security: "#ff3ad9",
  research: "#ffd700",
  reserve: "#888",
  grants: "#ff8844",
};

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function timeLeft(ms: number): string {
  const s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Estado inicial ancorado em entropia Ω (governança local real) ───────────

async function seedGovernanceFromOmega() {
  if (quantumDAO.getAllProposals().length > 0) return;
  const { material } = await loadOmegaMaterial(128);
  const [pk1, pk2, pk3] = governanceKeysFromMaterial(material);

  quantumDAO.registerStake(pk1, 5000);
  quantumDAO.registerStake(pk2, 3000);
  quantumDAO.registerStake(pk3, 2000);

  communityTreasury.deposit(100000n, "mint", "Emissão inicial do tesouro");
  communityTreasury.deposit(50000n, pk1, "Depósito do fundador");

  try {
    quantumDAO.createProposal(
      "Aumentar fundo de pesquisa",
      "Alocar 15.000 SOV para pesquisa em criptografia pós-quântica",
      "treasury",
      pk1,
      { target: "treasury", value: 15000n, calldata: "allocate(research, 15000)" }
    );
  } catch { /* já existe */ }

  try {
    quantumDAO.createProposal(
      "Reduzir quórum para community",
      "Proposta para reduzir quórum de 10% para 5% em propostas community",
      "parameter",
      pk2
    );
  } catch { /* já existe */ }

  try {
    quantumDAO.createProposal(
      "Protocolo de emergência QKD",
      "Implementar BB84 como camada de segurança obrigatória para transações > 1000 SOV",
      "emergency",
      pk3,
      { target: "security", value: 0n, calldata: "enableQKD(bb84, threshold=1000)" }
    );
  } catch { /* já existe */ }

  const proposals = quantumDAO.getAllProposals();
  if (proposals.length >= 1) {
    try { quantumDAO.castVote(proposals[0].id, pk2, "for", 900); } catch { /* já votou */ }
    try { quantumDAO.castVote(proposals[0].id, pk3, "for", 400); } catch { /* já votou */ }
  }
  if (proposals.length >= 2) {
    try { quantumDAO.castVote(proposals[1].id, pk1, "against", 2500); } catch { /* já votou */ }
    try { quantumDAO.castVote(proposals[1].id, pk3, "for", 1600); } catch { /* já votou */ }
  }
  if (proposals.length >= 3) {
    try { quantumDAO.castVote(proposals[2].id, pk1, "for", 4900); } catch { /* já votou */ }
    try { quantumDAO.castVote(proposals[2].id, pk2, "for", 900); } catch { /* já votou */ }
  }

  // Delegação
  try { quantumDAO.delegateVote(pk3, pk1, 0.5); } catch { /* já delegou */ }
}

void seedGovernanceFromOmega();

// ─── Componentes ─────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onVote,
}: {
  proposal: Proposal;
  onVote: (id: string, side: "for" | "against") => void;
}) {
  const isActive = proposal.status === "active";
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;

  return (
    <div className="p-4 bg-black border border-[#14181c] hover:border-[#6cf0ff]/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 border"
              style={{
                color: CATEGORY_COLORS[proposal.category],
                borderColor: CATEGORY_COLORS[proposal.category] + "40",
              }}
            >
              {CATEGORY_LABELS[proposal.category]}
            </span>
            <span
              className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 border"
              style={{
                color: STATUS_COLORS[proposal.status],
                borderColor: STATUS_COLORS[proposal.status] + "40",
              }}
            >
              {STATUS_LABELS[proposal.status]}
            </span>
          </div>
          <h3 className="font-mono text-sm text-zinc-100 truncate">
            {proposal.title}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[9px] text-zinc-500">
            {isActive ? timeLeft(proposal.votingEndsAt) + " restante" : timeAgo(proposal.createdAt)}
          </div>
          <div className="font-mono text-[9px] text-zinc-600">
            {proposal.voters.size} votantes
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] text-zinc-500 mb-3 line-clamp-2">
        {proposal.description}
      </p>

      {/* Barra de votos */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-[#b6ff3a]">
            FAVOR ({proposal.votesFor.toFixed(1)})
          </span>
          <span className="font-mono text-[9px] text-[#ff3ad9]">
            CONTRA ({proposal.votesAgainst.toFixed(1)})
          </span>
        </div>
        <div className="w-full h-2 bg-[#14181c] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#b6ff3a] transition-all duration-500"
            style={{ width: `${forPct}%` }}
          />
          <div
            className="h-full bg-[#ff3ad9] transition-all duration-500"
            style={{ width: `${100 - forPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[8px] text-zinc-600">
            √ peso: {proposal.votesFor.toFixed(2)}
          </span>
          <span className="font-mono text-[8px] text-zinc-600">
            quórum: {(proposal.quorumRequired * 100).toFixed(0)}%
          </span>
          <span className="font-mono text-[8px] text-zinc-600">
            √ peso: {proposal.votesAgainst.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payload de execução */}
      {proposal.executionPayload && (
        <div className="mb-3 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[9px]">
          <span className="text-zinc-500">EXEC: </span>
          <span className="text-[#6cf0ff]">{proposal.executionPayload.target}</span>
          <span className="text-zinc-600"> → </span>
          <span className="text-[#b6ff3a]">{proposal.executionPayload.calldata}</span>
        </div>
      )}

      {/* Botões de voto */}
      {isActive && (
        <div className="flex gap-2">
          <button
            onClick={() => onVote(proposal.id, "for")}
            className="flex-1 font-mono text-[10px] tracking-wider py-1.5 border border-[#b6ff3a]/40 text-[#b6ff3a] hover:bg-[#b6ff3a] hover:text-black transition-colors"
          >
            VOTAR ▲ FAVOR
          </button>
          <button
            onClick={() => onVote(proposal.id, "against")}
            className="flex-1 font-mono text-[10px] tracking-wider py-1.5 border border-[#ff3ad9]/40 text-[#ff3ad9] hover:bg-[#ff3ad9] hover:text-black transition-colors"
          >
            VOTAR ▼ CONTRA
          </button>
        </div>
      )}
    </div>
  );
}

function DelegationPanel() {
  const delegations = quantumDAO.getDelegations();

  return (
    <div>
      <span className="tag mb-3 block">DELEGAÇÕES ATIVAS</span>
      {delegations.length === 0 ? (
        <div className="p-3 bg-black border border-[#14181c] font-mono text-[10px] text-zinc-600 text-center">
          Nenhuma delegação ativa
        </div>
      ) : (
        <div className="space-y-2">
          {delegations.map((d) => (
            <div
              key={d.delegator}
              className="flex items-center justify-between p-2 bg-black border border-[#14181c] font-mono text-[10px]"
            >
              <span className="text-[#6cf0ff]">{d.delegator.slice(0, 8)}…</span>
              <span className="text-zinc-600">→</span>
              <span className="text-[#b6ff3a]">{d.delegate.slice(0, 8)}…</span>
              <span className="text-[#ff3ad9]">
                {(d.weight * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
        Delegação parcial: transferência de fração do poder de voto
      </div>
    </div>
  );
}

function TreasuryPanel() {
  const stats = communityTreasury.getStats();
  const transactions = communityTreasury.getTransactions(5);
  const pending = communityTreasury.getPendingAllocations();
  const multisig = communityTreasury.getMultiSigConfig();

  const maxCat = useMemo(() => {
    let max = 0n;
    for (const v of Object.values(stats.allocationsByCategory)) {
      if (v > max) max = v;
    }
    return max;
  }, [stats]);

  return (
    <div>
      <span className="tag mb-3 block">TESOURO COMUNITÁRIO</span>

      {/* Saldo principal */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">TOTAL</div>
          <div className="font-mono text-lg text-[#b6ff3a]">
            {stats.totalBalance.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">ALOCADO</div>
          <div className="font-mono text-lg text-[#6cf0ff]">
            {stats.allocatedBalance.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">DISPONÍVEL</div>
          <div className="font-mono text-lg text-[#ff3ad9]">
            {stats.availableBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Multi-sig */}
      <div className="mb-4 p-3 bg-black border border-[#14181c]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-zinc-500">MULTI-SIG</span>
          <span className="font-mono text-[10px] text-[#ffd700]">
            {multisig.requiredSignatures} de {multisig.signers.size} necessário
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: multisig.maxSigners }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < multisig.signers.size
                  ? "bg-[#b6ff3a]"
                  : "bg-[#14181c]"
              }`}
            />
          ))}
        </div>
        <div className="mt-1 font-mono text-[8px] text-zinc-600">
          {multisig.signers.size}/{multisig.maxSigners} signatários registrados
        </div>
      </div>

      {/* Alocações por categoria */}
      <div className="mb-4 space-y-2">
        <span className="font-mono text-[9px] text-zinc-500">ALOCAÇÕES</span>
        {TREASURY_CATS.map((cat) => {
          const amount = stats.allocationsByCategory[cat];
          const pct = maxCat > 0n ? Number((amount * 100n) / maxCat) : 0;
          return (
            <div key={cat} className="flex items-center gap-2">
              <span
                className="font-mono text-[9px] w-20 shrink-0"
                style={{ color: TREASURY_COLORS[cat] }}
              >
                {TREASURY_LABELS[cat]}
              </span>
              <div className="flex-1 h-1.5 bg-[#14181c] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: TREASURY_COLORS[cat],
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-zinc-500 w-16 text-right">
                {amount.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alocações pendentes */}
      {pending.length > 0 && (
        <div className="mb-4">
          <span className="font-mono text-[9px] text-zinc-500 mb-2 block">
            PENDENTES ({pending.length})
          </span>
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="p-2 bg-black border border-[#ffd700]/30 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: TREASURY_COLORS[p.category] }}>
                    {TREASURY_LABELS[p.category]}
                  </span>
                  <span className="text-[#ffd700]">
                    {p.amount.toLocaleString()} SOV
                  </span>
                </div>
                <div className="text-zinc-600 text-[9px] mt-1">
                  {p.signatures.size}/{p.requiredSignatures} assinaturas
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas transações */}
      <div>
        <span className="font-mono text-[9px] text-zinc-500 mb-2 block">
          ÚLTIMAS TRANSAÇÕES
        </span>
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2 bg-black border border-[#14181c] font-mono text-[9px]"
            >
              <span
                className={
                  tx.type === "deposit"
                    ? "text-[#b6ff3a]"
                    : tx.type === "withdrawal"
                      ? "text-[#ff3ad9]"
                      : "text-[#6cf0ff]"
                }
              >
                {tx.type === "deposit" ? "+" : "-"}
                {tx.amount.toLocaleString()}
              </span>
              <span className="text-zinc-600 truncate mx-2 flex-1 text-right">
                {tx.description}
              </span>
              <span className="text-zinc-600 shrink-0 ml-2">
                {timeAgo(tx.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600">
        Transparência total: todas as operações são auditáveis on-chain
      </div>
    </div>
  );
}

function GovernanceMetrics() {
  const config = quantumDAO.getConfig();
  const totalStaked = quantumDAO.getTotalStaked();
  const proposals = quantumDAO.getAllProposals();
  const delegations = quantumDAO.getDelegations();

  const byStatus = useMemo(() => {
    const map: Record<ProposalStatus, number> = {
      pending: 0,
      active: 0,
      passed: 0,
      rejected: 0,
      executed: 0,
      expired: 0,
    };
    for (const p of proposals) {
      map[p.status]++;
    }
    return map;
  }, [proposals]);

  return (
    <div>
      <span className="tag mb-3 block">MÉTRICAS DE GOVERNANÇA</span>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">
            SOV STAKED
          </div>
          <div className="font-mono text-lg text-[#b6ff3a]">
            {totalStaked.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">
            PROPOSTAS
          </div>
          <div className="font-mono text-lg text-[#6cf0ff]">
            {proposals.length}
          </div>
        </div>
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">
            DELEGAÇÕES
          </div>
          <div className="font-mono text-lg text-[#ff3ad9]">
            {delegations.length}
          </div>
        </div>
        <div className="p-3 bg-black border border-[#14181c]">
          <div className="font-mono text-[9px] text-zinc-500 mb-1">
            QUÓRUM
          </div>
          <div className="font-mono text-lg text-[#ffd700]">
            {(config.quorumThreshold * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Status das propostas */}
      <div className="space-y-1 mb-4">
        {(Object.entries(byStatus) as [ProposalStatus, number][]).map(
          ([status, count]) =>
            count > 0 && (
              <div
                key={status}
                className="flex items-center justify-between p-1.5 bg-black border border-[#14181c] font-mono text-[9px]"
              >
                <span style={{ color: STATUS_COLORS[status] }}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-zinc-400">{count}</span>
              </div>
            )
        )}
      </div>

      {/* Fórmula */}
      <div className="p-2 bg-black border border-[#14181c] font-mono text-[9px] text-zinc-600 leading-relaxed">
        <strong className="text-zinc-400">Votação Quadrática:</strong>
        <br />
        peso = √(quantidade) — previne plutocracia
        <br />
        <strong className="text-zinc-400">Delegação Parcial:</strong>
        <br />
        voto_ajustado = voto × (1 + Σdelegações)
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function QuantumDaoPanel() {
  const [proposals, setProposals] = useState(() =>
    quantumDAO.getAllProposals()
  );
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | "all">(
    "all"
  );
  const [filterCategory, setFilterCategory] =
    useState<ProposalCategory | "all">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<ProposalCategory>("community");
  const [voteAmount, setVoteAmount] = useState(100);
  const [tab, setTab] = useState<"proposals" | "treasury" | "governance">(
    "proposals"
  );

  const refresh = useCallback(() => {
    setProposals(quantumDAO.getAllProposals());
  }, []);

  const filtered = useMemo(() => {
    let list = proposals;
    if (filterStatus !== "all") {
      list = list.filter((p) => p.status === filterStatus);
    }
    if (filterCategory !== "all") {
      list = list.filter((p) => p.category === filterCategory);
    }
    return list;
  }, [proposals, filterStatus, filterCategory]);

  const handleVote = useCallback(
    (id: string, side: "for" | "against") => {
      try {
        quantumDAO.castVote(id, voterPubkey(), side, voteAmount);
        refresh();
      } catch (e) {
        console.warn("[DAO] Erro ao votar:", e);
      }
    },
    [voteAmount, refresh]
  );

  const handleCreate = useCallback(() => {
    if (!newTitle.trim()) return;
    try {
      quantumDAO.createProposal(
        newTitle,
        newDesc,
        newCategory,
        voterPubkey()
      );
      setNewTitle("");
      setNewDesc("");
      setShowCreateForm(false);
      refresh();
    } catch (e) {
      console.warn("[DAO] Erro ao criar proposta:", e);
    }
  }, [newTitle, newDesc, newCategory, refresh]);

  return (
    <section id="dao" className="relative border-b border-[#14181c] bg-black">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="mb-14 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
              § 3.0
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
              GOVERNANÇA QUÂNTICA
            </span>
          </div>
          <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
            Quantum<span className="text-[#b6ff3a]">DAO</span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
            Governança descentralizada pura — sem banco, sem NFTs fixos.
            Votação quadrática, delegação parcial e tesouro comunitário
            com multi-assinatura.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8">
          {(
            [
              ["proposals", "PROPOSTAS"],
              ["treasury", "TESOURO"],
              ["governance", "GOVERNANÇA"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-mono text-[10px] tracking-[0.2em] px-4 py-2 border transition-colors ${
                tab === key
                  ? "border-[#b6ff3a]/60 text-[#b6ff3a] bg-[#b6ff3a]/10"
                  : "border-[#14181c] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="grid lg:grid-cols-12 gap-px bg-[#14181c] border border-[#14181c]">
          {/* Coluna principal */}
          <div className="lg:col-span-8 bg-[#0a0d10] p-6 md:p-8">
            {tab === "proposals" && (
              <>
                {/* Controles */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="font-mono text-[10px] tracking-wider px-3 py-1.5 bg-[#b6ff3a] text-black hover:bg-[#b6ff3a]/80 transition-colors"
                  >
                    + NOVA PROPOSTA
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="font-mono text-[9px] text-zinc-500">
                      VOTO (√):
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={10000}
                      step={10}
                      value={voteAmount}
                      onChange={(e) => setVoteAmount(Number(e.target.value))}
                      className="w-24 h-1 bg-[#14181c] rounded appearance-none cursor-pointer accent-[#b6ff3a]"
                    />
                    <span className="font-mono text-[10px] text-[#b6ff3a] w-16 text-right">
                      {voteAmount} SOV
                    </span>
                    <span className="font-mono text-[9px] text-zinc-600">
                      (peso: {Math.sqrt(voteAmount).toFixed(1)})
                    </span>
                  </div>
                </div>

                {/* Formulário de criação */}
                {showCreateForm && (
                  <div className="mb-6 p-4 bg-black border border-[#b6ff3a]/30">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="font-mono text-[9px] text-zinc-500 mb-1 block">
                          TÍTULO
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Título da proposta..."
                          className="w-full bg-[#0a0d10] border border-[#14181c] px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:border-[#b6ff3a]/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[9px] text-zinc-500 mb-1 block">
                          CATEGORIA
                        </label>
                        <select
                          value={newCategory}
                          onChange={(e) =>
                            setNewCategory(e.target.value as ProposalCategory)
                          }
                          className="w-full bg-[#0a0d10] border border-[#14181c] px-3 py-2 font-mono text-[11px] text-zinc-200 focus:border-[#b6ff3a]/50 focus:outline-none"
                        >
                          {(
                            Object.entries(CATEGORY_LABELS) as [
                              ProposalCategory,
                              string,
                            ][]
                          ).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="font-mono text-[9px] text-zinc-500 mb-1 block">
                        DESCRIÇÃO
                      </label>
                      <textarea
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Descreva a proposta em detalhes..."
                        rows={3}
                        className="w-full bg-[#0a0d10] border border-[#14181c] px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:border-[#b6ff3a]/50 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        className="font-mono text-[10px] tracking-wider px-4 py-1.5 bg-[#b6ff3a] text-black hover:bg-[#b6ff3a]/80 transition-colors"
                      >
                        CRIAR PROPOSTA
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="font-mono text-[10px] tracking-wider px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition-colors"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as ProposalStatus | "all"
                      )
                    }
                    className="bg-black border border-[#14181c] px-2 py-1 font-mono text-[9px] text-zinc-400 focus:border-[#b6ff3a]/50 focus:outline-none"
                  >
                    <option value="all">TODOS STATUS</option>
                    {(
                      Object.entries(STATUS_LABELS) as [
                        ProposalStatus,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) =>
                      setFilterCategory(
                        e.target.value as ProposalCategory | "all"
                      )
                    }
                    className="bg-black border border-[#14181c] px-2 py-1 font-mono text-[9px] text-zinc-400 focus:border-[#b6ff3a]/50 focus:outline-none"
                  >
                    <option value="all">TODAS CATEGORIAS</option>
                    {(
                      Object.entries(CATEGORY_LABELS) as [
                        ProposalCategory,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="font-mono text-[9px] text-zinc-600 ml-auto">
                    {filtered.length} proposta{filtered.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Lista de propostas */}
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="p-8 bg-black border border-[#14181c] text-center font-mono text-[11px] text-zinc-600">
                      Nenhuma proposta encontrada
                    </div>
                  ) : (
                    filtered.map((p) => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        onVote={handleVote}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {tab === "treasury" && <TreasuryPanel />}
            {tab === "governance" && (
              <>
                <GovernanceMetrics />
                <div className="mt-8">
                  <DelegationPanel />
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 bg-black p-6 md:p-8">
            <GovernanceMetrics />

            <div className="mt-8">
              <DelegationPanel />
            </div>

            {/* Princípios */}
            <div className="mt-8">
              <span className="tag mb-3 block">PRINCÍPIOS PATH 3</span>
              <div className="space-y-2">
                {[
                  {
                    icon: "◇",
                    text: "Sem banco central",
                    color: "#b6ff3a",
                  },
                  {
                    icon: "◇",
                    text: "Sem NFTs fixos",
                    color: "#6cf0ff",
                  },
                  {
                    icon: "◇",
                    text: "Votação quadrática",
                    color: "#ff3ad9",
                  },
                  {
                    icon: "◇",
                    text: "Delegação parcial",
                    color: "#ffd700",
                  },
                  {
                    icon: "◇",
                    text: "Multi-sig no tesouro",
                    color: "#ff8844",
                  },
                  {
                    icon: "◇",
                    text: "Execução transparente",
                    color: "#b6ff3a",
                  },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-2 p-2 bg-[#0a0d10] border border-[#14181c] font-mono text-[10px]"
                  >
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span className="text-zinc-400">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fórmulas */}
            <div className="mt-8 p-4 bg-[#0a0d10] border border-[#14181c]">
              <span className="font-mono text-[9px] text-zinc-500 mb-2 block">
                FÓRMULAS
              </span>
              <div className="space-y-2 font-mono text-[9px] text-zinc-600">
                <div>
                  <span className="text-[#b6ff3a]">peso</span> = √(SOV)
                </div>
                <div>
                  <span className="text-[#6cf0ff]">voto_ajustado</span> = voto ×
                  (1 + Σdel)
                </div>
                <div>
                  <span className="text-[#ff3ad9]">quórum</span> =
                  participação / total_staked
                </div>
                <div>
                  <span className="text-[#ffd700]">aprovado</span> = quórum ∧
                  (favor &gt; contra)
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#14181c] font-mono text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-400">Path 3:</strong> Governança
              quântica pura. Sem intermediários, sem pontos centrais. A
              comunidade decide, o código executa.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
