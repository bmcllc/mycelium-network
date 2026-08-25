/**
 * Standalone server — Isossupra
 * Express app independente com apenas o router Isossupra.
 * Deploy: node server/isossupra/standalone.js
 */

import express from "express";
import isossupraRouter from "./index.js";

const app = express();
const PORT = process.env.ISOSSUPRA_PORT || 3014;

app.use(express.json());
app.use("/api/isossupra", isossupraRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "isossupra", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[Isossupra] listening on :${PORT}`);
});
