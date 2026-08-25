/**
 * VOID-512 — impulso acústico da sala (Web Audio chirp → IR simplificada).
 */

import { sha3_256 } from "@noble/hashes/sha3.js";

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function measureRoomImpulse(durationMs = 300): Promise<string> {
  const ctx = new AudioContext();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 18000 * t) * Math.exp(-t * 40) * 0.2;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  src.start();
  const freq = new Uint8Array(analyser.frequencyBinCount);
  await new Promise((r) => setTimeout(r, durationMs + 50));
  analyser.getByteFrequencyData(freq);
  src.stop();
  await ctx.close();
  return bytesToHex(sha3_256(freq));
}
