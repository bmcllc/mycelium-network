/**
 * Standalone server — PMU Governance
 * Express app independente para governança on-chain.
 * Deploy: node server/pmu/standalone.js
 */

import express from "express";
import { Router } from "express";

const pmuRouter = Router();

// In-memory governance state (persisted via JSON in production)
const proposals = new Map();
const votes = new Map();
let proposalCounter = 0;

pmuRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "pmu-governance", proposals: proposals.size });
});

pmuRouter.get("/proposals", (_req, res) => {
  res.json([...proposals.values()].sort((a, b) => b.createdAt - a.createdAt));
});

pmuRouter.post("/proposals", (req, res) => {
  const id = `prop-${++proposalCounter}`;
  const proposal = {
    id,
    title: req.body.title ?? "Untitled",
    description: req.body.description ?? "",
    creator: req.body.creator ?? "anonymous",
    status: "active",
    createdAt: Date.now(),
    endsAt: Date.now() + (req.body.durationMs ?? 7 * 24 * 3600_000),
  };
  proposals.set(id, proposal);
  votes.set(id, { yes: 0, no: 0, voters: new Set() });
  res.json(proposal);
});

pmuRouter.post("/proposals/:id/vote", (req, res) => {
  const { id } = req.params;
  const proposal = proposals.get(id);
  if (!proposal) return res.status(404).json({ error: "NOT_FOUND" });
  if (proposal.status !== "active") return res.status(400).json({ error: "CLOSED" });

  const voter = req.body.voter ?? "anonymous";
  const support = !!req.body.support;
  const v = votes.get(id);

  if (v.voters.has(voter)) return res.status(409).json({ error: "ALREADY_VOTED" });
  v.voters.add(voter);
  if (support) v.yes += 1;
  else v.no += 1;

  // Auto-close if quorum reached (simplified)
  if (v.yes + v.no >= (req.body.quorum ?? 10)) {
    proposal.status = v.yes > v.no ? "passed" : "rejected";
  }

  res.json({ proposalId: id, support, yes: v.yes, no: v.no, status: proposal.status });
});

pmuRouter.get("/consent", (_req, res) => {
  res.json({
    scopes: ["IDENTITY_COLLECTION", "ECONOMIC_ATTENTION", "LDK_LND_REMOTE", "SENSOR_DATA"],
    version: "v1",
    description: "PMU consent lattice levels",
  });
});

const app = express();
const PORT = process.env.PMU_PORT || 3018;

app.use(express.json());
app.use("/api/pmu", pmuRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "pmu-governance", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[PMU Governance] listening on :${PORT}`);
});
