/**
 * VOID-510 — Sensor Entropy Mesh (mescla streams de nós).
 */

import crypto from "node:crypto";

const pools = new Map();

export function ingestSensorStream(nodeId, streams) {
  const chunks = [];
  if (streams?.audio_hex) chunks.push(Buffer.from(streams.audio_hex, "hex"));
  if (streams?.camera_hex) chunks.push(Buffer.from(streams.camera_hex, "hex"));
  if (streams?.motion_hex) chunks.push(Buffer.from(streams.motion_hex, "hex"));
  if (streams?.device_hex) chunks.push(Buffer.from(streams.device_hex, "hex"));
  if (chunks.length === 0) {
    chunks.push(crypto.randomBytes(32));
  }
  let acc = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const b = chunks[i];
    const out = Buffer.alloc(Math.max(acc.length, b.length));
    for (let j = 0; j < out.length; j++) {
      out[j] = (acc[j] ?? 0) ^ (b[j % b.length] ?? 0);
    }
    acc = out;
  }
  pools.set(nodeId, { bytes: acc, at: Date.now() });
  return { nodeId, bytes: acc.length, sources: Object.keys(streams ?? {}).filter((k) => streams[k]) };
}

export function mergeMeshEntropy(bits = 256) {
  const nBytes = Math.ceil(bits / 8);
  const nodes = [...pools.values()];
  if (nodes.length === 0) {
    const b = crypto.randomBytes(nBytes);
    return {
      sku: "VOID-510",
      entropy_hex: b.toString("hex"),
      sha3_256: crypto.createHash("sha3-256").update(b).digest("hex"),
      nodes: 0,
      simulation: true,
    };
  }
  let mixed = Buffer.alloc(nBytes);
  for (const { bytes } of nodes) {
    for (let i = 0; i < nBytes; i++) mixed[i] ^= bytes[i % bytes.length];
  }
  const tail = crypto.createHash("sha3-512").update(`${nodes.length}:${Date.now()}`).digest();
  for (let i = 0; i < nBytes; i++) mixed[i] ^= tail[i % tail.length];
  return {
    sku: "VOID-510",
    engine: "Sensor Entropy Mesh",
    entropy_hex: mixed.toString("hex"),
    sha3_256: crypto.createHash("sha3-256").update(mixed).digest("hex"),
    bits,
    nodes: nodes.length,
    quantum_verified: false,
    iso: "johnson_shot_noise_lsb",
    supra: "xor_mesh_pool",
    complements: "VOID-521",
  };
}
