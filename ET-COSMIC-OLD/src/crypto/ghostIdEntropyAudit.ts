/**
 * Audit log da fonte de entropia no spawn GhostID — rastreabilidade honesta.
 */

export interface GhostIdEntropyAuditEntry {
  timestamp: number;
  handle?: string;
  stage: string;
  source: string;
  method: string;
  sources: string[];
  quantumVerified: boolean;
  simulation: boolean;
  consentSkipped?: boolean;
  fallback?: string;
}

const STORAGE_KEY = "ghostid_entropy_audit";
const MAX_ENTRIES = 64;

let memoryLog: GhostIdEntropyAuditEntry[] = [];

function persist(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryLog));
  } catch {
    /* quota / private mode */
  }
}

function hydrate(): void {
  if (typeof sessionStorage === "undefined" || memoryLog.length) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) memoryLog = JSON.parse(raw) as GhostIdEntropyAuditEntry[];
  } catch {
    memoryLog = [];
  }
}

export function recordGhostIdEntropyAudit(
  entry: Omit<GhostIdEntropyAuditEntry, "timestamp">,
): GhostIdEntropyAuditEntry {
  hydrate();
  const row: GhostIdEntropyAuditEntry = { ...entry, timestamp: Date.now() };
  memoryLog.push(row);
  if (memoryLog.length > MAX_ENTRIES) memoryLog = memoryLog.slice(-MAX_ENTRIES);
  persist();
  return row;
}

export function getGhostIdEntropyAudit(): readonly GhostIdEntropyAuditEntry[] {
  hydrate();
  return memoryLog;
}

export function clearGhostIdEntropyAudit(): void {
  memoryLog = [];
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
