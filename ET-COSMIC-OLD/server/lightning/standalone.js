/**
 * Standalone server — Lightning / Payment Gateway
 * Express app independente com apenas o router Lightning/LND.
 * Deploy: node server/lightning/standalone.js
 */

import express from "express";
import { Router } from "express";

const lightningRouter = Router();

// LND REST configuration
const LND_REST = process.env.LND_REST || "https://localhost:8080";
const LND_MACAROON = process.env.LND_MACAROON || "";

async function lndFetch(path, opts = {}) {
  const res = await fetch(`${LND_REST}${path}`, {
    ...opts,
    headers: {
      "Grpc-Metadata-macaroon": LND_MACAROON,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`LND ${res.status}: ${await res.text()}`);
  return res.json();
}

lightningRouter.get("/health", async (_req, res) => {
  try {
    const info = await lndFetch("/v1/getinfo");
    res.json({ status: "ok", alias: info.alias, synced: info.synced_to_chain, peers: info.num_peers });
  } catch (e) {
    res.json({ status: "degraded", error: e.message });
  }
});

lightningRouter.get("/info", async (_req, res) => {
  try {
    res.json(await lndFetch("/v1/getinfo"));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

lightningRouter.get("/balance", async (_req, res) => {
  try {
    res.json(await lndFetch("/v1/balance/channels"));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

lightningRouter.post("/invoice", async (req, res) => {
  try {
    const { value_sat, memo } = req.body;
    res.json(await lndFetch("/v1/invoices", {
      method: "POST",
      body: JSON.stringify({ value: String(value_sat), memo: memo || "ETRNET payment" }),
    }));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

lightningRouter.post("/pay", async (req, res) => {
  try {
    const { payment_request } = req.body;
    res.json(await lndFetch("/v1/channels/transactions", {
      method: "POST",
      body: JSON.stringify({ payment_request }),
    }));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

lightningRouter.get("/channels", async (_req, res) => {
  try {
    res.json(await lndFetch("/v1/channels"));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

const app = express();
const PORT = process.env.LIGHTNING_PORT || 3017;

app.use(express.json());
app.use("/api/lightning", lightningRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "lightning-payment", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[Lightning Gateway] listening on :${PORT}`);
});
