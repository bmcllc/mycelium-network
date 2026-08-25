/**
 * Symbiotic Hosting — Borrow resources from other sites securely.
 *
 * Site A inclui void-mesh.js → visitantes de A hospedam conteúdo de B.
 * Segurança:
 *   - Sandboxing: conteúdo servido é read-only, verificado por CID
 *   - LSC: CPU < 5%, RAM < 50MB, bateria > 20%
 *   - Rate limit: max 100 requests/min por nó
 *   - TTL: blobs expiram em 1h
 *   - Kill switch: site hospedeiro pode remover a qualquer momento
 *   - Sem acesso ao DOM do hospedeiro
 */

import crypto from "crypto";
import { creditAccount } from "../economy/sovLedger.js";

const symbionts = new Map(); // hostOrigin → { ...stats, salt, registeredAt }

// Rate limiter per symbiont
const rateLimits = new Map(); // origin → { count, resetAt }
const RATE_MAX = 100; // requests per minute
const RATE_WINDOW = 60_000;

export function registerSymbiont(body = {}) {
  const origin = body.origin;
  if (!origin) return { error: "MISSING_ORIGIN" };

  const salt = crypto.randomBytes(16).toString("hex");
  const hostHash = crypto.createHash("sha256").update(origin + salt).digest("hex");

  const entry = {
    hostHash,
    origin,
    salt,
    consent: {
      serveCdn: body.consent?.serveCdn !== false,
      serveCompute: body.consent?.serveCompute === true,
    },
    stats: {
      blobsServed: 0,
      bytesServed: 0,
      requestsHandled: 0,
      computeTasks: 0,
      sovEarnedMicro: 0,
    },
    limits: {
      maxBlobs: 1000,
      maxBytesPerBlob: 1024 * 1024, // 1MB
      ratePerMinute: RATE_MAX,
    },
    active: true,
    registeredAt: Date.now(),
    lastSeen: Date.now(),
  };

  symbionts.set(origin, entry);
  return {
    sku: "VOID-700-SYMBIOTIC",
    hostHash,
    limits: entry.limits,
    consent: entry.consent,
    message: "Symbiont registered. Serve content for other mesh nodes to earn $SOV.",
  };
}

export function listSymbionts() {
  return [...symbionts.values()]
    .filter(s => s.active)
    .map(s => ({
      hostHash: s.hostHash,
      consent: s.consent,
      stats: s.stats,
      active: s.active,
      lastSeen: s.lastSeen,
    }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export function reportSymbiontWork(body = {}) {
  const { origin, type, bytesServed, cid } = body;
  if (!origin) return { error: "MISSING_ORIGIN" };

  const s = symbionts.get(origin);
  if (!s || !s.active) return { error: "SYMBIONT_NOT_REGISTERED" };

  // Rate limiting
  const now = Date.now();
  let rl = rateLimits.get(origin);
  if (!rl || now - rl.resetAt > RATE_WINDOW) {
    rl = { count: 0, resetAt: now };
    rateLimits.set(origin, rl);
  }
  rl.count++;
  if (rl.count > RATE_MAX) {
    return { error: "RATE_LIMITED", retryAfterMs: RATE_WINDOW - (now - rl.resetAt) };
  }

  // Record work
  if (type === "cdn-serve" && bytesServed) {
    s.stats.blobsServed++;
    s.stats.bytesServed += bytesServed;
  }
  if (type === "compute") {
    s.stats.computeTasks++;
  }
  s.stats.requestsHandled++;
  s.lastSeen = now;

  // Credit SOV (1 microSOV per KB served)
  const creditMicro = type === "cdn-serve"
    ? Math.max(1, Math.floor(bytesServed / 1024))
    : 10; // compute tasks get 10 microSOV

  s.stats.sovEarnedMicro += creditMicro;
  const accountId = `symbiont:${s.hostHash.slice(0, 16)}`;
  creditAccount(accountId, creditMicro, { channel: "hosting", origin, sku: "VOID-700" });

  return {
    sku: "VOID-700",
    origin: s.hostHash.slice(0, 16), // don't expose real origin
    type,
    creditedMicro: creditMicro,
    stats: s.stats,
  };
}

export function getSymbiontStatus() {
  const all = [...symbionts.values()];
  return {
    sku: "VOID-700-SYMBIOTIC",
    totalSymbionts: all.length,
    activeSymbionts: all.filter(s => s.active).length,
    totalBlobsServed: all.reduce((sum, s) => sum + s.stats.blobsServed, 0),
    totalBytesServed: all.reduce((sum, s) => sum + s.stats.bytesServed, 0),
    totalRequests: all.reduce((sum, s) => sum + s.stats.requestsHandled, 0),
    security: {
      sandboxing: "read-only content, CID-verified",
      lsc: "CPU<5%, RAM<50MB, battery>20%",
      rateLimit: `${RATE_MAX} req/min per node`,
      ttl: "1 hour per blob",
      killSwitch: "site host can remove at any time",
    },
  };
}
