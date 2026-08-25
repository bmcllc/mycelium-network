import type { SlaCommitment, SlaVerdict, UptimeProof } from "./datTypes";

export const DEFAULT_SLA_UPTIME_PCT = 99.5;
export const DEFAULT_SLA_WINDOW_MS = 86_400_000;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export function createSlaCommitment(opts: {
  commitmentId: string;
  providerId: string;
  poolId: SlaCommitment["poolId"];
  stakeMicro: number;
  uptimeMinPct?: number;
  windowMs?: number;
  heartbeatIntervalMs?: number;
}): SlaCommitment {
  return {
    commitmentId: opts.commitmentId,
    providerId: opts.providerId,
    poolId: opts.poolId,
    uptimeMinPct: opts.uptimeMinPct ?? DEFAULT_SLA_UPTIME_PCT,
    windowMs: opts.windowMs ?? DEFAULT_SLA_WINDOW_MS,
    stakeMicro: Math.max(0, opts.stakeMicro),
    heartbeatIntervalMs: opts.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    createdAt: Date.now(),
    status: "active",
  };
}

/** Avalia SLA code-based a partir de heartbeats na janela. */
export function evaluateSla(
  commitment: SlaCommitment,
  proofs: UptimeProof[],
  now = Date.now(),
): SlaVerdict {
  const windowStart = now - commitment.windowMs;
  const inWindow = proofs.filter(
    (p) =>
      p.commitmentId === commitment.commitmentId &&
      p.providerId === commitment.providerId &&
      p.timestamp >= windowStart &&
      p.timestamp <= now,
  );
  const expectedHeartbeats = Math.max(
    1,
    Math.floor(commitment.windowMs / commitment.heartbeatIntervalMs),
  );
  const okCount = inWindow.filter((p) => p.ok).length;
  const uptimePct = (okCount / expectedHeartbeats) * 100;
  const fulfilled = uptimePct >= commitment.uptimeMinPct;

  if (fulfilled) {
    const bonusMicro = Math.floor(commitment.stakeMicro * 0.05);
    return {
      commitmentId: commitment.commitmentId,
      uptimePct,
      requiredPct: commitment.uptimeMinPct,
      fulfilled: true,
      slashedMicro: 0,
      bonusMicro,
    };
  }

  const deficit = commitment.uptimeMinPct - uptimePct;
  const slashRatio = Math.min(1, deficit / commitment.uptimeMinPct);
  const slashedMicro = Math.floor(commitment.stakeMicro * slashRatio);

  return {
    commitmentId: commitment.commitmentId,
    uptimePct,
    requiredPct: commitment.uptimeMinPct,
    fulfilled: false,
    slashedMicro,
    bonusMicro: 0,
  };
}
