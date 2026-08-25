/**
 * ETERNET API — orquestra LUSUS + OS RNG no servidor (Bruno Theory corre no cliente).
 */

import { Router } from "express";
import crypto from "node:crypto";
import { createHash } from "node:crypto";
import { correlatedPair } from "../lusus/chaos_bell.js";
import { LUSUS_DISCLAIMER } from "../lusus/index.js";

export const ETERNET_DISCLAIMER =
  "ETERNET: rede soberana. Entropia servidor = LUSUS chaos + OS RNG. Bruno Theory no cliente (src/eternet).";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    engine: "ETERNET",
    layers: ["lusus", "os_rng", "bruno_theory_client"],
    disclaimer: ETERNET_DISCLAIMER,
    lusus_disclaimer: LUSUS_DISCLAIMER,
  });
});

router.get("/status", (_req, res) => {
  res.json({
    engine: "ETERNET",
    version: "1.0.0",
    entropy_modes: ["server_hybrid"],
    modules: {
      lusus: "/api/lusus",
      theory: "src/theory (client-side)",
      void_core: "void_core/pkg",
    },
    open_core: true,
    enterprise: "docs/B2B-PRODUCT-LINES.md",
    disclaimer: ETERNET_DISCLAIMER,
  });
});

router.post("/entropy", (req, res) => {
  const bits = Math.min(4096, Math.max(128, parseInt(req.body?.bits ?? "256", 10)));
  const nBytes = Math.ceil(bits / 8);
  const seed = parseInt(req.body?.seed ?? String(Date.now() % 100000), 10);
  const bell = correlatedPair(seed);
  const os = crypto.randomBytes(nBytes);
  const bellBytes = createHash("sha3-512")
    .update(`${bell.seed}:${bell.correlation}:${bell.chaos?.S ?? 0}`)
    .digest();
  const mixed = Buffer.alloc(nBytes);
  for (let i = 0; i < nBytes; i++) {
    mixed[i] = os[i] ^ bellBytes[i % bellBytes.length];
  }
  const entropy_hex = mixed.toString("hex");
  const sha3_256 = createHash("sha3-256").update(mixed).digest("hex");
  res.json({
    entropy_hex,
    sha3_256,
    bits,
    source: "eternet",
    sources: ["os_rng", "lusus_chaos_bell"],
    simulation: true,
    quantum_verified: false,
    lusus: { correlation: bell.correlation, simulatedS: bell.chaos?.S },
    disclaimer: ETERNET_DISCLAIMER,
  });
});

export default router;
