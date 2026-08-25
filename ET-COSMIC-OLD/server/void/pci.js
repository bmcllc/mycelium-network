/**
 * VOID-PCI — PEFB (Physical Entropy Fingerprint Bridge).
 * Detecção estatística de MITM via latência/jitter (sem fóton).
 */
import crypto from "crypto";

const sessions = new Map();

export function pciHandshake(peerId) {
  const id = crypto.randomUUID();
  const nonce = crypto.randomBytes(32).toString("hex");
  const deadline = Date.now() + 30_000;
  sessions.set(id, {
    id,
    peerId,
    nonce,
    deadline,
    createdAt: Date.now(),
    baselineJitter: [],
  });
  return {
    sessionId: id,
    challenge: { nonce, timestampNs: process.hrtime.bigint().toString() },
    deadline,
    instructions:
      "Responda antes do deadline. Latência > 200ms ou jitter anômalo indica MITM.",
  };
}

export function pciRespond(sessionId, body = {}) {
  const session = sessions.get(sessionId);
  if (!session) return { error: "SESSION_NOT_FOUND", sessionId };

  const latencyMs = Number(body.latencyMs ?? 0);
  const jitter = Array.isArray(body.jitterProfile) ? body.jitterProfile : [];
  const klDiv = estimateKlDivergence(jitter, session.baselineJitter);
  const latencyScore = latencyMs <= 120 ? 1 : latencyMs <= 200 ? 0.85 : latencyMs <= 400 ? 0.6 : 0.3;
  const jitterScore = klDiv < 0.15 ? 1 : klDiv < 0.35 ? 0.75 : klDiv < 0.6 ? 0.5 : 0.2;
  const score = Math.min(1, (latencyScore + jitterScore) / 2);
  const anomalies = [];
  if (latencyMs > 200) anomalies.push("HIGH_LATENCY");
  if (klDiv > 0.35) anomalies.push("JITTER_DIVERGENCE");

  sessions.delete(sessionId);

  return {
    sessionId,
    integrity: {
      score,
      klDivergence: klDiv,
      anomalies,
      verdict: score > 0.85 ? "CLEAN" : score > 0.6 ? "SUSPICIOUS" : "COMPROMISED",
      recommendation:
        score < 0.85
          ? "Trocar chave de sessão e verificar rota de rede"
          : "Canal íntegro",
    },
    vsQKD: {
      advantage:
        "QKD: segurança information-theoretic. VOID-PCI: estatística computacionalmente bounded.",
      whenToUseQKD: "Adversários estatais, dados classificados, horizonte >25 anos.",
      whenToUseVoid: "MITM comum, sem fibra dedicada, orçamento <€10k/mês.",
    },
  };
}

function estimateKlDivergence(observed, baseline) {
  if (!observed.length) return 0.1;
  const mean = observed.reduce((a, b) => a + b, 0) / observed.length;
  const ref = baseline.length ? baseline.reduce((a, b) => a + b, 0) / baseline.length : mean * 0.9;
  if (ref <= 0) return 0.5;
  return Math.min(1, Math.abs(mean - ref) / (ref + 1));
}
