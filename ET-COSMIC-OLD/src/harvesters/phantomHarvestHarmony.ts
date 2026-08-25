/**
 * Passo Phantom Harvest na harmonia cósmica — só importação com consentimento (sem scrape automático).
 */

import { assertOperationAllowed } from "../protocol/amp/consentLattice";
import { consentReceiptStore } from "../protocol/amp/consentReceiptStore";
import type { SocialPlatform } from "../storage/contactDirectory";
import { phantomHarvester } from "./phantomHarvester";

export const PHANTOM_PENDING_IMPORT_KEY = "etrnet:phantom:pending_import";

export interface PendingImportRow {
  platform: SocialPlatform;
  platformId: string;
  username: string;
  nostrPubkey?: string;
}

export interface PhantomHarvestHarmonyResult {
  ran: boolean;
  imported: number;
  skippedReason?: string;
}

/** Lê fila de importação pendente (JSON em sessionStorage). */
export function readPendingPhantomImport(): PendingImportRow[] {
  try {
    const raw = sessionStorage.getItem(PHANTOM_PENDING_IMPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingImportRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearPendingPhantomImport(): void {
  sessionStorage.removeItem(PHANTOM_PENDING_IMPORT_KEY);
}

/** Enfileira contactos para import na próxima harmonia cósmica. */
export function queueContactsForHarmony(rows: PendingImportRow[]): number {
  const existing = readPendingPhantomImport();
  const merged = [...existing, ...rows];
  sessionStorage.setItem(PHANTOM_PENDING_IMPORT_KEY, JSON.stringify(merged));
  return merged.length;
}

export function getPendingHarmonyCount(): number {
  return readPendingPhantomImport().length;
}

/**
 * Importa contactos pendentes na harmonia (AMP legacy_import).
 * Scraping automático continua proibido — use /harvester com ficheiro.
 */
export async function runPhantomHarvestHarmonyStep(
  skip = false,
): Promise<PhantomHarvestHarmonyResult> {
  if (skip) {
    return { ran: false, imported: 0, skippedReason: "skipPhantomHarvest" };
  }

  const rows = readPendingPhantomImport();
  if (rows.length === 0) {
    return {
      ran: false,
      imported: 0,
      skippedReason: "sem fila etrnet:phantom:pending_import",
    };
  }

  try {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "legacy_import");
  } catch {
    return {
      ran: false,
      imported: 0,
      skippedReason: "consentimento legacy_import insuficiente",
    };
  }

  const n = await phantomHarvester.importContactsFromUserFile(rows);
  clearPendingPhantomImport();
  return { ran: true, imported: n };
}
