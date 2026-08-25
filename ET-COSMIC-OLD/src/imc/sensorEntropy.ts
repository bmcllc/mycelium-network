/**
 * VOID-510 — coleta de entropia no dispositivo (mic/câmera/motion + CSPRNG).
 */

import { sha3_256 } from "@noble/hashes/sha3.js";

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/** Ruído de microfone via AudioContext (silêncio / ganho baixo). */
export async function sampleAudioNoise(): Promise<Uint8Array> {
  try {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    await new Promise((r) => setTimeout(r, 120));
    analyser.getByteFrequencyData(buf);
    stream.getTracks().forEach((t) => t.stop());
    await ctx.close();
    return sha3_256(buf);
  } catch {
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

/** LSB de acelerómetro (DeviceMotion). */
export async function sampleMotionNoise(): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(crypto.getRandomValues(new Uint8Array(32))), 800);
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const raw = new TextEncoder().encode(
        `${a.x}:${a.y}:${a.z}:${e.interval}`,
      );
      clearTimeout(timeout);
      window.removeEventListener("devicemotion", handler);
      resolve(sha3_256(raw));
    };
    window.addEventListener("devicemotion", handler);
  });
}

export async function collectSensorEntropy(): Promise<{
  audio_hex: string;
  motion_hex: string;
  device_hex: string;
}> {
  const [audio, motion] = await Promise.all([sampleAudioNoise(), sampleMotionNoise()]);
  const device = crypto.getRandomValues(new Uint8Array(32));
  return {
    audio_hex: bytesToHex(audio),
    motion_hex: bytesToHex(motion),
    device_hex: bytesToHex(device),
  };
}
