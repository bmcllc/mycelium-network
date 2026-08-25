/**
 * Standalone server — IMC Compute
 * Express app independente com apenas o router IMC.
 * Deploy: node server/imc/standalone.js
 */

import express from "express";
import imcRouter from "./index.js";

const app = express();
const PORT = process.env.IMC_PORT || 3013;

app.use(express.json());
app.use("/api/imc", imcRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "imc-compute", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[IMC Compute] listening on :${PORT}`);
});
