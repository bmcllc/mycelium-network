import { useMemo } from "react";
import {
  getAttributionNotice,
  getAiUseReservationNotice,
  getCommercialLicenseSummary,
  getDualLicenseSummary,
  getOpenSourcePledge,
  getSovereigntyPolicy,
  ETRNET_REQUIRED_LEGAL_FILES,
  ETRNET_UI_CREDIT_LONG,
} from "../protocol/sovereignty/etrnetSovereignty";
import { computeProtocolRoyalty } from "../protocol/sovereignty/protocolRoyalty";
import ProtocolRoyaltyDisclosure from "./ProtocolRoyaltyDisclosure";

export default function SovereigntyPanel() {
  const policy = useMemo(() => getSovereigntyPolicy(), []);
  const samplePayment = useMemo(() => computeProtocolRoyalty(100_000, "payment"), []);
  const sampleDex = useMemo(() => computeProtocolRoyalty(50_000, "dex"), []);

  return (
    <section className="space-y-8 font-mono text-sm">
      <div className="p-4 border border-[#b6ff3a]/30 bg-[#b6ff3a]/5 rounded">
        <p className="text-[#b6ff3a] text-xs tracking-widest mb-2">CRÉDITO OBRIGATÓRIO</p>
        <p className="text-zinc-300">{getAttributionNotice()}</p>
        <p className="text-zinc-500 text-xs mt-2">{ETRNET_UI_CREDIT_LONG}</p>
      </div>

      <div className="border border-[#6cf0ff]/25 bg-[#6cf0ff]/5 p-4 rounded">
        <p className="text-[#6cf0ff] text-xs tracking-widest mb-2">LICENÇA DUPLA</p>
        <p className="text-zinc-400 text-xs leading-relaxed">{getDualLicenseSummary()}</p>
        <p className="text-zinc-600 text-[10px] mt-2">{getOpenSourcePledge()}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="border border-[#1a1f26] p-4 rounded">
          <h3 className="text-zinc-400 text-[10px] tracking-widest mb-3">COPYLEFT · CÓDIGO ABERTO</h3>
          <ul className="text-zinc-500 text-xs space-y-1">
            <li>Ramo 1: {policy.dualLicenseCommunity}</li>
            <li>Privatização upstream: bloqueada</li>
            <li>Ficheiros obrigatórios: {ETRNET_REQUIRED_LEGAL_FILES.join(", ")}</li>
          </ul>
        </div>
        <div className="border border-[#1a1f26] p-4 rounded">
          <h3 className="text-zinc-400 text-[10px] tracking-widest mb-3">ROYALTIES</h3>
          <ul className="text-zinc-500 text-xs space-y-1">
            <li>Taxa: {policy.protocolRoyaltyBps} bps ({policy.protocolRoyaltyBps / 100}%)</li>
            <li>Activa: {policy.protocolRoyaltyEnabled ? "sim" : "não (falta npub)"}</li>
            <li>Tesouraria: {policy.treasuryNpub ? `${policy.treasuryNpub.slice(0, 20)}…` : "—"}</li>
          </ul>
        </div>
        <div className="border border-[#1a1f26] p-4 rounded">
          <h3 className="text-zinc-400 text-[10px] tracking-widest mb-3">FUNDAÇÃO</h3>
          <ul className="text-zinc-500 text-xs space-y-1">
            <li>{policy.foundation.name}</li>
            <li>Estado: {policy.foundation.status}</li>
            <li>Arquitecto: {policy.foundation.architect}</li>
            <li>Veto anti-AGPL: {policy.foundation.vetoOnCopyleftRemoval ? "sim" : "não"}</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <ProtocolRoyaltyDisclosure
          split={samplePayment}
          contextLabel="Exemplo: pagamento 100 000 sat"
        />
        <ProtocolRoyaltyDisclosure
          split={sampleDex}
          contextLabel="Exemplo: DEX 50 000 sat nocional"
          compact
        />
      </div>

      <div className="border border-rose-900/40 bg-rose-950/10 p-4 rounded">
        <p className="text-rose-300/90 text-xs tracking-widest mb-2">RESERVA IA · ANTI-CLONAGEM</p>
        <p className="text-zinc-400 text-xs leading-relaxed">{getAiUseReservationNotice()}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
          <a href="/AI-USE-RESERVATION.md" className="text-rose-400 hover:underline" target="_blank" rel="noreferrer">
            AI-USE-RESERVATION.md →
          </a>
          <a href="/ai.txt" className="text-rose-400 hover:underline" target="_blank" rel="noreferrer">
            ai.txt →
          </a>
        </div>
      </div>

      <div className="border border-violet-900/40 bg-violet-950/10 p-4 rounded text-xs">
        <p className="mb-2 font-semibold text-violet-200">Protocol-First B2B</p>
        <p className="text-zinc-400">
          Monetização sem contratos: DAT, liquidity pools e tiers $SOV auto-executáveis.
          Contratos jurídicos são legado opcional (produto fechado copyleft).
        </p>
        <a href="/mesh/liquidity" className="inline-block mt-3 text-violet-300 hover:underline text-[10px]">
          /mesh/liquidity →
        </a>
        <a href="/PROTOCOL-FIRST-MESH.md" className="inline-block mt-3 ml-4 text-violet-300 hover:underline text-[10px]" target="_blank" rel="noreferrer">
          PROTOCOL-FIRST-MESH.md →
        </a>
      </div>

      <div className="border border-amber-900/40 bg-amber-950/10 p-4 rounded text-xs text-amber-200/80">
        <p className="mb-2 font-semibold">Licença comercial (opcional)</p>
        <p>{getCommercialLicenseSummary()}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
          <a href="/DUAL-LICENSE.md" className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
            DUAL-LICENSE.md →
          </a>
          <a href="/COMMERCIAL-LICENSE.md" className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
            COMMERCIAL-LICENSE.md →
          </a>
          <a href="/AI-USE-RESERVATION.md" className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
            AI-USE-RESERVATION.md →
          </a>
          <a href="/CREDITS.md" className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
            CREDITS.md →
          </a>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600">
        Configure: VITE_ETRNET_TREASURY_NPUB, VITE_PROTOCOL_ROYALTY_BPS (predef. 10), VITE_REQUIRE_ATTRIBUTION=true.
        Documentação: DOC/DEPLOY-PRODUCTION.md · docs/PRODUCTION-READY.md (guias completos: cópia local em docs/guides/)
      </p>
    </section>
  );
}
