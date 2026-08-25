/**
 * VOID-503 — Thomas-Fermi SDF Solver (semi-clássico, sem Schrödinger).
 */

import { solveDiatomic } from "../lusus/thomas_fermi_solver.js";

const MOLECULES = {
  H2: { separation: 1.4, label: "H₂" },
  H2O: { separation: 1.8, label: "H₂O (proxy diatómico)" },
  CH4: { separation: 2.1, label: "CH₄ (proxy diatómico)" },
};

export function solveThomasFermiSdf(molecule = "H2", separation) {
  const spec = MOLECULES[molecule] ?? MOLECULES.H2;
  const sep = separation ?? spec.separation;
  const result = solveDiatomic(sep);
  return {
    sku: "VOID-503",
    engine: "Thomas-Fermi SDF Solver",
    molecule: spec.label,
    separation_angstrom: sep,
    bindingEnergyEV: result.bindingEnergyEV,
    densityProfile: result.densityProfile,
    iso: { method: "thomas_fermi_plus_gradient", sdf: true },
    supra: { vhgpu_sharding: "roadmap", target_error_pct: "5-10" },
    complements: "VOID-54",
    disclaimer: result.disclaimer ?? "Aproximação TF — não DFT completo.",
  };
}
