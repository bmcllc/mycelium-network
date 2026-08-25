/**
 * Router HTTP — Isossupramulação VOID-500–600
 */

import { Router } from "express";
import {
  coreStatus,
  runEngine,
  runIsossupraPipeline,
  ISOSSUPRA_DISCLAIMER,
} from "./core.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "Isossupramulated Core", disclaimer: ISOSSUPRA_DISCLAIMER });
});

router.get("/status", (_req, res) => {
  res.json(coreStatus());
});

router.post("/pipeline", (req, res) => {
  res.json(runIsossupraPipeline(req.body ?? {}));
});

router.post("/run/:engineId", (req, res) => {
  const out = runEngine(req.params.engineId, req.body ?? {});
  if (out.error) return res.status(400).json(out);
  res.json(out);
});

router.get("/run/:engineId", (req, res) => {
  const q = req.query;
  const body =
    req.params.engineId === "ising"
      ? { n: q.n, shardCount: q.shards }
      : req.params.engineId === "thomas-fermi"
        ? { molecule: q.molecule, separation: q.separation }
        : req.params.engineId === "thermal-qrng"
          ? { bits: q.bits }
          : q;
  const out = runEngine(req.params.engineId, body);
  if (out.error) return res.status(400).json(out);
  res.json(out);
});

export default router;
