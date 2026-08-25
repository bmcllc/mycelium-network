/**
 * VOID-512 — Acoustic Room Handshake (IR → chave SHA3).
 */

import crypto from "node:crypto";
import { runAcousticHandshake } from "../isossupra/acoustic_handshake.js";

export function deriveRoomKeyFromImpulse(impulseHex, deviceA, deviceB) {
  const ir = Buffer.from(impulseHex.replace(/\s/g, ""), "hex");
  const hash = crypto.createHash("sha3-512").update(ir).digest("hex");
  const key_hex = crypto.createHash("sha3-256").update(`${deviceA}|${deviceB}|${hash}`).digest("hex");
  return {
    sku: "VOID-512",
    engine: "Acoustic Room Handshake",
    key_hex,
    ir_bytes: ir.length,
    iso: "web_audio_impulse_response",
    supra: "full_ir_hash_not_single_peak",
    complements: "VOID-502",
  };
}

export function acousticRoomFallback(opts) {
  const base = runAcousticHandshake(opts);
  return {
    sku: "VOID-512",
    ...base,
    mode: opts.impulseHex ? "measured_ir" : "helmholtz_model",
  };
}
