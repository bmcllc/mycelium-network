/**
 * Standalone server — Sovereign Economy
 * Express app independente com apenas o router de economia.
 * Deploy: node server/economy/standalone.js
 */

import express from "express";
import economyRouter from "./index.js";

const app = express();
const PORT = process.env.ECONOMY_PORT || 3011;

app.use(express.json());
app.use("/api/economy", economyRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "sovereign-economy", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[Sovereign Economy] listening on :${PORT}`);
});
