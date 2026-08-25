/**
 * Settlement DAT → ledger SOV (débito automático pay-per-use).
 */
import { creditAccount, debitAccount } from "../economy/sovLedger.js";
import { getDat, markDatConsumed } from "./datRegistry.js";
import { applyBootstrapBonus, getLiquidityProvider } from "./liquidityMining.js";

const POOLS = [
  { id: "POOL-COMPUTE", protocolFeeBps: 250 },
  { id: "POOL-STORAGE", protocolFeeBps: 180 },
  { id: "POOL-AI", protocolFeeBps: 320 },
  { id: "POOL-QUANTUM", protocolFeeBps: 450 },
  { id: "POOL-IDENTITY", protocolFeeBps: 120 },
];

const GLOBAL_PROTOCOL_BPS = parseInt(process.env.VITE_PROTOCOL_ROYALTY_BPS ?? "10", 10);

function poolFeeBps(poolId) {
  return POOLS.find((p) => p.id === poolId)?.protocolFeeBps ?? 250;
}

function currentBlock() {
  return Math.floor(Date.now() / 60000);
}

export function computeDatSettlement(dat, units) {
  const u = Math.max(1, Math.floor(units));
  const grossMicro = dat.paymentStreamMicro * u;
  const bps = poolFeeBps(dat.poolId);
  const poolFeeMicro = Math.ceil((grossMicro * bps) / 10_000);
  const afterPoolMicro = grossMicro - poolFeeMicro;
  const protocolFeeMicro = Math.floor((afterPoolMicro * GLOBAL_PROTOCOL_BPS) / 10_000);
  const netMicro = afterPoolMicro - protocolFeeMicro;

  return {
    datId: dat.datId,
    units: u,
    grossMicro,
    poolFeeMicro,
    protocolFeeMicro,
    netMicro,
  };
}

/** Débito automático: consumer → provider + tesourarias + bonus bootstrap. */
export function consumeDat(body = {}) {
  const { datId, consumerId, providerId, units = 1 } = body;
  if (!datId || !consumerId || !providerId) {
    return { error: "datId, consumerId and providerId required" };
  }

  const dat = getDat(datId);
  if (dat.error) return dat;

  const block = dat.currentBlock ?? currentBlock();
  const expiry = dat.expiryBlock ?? block + 1440;
  if (block > expiry) return { error: "DAT_EXPIRED" };

  const provider = getLiquidityProvider(providerId);

  const settlement = computeDatSettlement(dat, units);
  const debit = debitAccount(consumerId, settlement.grossMicro, {
    channel: "dat",
    datId,
    poolId: dat.poolId,
    providerId,
    units: settlement.units,
  });
  if (debit.error) return debit;

  const providerAccount = provider.error ? providerId : provider.accountId;
  creditAccount(providerAccount, settlement.netMicro, {
    channel: "dat",
    datId,
    from: consumerId,
    role: "provider",
  });

  if (settlement.poolFeeMicro > 0) {
    creditAccount(`treasury:pool:${dat.poolId}`, settlement.poolFeeMicro, {
      channel: "dat_pool_fee",
      datId,
    });
  }
  if (settlement.protocolFeeMicro > 0) {
    creditAccount("treasury:montelauro", settlement.protocolFeeMicro, {
      channel: "dat_protocol_fee",
      datId,
    });
  }

  const bootstrap = applyBootstrapBonus(providerId, settlement.netMicro);

  markDatConsumed(datId, settlement.units);

  return {
    sku: "VOID-721",
    datId,
    consumerId,
    providerId,
    providerAccount,
    ...settlement,
    bootstrapBonusMicro: bootstrap.bonusMicro ?? 0,
    balanceConsumer: debit.balanceMicro,
  };
}

export { POOLS, poolFeeBps };
