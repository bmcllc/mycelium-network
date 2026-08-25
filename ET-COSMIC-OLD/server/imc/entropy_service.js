/**
 * VOID-521 — Entropy-as-a-Service.
 */

import { mergeMeshEntropy, ingestSensorStream } from "./sensor_entropy_mesh.js";

export function purchaseEntropyPackage(bits, nodeId, streams) {
  if (nodeId && streams) ingestSensorStream(nodeId, streams);
  const pack = mergeMeshEntropy(bits);
  const pricePerKib = 0.01;
  const priceSov = (bits / 8192) * pricePerKib;
  return {
    ...pack,
    sku: "VOID-521",
    service: "Entropy-as-a-Service",
    bits,
    priceSov,
    disclaimer: "Entropia de sensores mesclados — não QRNG de laboratório.",
  };
}
