/**
 * CQR → PQC — Entropia do motor quântico-relacional (Bell/quimb) alimenta ML-KEM/ML-DSA.
 *
 * Simulação CQR real via `quantum/server.py`; chaves NIST PQC via @noble/post-quantum
 * com seeds determinísticos derivados da medição (FIPS-203/204 keygen(seed)).
 */

import { ml_kem1024 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha3_256 } from "@noble/hashes/sha3.js";
import { isServerAvailable } from "./quantumBridge";
import { deriveHybridSeed, fetchOmegaEntropy } from "./entropyOrchestrator";
import {
  mlDsaSign,
  mlDsaVerify,
  type EncapsulatedKey,
  type PQCKeyPair,
  type PQCSignature,
} from "./pqc";

export interface CqrPqcStatus {
  cqrOnline: boolean;
  entropySource: "omega" | "hybrid" | "cqr" | "anu" | "csprng";
  entropyMethod: string | null;
  entropyTier: string | null;
  chshViolated: boolean | null;
  quantumVerified: boolean;
  lastEntropySha3: string | null;
  kemSeedBytes: number;
  dsaSeedBytes: number;
  pmuDomain: string;
}

export interface CqrHybridCipher {
  ciphertext: Uint8Array;
  encapsulatedKey: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
  entropySha3: string;
}


function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Domínio HKDF — entropia híbrida CQR+ANU (PMU). */
export async function deriveCqrSeed(domain: string, length: number): Promise<Uint8Array> {
  return deriveHybridSeed(domain, length);
}

/** Par ML-KEM-1024 com seed de 64 B derivada do CQR. */
export async function generateMLKEMKeypairFromCQR(): Promise<PQCKeyPair & { seedDomain: string }> {
  const seed = await deriveCqrSeed("ml-kem-keygen-v1", 64);
  const keypair = ml_kem1024.keygen(seed);
  seed.fill(0);
  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
    algorithm: "ML-KEM-1024",
    seedDomain: "ml-kem-keygen-v1",
  };
}

/** Par ML-DSA-87 com seed de 32 B derivada do CQR. */
export async function generateMLDSAKeypairFromCQR(): Promise<PQCKeyPair & { seedDomain: string }> {
  const seed = await deriveCqrSeed("ml-dsa-keygen-v1", 32);
  const keypair = ml_dsa87.keygen(seed);
  seed.fill(0);
  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
    algorithm: "ML-DSA-87",
    seedDomain: "ml-dsa-keygen-v1",
  };
}

/** Cifra híbrida: encaps KEM + ChaCha20 com entropia CQR no KEM e no nonce. */
export async function hybridEncryptCQR(
  recipientPublicKey: Uint8Array,
  plaintext: Uint8Array,
): Promise<CqrHybridCipher> {
  const kemMsg = await deriveCqrSeed("ml-kem-encaps-msg", 32);
  const { cipherText: encapsulatedKey, sharedSecret } = ml_kem1024.encapsulate(
    recipientPublicKey,
    kemMsg,
  );
  kemMsg.fill(0);

  const symmetricKey = sharedSecret.slice(0, 32);
  const nonceMaterial = await deriveCqrSeed("chacha-nonce-v1", 12);
  const nonce = nonceMaterial.slice(0, 12);
  nonceMaterial.fill(0);

  const cipher = chacha20poly1305(symmetricKey, nonce);
  const ciphertextAndTag = cipher.encrypt(plaintext);
  const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - 16);
  const tag = ciphertextAndTag.slice(ciphertextAndTag.length - 16);

  sharedSecret.fill(0);

  const hybrid = await fetchOmegaEntropy(256);
  const qrng = hybrid.cqr;
  const entropySha3 =
    qrng?.sha3_256 ?? bytesToHex(sha3_256(crypto.getRandomValues(new Uint8Array(32))));

  return {
    ciphertext,
    encapsulatedKey,
    nonce,
    tag,
    entropySha3,
  };
}

export function hybridDecryptCQR(
  privateKey: Uint8Array,
  encapsulatedKey: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
): Uint8Array {
  const sharedSecret = ml_kem1024.decapsulate(encapsulatedKey, privateKey);
  const symmetricKey = sharedSecret.slice(0, 32);
  const cipher = chacha20poly1305(symmetricKey, nonce);
  const ciphertextAndTag = new Uint8Array(ciphertext.length + tag.length);
  ciphertextAndTag.set(ciphertext);
  ciphertextAndTag.set(tag, ciphertext.length);
  const plain = cipher.decrypt(ciphertextAndTag);
  sharedSecret.fill(0);
  return plain;
}

export async function signMessageCQR(
  privateKey: Uint8Array,
  message: Uint8Array,
): Promise<PQCSignature & { entropySha3: string }> {
  const sig = mlDsaSign(privateKey, message);
  const hybrid = await fetchOmegaEntropy(256);
  const qrng = hybrid.cqr;
  const entropySha3 =
    qrng?.sha3_256 ?? bytesToHex(sha3_256(crypto.getRandomValues(new Uint8Array(32))));
  return { ...sig, entropySha3 };
}

export function verifyMessageCQR(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  return mlDsaVerify(publicKey, message, signature);
}

/** Estado do pipeline CQR+PQC para UI e health checks. */
export async function getCqrPqcStatus(): Promise<CqrPqcStatus> {
  const online = await isServerAvailable();
  const hybrid = await fetchOmegaEntropy(256);
  const tier = hybrid.tier;
  let source: CqrPqcStatus["entropySource"] = "csprng";
  if (tier === "omega") source = "omega";
  else if (tier === "hybrid") source = "hybrid";
  else if (tier === "anu_only") source = "anu";
  else if (tier === "cqr_only") source = "cqr";
  return {
    cqrOnline: online,
    entropySource: source,
    entropyMethod: hybrid.cqr?.method ?? "hybrid_hkdf_sha3",
    entropyTier: tier,
    chshViolated: hybrid.chshViolated,
    quantumVerified: hybrid.quantumVerified,
    lastEntropySha3: hybrid.sha3_256,
    kemSeedBytes: 64,
    dsaSeedBytes: 32,
    pmuDomain: "quantum_void",
  };
}

/** Round-trip de demonstração: KEM + assinatura com entropia CQR. */
export async function runCqrPqcSelfTest(message = "etrnet-cqr-pqc-selftest"): Promise<{
  ok: boolean;
  kemMatch: boolean;
  sigValid: boolean;
  status: CqrPqcStatus;
}> {
  const status = await getCqrPqcStatus();
  const kem = await generateMLKEMKeypairFromCQR();
  const dsa = await generateMLDSAKeypairFromCQR();
  const plain = new TextEncoder().encode(message);

  const enc = await hybridEncryptCQR(kem.publicKey, plain);
  const dec = hybridDecryptCQR(kem.privateKey, enc.encapsulatedKey, enc.ciphertext, enc.nonce, enc.tag);
  const kemMatch = dec.length === plain.length && dec.every((b, i) => b === plain[i]);

  const sig = await signMessageCQR(dsa.privateKey, plain);
  const sigValid = verifyMessageCQR(dsa.publicKey, plain, sig.signature);

  return { ok: kemMatch && sigValid, kemMatch, sigValid, status };
}

export type { EncapsulatedKey, PQCKeyPair, PQCSignature };
