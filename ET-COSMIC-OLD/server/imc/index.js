import { Router } from "express";
import { imcStatus, runImcAction, IMC_DISCLAIMER } from "./core.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "IMC", version: "2.0.0", disclaimer: IMC_DISCLAIMER });
});

router.get("/status", (_req, res) => {
  res.json(imcStatus());
});

router.post("/action/:action", (req, res) => {
  const out = runImcAction(req.params.action, req.body ?? {});
  if (out.error) return res.status(400).json(out);
  res.json(out);
});

router.post("/entropy/mesh", (req, res) => {
  res.json(runImcAction("VOID-510", req.body ?? {}));
});

router.post("/ising/submit", (req, res) => {
  res.json(runImcAction("VOID-511", req.body ?? {}));
});

router.post("/acoustic/derive", (req, res) => {
  res.json(runImcAction("VOID-512", req.body ?? {}));
});

router.post("/marketplace/job", (req, res) => {
  res.json(runImcAction("VOID-520", req.body ?? {}));
});

router.post("/entropy/service", (req, res) => {
  res.json(runImcAction("VOID-521", req.body ?? {}));
});

router.post("/zk/batch", (req, res) => {
  res.json(runImcAction("VOID-522", req.body ?? {}));
});

export default router;
