/**
 * Blindagem PQC das geodésicas Sistema 2 (ML-DSA-87 sobre metadados STA/LR).
 */
import { sha3_256 } from "@noble/hashes/sha3.js";
import { mlDsaSign, mlDsaVerify } from "../crypto/pqc";
import type { QrcRoutePlan } from "./qrcMotor";

export interface QrcSignedRoute {
  v: 1;
  commitment: string;
  shardIndex: number;
  geodesic: {
    distance: number;
    sin2: number;
    effectiveCost: number;
    usedLut: boolean;
  };
  liebRobinson: {
    spreadRate: number;
    vLR: number;
    safetyState: string;
  };
  preferredChannel: string;
  andersonCollapse: boolean;
  routeDigest: string;
  signatureB64: string;
  signerPubKeyB64: string;
}

function b64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBytes(b64str: string): Uint8Array {
  const bin = atob(b64str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function canonicalRouteBytes(
  commitment: string,
  shardIndex: number,
  plan: QrcRoutePlan,
): Uint8Array {
  const body = {
    v: 1,
    commitment,
    shardIndex,
    geodesic: {
      distance: plan.geodesic.distance,
      sin2: plan.geodesic.sin2,
      effectiveCost: plan.geodesic.effectiveCost,
      usedLut: plan.geodesic.usedLut,
    },
    liebRobinson: {
      spreadRate: plan.liebRobinson.spreadRate,
      vLR: plan.liebRobinson.vLR,
      safetyState: plan.liebRobinson.safetyState,
    },
    preferredChannel: plan.preferredChannel,
    andersonCollapse: plan.andersonCollapse,
  };
  return new TextEncoder().encode(JSON.stringify(body));
}

export function sealQrcRoute(
  commitment: string,
  shardIndex: number,
  plan: QrcRoutePlan,
  signingPrivateKey: Uint8Array,
  signingPublicKey: Uint8Array,
): QrcSignedRoute {
  const canonical = canonicalRouteBytes(commitment, shardIndex, plan);
  const routeDigest = Array.from(sha3_256(canonical))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const sig = mlDsaSign(signingPrivateKey, canonical);

  return {
    v: 1,
    commitment,
    shardIndex,
    geodesic: {
      distance: plan.geodesic.distance,
      sin2: plan.geodesic.sin2,
      effectiveCost: plan.geodesic.effectiveCost,
      usedLut: plan.geodesic.usedLut,
    },
    liebRobinson: {
      spreadRate: plan.liebRobinson.spreadRate,
      vLR: plan.liebRobinson.vLR,
      safetyState: plan.liebRobinson.safetyState,
    },
    preferredChannel: plan.preferredChannel,
    andersonCollapse: plan.andersonCollapse,
    routeDigest,
    signatureB64: b64(sig.signature),
    signerPubKeyB64: b64(signingPublicKey),
  };
}

export function verifyQrcRoute(sealed: QrcSignedRoute, plan: QrcRoutePlan): boolean {
  const canonical = canonicalRouteBytes(sealed.commitment, sealed.shardIndex, plan);
  const digest = Array.from(sha3_256(canonical))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (digest !== sealed.routeDigest) return false;

  const pub = b64ToBytes(sealed.signerPubKeyB64);
  const sig = b64ToBytes(sealed.signatureB64);
  return mlDsaVerify(pub, canonical, sig);
}

/** Reconstrói plano a partir do selo e verifica integridade ML-DSA. */
export function verifyQrcRouteSeal(sealed: QrcSignedRoute): boolean {
  const plan: QrcRoutePlan = {
    geodesic: {
      distance: sealed.geodesic.distance,
      sin2: sealed.geodesic.sin2,
      effectiveCost: sealed.geodesic.effectiveCost,
      usedLut: sealed.geodesic.usedLut,
      scale: 1.0,
    },
    liebRobinson: {
      spreadRate: sealed.liebRobinson.spreadRate,
      vLR: sealed.liebRobinson.vLR,
      safetyState: sealed.liebRobinson.safetyState as QrcRoutePlan["liebRobinson"]["safetyState"],
      violated: sealed.liebRobinson.safetyState === "anderson_cage",
    },
    safetyState: sealed.liebRobinson.safetyState as QrcRoutePlan["safetyState"],
    preferredChannel: sealed.preferredChannel as QrcRoutePlan["preferredChannel"],
    channelOrder: [sealed.preferredChannel as QrcRoutePlan["preferredChannel"]],
    andersonCollapse: sealed.andersonCollapse,
  };
  return verifyQrcRoute(sealed, plan);
}
