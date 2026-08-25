/**
 * LUSUS HTTP router — Latim: ilusão/jogo/truque — fenômenos clássicos na fronteira do colapso.
 */

import { Router } from "express";
import { cavityModes } from "./cavity_planck.js";
import { storeVortex, readVortex, listVortices, stepVortexDynamics, calculateHamiltonian, calculateAngularMomentum } from "./vortex_memory.js";
import { solveMaxCut, randomGraph } from "./ising_machine.js";
import { solveDiatomic } from "./thomas_fermi_solver.js";
import { adiabaticShift } from "./adiabatic_shifter.js";
import { stepCooler } from "./grav_mimetic_cooler.js";
import { correlatedPair, chshTest } from "./chaos_bell.js";
import { runTensorContract, tensorContractStatus } from "./tensor_contract.js";

export const LUSUS_DISCLAIMER =
  "LUSUS: máquina de estados coerentes clássicos. Parece quântico; viola o hype, não as leis da física.";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "LUSUS", disclaimer: LUSUS_DISCLAIMER });
});

router.get("/status", (_req, res) => {
  res.json({
    engine: "LUSUS",
    modules: [
      "cavity_planck",
      "vortex_memory",
      "ising_machine",
      "thomas_fermi_solver",
      "adiabatic_shifter",
      "grav_mimetic_cooler",
      "chaos_bell",
      "tensor_contract",
    ],
    disclaimer: LUSUS_DISCLAIMER,
  });
});

router.get("/cavity", (req, res) => {
  const nMax = Math.min(64, parseInt(req.query.modes ?? "24", 10));
  res.json(cavityModes(nMax));
});

router.post("/vortex/store", (req, res) => {
  const { id, circulation, position } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "id required" });
  res.json(storeVortex(id, circulation ?? 1, position));
});

router.get("/vortex/:id", (req, res) => {
  res.json(readVortex(req.params.id));
});

router.get("/vortex", (_req, res) => {
  res.json({ vortices: listVortices(), hamiltonian: calculateHamiltonian(), angularMomentum: calculateAngularMomentum() });
});

router.post("/vortex/step", (req, res) => {
  const dt = parseFloat(req.body?.dt ?? "0.05");
  res.json(stepVortexDynamics(dt));
});

router.post("/ising/maxcut", (req, res) => {
  const n = Math.min(64, Math.max(4, parseInt(req.body?.n ?? "12", 10)));
  const edges = req.body?.edges ?? randomGraph(n);
  res.json(solveMaxCut(n, edges, req.body?.iterations ?? 300));
});

router.get("/thomas-fermi/h2", (req, res) => {
  const sep = parseFloat(req.query.separation ?? "1.4");
  res.json(solveDiatomic(sep));
});

router.get("/adiabatic/shift", (req, res) => {
  const f0 = parseFloat(req.query.f0 ?? "10e9");
  const ratio = parseFloat(req.query.ratio ?? "100");
  res.json(adiabaticShift(f0, ratio));
});

router.post("/cooler/step", (req, res) => {
  const { T_kinetic, E_injected } = req.body ?? {};
  res.json(stepCooler(T_kinetic ?? 300, E_injected ?? 10));
});

router.get("/chaos-bell", (req, res) => {
  const seed = parseInt(req.query.seed ?? String(Date.now() % 10000), 10);
  res.json(correlatedPair(seed));
});

router.get("/chaos-bell/chsh", (req, res) => {
  const mode = req.query.mode === "chaos" ? "chaos" : "lhv";
  const nTrials = Math.min(10000, Math.max(100, parseInt(req.query.trials ?? "2000", 10)));
  res.json(chshTest(mode, nTrials));
});

router.get("/tensor/status", async (_req, res) => {
  res.json(await tensorContractStatus());
});

router.post("/tensor/contract", async (req, res) => {
  try {
    const body = req.body ?? {};
    if (body.mode !== "matrix" && body.mode !== "mps_chain") {
      return res.status(400).json({ error: "mode must be matrix or mps_chain" });
    }
    const result = await runTensorContract(body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: String(e.message ?? e) });
  }
});

export default router;
