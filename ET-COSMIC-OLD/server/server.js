/**
 * ET-RNET Server
 *
 * Modo real:   LND REST API (LND_REST_URL + LND_MACAROON_HEX no .env)
 * Modo fallback: simulação em memória (sem variáveis de ambiente)
 *
 * Para produção soberana:
 *   LND_REST_URL=https://127.0.0.1:8080
 *   LND_MACAROON_HEX=<cat ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon | xxd -p -c 256>
 *   LND_TLS_SKIP=false  (para TLS auto-assinado em dev: true)
 */

import "./loadEnv.js";

import express from "express";
import cors from "cors";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __serverDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__serverDir, "..");
import {
  loadApiKeys,
  saveApiKeys,
  apiKeys,
  generateApiKey,
  requireApiKey,
  generateKyberKeys,
  generateDilithiumKeys,
  kemEncapsulate,
  kemDecapsulate,
  dsaSign,
  dsaVerify
} from "./pqcService.js";
import lususRouter from "./lusus/index.js";
import aqreRouter from "./aqre/index.js";
import eternetRouter from "./eternet/index.js";
import isossupraRouter from "./isossupra/index.js";
import imcRouter from "./imc/index.js";
import silentMeshRouter from "./silentMesh/index.js";
import economyRouter from "./economy/index.js";
import { flushAllEconomyStores } from "./economy/economyPersistence.js";
import voidStackRouter from "./void/index.js";
import meshLiquidityRouter from "./mesh/liquidity.js";
import {
  getPendingDeposit,
  linkInvoiceToDeposit,
  settlePairedDepositFromInvoice,
} from "./economy/pairedDeposit.js";
import { processDueRenewals } from "./mesh/tierSubscriptions.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// LND REST config
const LND_REST_URL  = (process.env.LND_REST_URL  || "").replace(/\/$/, "");
const LND_MACAROON  = (process.env.LND_MACAROON_HEX || "").trim();
const LND_TLS_SKIP  = process.env.LND_TLS_SKIP === "true";

const HAS_LND = LND_REST_URL.length > 0 && LND_MACAROON.length > 0;

const REQUIRE_LND =
  process.env.ETRNET_SERVER_REQUIRE_LND === "1" ||
  (process.env.NODE_ENV === "production" && process.env.LND_FALLBACK_SIM !== "1");

const LND_REQUEST_TIMEOUT_MS = parseInt(process.env.LND_REQUEST_TIMEOUT_MS ?? "5000", 10);

if (REQUIRE_LND && !HAS_LND) {
  console.error(
    "[ET-RNET] Produção exige LND_REST_URL + LND_MACAROON_HEX. " +
      "Modo simulação bloqueado (NODE_ENV=production ou ETRNET_SERVER_REQUIRE_LND=1). " +
      "Staging sem LND: LND_FALLBACK_SIM=1 ou ETRNET_SERVER_REQUIRE_LND=0.",
  );
  process.exit(1);
}

function canFallbackToSimulation() {
  if (process.env.LND_FALLBACK_SIM === "0") return false;
  if (process.env.LND_FALLBACK_SIM === "1") return true;
  if (REQUIRE_LND) return false;
  return true;
}

function canSimulateSettle(invoice) {
  if (!invoice) return false;
  if (invoice.mode === "simulation" || invoice.mode === "simulation_fallback") return true;
  return (
    process.env.SOV_DEPOSIT_DEMO === "1" || process.env.NODE_ENV === "development"
  );
}

// TLS auto-assinado do LND: desabilitar verificação via variável de ambiente Node
if (LND_TLS_SKIP) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// ─── Fallback em memória ──────────────────────────────────────────────────────

const invoices = new Map();

// Preços BTC aproximados (fallback)
const BTC_PRICES = { BRL: 620000, USD: 105000, EUR: 96000 };

function fiatToSats(amount, currency) {
  const price = BTC_PRICES[currency] || BTC_PRICES.USD;
  return Math.round((parseFloat(amount) / price) * 100_000_000);
}

// ─── LND REST helpers ────────────────────────────────────────────────────────

