import { Router } from "express";
import {
  economyStatus,
  getBalance,
  getHistory,
  creditAccount,
} from "./sovLedger.js";
import {
  createPairedDepositIntent,
  getDepositStatus,
  satPerSovRate,
  simulateSettleDeposit,
} from "./pairedDeposit.js";
import { economyPersistenceEnabled, POOL_DIR } from "./economyPersistence.js";
import { publishBinary, listBinaries, getBinary, purchaseBinary, publishArtifact, listArtifacts, getArtifact, purchaseArtifact } from "./binaryMarket.js";
import {
  registerHostingSite,
  recordHostingTraffic,
  listHostingSites,
  getHostingRates,
} from "./hostingRevenue.js";
import {
  registerMiner,
  submitEthicalWork,
  listMiners,
  getMiningRewards,
} from "./ethicalMining.js";
import { creditDMCU, burnDMCU, transferDMCU, creditDMCG, getDMCBalance, getDMCStatus, flushDMCTokens } from "./dmcToken.js";
import { submitProofOfWork, getDeviceStatus, getRewardRates, getPoDStats } from "./proofOfData.js";
import { reportConnectivity, distributeDmcgRewards, getNodeStatus, getPoCStats } from "./proofOfConnectivity.js";
import {
  registerLP, listLPs, mintStable, burnStable, transferStable,
  getStableBalance, getAllBalances, getSwiftChainStatus, getTxHistory,
  flushSwiftChain,
} from "./swiftChain.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", engine: "SOV-Economy", ...economyStatus() });
});

router.get("/status", (_req, res) => {
  res.json({
    ...economyStatus(),
    poolDir: POOL_DIR,
    stores: {
      ledger: economyPersistenceEnabled(),
      binaries: listBinaries().length,
      artifacts: listArtifacts().length,
      hostingSites: listHostingSites().length,
      miners: listMiners().length,
    },
  });
});

router.get("/balance/:accountId", (req, res) => {
  res.json(getBalance(req.params.accountId));
});

router.get("/history/:accountId", (req, res) => {
  res.json(getHistory(req.params.accountId, parseInt(req.query.limit ?? "30", 10)));
});

router.post("/balance/:accountId/credit", (req, res) => {
  res.json(creditAccount(req.params.accountId, req.body?.amountMicro ?? 0, req.body?.meta ?? {}));
});

// ─── Depósito pareado local → ledger $SOV (FR-001) ───────────────────────────

router.get("/deposit/paired/rate", (_req, res) => {
  res.json({ satPerSov: satPerSovRate(), currency: "SAT", pairedTo: "SOV" });
});

router.post("/deposit/paired/intent", (req, res) => {
  const result = createPairedDepositIntent(req.body ?? {});
  if (result.error) {
    const code =
      result.error === "SIMULATED_DISABLED" || result.error === "SIMULATE_DISABLED" ? 403 : 400;
    res.status(code).json(result);
    return;
  }
  res.json(result);
});

