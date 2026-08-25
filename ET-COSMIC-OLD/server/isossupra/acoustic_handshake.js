/**
 * VOID-502 — Acoustic Resonance Handshake (cavidades Helmholtz, chave efémera).
 */

import crypto from "node:crypto";

const C_AIR = 343;

/** Frequência fundamental Helmholtz: f ≈ (c/2π)√(A/(V·L_eff)) */
export function helmholtzFrequency({ neckArea = 0.002, volume = 0.01, neckLength = 0.05 } = {}) {
  const A = neckArea;
  const V = volume;
  const L = neckLength;
  const f = (C_AIR / (2 * Math.PI)) * Math.sqrt(A / (V * L));
  return f;
}

export function scanResonancePeaks(roomSignature = "default-room") {
  const seed = crypto.createHash("sha3-256").update(roomSignature).digest();
  const peaks = [];
  for (let k = 0; k < 8; k++) {
    const neck = 0.001 + (seed[k] / 255) * 0.004;
    const vol = 0.005 + (seed[k + 8] / 255) * 0.02;
    const f0 = helmholtzFrequency({ neckArea: neck, volume: vol, neckLength: 0.03 + k * 0.005 });
    const Q = 5 + (seed[k + 16] / 255) * 45;
    peaks.push({ mode: k, f0_hz: f0, Q, amplitude: seed[k + 24] / 255 });
  }
  peaks.sort((a, b) => b.amplitude - a.amplitude);
  return peaks;
}

export function deriveAcousticSessionKey(peaks, deviceA, deviceB) {
  const top = peaks[0];
  const material = `${deviceA}|${deviceB}|${top.f0_hz.toFixed(6)}|${top.Q.toFixed(4)}`;
  const key_hex = crypto.createHash("sha3-512").update(material).digest("hex").slice(0, 64);
  return { key_hex, f0_hz: top.f0_hz, Q: top.Q, ephemeral: true };
}

export function runAcousticHandshake(opts = {}) {
  const room = opts.roomSignature ?? opts.room ?? "etrnet:room:default";
  const peaks = scanResonancePeaks(room);
  const session = deriveAcousticSessionKey(peaks, opts.deviceA ?? "A", opts.deviceB ?? "B");
  return {
    sku: "VOID-502",
    engine: "Acoustic Resonance Handshake",
    iso: { model: "helmholtz_modes", peaks: peaks.slice(0, 4) },
    supra: {
      note: "HGPU pode prever modos ultrassônicos não medidos (super-resolução — roadmap).",
    },
    session,
    complements: "VOID-215",
    disclaimer:
      "Chave derivada da geometria da sala — autenticação física; não substitui PQC em banda larga.",
  };
}
