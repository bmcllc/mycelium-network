/**
 * Standalone server — PQC-as-a-Service
 * Express app independente com apenas o router PQC.
 * Deploy: node server/pqcService/standalone.js
 */

import express from "express";
import { Router } from "express";
import { keygenMLKEM1024, encapsulateMLKEM1024, decapsulateMLKEM1024, keygenMLDSA87, signMLDSA87, verifyMLDSA87 } from "../pqcService.js";

const pqcRouter = Router();

pqcRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", algorithms: ["ML-KEM-1024", "ML-DSA-87"] });
});

pqcRouter.post("/ml-kem/keygen", (_req, res) => {
  res.json(keygenMLKEM1024());
});

pqcRouter.post("/ml-kem/encapsulate", (req, res) => {
  res.json(encapsulateMLKEM1024(req.body.publicKey));
});

pqcRouter.post("/ml-kem/decapsulate", (req, res) => {
  res.json(decapsulateMLKEM1024(req.body.ciphertext, req.body.secretKey));
});

pqcRouter.post("/ml-dsa/keygen", (_req, res) => {
  res.json(keygenMLDSA87());
});

pqcRouter.post("/ml-dsa/sign", (req, res) => {
  res.json(signMLDSA87(req.body.message, req.body.secretKey));
});

pqcRouter.post("/ml-dsa/verify", (req, res) => {
  res.json(verifyMLDSA87(req.body.message, req.body.signature, req.body.publicKey));
});

const app = express();
const PORT = process.env.PQC_PORT || 3016;

app.use(express.json());
app.use("/api/pqc", pqcRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "pqc-service", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[PQC Service] listening on :${PORT}`);
});
