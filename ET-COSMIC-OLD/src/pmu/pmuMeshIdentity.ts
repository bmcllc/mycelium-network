/**
 * Identidade NOSTR persistente para manifestos PMU (malha).
 */

import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha3_256 } from "@noble/hashes/sha3.js";

const STORAGE_KEY = "etrnet_pmu_mesh_nsec";

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Chave NOSTR dedicada à malha PMU (persistida). */
export function getOrCreateMeshNostrSecretKey(): Uint8Array {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.length >= 64) {
      return hexToBytes(raw);
    }
  } catch {
    /* private mode */
  }
  const sk = generateSecretKey();
  try {
    localStorage.setItem(STORAGE_KEY, bytesToHex(sk));
  } catch {
    /* ignore */
  }
  return sk;
}

/** Deriva a mesma chave a partir da GhostID pública (determinístico). */
export function meshSecretFromGhostPublicKey(ghostPublicKey: Uint8Array): Uint8Array {
  return hkdf(sha3_256, ghostPublicKey, undefined, new TextEncoder().encode("etrnet/pmu/mesh-nostr/v1"), 32);
}

export function getMeshNostrPublicKey(): string {
  return getPublicKey(getOrCreateMeshNostrSecretKey());
}
