/**
 * Persistência JSON partilhada — economia SOV (void_pool/).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const POOL_DIR = process.env.SOV_POOL_DIR ?? join(repoRoot, "void_pool");

export function economyPersistenceEnabled() {
  if (process.env.SOV_LEDGER_PERSIST === "0") return false;
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return false;
  return true;
}

export function economyPoolPath(filename) {
  return join(POOL_DIR, filename);
}

/** Mapa persistido com debounce por ficheiro. */
export function createPersistedStore(fileRef, { idField } = {}) {
  const filePath =
    fileRef.includes("/") || fileRef.includes("\\") ? fileRef : economyPoolPath(fileRef);
  const map = new Map();
  let timer = null;

  function load() {
    if (!economyPersistenceEnabled()) return;
    try {
      if (!existsSync(filePath)) return;
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      const entries = raw.entries ?? raw.accounts ?? raw;
      if (typeof entries === "object" && entries !== null) {
        for (const [k, v] of Object.entries(entries)) {
          const key = idField && v?.[idField] ? v[idField] : k;
          map.set(key, v);
        }
      }
      console.log(`[SOV] ${filePath}: ${map.size} entradas`);
    } catch (e) {
      console.warn(`[SOV] falha ao carregar ${filePath}:`, e?.message ?? e);
    }
  }

  function persistSync() {
    if (!economyPersistenceEnabled()) return;
    mkdirSync(dirname(filePath), { recursive: true });
    const payload = {
      version: 1,
      savedAt: Date.now(),
      entries: Object.fromEntries(map),
    };
    writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  function schedule() {
    if (!economyPersistenceEnabled()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        persistSync();
      } catch (e) {
        console.warn(`[SOV] falha ao persistir ${filePath}:`, e?.message ?? e);
      }
    }, 200);
  }

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    persistSync();
  }

  load();

  return { map, schedule, flush, filePath, persistSync };
}

/** Flush de todos os stores registados (shutdown). */
const flushers = [];

export function registerEconomyFlusher(fn) {
  flushers.push(fn);
}

export function flushAllEconomyStores() {
  for (const fn of flushers) {
    try {
      fn();
    } catch (e) {
      console.warn("[SOV] flush:", e?.message ?? e);
    }
  }
}

export { POOL_DIR };
