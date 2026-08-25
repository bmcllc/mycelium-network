import { Link } from "wouter";
import {
  formatTransparentProtocolFee,
  type ProtocolRoyaltySplit,
} from "../protocol/sovereignty/protocolRoyalty";
import { ETRNET_FOUNDATION_NAME } from "../protocol/sovereignty/etrnetSovereignty";

export interface ProtocolRoyaltyDisclosureProps {
  split: ProtocolRoyaltySplit;
  /** Ex.: "Pagamento estimado" ou "Trade nocional" */
  contextLabel?: string;
  /** Exige checkbox antes de confirmar (quando taxa activa). */
  requireAck?: boolean;
  acknowledged?: boolean;
  onAckChange?: (value: boolean) => void;
  compact?: boolean;
}

/**
 * Bloco fixo de transparência — taxa MontêLauro Foundation antes de confirmar.
 */
export default function ProtocolRoyaltyDisclosure({
  split,
  contextLabel,
  requireAck = false,
  acknowledged = false,
  onAckChange,
  compact = false,
}: ProtocolRoyaltyDisclosureProps) {
  const headline = formatTransparentProtocolFee(split);
  const showAck = requireAck && split.enabled && split.grossAmountSat > 0;

  return (
    <div
      className={`border font-mono ${
        split.enabled && split.grossAmountSat > 0
          ? "border-[#ffd700]/35 bg-[#ffd700]/5"
          : "border-[#14181c] bg-[#0a0d10]"
      } ${compact ? "px-3 py-2 text-[9px]" : "px-4 py-3 text-[10px]"}`}
      role="region"
      aria-label="Taxa de protocolo transparente"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-[#ffd700]/90 text-[9px] tracking-[0.2em] uppercase">
          Taxa transparente · {ETRNET_FOUNDATION_NAME}
        </span>
        <Link
          href="/governance/sovereignty"
          className="text-[#6cf0ff] hover:text-white text-[8px] tracking-wider shrink-0"
        >
          política →
        </Link>
      </div>

      {contextLabel && (
        <div className="text-zinc-500 text-[9px] mb-1">{contextLabel}</div>
      )}

      <p className="text-zinc-200 leading-relaxed">{headline}</p>

      {split.enabled && split.treasuryNpub && (
        <p className="text-zinc-600 text-[8px] mt-2 break-all">
          tesouraria: {split.treasuryNpub.slice(0, 24)}…
        </p>
      )}

      <p className="text-zinc-600 text-[8px] mt-2 italic">{split.disclosure}</p>

      {showAck && (
        <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAckChange?.(e.target.checked)}
            className="mt-0.5 accent-[#ffd700]"
          />
          <span className="text-zinc-400 text-[9px] leading-snug">
            Li e aceito a taxa de protocolo acima antes de confirmar esta operação.
          </span>
        </label>
      )}
    </div>
  );
}
