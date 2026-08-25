/**
 * API mesh liquidity — pools, tiers, DAT, SLA, liquidity mining.
 */
import { Router } from "express";
import { registerDat, getDat, listDats } from "./datRegistry.js";
import { consumeDat, POOLS } from "./datSettlement.js";
import {
  createSlaCommitment,
  submitUptimeProof,
  evaluateSlaCommitment,
  getSlaCommitment,
  listSlaCommitments,
} from "./slaContract.js";
import {
  registerLiquidityProvider,
  bootstrapStatus,
  listLiquidityProviders,
  getLiquidityProvider,
} from "./liquidityMining.js";
import { checkoutPmuAudit, pmuAuditPrice } from "./vasCheckout.js";
import {
  builderTierPrice,
  getTierStatus,
  processDueRenewals,
  subscribeTier,
  TIER_CATALOG,
} from "./tierSubscriptions.js";

const LIQUIDITY_POOLS = [
  { id: "POOL-COMPUTE", protocolFeeBps: 250, basePriceMicroPerUnit: 1000 },
  { id: "POOL-STORAGE", protocolFeeBps: 180, basePriceMicroPerUnit: 200 },
  { id: "POOL-AI", protocolFeeBps: 320, basePriceMicroPerUnit: 5000 },
  { id: "POOL-QUANTUM", protocolFeeBps: 450, basePriceMicroPerUnit: 8000 },
  { id: "POOL-IDENTITY", protocolFeeBps: 120, basePriceMicroPerUnit: 500 },
];

const ACCESS_TIERS = [
  { id: "citizen", monthlySov: 50, rateLimitPerHour: 100 },
  { id: "builder", monthlySov: 250, rateLimitPerHour: 1000 },
  { id: "enterprise", monthlySov: 2500, rateLimitPerHour: null },
  { id: "sovereign", monthlySov: 25000, rateLimitPerHour: null },
];

function reputationMultiplier(score) {
  const c = Math.max(0, Math.min(100, Number(score)));
  return 0.8 + (c / 100) * 0.7;
}

function computeQuote(poolId, reputationScore, units, demandFactor) {
  const pool = LIQUIDITY_POOLS.find((p) => p.id === poolId);
  const base = pool?.basePriceMicroPerUnit ?? 1000;
  const rep = reputationMultiplier(reputationScore);
  const demand = Math.max(0.5, Math.min(3, Number(demandFactor) || 1));
  const unitPriceMicro = Math.ceil(base * rep * demand);
  const u = Math.max(1, Number(units) || 1);
  return { baseMicro: base, reputationMultiplier: rep, demandFactor: demand, unitPriceMicro, totalMicro: unitPriceMicro * u };
}

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    engine: "Protocol-First-Liquidity-Mesh",
    model: "zero-contract",
    features: [
      "dat-settlement",
      "sla-code-based",
      "liquidity-mining-bootstrap",
      "vas-void-308-checkout",
      "vas-tier-builder-subscribe",
    ],
  });
});

router.get("/vas/tier/catalog", (_req, res) => {
  res.json({ tiers: TIER_CATALOG });
});

router.get("/vas/tier/builder/price", (_req, res) => {
  res.json(builderTierPrice());
});

router.post("/vas/tier/subscribe", (req, res) => {
  const result = subscribeTier(req.body ?? {});
  if (result.error) {
    const code = result.error === "INSUFFICIENT_SOV" ? 402 : 400;
    res.status(code).json(result);
    return;
  }
  res.json(result);
});

