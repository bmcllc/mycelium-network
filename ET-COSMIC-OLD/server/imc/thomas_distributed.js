/**
 * VOID-514 — Thomas-Fermi Distributed.
 */

import { solveThomasFermiSdf } from "../isossupra/thomas_fermi_sdf.js";

export function solveThomasDistributed(molecule, octreeShards = 4) {
  const local = solveThomasFermiSdf(molecule);
  const shards = Array.from({ length: octreeShards }, (_, i) => ({
    shardId: i,
    bindingEnergyEV: local.bindingEnergyEV * (1 + (i - octreeShards / 2) * 0.002),
  }));
  const mean =
    shards.reduce((s, x) => s + x.bindingEnergyEV, 0) / shards.length;
  return {
    sku: "VOID-514",
    molecule: local.molecule,
    bindingEnergyEV: mean,
    shards,
    iso: "thomas_fermi_sdf_grid",
    supra: "vhgpu_octree_void51",
    complements: "VOID-503",
    disclaimer: local.disclaimer,
  };
}
