/**
 * ET-COSMIC — Política de soberania (AGPL livre, créditos, royalties, fundação).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2024-2026 Bruno Monteiro Caldas da Cunha
 */

export const ETRNET_COPYRIGHT_HOLDER = "Bruno Monteiro Caldas da Cunha";
export const ETRNET_FOUNDATION_NAME = "MontêLauro Foundation";
export const ETRNET_PROJECT_NAME = "ET-COSMIC";
export const ETRNET_LICENSE_SPDX = "AGPL-3.0-or-later";

/** Ramo comunitário da licença dupla (sempre disponível). */
export const ETRNET_COMMUNITY_LICENSE = "AGPL-3.0-or-later";

/** Ramo comercial (contrato separado — não remove AGPL do upstream). */
export const ETRNET_COMMERCIAL_LICENSE_LABEL = "ET-COSMIC Commercial License (contact holder)";

/** Ficheiros legais que NUNCA devem ser removidos do repositório oficial. */
export const ETRNET_REQUIRED_LEGAL_FILES = [
  "LICENSE",
  "NOTICE",
  "DUAL-LICENSE.md",
  "CREDITS.md",
  "COMMERCIAL-LICENSE.md",
  "AI-USE-RESERVATION.md",
] as const;

/** Reserva de direitos contra treino IA e clonagem automatizada. */
export const ETRNET_AI_RESERVATION_SUMMARY =
  "Reservados: treino/fine-tuning de IA, scraping para datasets, TDM comercial (opt-out UE), " +
  "engenharia reversa de binários comerciais. Ver AI-USE-RESERVATION.md e public/ai.txt.";

/** Compromisso público anti-privatização do monorepo oficial. */
export const ETRNET_OPEN_SOURCE_PLEDGE =
  "O repositório oficial ET-COSMIC permanece sob AGPL-3.0-or-later (totalmente livre). " +
  "Não será relicenciado como proprietário exclusivo. Forks e malha na rede mantêm copyleft §13 e NOTICE.";

/** Linha curta obrigatória em UI derivada (ver NOTICE). */
export const ETRNET_UI_CREDIT_SHORT = `${ETRNET_PROJECT_NAME} · ${ETRNET_COPYRIGHT_HOLDER.split(" ").slice(-2).join(" ")}`;

/** Linha longa para documentação e licenças. */
export const ETRNET_UI_CREDIT_LONG = `${ETRNET_FOUNDATION_NAME} / ${ETRNET_COPYRIGHT_HOLDER}`;

export interface SovereigntyPolicy {
  license: string;
  dualLicenseCommunity: string;
  dualLicenseCommercial: string;
  copyleft: boolean;
  openSourceOnly: boolean;
  commercialDualLicenseAvailable: boolean;
  protocolRoyaltyBps: number;
  protocolRoyaltyEnabled: boolean;
  treasuryNpub: string | null;
  requireAttribution: boolean;
  foundation: {
    name: string;
    status: "forming" | "active";
    architect: string;
    vetoOnCopyleftRemoval: boolean;
  };
}

function parseBps(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? String(fallback), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, 1000);
}

/** Política efectiva (env Vite + predefinições do monorepo). */
export function getSovereigntyPolicy(): SovereigntyPolicy {
  const bps = parseBps(import.meta.env.VITE_PROTOCOL_ROYALTY_BPS, 10);
  const treasury =
    (import.meta.env.VITE_ETRNET_TREASURY_NPUB as string | undefined)?.trim() || null;
  const requireAttribution =
    import.meta.env.VITE_REQUIRE_ATTRIBUTION !== "false";

  return {
    license: ETRNET_LICENSE_SPDX,
    dualLicenseCommunity: ETRNET_COMMUNITY_LICENSE,
    dualLicenseCommercial: ETRNET_COMMERCIAL_LICENSE_LABEL,
    copyleft: true,
    openSourceOnly: true,
    commercialDualLicenseAvailable: true,
    protocolRoyaltyBps: bps,
    protocolRoyaltyEnabled: bps > 0 && !!treasury,
    treasuryNpub: treasury,
    requireAttribution,
    foundation: {
      name: ETRNET_FOUNDATION_NAME,
      status: "forming",
      architect: ETRNET_COPYRIGHT_HOLDER,
      vetoOnCopyleftRemoval: true,
    },
  };
}

export function getAttributionNotice(): string {
  return `Powered by ${ETRNET_PROJECT_NAME} · ${ETRNET_UI_CREDIT_LONG}. Licensed under ${ETRNET_LICENSE_SPDX}.`;
}

export function getDualLicenseSummary(): string {
  return (
    `Licença dupla: (1) ${ETRNET_COMMUNITY_LICENSE} — código aberto total; ` +
    `(2) ${ETRNET_COMMERCIAL_LICENSE_LABEL} — produto fechado opcional. Ver DUAL-LICENSE.md.`
  );
}

export function getOpenSourcePledge(): string {
  return ETRNET_OPEN_SOURCE_PLEDGE;
}

export function getCommercialLicenseSummary(): string {
  return (
    "Uso em produto fechado sem publicar código-fonte requer licença comercial (ramo 2). " +
    "Proibido: engenharia reversa do binário, treino de IA, scraping para clonagem. " +
    "Ver DUAL-LICENSE.md, COMMERCIAL-LICENSE.md e AI-USE-RESERVATION.md."
  );
}

export function getAiUseReservationNotice(): string {
  return `${ETRNET_PROJECT_NAME}: ${ETRNET_AI_RESERVATION_SUMMARY}`;
}

/** Bloqueia UI derivada sem crédito quando VITE_REQUIRE_ATTRIBUTION !== "false". */
export function mustShowAttribution(): boolean {
  return getSovereigntyPolicy().requireAttribution;
}
