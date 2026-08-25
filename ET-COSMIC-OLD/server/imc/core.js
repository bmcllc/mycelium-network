/**
 * VOID-600 — IMC Core (orquestra 510–522 + isossupra legado).
 */

import { coreStatus as isossupraStatus, runEngine } from "../isossupra/core.js";
import { mergeMeshEntropy, ingestSensorStream } from "./sensor_entropy_mesh.js";
import { submitIsingJob, getIsingJob } from "./ising_mesh.js";
import { deriveRoomKeyFromImpulse, acousticRoomFallback } from "./acoustic_room.js";
import { syncChaosMesh } from "./chaos_mesh.js";
import { solveThomasDistributed } from "./thomas_distributed.js";
import { postMarketplaceJob, getMarketplaceJob } from "./marketplace.js";
import { purchaseEntropyPackage } from "./entropy_service.js";
import { submitZkProofs } from "./zk_aggregate.js";

export const VOID_SOVEREIGN_DISCLAIMER =
  "VOID Sovereign Stack: Anacroclastia × Isossupramulação — sensores + malha clássica, sem qubits. AGPL-3.0-or-later.";

/** @deprecated alias IMC */
export const IMC_DISCLAIMER = VOID_SOVEREIGN_DISCLAIMER;

export const IMC_ENGINES = {
  "VOID-510": "sensor-entropy",
  "VOID-511": "ising-mesh",
  "VOID-512": "acoustic-room",
  "VOID-513": "chaos-mesh",
  "VOID-514": "thomas-distributed",
  "VOID-520": "marketplace",
  "VOID-521": "entropy-service",
  "VOID-522": "zk-aggregate",
  "VOID-600": "core",
};

export function imcStatus() {
  return {
    sku: "VOID-600",
    engine: "Isossupramulated Mesh Computer",
    stack: "VOID-SOVEREIGN",
    version: "2.0.0",
    whitepaper: "docs/whitepaper-v2.0.md",
    engines: Object.entries(IMC_ENGINES).map(([sku, id]) => ({ sku, id })),
    isossupra: isossupraStatus(),
    disclaimer: IMC_DISCLAIMER,
  };
}

export function runImcAction(action, body = {}) {
  switch (action) {
    case "sensor-entropy":
    case "VOID-510":
      if (body.nodeId) ingestSensorStream(body.nodeId, body.streams);
      return mergeMeshEntropy(body.bits ?? 256);
    case "ising-mesh":
    case "VOID-511":
      return body.jobId ? getIsingJob(body.jobId) : submitIsingJob(body.jobId ?? `ising-${Date.now()}`, body);
    case "acoustic-room":
    case "VOID-512":
      return body.impulseHex
        ? deriveRoomKeyFromImpulse(body.impulseHex, body.deviceA, body.deviceB)
        : acousticRoomFallback(body);
    case "chaos-mesh":
    case "VOID-513":
      return syncChaosMesh(body.seed ?? Date.now() % 100000, body.nodeIds);
    case "thomas-distributed":
    case "VOID-514":
      return solveThomasDistributed(body.molecule ?? "H2", body.shards ?? 4);
    case "marketplace":
    case "VOID-520":
      return body.jobId ? getMarketplaceJob(body.jobId) : postMarketplaceJob(body);
    case "entropy-service":
    case "VOID-521":
      return purchaseEntropyPackage(body.bits ?? 512, body.nodeId, body.streams);
    case "zk-aggregate":
    case "VOID-522":
      return submitZkProofs(body.batchId ?? `zk-${Date.now()}`, body.proofs);
    default:
      if (body.legacyEngine) return runEngine(body.legacyEngine, body);
      return { error: "UNKNOWN_ACTION", action, available: Object.values(IMC_ENGINES) };
  }
}
