/**
 * VOID Sovereign Stack — API unificada
 * POST /api/void { service, payload }
 */
import { Router } from "express";
import { bridgeSolve, bridgeSavings } from "./bridge.js";
import { pciHandshake, pciRespond } from "./pci.js";
import { meshRegister, meshTaskNext, meshTaskSubmit, meshStatus } from "./mesh.js";
import { voidComputeStatus } from "./compute.js";

const VOID_DISCLAIMER =
  "VOID Sovereign Stack · Anacroclastia × Isossupramulação · AGPL-3.0-or-later";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    stack: "VOID-SOVEREIGN",
    version: "1.0.0",
    license: "AGPL-3.0-or-later",
    disclaimer: VOID_DISCLAIMER,
  });
});

router.get("/status", (_req, res) => {
  res.json({
    stack: "VOID-SOVEREIGN",
    version: "1.0.0",
    license: "AGPL-3.0-or-later",
    products: ["VOID-BRIDGE", "VOID-PCI", "VOID-MESH"],
    compute: voidComputeStatus(),
    mesh: meshStatus(),
    disclaimer: VOID_DISCLAIMER,
  });
});

router.post("/", (req, res) => {
  const { service, payload = {} } = req.body ?? {};
  try {
    switch (service) {
      case "bridge.solve":
        return res.json({ ok: true, ...bridgeSolve(payload) });
      case "bridge.savings":
        return res.json({ ok: true, ...bridgeSavings(payload.records, payload.voidMonthlyPrice) });
      case "pci.handshake":
        return res.json({ ok: true, ...pciHandshake(payload.peerId) });
      case "pci.respond":
        return res.json({ ok: true, ...pciRespond(payload.sessionId, payload) });
      case "mesh.register":
        return res.json({ ok: true, ...meshRegister(payload) });
      case "mesh.task.next":
        return res.json({ ok: true, ...meshTaskNext(payload.ghostId, payload.capabilities) });
      case "mesh.task.submit":
        return res.json({ ok: true, ...meshTaskSubmit(payload) });
      default:
        return res.status(400).json({
          ok: false,
          error: `Serviço desconhecido: ${service}. Disponíveis: bridge.solve, bridge.savings, pci.handshake, pci.respond, mesh.register, mesh.task.next, mesh.task.submit`,
        });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message ?? e) });
  }
});

export default router;