// Node 22+ tem fetch nativo — sem node-fetch necessário
async function lndFetch(path, init = {}) {
  const res = await fetch(`${LND_REST_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(LND_REQUEST_TIMEOUT_MS),
    headers: {
      "Grpc-Metadata-Macaroon": LND_MACAROON,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LND ${init.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function lndGet(path) {
  return lndFetch(path, { method: "GET" });
}

async function lndPost(path, body) {
  return lndFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function storeSimulatedInvoice({
  amountSat,
  amount,
  currency,
  memo,
  pairedDepositId,
  mode = "simulation",
  lndError = null,
}) {
  const paymentHash = crypto.randomBytes(32).toString("hex");
  const invoiceData = {
    id: crypto.randomUUID(),
    invoice: `lnbc${amountSat}n1simulated${paymentHash.slice(0, 16)}`,
    paymentHash,
    amountSat,
    amount: amount || amountSat.toString(),
    currency: currency || "SAT",
    label: memo,
    pairedDepositId: pairedDepositId ? String(pairedDepositId) : null,
    pairedCredited: false,
    status: "pending",
    mode,
    lndError,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3_600_000,
  };
  invoices.set(invoiceData.id, invoiceData);
  if (pairedDepositId) linkInvoiceToDeposit(String(pairedDepositId), invoiceData.id);
  return invoiceData;
}

function invoiceCreateResponse(invoiceData) {
  return {
    id: invoiceData.id,
    invoice: invoiceData.invoice,
    amountSat: invoiceData.amountSat,
    paymentHash: invoiceData.paymentHash,
    expiresAt: invoiceData.expiresAt,
    pairedDepositId: invoiceData.pairedDepositId,
    mode: invoiceData.mode,
    ...(invoiceData.lndError ? { lndFallback: true, lndError: invoiceData.lndError } : {}),
  };
}

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/health", async (req, res) => {
  const base = {
    status: "ok",
    mode: HAS_LND ? "lnd_rest" : "simulation",
    timestamp: Date.now(),
  };

  if (!HAS_LND) {
    return res.json({
      ...base,
      invoices: invoices.size,
      warning: "Modo simulação — não usar em produção",
    });
  }

  try {
    const info = await lndGet("/v1/getinfo");
    res.json({
      ...base,
      lnd: {
        pubkey:         info.identity_pubkey,
        alias:          info.alias,
        blockHeight:    info.block_height,
        synced:         info.synced_to_chain,
        activeChannels: info.num_active_channels,
        peers:          info.num_peers,
        network:        info.chains?.[0]?.network,
      },
    });
  } catch (err) {
    res.status(503).json({ ...base, status: "lnd_unreachable", error: err.message });
  }
});

// ─── Nó Lightning: informações ───────────────────────────────────────────────

app.get("/api/lightning/info", async (_req, res) => {
  if (!HAS_LND) {
    return res.json({ mode: "simulation", message: "Configure LND_REST_URL e LND_MACAROON_HEX" });
  }
  try {
    const info = await lndGet("/v1/getinfo");
    res.json({
      pubkey:         info.identity_pubkey,
      alias:          info.alias,
      blockHeight:    info.block_height,
      synced:         info.synced_to_chain,
      activeChannels: info.num_active_channels,
    });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// ─── Saldo de canais ─────────────────────────────────────────────────────────

app.get("/api/lightning/balance", async (_req, res) => {
  if (!HAS_LND) {
    return res.json({ mode: "simulation", localSat: 0, remoteSat: 0 });
  }
  try {
    const data = await lndGet("/v1/balance/channels");
    res.json({
      localSat:   parseInt(data.local_balance?.sat  ?? "0", 10),
      remoteSat:  parseInt(data.remote_balance?.sat ?? "0", 10),
    });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// ─── Criar Invoice Lightning ──────────────────────────────────────────────────

function applyPairedDepositSettlement(invoice) {
  try {
    const paired = settlePairedDepositFromInvoice(invoice);
    if (paired?.ok && !paired.already) {
      console.log(`[PairedDeposit] Creditado ${invoice.pairedDepositId} → ledger SOV`);
    }
  } catch (err) {
    console.warn("[PairedDeposit] settle:", err?.message ?? err);
  }
}

app.post("/api/lightning/create", async (req, res) => {
  try {
    const { amount, currency, label, amountSat: directSat, pairedDepositId } = req.body;

    // Aceita sats direto ou conversão fiat
    let amountSat = directSat ?? fiatToSats(amount, currency);
    const memo = label || "ETΞRNET Payment";

    if (pairedDepositId) {
      const pending = getPendingDeposit(String(pairedDepositId));
      if (!pending || pending.status !== "pending") {
        return res.status(400).json({ error: "INVALID_PAIRED_DEPOSIT", pairedDepositId });
      }
      amountSat = pending.amountSat;
    }

    if (HAS_LND) {
      try {
        const data = await lndPost("/v1/invoices", {
          value: amountSat.toString(),
          memo,
          expiry: "3600",
        });

        const invoiceData = {
          id: crypto.randomUUID(),
          invoice: data.payment_request,
          paymentHash: data.r_hash,
          amountSat,
          amount: amount || amountSat.toString(),
          currency: currency || "SAT",
          label: memo,
          pairedDepositId: pairedDepositId ? String(pairedDepositId) : null,
          pairedCredited: false,
          status: "pending",
          mode: "lnd_real",
          createdAt: Date.now(),
          expiresAt: Date.now() + 3_600_000,
        };
        invoices.set(invoiceData.id, invoiceData);
        if (pairedDepositId) linkInvoiceToDeposit(String(pairedDepositId), invoiceData.id);

        return res.json(invoiceCreateResponse(invoiceData));
      } catch (lndErr) {
        if (!canFallbackToSimulation()) {
          return res.status(503).json({
            error: "LND_UNAVAILABLE",
            message: lndErr.message,
            hint: "Verifique LND_REST_URL, macaroon e LND_REQUEST_TIMEOUT_MS",
          });
        }
        console.warn("[Lightning] LND indisponível — fallback simulação:", lndErr.message);
        const invoiceData = storeSimulatedInvoice({
          amountSat,
          amount,
          currency,
          memo,
          pairedDepositId,
          mode: "simulation_fallback",
          lndError: lndErr.message,
        });
        return res.json(invoiceCreateResponse(invoiceData));
      }
    }

    const invoiceData = storeSimulatedInvoice({
      amountSat,
      amount,
      currency,
      memo,
      pairedDepositId,
      mode: "simulation",
    });
    res.json(invoiceCreateResponse(invoiceData));
  } catch (err) {
    console.error("[Lightning] Erro:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Status de Invoice ───────────────────────────────────────────────────────

app.get("/api/lightning/status/:id", async (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice não encontrada" });
  }

  if (Date.now() > invoice.expiresAt) {
    invoice.status = "expired";
  }

  if (HAS_LND && invoice.paymentHash) {
    try {
      // Consulta status real no LND via r_hash
      const b64 = Buffer.from(invoice.paymentHash, "hex").toString("base64");
      const data = await lndGet(`/v1/invoice/${encodeURIComponent(b64)}`);
      if (data.settled) {
        invoice.status = "confirmed";
        invoice.settledAt = parseInt(data.settle_date, 10) * 1000;
        if (invoice.apiKey && !invoice.credited) {
          const keyData = apiKeys.get(invoice.apiKey);
          if (keyData) {
            keyData.balanceSat += invoice.amountSat;
            invoice.credited = true;
            saveApiKeys();
          }
        }
        applyPairedDepositSettlement(invoice);
      }
    } catch { /* ignora — usa status em memória */ }
  }

  if (invoice.status === "confirmed") applyPairedDepositSettlement(invoice);

  res.json({
    id:            invoice.id,
    status:        invoice.status,
    amountSat:     invoice.amountSat,
    confirmations: invoice.status === "confirmed" ? 1 : 0,
    settledAt:     invoice.settledAt,
  });
});

// ─── Simular pagamento (dev / SOV_DEPOSIT_DEMO) ───────────────────────────────

app.post("/api/lightning/simulate-settle/:id", (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice não encontrada" });
  if (!canSimulateSettle(invoice)) {
    return res.status(403).json({
      error: "SIMULATE_DISABLED",
      mode: invoice.mode,
      hint: "Apenas invoices simulation/simulation_fallback ou SOV_DEPOSIT_DEMO=1",
    });
  }
  invoice.status = "confirmed";
  invoice.settledAt = Date.now();
  applyPairedDepositSettlement(invoice);
  res.json({
    ok: true,
    id: invoice.id,
    status: invoice.status,
    mode: invoice.mode,
    pairedDepositId: invoice.pairedDepositId,
  });
});

// ─── Webhook (LND / LNbits / BTCPay → confirma invoice) ─────────────────────

app.post("/api/lightning/webhook", (req, res) => {
  try {
    const { paymentHash, r_hash, status, settled } = req.body;
    const hash = paymentHash || r_hash;

    for (const [, inv] of invoices) {
      if (inv.paymentHash === hash) {
        inv.status = (status === "confirmed" || settled) ? "confirmed" : (status || "confirmed");
        inv.settledAt = Date.now();
        if (inv.status === "confirmed" && inv.apiKey && !inv.credited) {
          const keyData = apiKeys.get(inv.apiKey);
          if (keyData) {
            keyData.balanceSat += inv.amountSat;
            inv.credited = true;
            saveApiKeys();
          }
        }
        if (inv.status === "confirmed") applyPairedDepositSettlement(inv);
        console.log(`[Lightning] Pagamento ${inv.status}: ${inv.id}`);
        break;
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("[Lightning] Webhook error:", err.message);
    res.sendStatus(200);
  }
});

// ─── Pagar Invoice (proxy para LND) ──────────────────────────────────────────

app.post("/api/lightning/pay", async (req, res) => {
  if (!HAS_LND) {
    return res.status(503).json({ error: "LND não configurado. Defina LND_REST_URL e LND_MACAROON_HEX." });
  }
  try {
    const { bolt11, maxFeeSat = 10 } = req.body;
    const data = await lndPost("/v1/channels/transactions", {
      payment_request: bolt11,
      fee_limit: { fixed: maxFeeSat.toString() },
    });
    if (data.payment_error) {
      return res.status(400).json({ success: false, error: data.payment_error });
    }
    res.json({ success: true, preimage: data.payment_preimage, feeSat: data.fee_sat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Bitcoin: endereço real via LND on-chain ──────────────────────────────────

app.post("/api/bitcoin/create", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const amountSat = fiatToSats(amount || "0", currency);

    if (HAS_LND) {
      const data = await lndPost("/v1/newaddress", { type: "WITNESS_PUBKEY_HASH" });
      return res.json({
        id:        crypto.randomUUID(),
        address:   data.address,
        amountSat,
        amountBTC: (amountSat / 100_000_000).toFixed(8),
        mode:      "lnd_real",
      });
    }

    // ── Fallback: endereço bech32 simulado (marcado claramente) ──
    const seed = crypto.randomBytes(20).toString("hex");
    const address = `bc1qSIMULATED${seed.slice(0, 20)}`;
    res.json({
      id:        crypto.randomUUID(),
      address,
      amountSat,
      amountBTC: (amountSat / 100_000_000).toFixed(8),
      mode:      "simulation",
      warning:   "Endereço simulado — não usar em mainnet",
    });
  } catch (err) {
    console.error("[Bitcoin] Erro:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AQRE & LUSUS (emuladores clássicos anacróclastas) ───────────────────────

app.use("/api/lusus", lususRouter);
app.use("/api/aqre", aqreRouter);
app.use("/api/eternet", eternetRouter);
app.use("/api/isossupra", isossupraRouter);
app.use("/api/imc", imcRouter);
app.use("/api/void", voidStackRouter);
app.use("/api/silent-mesh", silentMeshRouter);
app.use("/api/economy", economyRouter);
app.use("/api/mesh/liquidity", meshLiquidityRouter);

// ─── PQC-as-a-Service Endpoints ──────────────────────────────────────────────

// Registrar novo desenvolvedor
app.post("/api/pqc/register", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Falta o nome ou e-mail de cadastro." });
  }

  const key = generateApiKey();
  const devData = {
    key,
    name,
    balanceSat: 100, // Onboarding bonus: 100 Sats gratuitos
    totalRequests: 0,
    createdAt: Date.now()
  };

  apiKeys.set(key, devData);
  saveApiKeys();

  res.json({
    message: "Cadastro realizado com sucesso! Use seu x-api-key nos cabeçalhos das requisições.",
    apiKey: key,
    balanceSat: devData.balanceSat,
    costPerRequestSat: 1
  });
});

// Consultar saldo de uma chave de API
app.get("/api/pqc/balance", (req, res) => {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) {
    return res.status(400).json({ error: "Falta x-api-key nos headers ou query." });
  }

  const data = apiKeys.get(key);
  if (!data) {
    return res.status(404).json({ error: "Chave de API não encontrada." });
  }

  res.json({
    name: data.name,
    balanceSat: data.balanceSat,
    totalRequests: data.totalRequests
  });
});

// Criar fatura de recarga para uma chave de API
app.post("/api/pqc/refill", async (req, res) => {
  const { key, amountSat } = req.body;
  if (!key || !amountSat) {
    return res.status(400).json({ error: "Falta 'key' ou 'amountSat' no corpo da requisição." });
  }

  if (!apiKeys.has(key)) {
    return res.status(404).json({ error: "Chave de API não encontrada." });
  }

  try {
    const memo = `PQC-Service Refill: ${key.slice(0, 15)}...`;
    if (HAS_LND) {
      const data = await lndPost("/v1/invoices", {
        value:  amountSat.toString(),
        memo,
        expiry: "3600",
      });

      const invoiceData = {
        id:          crypto.randomUUID(),
        invoice:     data.payment_request,
        paymentHash: data.r_hash,
        amountSat:   parseInt(amountSat, 10),
        status:      "pending",
        apiKey:      key,
        credited:    false,
        expiresAt:   Date.now() + 3_600_000,
      };
      invoices.set(invoiceData.id, invoiceData);

      return res.json({
        id:          invoiceData.id,
        invoice:     invoiceData.invoice,
        amountSat:   invoiceData.amountSat,
        paymentHash: invoiceData.paymentHash,
        expiresAt:   invoiceData.expiresAt
      });
    }

    // Fallback simulado
    const paymentHash = crypto.randomBytes(32).toString("hex");
    const invoiceData = {
      id:          crypto.randomUUID(),
      invoice:     `lnbc${amountSat}n1simulated${paymentHash.slice(0, 16)}`,
      paymentHash,
      amountSat:   parseInt(amountSat, 10),
      status:      "pending",
      apiKey:      key,
      credited:    false,
      expiresAt:   Date.now() + 3_600_000,
    };
    invoices.set(invoiceData.id, invoiceData);

    res.json({
      id:          invoiceData.id,
      invoice:     invoiceData.invoice,
      amountSat:   invoiceData.amountSat,
      paymentHash: invoiceData.paymentHash,
      expiresAt:   invoiceData.expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Métodos de Criptografia Pós-Quântica (Protegidos por requireApiKey) ---

// 1. Gerar Chaves (Kyber ou Dilithium)
app.post("/api/pqc/v1/generate-keys", requireApiKey, (req, res) => {
  const { algorithm } = req.body;
  if (algorithm === "ML-KEM-1024") {
    return res.json(generateKyberKeys());
  } else if (algorithm === "ML-DSA-87") {
    return res.json(generateDilithiumKeys());
  } else {
    return res.status(400).json({ error: "Algoritmo inválido. Escolha 'ML-KEM-1024' ou 'ML-DSA-87'." });
  }
});

// 2. Encapsulamento de Chave (ML-KEM)
app.post("/api/pqc/v1/encapsulate", requireApiKey, (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: "Falta 'publicKey' em formato hexadecimal." });
  }
  try {
    res.json(kemEncapsulate(publicKey));
  } catch (err) {
    res.status(400).json({ error: `Erro no encapsulamento: ${err.message}` });
  }
});

// 3. Desencapsulamento de Chave (ML-KEM)
app.post("/api/pqc/v1/decapsulate", requireApiKey, (req, res) => {
  const { privateKey, ciphertext } = req.body;
  if (!privateKey || !ciphertext) {
    return res.status(400).json({ error: "Falta 'privateKey' ou 'ciphertext' em formato hexadecimal." });
  }
  try {
    res.json(kemDecapsulate(privateKey, ciphertext));
  } catch (err) {
    res.status(400).json({ error: `Erro no desencapsulamento: ${err.message}` });
  }
});

// 4. Assinatura Digital (ML-DSA)
app.post("/api/pqc/v1/sign", requireApiKey, (req, res) => {
  const { privateKey, message } = req.body;
  if (!privateKey || !message) {
    return res.status(400).json({ error: "Falta 'privateKey' ou 'message' em formato hexadecimal." });
  }
  try {
    res.json(dsaSign(privateKey, message));
  } catch (err) {
    res.status(400).json({ error: `Erro ao assinar: ${err.message}` });
  }
});

// 5. Verificação de Assinatura (ML-DSA)
app.post("/api/pqc/v1/verify", requireApiKey, (req, res) => {
  const { publicKey, message, signature } = req.body;
  if (!publicKey || !message || !signature) {
    return res.status(400).json({ error: "Falta 'publicKey', 'message' ou 'signature' em formato hexadecimal." });
  }
  res.json(dsaVerify(publicKey, message, signature));
});

// 6. Entropia — sempre declarada como clássica (CSPRNG ou emulação CQR)
app.get("/api/pqc/v1/entropy", requireApiKey, async (req, res) => {
  const bits = parseInt(req.query.bits || "256", 10);
  try {
    const qBase = (process.env.QUANTUM_API_URL || "http://127.0.0.1:8472").replace(/\/$/, "");
    const qRes = await fetch(`${qBase}/quantum/entropy?bits=${bits}`);
    if (qRes.ok) {
      const data = await qRes.json();
      return res.json({
        source: "CQR_CLASSICAL_EMULATION",
        certified_quantum: false,
        disclaimer:
          "Entropia de alta qualidade via simulação clássica — não aleatoriedade quântica certificada.",
        ...data,
      });
    }
  } catch { /* fallback */ }

  const bytes = crypto.randomBytes(bits / 8);
  res.json({
    source: "NODE_CRYPTO_SECURE_RANDOM",
    certified_quantum: false,
    disclaimer:
      "Entropia clássica CSPRNG (Node crypto.randomBytes) — não QRNG nem colapso de medição.",
    bits,
    sha3_256: crypto.createHash("sha3-256").update(bytes).digest("hex"),
    entropy_hex: bytes.toString("hex"),
  });
});

const distPath = join(repoRoot, "dist");
const publicPath = join(repoRoot, "public");
app.use(express.static(publicPath));
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(join(distPath, "index.html"), (err) => {
    if (err) {
      console.error(
        `[ET-RNET] dist não encontrado em ${distPath}. Rode na raiz: npm run build`,
      );
      res.status(503).send("Frontend não compilado. Execute: npm run build");
    }
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const TIER_RENEW_MS = parseInt(process.env.SOV_TIER_RENEW_INTERVAL_MS ?? "3600000", 10);

function runTierRenewalJob() {
  try {
    const report = processDueRenewals();
    if (report.processed > 0) {
      console.log(
        `[TierRenewal] processadas=${report.processed} renovadas=${report.renewed} falhas=${report.failed}`,
      );
    }
  } catch (err) {
    console.warn("[TierRenewal]", err?.message ?? err);
  }
}

const httpServer = app.listen(PORT, () => {
  loadApiKeys();
  if (process.env.SOV_TIER_AUTO_RENEW !== "0") {
    runTierRenewalJob();
    setInterval(runTierRenewalJob, TIER_RENEW_MS).unref?.();
  }
  const mode = HAS_LND ? `LND REAL → ${LND_REST_URL}` : "SIMULAÇÃO (defina LND_REST_URL e LND_MACAROON_HEX)";
  console.log(`\n⚡ ET-RNET Server → http://localhost:${PORT}`);
  console.log(`   Modo: ${mode}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   LUSUS:    http://localhost:${PORT}/api/lusus/health`);
  console.log(`   AQRE:     http://localhost:${PORT}/api/aqre/health`);
  console.log(`   ETERNET:    http://localhost:${PORT}/api/eternet/health`);
  console.log(`   ISOSSUPRA:  http://localhost:${PORT}/api/isossupra/health`);
  console.log(`   IMC v2:     http://localhost:${PORT}/api/imc/health`);
  console.log(`   VOID-700:   http://localhost:${PORT}/api/silent-mesh/health`);
  console.log(`   SOV:        http://localhost:${PORT}/api/economy/health\n`);
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[ET-RNET] Porta ${PORT} já em uso.\n` +
        `  • Container Docker: docker ps | grep 3001  →  docker stop etrnet-server\n` +
        `  • Ou use outra porta: PORT=3002 node server.js\n` +
        `    (no Vite: ETRNET_SERVER_PORT=3002 no .env da raiz do projeto)\n`,
    );
    process.exit(1);
  }
  throw err;
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    flushAllEconomyStores();
    httpServer.close(() => process.exit(0));
  });
}
