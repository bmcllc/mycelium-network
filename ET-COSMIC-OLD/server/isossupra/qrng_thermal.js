/**
 * VOID-501 — QRNG Hardware Bridge (ruído Johnson / avalanche simulado ou serial).
 */

import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

/** Johnson: tensão gaussiana kT/C — amostra via Box-Muller. */
export function johnsonSample(n = 1) {
  const out = [];
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(1e-12, Math.random());
    const u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push(r * Math.cos(2 * Math.PI * u2));
    if (out.length < n) out.push(r * Math.sin(2 * Math.PI * u2));
  }
  return out.slice(0, n);
}

function readHardwareDevice() {
  const path = process.env.ISOSSUPRA_THERMAL_DEVICE;
  if (!path || !existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8").trim().replace(/\s/g, "");
    if (raw.length < 32) return null;
    return Buffer.from(raw.slice(0, 4096), "hex");
  } catch {
    return null;
  }
}

export function sampleThermalQrng(nBytes) {
  const hw = readHardwareDevice();
  if (hw && hw.length >= nBytes) {
    return {
      bytes: hw.subarray(0, nBytes),
      source: "thermal_hardware_serial",
      hardware: true,
    };
  }
  const buf = Buffer.alloc(nBytes);
  for (let i = 0; i < nBytes; i++) {
    const v = johnsonSample(1)[0];
    const adc = Math.floor(((v + 4) / 8) * 255) & 0xff;
    buf[i] = adc ^ (crypto.randomBytes(1)[0] & 0x0f);
  }
  return {
    bytes: buf,
    source: "johnson_noise_simulated",
    hardware: false,
  };
}

export function thermalQrngService(bits = 256) {
  const nBytes = Math.ceil(bits / 8);
  const { bytes, source, hardware } = sampleThermalQrng(nBytes);
  const entropy_hex = bytes.toString("hex");
  const sha3_256 = crypto.createHash("sha3-256").update(bytes).digest("hex");
  const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
  return {
    sku: "VOID-501",
    engine: "QRNG Thermal Bridge",
    entropy_hex,
    sha3_256,
    bits,
    source,
    hardware,
    stats: { mean_byte: mean, n_bytes: nBytes },
    simulation: !hardware,
    quantum_verified: false,
    complements: "VOID-76",
    disclaimer:
      hardware
        ? "Entropia de dispositivo térmico externo (serial/GPIO)."
        : "Simulação Johnson + mistura CSPRNG — ligue ISOSSUPRA_THERMAL_DEVICE para hardware real.",
  };
}
