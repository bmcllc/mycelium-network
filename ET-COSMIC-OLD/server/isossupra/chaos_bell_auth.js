/**
 * VOID-504 — Chaos-Bell Authenticator (sincronização de caos, HKDF).
 */

import crypto from "node:crypto";
import { correlatedPair } from "../lusus/chaos_bell.js";

export function deriveChaosBellKey(seed, context = "etrnet/isossupra/chaos-bell/v1") {
  const pair = correlatedPair(seed);
  const ikm = Buffer.from(
    `${pair.seed}:${pair.correlation}:${pair.chaos?.S ?? 0}:${pair.lhv?.S ?? 0}`,
    "utf8",
  );
  const key_hex = crypto.createHmac("sha3-512", ikm).update(context).digest("hex").slice(0, 64);
  return { pair, key_hex };
}

export function chaosBellAuthenticate(opts = {}) {
  const seed = parseInt(opts.seed ?? String(Date.now() % 100000), 10);
  const { pair, key_hex } = deriveChaosBellKey(seed, opts.context);
  return {
    sku: "VOID-504",
    engine: "Chaos-Bell Authenticator",
    seed,
    correlation: pair.correlation,
    chsh: { lhv: pair.lhv, chaos: pair.chaos },
    session_key_hex: key_hex,
    iso: { mechanism: "shared_chaos_seed" },
    supra: { bind_acoustic: "pair with VOID-502 room key (roadmap)" },
    complements: "VOID-288",
    simulation: true,
    quantum_verified: false,
    disclaimer: pair.disclaimer,
  };
}
