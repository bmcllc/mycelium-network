/**
 * VOID-704 — Receita por hospedagem (sites + nós VOID-700).
 */

import { creditAccount, applyProtocolFee } from "./sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "./economyPersistence.js";

const hostingStore = createPersistedStore("sov-hosting.json", { idField: "siteId" });
registerEconomyFlusher(hostingStore.flush);

const RATES = {
  perThousandVisitorsMicro: 5000,
  perGbServedMicro: 2000,
  nodeUptimeHourMicro: 300,
};

export function registerHostingSite(body = {}) {
  const siteId = body.siteId ?? `host-${Date.now().toString(36)}`;
  const entry = {
    sku: "VOID-704",
    siteId,
    ownerId: body.ownerId ?? "host:anonymous",
    origin: body.origin ?? "",
    plan: body.plan ?? "mesh-free",
    stats: { visitorMinutes: 0, bytesServed: 0, earnedMicro: 0 },
    registeredAt: Date.now(),
  };
  hostingStore.map.set(siteId, entry);
  hostingStore.schedule();
  return entry;
}

export function recordHostingTraffic(siteId, metrics = {}) {
  const site = hostingStore.map.get(siteId);
  if (!site) return { error: "SITE_NOT_FOUND" };
  const visitors = metrics.visitors ?? 0;
  const bytes = metrics.bytesServed ?? 0;
  site.stats.visitorMinutes += metrics.minutes ?? visitors;
  site.stats.bytesServed += bytes;

  let gross =
    Math.floor((visitors / 1000) * RATES.perThousandVisitorsMicro) +
    Math.floor((bytes / 1e9) * RATES.perGbServedMicro);
  if (metrics.nodeUptimeMinutes) {
    gross += Math.floor((metrics.nodeUptimeMinutes / 60) * RATES.nodeUptimeHourMicro);
  }
  const { feeMicro, netMicro } = applyProtocolFee(gross);
  if (netMicro > 0) {
    creditAccount(site.ownerId, netMicro, {
      channel: "hosting",
      siteId,
      visitors,
      bytes,
    });
    site.stats.earnedMicro += netMicro;
  }
  hostingStore.schedule();
  return {
    sku: "VOID-704",
    siteId,
    ownerId: site.ownerId,
    grossMicro: gross,
    feeMicro,
    creditedMicro: netMicro,
    stats: site.stats,
  };
}

export function listHostingSites() {
  return [...hostingStore.map.values()];
}

export function getHostingRates() {
  return { sku: "VOID-704", rates: RATES, currency: "SOV" };
}

export function flushHostingRevenue() {
  hostingStore.flush();
}
