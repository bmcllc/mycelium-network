/**
 * AQRE HTTP router — montar em /api/aqre
 */

import { Router } from "express";
import {
  runTask,
  getStatus,
  evaluateIndicators,
  AQRE_DISCLAIMER,
} from "./orchestrator.js";
import { recordLscReading, getLscHistory, lscGuardMiddleware } from "./lsc_monitor.js";
import { sampleChiField } from "./chi_field.js";
import { planStaRoute, resolveStaGeodesic } from "./sta_geodesic.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "AQRE", disclaimer: AQRE_DISCLAIMER });
});

router.get("/status", (_req, res) => {
  res.json(getStatus());
});

router.get("/limits", (_req, res) => {
  res.json({
    fundamental: [
      "Explosão exponencial de memória (7^N, 2^N)",
      "Precisão finita vs amplitudes contínuas",
      "Pseudo-aleatoriedade — sem colapso genuíno",
      "Não-clonagem violada em simuladores (memcpy)",
      "Sem emaranhamento não-local físico",
    ],
    operational: {
      maxSpinNodes: 20,
      maxHeptitsUI: 4,
      lscCriticalCepsilon: 0.86,
      httpOnExceed: 429,
    },
    classification: {
      red: "Impossível classicamente (QC real, QRNG certificado)",
      orange: "Exponencialmente inviável (>30 qubits/qusepts)",
      yellow: "Especulativo testável (χ cosmológico, gravidade com memória)",
      green: "Realizável agora (SDF, LSC fenomenológica, PQC, Nostr)",
    },
  });
});

router.post("/lsc/record", (req, res) => {
  const reading = recordLscReading(req.body ?? {});
  res.status(reading.allowed ? 200 : 429).json(reading);
});

router.get("/lsc/history", (_req, res) => {
  res.json({ readings: getLscHistory() });
});

router.post("/evaluate", (req, res) => {
  res.json(evaluateIndicators(req.body ?? {}));
});

router.post("/run", lscGuardMiddleware, (req, res) => {
  const { task, ...params } = req.body ?? {};
  const out = runTask(task, params);
  res.status(out.ok ? 200 : out.status ?? 400).json(out);
});

router.post("/sta/geodesic", (req, res) => {
  const distance = Number(req.body?.distance ?? 1.0);
  const scale = Number(req.body?.scale ?? 1.0);
  res.json({ engine: "STAUmpire", ...resolveStaGeodesic(distance, scale) });
});

router.post("/sta/route", (req, res) => {
  res.json(planStaRoute(req.body ?? {}));
});

router.get("/research/chi", (_req, res) => {
  res.json({
    route: "research",
    speculative: true,
    ...sampleChiField(24),
  });
});

export default router;
