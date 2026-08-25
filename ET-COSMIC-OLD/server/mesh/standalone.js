/**
 * Standalone server — Mesh Liquidity
 * Express app independente com apenas o router de mesh/liquidez.
 * Deploy: node server/mesh/standalone.js
 */

import express from "express";
import meshLiquidityRouter from "./liquidity.js";

const app = express();
const PORT = process.env.MESH_PORT || 3012;

app.use(express.json());
app.use("/api/mesh/liquidity", meshLiquidityRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "mesh-liquidity", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[Mesh Liquidity] listening on :${PORT}`);
});
