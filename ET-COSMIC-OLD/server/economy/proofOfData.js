/**
 * Proof-of-Data (PoD) — Verificação de trabalho útil para emissão de $DMC-U
 *
 * Dispositivos geram tokens ao capturar/rotear dados úteis:
 * - sensor: dados de sensores (temperatura, aceleração, áudio)
 * - mesh-relay: roteamento de tráfego mesh
 * - cdn-serve: servir conteúdo via CDN
 * - entropy: geração de entropia verificável
 * - hosting: hospedagem de sites na mesh
 * - acoustic: fingerprint acústico do ambiente
 * - compute: trabalho computacional (Ising, Thomas-Fermi)
 *
 * Anti-Sybil: taxa de emissão decrescente por dispositivo (hardware fingerprint).
 */

import { creditDMCU } from "./dmcToken.js";

// ─── Reward Rates (micro $DMC-U per unit) ────────────────────────────────────

const REWARD_RATES = {
  "sensor": 50,           // per verified sensor reading
  "mesh-relay": 10,       // per MB relayed
  "cdn-serve": 15,        // per MB served
  "entropy": 25,          // per entropy hash
  "hosting": 8,           // per visitor-hour
  "acoustic": 100,        // per acoustic fingerprint
  "compute": 120,         // per compute task (Ising, TF)
  "data-artifact": 200,   // per published data artifact
};

// ─── Anti-Sybil: Device Registry ─────────────────────────────────────────────

const deviceRegistry = new Map(); // fingerprint → { totalEarned, workCount, firstSeen }
const DEVICE_EARNINGS_CAP = 1_000_000_000; // 1000 $DMC-U cap per device lifetime
const DEVICE_DECAY_FACTOR = 0.995; // 0.5% decay per work submission

/**
 * Verifica e credita trabalho útil.
 *
 * @param {string} deviceId - hardware fingerprint do dispositivo
 * @param {string} workType - tipo de trabalho (ver REWARD_RATES)
 * @param {object} proof - dados de prova (variável por tipo)
 * @returns {object} resultado com crédito ou erro
 */
export function submitProofOfWork(deviceId, workType, proof = {}) {
  const rate = REWARD_RATES[workType];
  if (!rate) return { error: "UNKNOWN_WORK_TYPE", workType, valid: Object.keys(REWARD_RATES) };

  // Anti-Sybil: verificar dispositivo
  let device = deviceRegistry.get(deviceId);
  if (!device) {
    device = { totalEarned: 0, workCount: 0, firstSeen: Date.now() };
    deviceRegistry.set(deviceId, device);
  }

  // Cap por dispositivo
  if (device.totalEarned >= DEVICE_EARNINGS_CAP) {
    return { error: "DEVICE_EARNINGS_CAP", deviceId, earned: device.totalEarned };
  }

  // Calcular recompensa com decay
  const decayMultiplier = Math.pow(DEVICE_DECAY_FACTOR, device.workCount);
  const rawReward = rate;
  const reward = Math.max(1, Math.floor(rawReward * decayMultiplier));

  // Verificar prova (simplificado — cada tipo tem validação diferente)
  const verified = verifyProof(workType, proof);
  if (!verified) return { error: "PROOF_INVALID", workType, proof };

  // Creditar $DMC-U
  const result = creditDMCU(deviceId, reward, `pod:${workType}`);

  // Atualizar estado do dispositivo
  device.totalEarned += reward;
  device.workCount += 1;
  deviceRegistry.set(deviceId, device);

  return {
    ...result,
    workType,
    decayMultiplier: Math.round(decayMultiplier * 1000) / 1000,
    deviceWorkCount: device.workCount,
  };
}

/** Verifica a prova de acordo com o tipo de trabalho. */
function verifyProof(workType, proof) {
  switch (workType) {
    case "sensor":
      // Exige hash SHA3 dos dados + timestamp
      return !!proof.hash && !!proof.timestamp;
    case "mesh-relay":
      // Exige contagem de bytes + peer IDs
      return proof.bytesRelayed > 0 && !!proof.peerIds?.length;
    case "cdn-serve":
      // Exige bytes servidos + visitor count
      return proof.bytesServed > 0;
    case "entropy":
      // Exige hash de entropia + fonte
      return !!proof.entropyHash && !!proof.source;
    case "hosting":
      // Exige site ID + visitor count
      return !!proof.siteId && proof.visitors > 0;
    case "acoustic":
      // Exige fingerprint acústico
      return !!proof.acousticHash;
    case "compute":
      // Exige task ID + resultado verificável
      return !!proof.taskId && !!proof.resultHash;
    case "data-artifact":
      // Exige artifact ID + SHA-256
      return !!proof.artifactId && !!proof.sha256;
    default:
      return false;
  }
}

/** Retorna status do dispositivo. */
export function getDeviceStatus(deviceId) {
  const device = deviceRegistry.get(deviceId);
  if (!device) return { registered: false };
  return {
    registered: true,
    ...device,
    earningsCap: DEVICE_EARNINGS_CAP,
    remaining: DEVICE_EARNINGS_CAP - device.totalEarned,
    currentDecay: Math.pow(DEVICE_DECAY_FACTOR, device.workCount),
  };
}

/** Retorna taxas de recompensa. */
export function getRewardRates() {
  return { ...REWARD_RATES };
}

/** Retorna estatísticas agregadas. */
export function getPoDStats() {
  let totalDevices = 0;
  let totalWork = 0;
  let totalEarned = 0;
  for (const d of deviceRegistry.values()) {
    totalDevices++;
    totalWork += d.workCount;
    totalEarned += d.totalEarned;
  }
  return { totalDevices, totalWork, totalEarned, rates: REWARD_RATES };
}
