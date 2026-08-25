/**
 * VOID-700 — Silent Mesh Hosting (nós browser + VPS).
 * Sem portas abertas: registo via API, sinalização Nostr, trabalho útil VOID-520.
 */

import crypto from "crypto";
import { creditAccount } from "../economy/sovLedger.js";

const nodes = new Map();
const cdnSites = new Map();

const LIMITS = {
  browser: { cpuPctMax: 5, ramMbMax: 50, idleIntervalMs: 300_000 },
  vps: { cpuPctMax: 3, ramMbMax: 64 },
};

export function silentMeshStatus() {
  return {
    sku: "VOID-700",
    name: "Silent Mesh Hosting",
    activeNodes: nodes.size,
    cdnSites: cdnSites.size,
    limits: LIMITS,
    embed: "/void-mesh.js",
    installer: "scripts/void-node-install.sh",
    disclaimer:
      "Propagação voluntária. Consentimento granular. Nunca excede limites LSC (VOID-180).",
  };
}

export function registerNode(body = {}) {
  const nodeId =
    body.nodeId ??
    `node-${crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16)}`;
  const mode = body.mode === "vps" ? "vps" : "browser";
  const limits = LIMITS[mode];
  const record = {
    nodeId,
    mode,
    ghostIdHint: body.ghostIdHint ?? null,
    siteOrigin: body.siteOrigin ?? null,
    limits,
    consent: {
      compute: Boolean(body.consent?.compute ?? false),
      entropy: Boolean(body.consent?.entropy ?? false),
      cdn: Boolean(body.consent?.cdn ?? true),
    },
    stats: {
      tasksCompleted: 0,
      entropyContributions: 0,
      bytesServed: 0,
      sovEarnedMicro: 0,
    },
    registeredAt: Date.now(),
    lastSeen: Date.now(),
  };
  nodes.set(nodeId, record);
  return { sku: "VOID-700", ...record };
}

export function heartbeatNode(nodeId, metrics = {}) {
  const n = nodes.get(nodeId);
  if (!n) return { error: "NODE_NOT_FOUND" };
  n.lastSeen = Date.now();
  if (metrics.cpuPct != null && metrics.cpuPct > n.limits.cpuPctMax) {
    return {
      sku: "VOID-700",
      nodeId,
      action: "throttle",
      reason: "LSC_CPU",
      message: "VOID-180: pausa até calmaria térmica",
      pauseMs: 120_000,
    };
  }
  if (metrics.batteryPct != null && metrics.batteryPct < 20) {
    return { sku: "VOID-700", nodeId, action: "pause", reason: "BATTERY_LOW" };
  }
  return { sku: "VOID-700", nodeId, action: "ok", nextIdleMs: LIMITS.browser.idleIntervalMs };
}

export function recordNodeWork(nodeId, work = {}) {
  const n = nodes.get(nodeId);
  if (!n) return { error: "NODE_NOT_FOUND" };
  if (work.type === "marketplace") n.stats.tasksCompleted += 1;
  if (work.type === "entropy") n.stats.entropyContributions += 1;
  if (work.bytesServed) n.stats.bytesServed += work.bytesServed;
  const credit = work.sovMicro ?? (work.type === "marketplace" ? 50 : 10);
  n.stats.sovEarnedMicro += credit;
  n.lastSeen = Date.now();
  const accountId = work.accountId ?? `node:${nodeId}`;
  const ledger = creditAccount(accountId, credit, {
    channel: work.type === "marketplace" ? "mining" : "hosting",
    nodeId,
    sku: "VOID-700",
  });
  return {
    sku: "VOID-700",
    nodeId,
    stats: n.stats,
    creditedMicro: credit,
    balanceSov: ledger.balanceMicro / 1_000_000,
    accountId,
  };
}

export function listNodes() {
  return [...nodes.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

/** VOID-701 — publicar site estático na malha (metadados; blobs via IPFS-like futuro). */
export function publishMeshCdn(body = {}) {
  const siteId = body.siteId ?? `site-${Date.now().toString(36)}`;
  const entry = {
    sku: "VOID-701",
    siteId,
    name: body.name ?? "Untitled",
    manifest: body.manifest ?? [],
    gatewayPath: `/mesh-cdn/${siteId}`,
    publishedAt: Date.now(),
    nodesServing: 0,
  };
  cdnSites.set(siteId, entry);
  return entry;
}

export function getMeshCdnSite(siteId) {
  return cdnSites.get(siteId) ?? { error: "NOT_FOUND" };
}

export function listMeshCdnSites() {
  return [...cdnSites.values()];
}
