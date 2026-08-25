/**
 * VOID-600 — Isossupramulated Core (orquestra VOID-500 … VOID-506).
 */

import { solveIsingIsossupra } from "./ising_solver.js";
import { thermalQrngService } from "./qrng_thermal.js";
import { runAcousticHandshake } from "./acoustic_handshake.js";
import { solveThomasFermiSdf } from "./thomas_fermi_sdf.js";
import { chaosBellAuthenticate } from "./chaos_bell_auth.js";
import { vortexMemoryStatus, sealSecretInVortex, openVortexSecret } from "./vortex_store.js";
import { compileHomotopicPaths } from "./homotopy_compiler.js";

export const ISOSSUPRA_DISCLAIMER =
  "Isossupramulação: gêmeo digital fiel (iso) + amplificação mesh/LSC (supra). Clássico extremo — sem qubits.";

export const ENGINES = {
  "VOID-500": { id: "ising", label: "Ising Solver Engine" },
  "VOID-501": { id: "thermal-qrng", label: "QRNG Hardware Bridge" },
  "VOID-502": { id: "acoustic", label: "Acoustic Resonance Handshake" },
  "VOID-503": { id: "thomas-fermi", label: "Thomas-Fermi SDF Solver" },
  "VOID-504": { id: "chaos-bell", label: "Chaos-Bell Authenticator" },
  "VOID-505": { id: "vortex", label: "Vortex Memory Store" },
  "VOID-506": { id: "homotopy", label: "Homotopy Compiler" },
};

export function coreStatus() {
  return {
    sku: "VOID-600",
    engine: "Isossupramulated Core",
    version: "1.0.0",
    engines: Object.entries(ENGINES).map(([sku, e]) => ({ sku, ...e })),
    layers: { iso: "physical_parity_odes", supra: "mesh_sharding_lsc_homotopy" },
    integrates: ["LUSUS", "ETERNET", "AQRE", "void-runner"],
    disclaimer: ISOSSUPRA_DISCLAIMER,
  };
}

export function runEngine(engineId, body = {}) {
  switch (engineId) {
    case "ising":
    case "VOID-500":
      return solveIsingIsossupra(body);
    case "thermal-qrng":
    case "VOID-501":
      return thermalQrngService(body.bits ?? 256);
    case "acoustic":
    case "VOID-502":
      return runAcousticHandshake(body);
    case "thomas-fermi":
    case "VOID-503":
      return solveThomasFermiSdf(body.molecule, body.separation);
    case "chaos-bell":
    case "VOID-504":
      return chaosBellAuthenticate(body);
    case "vortex":
    case "VOID-505":
      if (body.action === "seal") return sealSecretInVortex(body.secretId, body.payload, body.geometrySeed);
      if (body.action === "open") return openVortexSecret(body.secretId, body.geometrySeed);
      return vortexMemoryStatus();
    case "homotopy":
    case "VOID-506":
      return compileHomotopicPaths(body.programId ?? "void-job", body.blocks);
    default:
      return { error: "UNKNOWN_ENGINE", engineId, available: Object.keys(ENGINES) };
  }
}

/** Pipeline iso+supra: entropia térmica → chaos-bell → vórtice selo opcional. */
export function runIsossupraPipeline(opts = {}) {
  const thermal = thermalQrngService(opts.bits ?? 256);
  const chaos = chaosBellAuthenticate({ seed: opts.seed });
  const acoustic = opts.room ? runAcousticHandshake({ room: opts.room }) : null;
  return {
    sku: "VOID-600",
    pipeline: "thermal→chaos→acoustic?",
    thermal,
    chaos,
    acoustic,
    disclaimer: ISOSSUPRA_DISCLAIMER,
  };
}
