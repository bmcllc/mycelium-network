/**
 * VOID-703 — Bazaar de dados e binários (qualquer artefato: software, datasets, streams, sensores).
 */

import crypto from "crypto";
import { transferWithFee } from "./sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "./economyPersistence.js";

const artifactStore = createPersistedStore("sov-artifacts.json", { idField: "artifactId" });
registerEconomyFlusher(artifactStore.flush);

/** Tipos de artefato suportados */
const ARTIFACT_TYPES = [
  "binary",     // software/binário
  "dataset",    // dados tabulares, CSV, JSON
  "stream",     // feed de dados em tempo real
  "sensor",     // dados de sensores IoT
  "api-key",    // acesso a API
  "model",      // modelo ML/AI
  "document",   // PDF, doc, relatório
  "media",      // imagem, áudio, vídeo
  "generic",    // qualquer outro
];

export function publishArtifact(body = {}) {
  const artifactId = body.artifactId ?? `art-${Date.now().toString(36)}`;
  const priceMicro = Math.max(0, Math.floor(body.priceSov ?? 0) * 1_000_000);
  const artifactType = ARTIFACT_TYPES.includes(body.type) ? body.type : "generic";

  const entry = {
    sku: "VOID-703",
    artifactId,
    type: artifactType,
    name: body.name ?? artifactType,
    version: body.version ?? "1.0.0",
    platform: body.platform ?? "any",
    sha256: body.sha256 ?? crypto.createHash("sha256").update(body.name ?? artifactId).digest("hex"),
    sizeBytes: body.sizeBytes ?? 0,
    priceMicro,
    priceSov: priceMicro / 1_000_000,
    sellerId: body.sellerId ?? "seller:anonymous",
    downloadUrl: body.downloadUrl ?? `/api/economy/artifacts/${artifactId}/download`,
    /** Metadados genéricos: schema, mimetype, encoding, tags, etc. */
    metadata: body.metadata ?? {},
    publishedAt: Date.now(),
    sales: 0,
  };
  artifactStore.map.set(artifactId, entry);
  artifactStore.schedule();
  return entry;
}

/** Compat: publicar binário (alias) */
export function publishBinary(body = {}) {
  return publishArtifact({ ...body, type: "binary" });
}

export function listArtifacts(filter = {}) {
  let items = [...artifactStore.map.values()];
  if (filter.type) items = items.filter(a => a.type === filter.type);
  if (filter.sellerId) items = items.filter(a => a.sellerId === filter.sellerId);
  if (filter.maxPriceSov != null) items = items.filter(a => a.priceSov <= filter.maxPriceSov);
  return items.sort((a, b) => b.publishedAt - a.publishedAt);
}

/** Compat: listar binários */
export function listBinaries() {
  return listArtifacts({ type: "binary" });
}

export function getArtifact(artifactId) {
  return artifactStore.map.get(artifactId) ?? { error: "NOT_FOUND" };
}

/** Compat: obter binário */
export function getBinary(artifactId) {
  return getArtifact(artifactId);
}

export function purchaseArtifact(artifactId, buyerId) {
  const art = artifactStore.map.get(artifactId);
  if (!art) return { error: "NOT_FOUND" };
  if (art.priceMicro <= 0) {
    art.sales += 1;
    artifactStore.schedule();
    return { sku: "VOID-703", artifactId, type: art.type, buyerId, priceMicro: 0, free: true };
  }
  const tx = transferWithFee(buyerId, art.sellerId, art.priceMicro, "marketplace");
  if (tx.error) return tx;
  art.sales += 1;
  artifactStore.schedule();
  return {
    sku: "VOID-703",
    artifactId,
    type: art.type,
    buyerId,
    sellerId: art.sellerId,
    ...tx,
    downloadUrl: art.downloadUrl,
    sha256: art.sha256,
  };
}

/** Compat: comprar binário */
export function purchaseBinary(artifactId, buyerId) {
  return purchaseArtifact(artifactId, buyerId);
}

export function flushBinaryMarket() {
  artifactStore.flush();
}
