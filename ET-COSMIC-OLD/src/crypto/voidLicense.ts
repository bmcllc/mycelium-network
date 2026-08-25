/**
 * VOID-00 — Handshake de licença comercial (WASM ML-DSA-87 + device binding).
 * Ativa com VITE_VOID_LICENSE_ENFORCE=true e token em env ou storage.
 */

import init, {
  init_void_core,
  license_compute_device_id,
  license_verify_handshake,
} from "void_core";
import { VoidAnimus } from "../plugins/voidAnimus";
import { devDebug } from "../utils/devLog";

export interface VoidLicenseHandshakeResult {
  ok: boolean;
  deviceIdHex: string;
  reason: string;
  enforced: boolean;
}

let wasmReady = false;

async function ensureVoidCoreWasm(): Promise<void> {
  if (wasmReady) return;
  await init();
  init_void_core();
  wasmReady = true;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "").toLowerCase();
  if (clean.length % 2 !== 0) throw new Error("hex inválido");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Entropia de hardware para binding (Android nativo ou fallback web). */
export async function collectDeviceBindingEntropy(): Promise<Uint8Array> {
  try {
    const { entropy, source } = await VoidAnimus.getDeviceEntropy();
    devDebug(`[VOID-00] device entropy source=${source}`);
    return hexToBytes(entropy);
  } catch {
    const fallback = new TextEncoder().encode(
      [
        navigator.userAgent,
        navigator.language,
        String(screen.width),
        String(screen.height),
        String(devicePixelRatio),
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      ].join("|"),
    );
    const out = new Uint8Array(32);
    const hash = await crypto.subtle.digest("SHA-256", fallback);
    out.set(new Uint8Array(hash));
    return out;
  }
}

function licenseEnforced(): boolean {
  return import.meta.env.VITE_VOID_LICENSE_ENFORCE === "true";
}

function readLicenseFromEnv(): {
  vendorPk: Uint8Array;
  payload: Uint8Array;
  signature: Uint8Array;
  sku: string;
} | null {
  const pkHex = (import.meta.env.VITE_VOID_LICENSE_VENDOR_PK as string | undefined)?.trim();
  const payloadHex = (import.meta.env.VITE_VOID_LICENSE_PAYLOAD_HEX as string | undefined)?.trim();
  const sigHex = (import.meta.env.VITE_VOID_LICENSE_SIGNATURE_HEX as string | undefined)?.trim();
  const sku = (import.meta.env.VITE_VOID_LICENSE_SKU as string | undefined)?.trim() || "SOVEREIGN-CITIZEN";
  if (!pkHex || !payloadHex || !sigHex) return null;
  return {
    vendorPk: hexToBytes(pkHex),
    payload: hexToBytes(payloadHex),
    signature: hexToBytes(sigHex),
    sku,
  };
}

/**
 * Handshake obrigatório antes de `derive_ghost_id` em builds comerciais.
 * Em modo comunidade (enforce=false) devolve ok sem verificar.
 */
export async function enforceVoidCoreLicenseHandshake(
  sku?: string,
): Promise<VoidLicenseHandshakeResult> {
  const enforced = licenseEnforced();
  const deviceEntropy = await collectDeviceBindingEntropy();
  await ensureVoidCoreWasm();

  const resolvedSku =
    sku ??
    (import.meta.env.VITE_VOID_LICENSE_SKU as string | undefined)?.trim() ??
    (import.meta.env.VITE_B2B_SKUS as string | undefined)?.split(",")[0]?.trim() ??
    "SOVEREIGN-CITIZEN";

  const deviceId = license_compute_device_id(deviceEntropy, resolvedSku);
  const deviceIdHex = Array.from(deviceId)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!enforced) {
    return { ok: true, deviceIdHex, reason: "community_mode", enforced: false };
  }

  const lic = readLicenseFromEnv();
  if (!lic) {
    return {
      ok: false,
      deviceIdHex,
      reason: "VITE_VOID_LICENSE_* em falta (vendor PK, payload, signature)",
      enforced: true,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const result = license_verify_handshake(
    lic.vendorPk,
    deviceEntropy,
    lic.sku || resolvedSku,
    lic.payload,
    lic.signature,
    BigInt(now),
  );

  return {
    ok: result.ok,
    deviceIdHex: result.device_id_hex || deviceIdHex,
    reason: result.reason,
    enforced: true,
  };
}

export async function getVoidDeviceIdHex(sku?: string): Promise<string> {
  await ensureVoidCoreWasm();
  const entropy = await collectDeviceBindingEntropy();
  const skuResolved = sku ?? "SOVEREIGN-CITIZEN";
  const id = license_compute_device_id(entropy, skuResolved);
  return Array.from(id)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
