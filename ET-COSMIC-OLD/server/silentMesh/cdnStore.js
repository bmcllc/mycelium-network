/**
 * CDN Blob Store — Content-addressed storage for mesh-served content.
 * Blobs are stored by CID (SHA-256) with TTL and origin tracking.
 */

import crypto from "crypto";

const blobs = new Map(); // cid → { cid, data, mime, origin, size, storedAt, ttl, serveCount }

const DEFAULT_TTL = 3600_000; // 1 hour
const MAX_BLOB_SIZE = 1024 * 1024; // 1MB
const MAX_BLOBS = 10_000;

export function storeCdnBlob(cid, data, mime, origin) {
  // Evict expired or LRU if at capacity
  if (blobs.size >= MAX_BLOBS) {
    const oldest = [...blobs.entries()]
      .sort((a, b) => a[1].storedAt - b[1].storedAt)
      .slice(0, Math.floor(MAX_BLOBS * 0.1)); // evict 10%
    for (const [k] of oldest) blobs.delete(k);
  }

  const size = typeof data === "string" ? Buffer.byteLength(data) : data.length;
  if (size > MAX_BLOB_SIZE) return { error: "BLOB_TOO_LARGE", maxSize: MAX_BLOB_SIZE };

  const entry = {
    cid,
    data: typeof data === "string" ? data : data.toString("base64"),
    mime: mime || "application/octet-stream",
    origin: origin || "unknown",
    size,
    storedAt: Date.now(),
    ttl: DEFAULT_TTL,
    serveCount: 0,
  };
  blobs.set(cid, entry);
  return { cid, size, mime: entry.mime, origin: entry.origin };
}

export function getCdnBlob(cid) {
  const blob = blobs.get(cid);
  if (!blob) return null;
  if (Date.now() - blob.storedAt > blob.ttl) {
    blobs.delete(cid);
    return null;
  }
  blob.serveCount++;
  return blob;
}

export function listCdnBlobs() {
  const now = Date.now();
  return [...blobs.values()]
    .filter(b => now - b.storedAt < b.ttl)
    .map(b => ({ cid: b.cid, mime: b.mime, origin: b.origin, size: b.size, serveCount: b.serveCount, age: now - b.storedAt }))
    .sort((a, b) => b.serveCount - a.serveCount);
}
