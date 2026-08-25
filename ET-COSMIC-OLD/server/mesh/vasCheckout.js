/**
 * VAS checkout — VOID-308 auditoria PMU (mint DAT + consume num passo).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { creditAccount, getBalance, microToSov } from "../economy/sovLedger.js";
import { registerDat } from "./datRegistry.js";
import { consumeDat } from "./datSettlement.js";
import { registerLiquidityProvider } from "./liquidityMining.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

/** Preço fixo documentado: 100 $SOV */
export const PMU_AUDIT_PRICE_MICRO = 100 * 1_000_000;
export const PMU_AUDIT_PRICE_SOV = 100;
const PROVIDER_ID = "provider:void-308-pmu";
const POOL_ID = "POOL-IDENTITY";

function ensurePmuProvider() {
  registerLiquidityProvider({
    accountId: "treasury:pmu-audit",
    poolId: POOL_ID,
    providerId: PROVIDER_ID,
  });
}

function writeReport(report) {
  const dir = path.join(REPO_ROOT, "void_pool", "reports");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${report.report_id}.json`);
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
    report.report_path = path.relative(REPO_ROOT, file);
  } catch {
    report.report_path = null;
  }
  return report;
}

export function pmuAuditPrice() {
  return {
    sku: "VOID-308",
    priceSov: PMU_AUDIT_PRICE_SOV,
    priceMicro: PMU_AUDIT_PRICE_MICRO,
    poolId: POOL_ID,
    model: "mint-dat-then-consume",
  };
}

/**
 * @param {{ consumerId?: string; demoTopUp?: boolean }} body
 */
export function checkoutPmuAudit(body = {}) {
  const consumerId = body.consumerId ? String(body.consumerId) : "";
  if (!consumerId) return { error: "consumerId required" };

  const demoAllowed =
    process.env.SOV_VAS_DEMO === "1" || process.env.NODE_ENV === "development";
  if (body.demoTopUp && demoAllowed) {
    creditAccount(consumerId, PMU_AUDIT_PRICE_MICRO, {
      channel: "vas_demo",
      sku: "VOID-308",
    });
  }

  ensurePmuProvider();

  const block = Math.floor(Date.now() / 60000);
  const digestHex = crypto.randomBytes(16).toString("hex");
  const dat = registerDat({
    resourceId: "VOID-308-pmu-audit",
    poolId: POOL_ID,
    tier: "builder",
    reputationScore: 80,
    paymentStreamMicro: PMU_AUDIT_PRICE_MICRO,
    expiryBlock: block + 120,
    issuedAt: Date.now(),
    proofOfWork: { scheme: "pmu-audit", digestHex, verified: true },
  });

  const settlement = consumeDat({
    datId: dat.datId,
    consumerId,
    providerId: PROVIDER_ID,
    units: 1,
  });

  if (settlement.error) {
    return {
      error: settlement.error,
      sku: "VOID-308",
      datId: dat.datId,
      priceMicro: PMU_AUDIT_PRICE_MICRO,
      priceSov: PMU_AUDIT_PRICE_SOV,
      balance: getBalance(consumerId),
      hint:
        settlement.error === "INSUFFICIENT_SOV"
          ? "Credite $SOV no ledger (VPS) ou active SOV_VAS_DEMO=1 em staging"
          : undefined,
    };
  }

  const report_id = `pmu-audit-${Date.now()}`;
  const report = writeReport({
    report_id,
    sku: "VOID-308",
    service: "PMU Audit · Protocol-First",
    generated_at: new Date().toISOString(),
    consumer_id: consumerId,
    dat_id: dat.datId,
    proof_digest: digestHex,
    truth_level_id: "pmu_protocol_l2",
    truth_level: 2,
    honesty_note: "Sabor Quântico — simulação clássica auditável; STS completo no motor quantum VPS",
    sts_light: { skipped: true, reason: "checkout_protocol_stub" },
    settlement: {
      grossMicro: settlement.grossMicro,
      poolFeeMicro: settlement.poolFeeMicro,
      protocolFeeMicro: settlement.protocolFeeMicro,
      netMicro: settlement.netMicro,
      grossSov: microToSov(settlement.grossMicro),
    },
  });

  return {
    ok: true,
    sku: "VOID-308",
    dat,
    settlement,
    report,
    balanceConsumer: settlement.balanceConsumer,
    balanceSov: microToSov(settlement.balanceConsumer),
  };
}