router.get("/deposit/paired/:depositId", (req, res) => {
  const result = getDepositStatus(req.params.depositId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

router.post("/deposit/paired/confirm-sim", (req, res) => {
  const result = simulateSettleDeposit(req.body?.depositId);
  if (result.error) {
    const code = result.error === "SIMULATE_DISABLED" ? 403 : 400;
    res.status(code).json(result);
    return;
  }
  res.json(result);
});

router.get("/binaries", (_req, res) => {
  res.json({ sku: "VOID-703", artifacts: listBinaries() });
});

router.post("/binaries/publish", (req, res) => {
  res.json(publishBinary(req.body ?? {}));
});

router.get("/binaries/:id", (req, res) => {
  res.json(getBinary(req.params.id));
});

router.post("/binaries/:id/purchase", (req, res) => {
  res.json(purchaseBinary(req.params.id, req.body?.buyerId ?? "buyer:anonymous"));
});

// ─── Generic Data Marketplace (VOID-703 extended) ────────────────────────────

router.get("/artifacts", (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.seller) filter.sellerId = req.query.seller;
  if (req.query.maxPrice) filter.maxPriceSov = parseFloat(req.query.maxPrice);
  res.json({ sku: "VOID-703", artifacts: listArtifacts(filter) });
});

router.post("/artifacts/publish", (req, res) => {
  res.json(publishArtifact(req.body ?? {}));
});

router.get("/artifacts/:id", (req, res) => {
  res.json(getArtifact(req.params.id));
});

router.post("/artifacts/:id/purchase", (req, res) => {
  res.json(purchaseArtifact(req.params.id, req.body?.buyerId ?? "buyer:anonymous"));
});

router.get("/hosting/rates", (_req, res) => res.json(getHostingRates()));

router.get("/hosting/sites", (_req, res) => {
  res.json({ sku: "VOID-704", sites: listHostingSites() });
});

router.post("/hosting/sites/register", (req, res) => {
  res.json(registerHostingSite(req.body ?? {}));
});

router.post("/hosting/sites/:siteId/traffic", (req, res) => {
  res.json(recordHostingTraffic(req.params.siteId, req.body ?? {}));
});

router.get("/mining/rewards", (_req, res) => res.json(getMiningRewards()));

router.get("/mining/workers", (_req, res) => {
  res.json({ sku: "VOID-705", workers: listMiners() });
});

router.post("/mining/workers/register", (req, res) => {
  res.json(registerMiner(req.body?.workerId, req.body ?? {}));
});

router.post("/mining/workers/:workerId/work", (req, res) => {
  res.json(submitEthicalWork(req.params.workerId, req.body ?? {}));
});

// ─── DMC Dual Token ──────────────────────────────────────────────────────────

router.get("/dmc/status", (_req, res) => {
  res.json(getDMCStatus());
});

router.get("/dmc/balance/:accountId", (req, res) => {
  res.json(getDMCBalance(req.params.accountId));
});

// ─── Proof-of-Data ───────────────────────────────────────────────────────────

router.post("/pod/submit", (req, res) => {
  const { deviceId, workType, proof } = req.body ?? {};
  res.json(submitProofOfWork(deviceId, workType, proof));
});

router.get("/pod/device/:deviceId", (req, res) => {
  res.json(getDeviceStatus(req.params.deviceId));
});

router.get("/pod/rates", (_req, res) => {
  res.json(getRewardRates());
});

router.get("/pod/stats", (_req, res) => {
  res.json(getPoDStats());
});

// ─── Proof-of-Connectivity ───────────────────────────────────────────────────

router.post("/poc/report", (req, res) => {
  const { nodeId, metrics } = req.body ?? {};
  res.json(reportConnectivity(nodeId, metrics));
});

router.post("/poc/distribute", (_req, res) => {
  res.json(distributeDmcgRewards());
});

router.get("/poc/node/:nodeId", (req, res) => {
  res.json(getNodeStatus(req.params.nodeId));
});

router.get("/poc/stats", (_req, res) => {
  res.json(getPoCStats());
});

// ─── SwiftChain: Stablecoins Locais + Liquidez P2P ──────────────────────────

router.get("/swift/status", (_req, res) => {
  res.json(getSwiftChainStatus());
});

router.get("/swift/lps", (req, res) => {
  res.json(listLPs(req.query.currency));
});

router.post("/swift/lps/register", (req, res) => {
  res.json(registerLP(req.body ?? {}));
});

router.post("/swift/mint", (req, res) => {
  const { lpId, accountId, currency, amountLocal } = req.body ?? {};
  res.json(mintStable(lpId, accountId, currency, amountLocal));
});

router.post("/swift/burn", (req, res) => {
  const { lpId, accountId, currency, amountLocal } = req.body ?? {};
  res.json(burnStable(lpId, accountId, currency, amountLocal));
});

router.post("/swift/transfer", (req, res) => {
  const { fromId, toId, fromCurrency, toCurrency, amountLocal } = req.body ?? {};
  res.json(transferStable(fromId, toId, fromCurrency, toCurrency, amountLocal));
});

router.get("/swift/balance/:accountId", (req, res) => {
  res.json(getAllBalances(req.params.accountId));
});

router.get("/swift/balance/:accountId/:currency", (req, res) => {
  res.json(getStableBalance(req.params.accountId, req.params.currency));
});

router.get("/swift/history/:accountId", (req, res) => {
  res.json(getTxHistory(req.params.accountId, parseInt(req.query.limit) || 50));
});

// ─── Pay with any method: $SOV, EUR, sBRL, Lightning ─────────────────────────

router.post("/pay", (req, res) => {
  const { method, accountId, productId, amount, currency } = req.body ?? {};

  switch (method) {
    case "sov": {
      // Pagamento direto em $SOV
      const amountMicro = Math.floor((amount ?? 0) * 1_000_000);
      const tx = transferWithFee(accountId, "treasury:montelauro", amountMicro, "product");
      res.json({ method: "sov", productId, ...tx });
      break;
    }
    case "lightning": {
      // Pagamento via Lightning (NWC) — retorna invoice
      res.json({
        method: "lightning",
        productId,
        status: "invoice_required",
        message: "Connect NWC wallet at /finance/payment to create invoice",
        redirect: `/finance/payment?product=${productId}`,
      });
      break;
    }
    case "stablecoin": {
      // Pagamento em stablecoin local (sBRL, sUSD, sEUR, sGBP)
      const tx = transferStable(accountId, "treasury:montelauro", currency, "SOV", amount);
      res.json({ method: "stablecoin", productId, currency, ...tx });
      break;
    }
    default:
      res.json({
        error: "UNKNOWN_METHOD",
        supported: ["sov", "lightning", "stablecoin"],
        message: "Use 'sov' for $SOV, 'lightning' for NWC, or 'stablecoin' for sBRL/sUSD/sEUR/sGBP",
      });
  }
});

export default router;
