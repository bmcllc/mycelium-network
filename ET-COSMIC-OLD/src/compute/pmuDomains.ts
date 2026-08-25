/**
 * Domínios vHGPU — PMU (Protocolo de Malha Unificado) §3.5.2 / §3.7.3
 *
 * Quatro núcleos lógicos mínimos (4 cores cada) para offload HCF.
 * Ref: DOC/Protocolo_de_Malha_Unificado.pdf
 */

export const PMU_VHGPU_MIN_CORES = 4 as const;

/** Identificadores de domínio (alinhados com quantum/server.py /pmu/vhgpu) */
export type PmuVhgpuDomainId =
  | "geom_relativity"
  | "quantum_void"
  | "algebra_paleo"
  | "lsc_mcm";

export interface PmuVhgpuDomainSpec {
  id: PmuVhgpuDomainId;
  label: string;
  description: string;
  pmuSection: string;
  minCores: typeof PMU_VHGPU_MIN_CORES;
  /** Estágio AMP que autoriza compute neste domínio */
  ampStage: "HCF" | "DPL";
}

export const PMU_VHGPU_DOMAINS: readonly PmuVhgpuDomainSpec[] = [
  {
    id: "geom_relativity",
    label: "Geometria / Relatividade",
    description: "SDF homotópico, núcleo diferencial, topologia (HGPU §4)",
    pmuSection: "PMU §3.5 / Cap.4 HGPU",
    minCores: PMU_VHGPU_MIN_CORES,
    ampStage: "HCF",
  },
  {
    id: "quantum_void",
    label: "Quântica / VOID",
    description: "CQR Bell + CHSH por circuito; entropia para PQC/GhostID",
    pmuSection: "PMU §3.5 VOID / CQR",
    minCores: PMU_VHGPU_MIN_CORES,
    ampStage: "HCF",
  },
  {
    id: "algebra_paleo",
    label: "Álgebra / Paleocomputação",
    description: "MCM (colapso com memória) + fossilização Paleo",
    pmuSection: "PMU §3.5 Cap.8 MCM / Cap.12 Paleo",
    minCores: PMU_VHGPU_MIN_CORES,
    ampStage: "DPL",
  },
  {
    id: "lsc_mcm",
    label: "LSC / MCM",
    description: "Saturação LSC (C_ε, K_eff) acoplada a stress MCM",
    pmuSection: "PMU §3.5 Cap.9 LSC + Cap.8 MCM",
    minCores: PMU_VHGPU_MIN_CORES,
    ampStage: "HCF",
  },
] as const;

export function getPmuDomain(id: PmuVhgpuDomainId): PmuVhgpuDomainSpec {
  const d = PMU_VHGPU_DOMAINS.find((x) => x.id === id);
  if (!d) throw new Error(`PMU_VHGPU: domínio desconhecido ${id}`);
  return d;
}
