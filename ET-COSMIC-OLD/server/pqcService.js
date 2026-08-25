import fs from "fs";
import { join } from "path";
import crypto from "crypto";
import { ml_kem1024 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";

const API_KEYS_FILE = join(import.meta.dirname, "db-apikeys.json");
export const apiKeys = new Map();

// Helper to convert Uint8Array to Hex
const toHex = (arr) => Buffer.from(arr).toString("hex");

// Helper to convert Hex to Uint8Array
const fromHex = (str) => new Uint8Array(Buffer.from(str, "hex"));

// Load API Keys from local JSON database
export function loadApiKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const data = JSON.parse(fs.readFileSync(API_KEYS_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        apiKeys.set(k, v);
      }
      console.log(`[PQC-Service] Carregadas ${apiKeys.size} chaves de API.`);
    } else {
      // Create empty db file if it doesn't exist
      saveApiKeys();
      console.log("[PQC-Service] Criado novo arquivo de banco db-apikeys.json.");
    }
  } catch (err) {
    console.error("[PQC-Service] Erro ao carregar chaves de API:", err.message);
  }
}

// Save API Keys to local JSON database
export function saveApiKeys() {
  try {
    const obj = {};
    for (const [k, v] of apiKeys.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("[PQC-Service] Erro ao salvar chaves de API:", err.message);
  }
}

// Generate a secure API Key
export function generateApiKey() {
  return "sk_pqc_" + crypto.randomBytes(24).toString("hex");
}

// Middleware to authorize API calls and deduct balance
export function requireApiKey(req, res, next) {
  const authHeader = req.headers["x-api-key"] || req.query.key;
  if (!authHeader) {
    return res.status(401).json({
      error: "Missing API key. Provide it in 'x-api-key' header or as '?key=...' query parameter."
    });
  }

  const keyData = apiKeys.get(authHeader);
  if (!keyData) {
    return res.status(401).json({ error: "Invalid API key." });
  }

  if (keyData.balanceSat < 1) {
    return res.status(402).json({
      error: "Insufficient balance (Payment Required). Please refill your API key balance via POST /api/pqc/refill",
      key: authHeader,
      balanceSat: keyData.balanceSat
    });
  }

  // Deduct 1 Satoshi per request
  keyData.balanceSat -= 1;
  keyData.totalRequests += 1;
  saveApiKeys();

  req.apiKey = authHeader;
  req.developer = keyData;
  next();
}

// PQC Crytography Core Helpers
export function generateKyberKeys() {
  const keypair = ml_kem1024.keygen();
  return {
    publicKey: toHex(keypair.publicKey),
    privateKey: toHex(keypair.secretKey),
    algorithm: "ML-KEM-1024"
  };
}

export function generateDilithiumKeys() {
  const keypair = ml_dsa87.keygen();
  return {
    publicKey: toHex(keypair.publicKey),
    privateKey: toHex(keypair.secretKey),
    algorithm: "ML-DSA-87"
  };
}

export function kemEncapsulate(pkHex) {
  const result = ml_kem1024.encapsulate(fromHex(pkHex));
  return {
    ciphertext: toHex(result.cipherText),
    sharedSecret: toHex(result.sharedSecret)
  };
}

export function kemDecapsulate(skHex, ctHex) {
  const sharedSecret = ml_kem1024.decapsulate(fromHex(ctHex), fromHex(skHex));
  return {
    sharedSecret: toHex(sharedSecret)
  };
}

export function dsaSign(skHex, msgHex) {
  const signature = ml_dsa87.sign(fromHex(msgHex), fromHex(skHex));
  return {
    signature: toHex(signature),
    algorithm: "ML-DSA-87"
  };
}

export function dsaVerify(pkHex, msgHex, sigHex) {
  try {
    const valid = ml_dsa87.verify(fromHex(sigHex), fromHex(msgHex), fromHex(pkHex));
    return { valid };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
