import type { DATConsumption, DynamicAccessToken } from "./datTypes";
import { estimateDatProtocolFee } from "./datEngine";
import { computeBootstrapBonus } from "./liquidityMining";

const GLOBAL_PROTOCOL_BPS = parseInt(
  typeof import.meta !== "undefined" && import.meta.env?.VITE_PROTOCOL_ROYALTY_BPS
    ? String(import.meta.env.VITE_PROTOCOL_ROYALTY_BPS)
    : "10",
  10,
);

export function computeDatConsumption(
  dat: DynamicAccessToken,
  units: number,
  opts?: { bootstrapEligible?: boolean; providerBonusMicro?: number },
): DATConsumption {
  const u = Math.max(1, Math.floor(units));
  const grossMicro = dat.paymentStreamMicro * u;
  const poolFeeMicro = estimateDatProtocolFee(dat, u);
  const afterPoolMicro = grossMicro - poolFeeMicro;
  const protocolFeeMicro = Math.floor((afterPoolMicro * GLOBAL_PROTOCOL_BPS) / 10_000);
  const netMicro = afterPoolMicro - protocolFeeMicro;
  const bootstrapBonusMicro = opts?.bootstrapEligible
    ? computeBootstrapBonus(netMicro, opts.providerBonusMicro ?? 0)
    : 0;

  const base: DATConsumption = {
    datId: dat.datId,
    units: u,
    grossMicro,
    poolFeeMicro,
    protocolFeeMicro,
    netMicro,
  };
  if (bootstrapBonusMicro > 0) {
    return { ...base, bootstrapBonusMicro };
  }
  return base;
}

export function validateDatForConsume(
  dat: DynamicAccessToken,
  currentBlock: number,
): { ok: true } | { ok: false; error: string } {
  if (currentBlock > dat.expiryBlock) {
    return { ok: false, error: "DAT_EXPIRED" };
  }
  if (!dat.proofOfWork?.digestHex) {
    return { ok: false, error: "DAT_INVALID_PROOF" };
  }
  return { ok: true };
}
