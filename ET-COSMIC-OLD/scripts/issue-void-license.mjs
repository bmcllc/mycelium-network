#!/usr/bin/env node
/**
 * Emissor de licença VOID-00 (ML-DSA-87 + device binding).
 *
 * Gerar par titular (uma vez):
 *   node scripts/issue-void-license.mjs --gen-vendor-keys
 *
 * Emitir licença para dispositivo:
 *   node scripts/issue-void-license.mjs --entropy-hex <hex> --sku SOVEREIGN-CITIZEN
 *
 * Requer: npm run build:wasm
 * Env emissor: VOID_LICENSE_SIGNING_SEED_HEX (32 B) + VOID_LICENSE_VENDOR_PK_HEX (2592 B PK)
 */
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "void_core/pkg");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--gen-vendor-keys") {
      out.genKeys = true;
    } else if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function hexToU8(hex) {
  const clean = hex.replace(/\s+/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function u8ToHex(u8) {
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadWasm() {
  const wasmPath = join(pkgDir, "void_core.js");
  if (!existsSync(wasmPath)) {
    console.error("Execute primeiro: npm run build:wasm");
    process.exit(1);
  }
  const mod = await import(wasmPath);
  await mod.default();
  return mod;
}

async function main() {
  const args = parseArgs(process.argv);
  const wasm = await loadWasm();

  if (args.genKeys) {
    const kp = wasm.mldsa_keygen();
    console.log(
      JSON.stringify(
        {
          VOID_LICENSE_SIGNING_SEED_HEX: u8ToHex(kp.signing_seed),
          VOID_LICENSE_VENDOR_PK_HEX: u8ToHex(kp.public_key),
          note: "Guarde só no emissor. Nunca embutir seed na PWA do cliente.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const signingSeedHex = process.env.VOID_LICENSE_SIGNING_SEED_HEX?.trim();
  const vendorPkHex = process.env.VOID_LICENSE_VENDOR_PK_HEX?.trim();
  if (!signingSeedHex || signingSeedHex.length !== 64) {
    console.error("Defina VOID_LICENSE_SIGNING_SEED_HEX (ou use --gen-vendor-keys).");
    process.exit(1);
  }
  if (!vendorPkHex) {
    console.error("Defina VOID_LICENSE_VENDOR_PK_HEX (par do seed).");
    process.exit(1);
  }

  const sku = args.sku || "SOVEREIGN-CITIZEN";
  const years = parseInt(args.years || "1", 10);

  let deviceEntropy;
  if (args["entropy-hex"]) {
    deviceEntropy = hexToU8(args["entropy-hex"]);
  } else {
    console.error("Indique --entropy-hex (saída de VoidAnimus / getVoidDeviceIdHex pipeline).");
    process.exit(1);
  }

  const licenseId = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const now = Math.floor(Date.now() / 1000);
  const notAfter = now + years * 365 * 24 * 3600;

  const payload = wasm.license_build_payload(
    deviceEntropy,
    sku,
    licenseId,
    now,
    notAfter,
    nonce,
  );

  const signature = wasm.mldsa_sign(hexToU8(signingSeedHex), payload);
  const deviceId = wasm.license_compute_device_id(deviceEntropy, sku);

  const out = {
    sku,
    device_id_hex: u8ToHex(deviceId),
    vendor_pk_hex: vendorPkHex,
    payload_hex: u8ToHex(payload),
    signature_hex: u8ToHex(signature),
    not_before: now,
    not_after: notAfter,
    env_snippet: {
      VITE_VOID_LICENSE_ENFORCE: "true",
      VITE_VOID_LICENSE_SKU: sku,
      VITE_VOID_LICENSE_VENDOR_PK: vendorPkHex,
      VITE_VOID_LICENSE_PAYLOAD_HEX: u8ToHex(payload),
      VITE_VOID_LICENSE_SIGNATURE_HEX: u8ToHex(signature),
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
