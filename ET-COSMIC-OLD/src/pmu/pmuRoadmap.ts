/**
 * Estado do roadmap PMU (PDF) vs implementação atual.
 */

export type RoadmapStatus = "done" | "partial" | "planned";

export interface PmuRoadmapItem {
  id: string;
  title: string;
  status: RoadmapStatus;
  detail: string;
  route?: string;
}

export const PMU_ROADMAP: PmuRoadmapItem[] = [
  {
    id: "entropy-omega",
    title: "Entropia Ω (CQR + ANU + paleo)",
    status: "done",
    detail: "Motor Python + entropyOrchestrator; fallback simulado rotulado.",
    route: "/compute/pmu-truth",
  },
  {
    id: "vhgpu-4",
    title: "4 domínios vHGPU",
    status: "done",
    detail: "geom, quantum_void, algebra_paleo, lsc_mcm",
    route: "/compute/pmu-vhgpu",
  },
  {
    id: "void-runner",
    title: "GhostDocker Rust (void-runner)",
    status: "done",
    detail: "Servidor /cosmic/void/execute; browser usa ghostDockerBridge.",
    route: "/compute/cosmic-harmony",
  },
  {
    id: "harvest-import",
    title: "Phantom Harvest (import + fila harmonia)",
    status: "done",
    detail: "Sem scrape automático; JSON/CSV + sessionStorage.",
    route: "/harvester",
  },
  {
    id: "anchor-l2",
    title: "Governança on-chain (ETRNETAnchor)",
    status: "done",
    detail: "proposeRoot/finalize via wallet; servidor POST /pmu/anchor/propose com web3.",
    route: "/compute/pmu-roadmap",
  },
  {
    id: "mesh-full",
    title: "Malha PMU (manifesto kind 31220)",
    status: "done",
    detail: "Publicação + subscrição live; identidade NOSTR persistente.",
    route: "/compute/pmu-roadmap",
  },
  {
    id: "ibm-qrng",
    title: "IBM QRNG (opcional)",
    status: "planned",
    detail: "Requer API key; ANU/CQR cobrem produção local.",
  },
];
