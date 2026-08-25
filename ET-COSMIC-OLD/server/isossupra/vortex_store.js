/**
 * VOID-505 — Vortex Memory Store (topologia de circulação, iso Helmholtz).
 */

import crypto from "node:crypto";
import {
  storeVortex,
  readVortex,
  listVortices,
  stepVortexDynamics,
} from "../lusus/vortex_memory.js";

const secrets = new Map();

export function sealSecretInVortex(secretId, payload, geometrySeed = "default") {
  const hash = crypto.createHash("sha3-256").update(`${geometrySeed}:${payload}`).digest();
  const circulation = (hash.readInt32BE(0) % 1000) / 100 + 0.5;
  const position = [hash.readInt16BE(4) / 32768, hash.readInt16BE(6) / 32768];
  storeVortex(secretId, circulation, position);
  secrets.set(secretId, {
    payload_sha3: crypto.createHash("sha3-256").update(payload).digest("hex"),
    geometrySeed,
    sealed_at: Date.now(),
  });
  return {
    secretId,
    circulation,
    position,
    note: "Segredo indexado por geometria de vórtice — leitura exige circulação correta.",
  };
}

export function openVortexSecret(secretId, geometrySeed) {
  const meta = secrets.get(secretId);
  const v = readVortex(secretId);
  if (!meta || !v.ok) return { ok: false, error: "NOT_FOUND" };
  if (meta.geometrySeed !== geometrySeed) return { ok: false, error: "GEOMETRY_MISMATCH" };
  return {
    ok: true,
    secretId,
    payload_sha3: meta.payload_sha3,
    vortex: v,
    complements: "VOID-132 Ghost Locker",
  };
}

export function vortexMemoryStatus() {
  stepVortexDynamics(0.02);
  return {
    sku: "VOID-505",
    engine: "Vortex Memory Store",
    vortices: listVortices(),
    secrets_sealed: secrets.size,
    iso: { conservation: "circulation_helmholtz" },
    supra: { mesh_replicate: "velocity_field_hash sync (roadmap)" },
  };
}
