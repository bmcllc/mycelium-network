/**
 * Standalone server — AQRE Engine
 * Express app independente com apenas o router AQRE.
 * Deploy: node server/aqre/standalone.js
 */

import express from "express";
import aqreRouter from "./index.js";

const app = express();
const PORT = process.env.AQRE_PORT || 3015;

app.use(express.json());
app.use("/api/aqre", aqreRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "aqre", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[AQRE Engine] listening on :${PORT}`);
});
