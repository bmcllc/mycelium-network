/**
 * Taxa de protocolo ET-COSMIC — royalties técnicos transparentes (não privatizam o código).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  getSovereigntyPolicy,
  ETRNET_PROJECT_NAME,
  ETRNET_FOUNDATION_NAME,
} from "./etrnetSovereignty";

export type ProtocolRoyaltyChannel = "payment" | "dex" | "animus" | "rwa";

export interface ProtocolRoyaltySplit {
  channel: ProtocolRoyaltyChannel;
  grossAmountSat: number;
  feeBps: number;
  feeSat: number;
  netSat: number;
  treasuryNpub: string | null;
  enabled: boolean;
  disclosure: string;
}

/** Linha curta para UI — sempre visível antes de confirmar operação. */
export function formatTransparentProtocolFee(split: ProtocolRoyaltySplit): string {
  if (!split.enabled || split.grossAmountSat <= 0) {
    return `${ETRNET_FOUNDATION_NAME}: taxa de protocolo desactivada (código permanece AGPL livre). Configure VITE_ETRNET_TREASURY_NPUB.`;
  }
  const pct = (split.feeBps / 100).toFixed(split.feeBps % 100 === 0 ? 0 : 2);
  return (
    `Taxa ${ETRNET_FOUNDATION_NAME}: ${split.feeSat.toLocaleString("pt-PT")} sat (${pct}% de ${split.grossAmountSat.toLocaleString("pt-PT")} sat) · ` +
    `líquido ${split.netSat.toLocaleString("pt-PT")} sat → tesouraria Nostr · código AGPL totalmente livre`
  );
}

/** Estima sats a partir de fiat (usa taxas BTC passadas). */
export function fiatToSatEstimate(
  amount: string,
  currency: string,
  btcPrices: { brl: number; usd: number; eur: number },
): number {
  const n = parseFloat(amount.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const rate =
    currency === "BRL" ? btcPrices.brl : currency === "EUR" ? btcPrices.eur : btcPrices.usd;
  if (!rate || rate <= 0) return 0;
  return Math.max(0, Math.floor((n / rate) * 100_000_000));
}

/** Calcula taxa em satoshis (arredondamento para cima, mínimo 1 sat se bps > 0 e gross > 0). */
export function computeProtocolRoyalty(
  grossAmountSat: number,
  channel: ProtocolRoyaltyChannel,
  overrideBps?: number,
): ProtocolRoyaltySplit {
  const policy = getSovereigntyPolicy();
  const bps = overrideBps ?? policy.protocolRoyaltyBps;
  const enabled = bps > 0 && policy.treasuryNpub != null;
  const gross = Math.max(0, Math.floor(grossAmountSat));

  let feeSat = 0;
  if (enabled && gross > 0) {
    feeSat = Math.max(1, Math.ceil((gross * bps) / 10_000));
    feeSat = Math.min(feeSat, gross);
  }

  const netSat = gross - feeSat;
  const pct = (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);

  return {
    channel,
    grossAmountSat: gross,
    feeBps: bps,
    feeSat,
    netSat,
    treasuryNpub: policy.treasuryNpub,
    enabled,
    disclosure: enabled
      ? `${ETRNET_FOUNDATION_NAME} / ${ETRNET_PROJECT_NAME}: ${pct}% (${feeSat} sat) → tesouraria. Código AGPL livre.`
      : `${ETRNET_FOUNDATION_NAME}: taxa desactivada (VITE_ETRNET_TREASURY_NPUB + VITE_PROTOCOL_ROYALTY_BPS).`,
  };
}

/** Valor nocional fiat→sats para DEX (preço × quantidade, escala arbitrária). */
export function dexNotionalToSat(amount: number, price: number, satPerUnit = 1000): number {
  return Math.max(0, Math.floor(amount * price * satPerUnit));
}
