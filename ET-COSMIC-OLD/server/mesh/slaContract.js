/**
 * SLA code-based — contrato executado por código (sem papel).
 */
import crypto from "crypto";
import { creditAccount, debitAccount } from "../economy/sovLedger.js";
import { createPersistedStore, registerEconomyFlusher } from "../economy/economyPersistence.js";

const DEFAULT_UPTIME_PCT = 99.5;
const DEFAULT_WINDOW_MS = 86_400_000;
const DEFAULT_HEARTBEAT_MS = 60_000;

const slaStore = createPersistedStore("mesh-sla.json", { idField: "commitmentId" });
const proofStore = createPersistedStore("mesh-sla-proofs.json", { idField: "proofId" });
registerEconomyFlusher(slaStore.flush);
registerEconomyFlusher(proofStore.flush);

export function createSlaCommitment(body = {}) {
  const commitmentId = body.commitmentId ?? `sla-${crypto.randomBytes(6).toString("hex")}`;
  const providerId = body.providerId;
  const stakeMicro = Math.max(0, Math.floor(body.stakeMicro ?? 0));
  if (!providerId) return { error: "providerId required" };
  if (stakeMicro <= 0) return { error: "stakeMicro required" };

  const stakeDebit = debitAccount(body.accountId ?? providerId, stakeMicro, {
    channel: "sla_stake",
    commitmentId,
  });
  if (stakeDebit.error) return stakeDebit;

  const record = {
    sku: "VOID-721",
    commitmentId,
    providerId,
    poolId: body.poolId ?? "POOL-COMPUTE",
    uptimeMinPct: body.uptimeMinPct ?? DEFAULT_UPTIME_PCT,
    windowMs: body.windowMs ?? DEFAULT_WINDOW_MS,
    stakeMicro,
    heartbeatIntervalMs: body.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS,
    stakeAccountId: body.accountId ?? providerId,
    createdAt: Date.now(),
    status: "active",
  };
  slaStore.map.set(commitmentId, record);
  slaStore.schedule();
  return record;
}

export function submitUptimeProof(body = {}) {
  const { commitmentId, providerId } = body;
  const commitment = slaStore.map.get(commitmentId);
  if (!commitment) return { error: "COMMITMENT_NOT_FOUND" };
  if (commitment.providerId !== providerId) return { error: "PROVIDER_MISMATCH" };
  if (commitment.status !== "active") return { error: "COMMITMENT_NOT_ACTIVE" };

  const proofId = `proof-${crypto.randomBytes(6).toString("hex")}`;
  const proof = {
    proofId,
    commitmentId,
    providerId,
    timestamp: body.timestamp ?? Date.now(),
    latencyMs: body.latencyMs ?? 0,
    ok: Boolean(body.ok ?? true),
  };
  proofStore.map.set(proofId, proof);
  proofStore.schedule();
  return proof;
}

export function evaluateSlaCommitment(commitmentId, now = Date.now()) {
  const commitment = slaStore.map.get(commitmentId);
  if (!commitment) return { error: "COMMITMENT_NOT_FOUND" };

  const proofs = [...proofStore.map.values()].filter((p) => p.commitmentId === commitmentId);
  const windowStart = now - commitment.windowMs;
  const inWindow = proofs.filter(
    (p) => p.timestamp >= windowStart && p.timestamp <= now,
  );
  const expected = Math.max(1, Math.floor(commitment.windowMs / commitment.heartbeatIntervalMs));
  const okCount = inWindow.filter((p) => p.ok).length;
  const uptimePct = (okCount / expected) * 100;
  const fulfilled = uptimePct >= commitment.uptimeMinPct;

  if (fulfilled) {
    const bonusMicro = Math.floor(commitment.stakeMicro * 0.05);
    creditAccount(commitment.stakeAccountId, commitment.stakeMicro + bonusMicro, {
      channel: "sla_fulfilled",
      commitmentId,
      uptimePct,
    });
    commitment.status = "fulfilled";
    slaStore.schedule();
    return {
      sku: "VOID-721",
      commitmentId,
      uptimePct,
      requiredPct: commitment.uptimeMinPct,
      fulfilled: true,
      slashedMicro: 0,
      bonusMicro,
      stakeReturnedMicro: commitment.stakeMicro,
    };
  }

  const deficit = commitment.uptimeMinPct - uptimePct;
  const slashRatio = Math.min(1, deficit / commitment.uptimeMinPct);
  const slashedMicro = Math.floor(commitment.stakeMicro * slashRatio);
  const returnedMicro = commitment.stakeMicro - slashedMicro;

  if (returnedMicro > 0) {
    creditAccount(commitment.stakeAccountId, returnedMicro, {
      channel: "sla_partial_return",
      commitmentId,
      uptimePct,
    });
  }
  if (slashedMicro > 0) {
    creditAccount("treasury:montelauro", slashedMicro, {
      channel: "sla_slash",
      commitmentId,
      providerId: commitment.providerId,
    });
  }

  commitment.status = "violated";
  slaStore.schedule();

  return {
    sku: "VOID-721",
    commitmentId,
    uptimePct,
    requiredPct: commitment.uptimeMinPct,
    fulfilled: false,
    slashedMicro,
    bonusMicro: 0,
    stakeReturnedMicro: returnedMicro,
  };
}

export function getSlaCommitment(commitmentId) {
  const c = slaStore.map.get(commitmentId);
  if (!c) return { error: "COMMITMENT_NOT_FOUND" };
  return c;
}

export function listSlaCommitments(providerId) {
  const all = [...slaStore.map.values()];
  if (providerId) return all.filter((c) => c.providerId === providerId);
  return all;
}