router.get("/vas/tier/status/:accountId", (req, res) => {
  const attemptRenewal = req.query.attemptRenewal !== "0";
  const result = getTierStatus(req.params.accountId, { attemptRenewal });
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post("/vas/tier/renew-due", (req, res) => {
  const secret = process.env.SOV_TIER_CRON_SECRET;
  if (secret) {
    const hdr = req.headers["x-sov-cron"] ?? req.body?.cronSecret;
    if (hdr !== secret) {
      res.status(401).json({ error: "CRON_UNAUTHORIZED" });
      return;
    }
  }
  res.json(processDueRenewals());
});

router.get("/vas/pmu-audit/price", (_req, res) => {
  res.json(pmuAuditPrice());
});

router.post("/vas/pmu-audit/checkout", (req, res) => {
  const result = checkoutPmuAudit(req.body ?? {});
  if (result.error) {
    const code = result.error === "INSUFFICIENT_SOV" ? 402 : 400;
    res.status(code).json(result);
    return;
  }
  res.json(result);
});

router.get("/pools", (_req, res) => {
  res.json({ pools: LIQUIDITY_POOLS, tiers: ACCESS_TIERS, poolFees: POOLS });
});

router.post("/quote", (req, res) => {
  const { poolId, reputationScore = 50, units = 1, demandFactor = 1 } = req.body ?? {};
  if (!poolId) {
    res.status(400).json({ error: "poolId required" });
    return;
  }
  res.json({ quote: computeQuote(poolId, reputationScore, units, demandFactor) });
});

router.post("/dat/mint", (req, res) => {
  const { resourceId, poolId, reputationScore = 50, tier = "citizen", expiryBlocks = 1440 } =
    req.body ?? {};
  if (!resourceId || !poolId) {
    res.status(400).json({ error: "resourceId and poolId required" });
    return;
  }
  const q = computeQuote(poolId, reputationScore, 1, 1);
  const block = Math.floor(Date.now() / 60000);
  const dat = registerDat({
    resourceId: String(resourceId),
    poolId,
    tier,
    reputationScore: Number(reputationScore),
    paymentStreamMicro: q.unitPriceMicro,
    expiryBlock: block + Number(expiryBlocks),
    issuedAt: Date.now(),
    proofOfWork: { scheme: "stub", digestHex: `dat-${poolId}-${Date.now()}`, verified: false },
  });
  res.json({ dat, settlement: "debit on POST /dat/consume" });
});

router.get("/dat", (_req, res) => {
  res.json({ dats: listDats() });
});

router.get("/dat/:datId", (req, res) => {
  res.json({ dat: getDat(req.params.datId) });
});

router.post("/dat/consume", (req, res) => {
  const result = consumeDat(req.body ?? {});
  if (result.error) {
    res.status(result.error === "INSUFFICIENT_SOV" ? 402 : 400).json(result);
    return;
  }
  res.json(result);
});

router.post("/providers/register", (req, res) => {
  res.json({ provider: registerLiquidityProvider(req.body ?? {}) });
});

router.get("/providers", (_req, res) => {
  res.json({ providers: listLiquidityProviders(), bootstrap: bootstrapStatus() });
});

router.get("/providers/:providerId", (req, res) => {
  res.json({ provider: getLiquidityProvider(req.params.providerId) });
});

router.get("/mining/bootstrap", (_req, res) => {
  res.json(bootstrapStatus());
});

router.post("/sla/commit", (req, res) => {
  const result = createSlaCommitment(req.body ?? {});
  if (result.error) {
    res.status(result.error === "INSUFFICIENT_SOV" ? 402 : 400).json(result);
    return;
  }
  res.json({ commitment: result });
});

router.post("/sla/proof", (req, res) => {
  const result = submitUptimeProof(req.body ?? {});
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json({ proof: result });
});

router.post("/sla/evaluate", (req, res) => {
  const { commitmentId } = req.body ?? {};
  if (!commitmentId) {
    res.status(400).json({ error: "commitmentId required" });
    return;
  }
  const result = evaluateSlaCommitment(commitmentId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

router.get("/sla", (req, res) => {
  res.json({ commitments: listSlaCommitments(req.query.providerId) });
});

router.get("/sla/:commitmentId", (req, res) => {
  res.json({ commitment: getSlaCommitment(req.params.commitmentId) });
});

export default router;
