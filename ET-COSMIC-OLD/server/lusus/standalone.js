/**
 * Standalone server — LUSUS Engine
 * Express app independente com apenas o router LUSUS.
 * Deploy: node server/lusus/standalone.js
 */

import express from "express";
import lususRouter from "./index.js";

const app = express();
const PORT = process.env.LUSUS_PORT || 3010;

app.use(express.json());
app.use("/api/lusus", lususRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "lusus", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[LUSUS Engine] listening on :${PORT}`);
});
