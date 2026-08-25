/**
 * VOID Sovereign Stack — tipos canônicos (Anacroclastia × Isossupramulação).
 * ET-COSMIC / ETERNET / VØID · AGPL-3.0-or-later
 */

export const VOID_SOVEREIGN_VERSION = "1.0.0";
export const VOID_SOVEREIGN_LICENSE = "AGPL-3.0-or-later";

/** Três produtos visíveis (camada 3). */
export type VoidProduct = "VOID-BRIDGE" | "VOID-PCI" | "VOID-MESH";

export type VoidStackLayer = "substrate" | "compute" | "product";

export interface VoidProductDef {
  id: VoidProduct;
  label: string;
  tagline: string;
  idol: string;
  iso: string;
  supra: string;
  skus: readonly string[];
  path: string;
  apiServices: readonly string[];
}

export const VOID_PRODUCTS: readonly VoidProductDef[] = [
  {
    id: "VOID-BRIDGE",
    label: "VOID-BRIDGE",
    tagline: "Resolve QUBO sem quantum",
    idol: "D-Wave/IBM para otimização combinatória",
    iso: "QUBO · Ising · OpenQASM · Qiskit",
    supra: "Parallel Tempering clássico em ms — diz quando quantum ajudaria",
    skus: ["VOID-511", "VOID-514", "VOID-520", "VOID-522"],
    path: "/void/bridge",
    apiServices: ["bridge.solve", "bridge.savings"],
  },
  {
    id: "VOID-PCI",
    label: "VOID-PCI",
    tagline: "Detecta canal comprometido sem fóton",
    idol: "QKD com fibra dedicada",
    iso: "Paridade funcional com detecção de intrusão",
    supra: "PEFB — latência, jitter, KL divergence sobre TCP/WebRTC/mesh",
    skus: ["VOID-512", "VOID-513", "VOID-521"],
    path: "/void/pci",
    apiServices: ["pci.handshake", "pci.respond"],
  },
  {
    id: "VOID-MESH",
    label: "VOID-MESH",
    tagline: "Sua rede hospeda a rede",
    idol: "AWS/Cloudflare obrigatórios",
    iso: "Sites funcionam normalmente para visitantes",
    supra: "Tráfego web → malha P2P · ganhos $SOV · void-mesh.js",
    skus: ["VOID-700", "VOID-701", "VOID-702", "VOID-704", "VOID-710"],
    path: "/void/mesh",
    apiServices: ["mesh.register", "mesh.task.next", "mesh.task.submit"],
  },
] as const;

export const VOID_STACK_LAYERS = [
  {
    id: "substrate" as const,
    label: "Substrato",
    subtitle: "Silent Mesh Hosting (VOID-700)",
    color: "#3b82f6",
    components: ["Service Worker", "void-node", "void-mesh.js", "void_core.wasm"],
  },
  {
    id: "compute" as const,
    label: "VOID Compute Mesh",
    subtitle: "Motores clássicos + LSC",
    color: "#8b5cf6",
    components: ["Ising", "PEFB", "EntropyPool", "Nostr/WebRTC", "LSC Monitor"],
  },
  {
    id: "product" as const,
    label: "Produto",
    subtitle: "BRIDGE · PCI · MESH",
    color: "#b6ff3a",
    components: ["VOID-BRIDGE", "VOID-PCI", "VOID-MESH"],
  },
] as const;

export const VOID_SOVEREIGN_DISCLAIMER =
  "VOID Sovereign Stack: Anacroclastia × Isossupramulação — clássico honesto, malha auto-hospedada, AGPL-3.0-or-later.";

/** @deprecated alias IMC v2 */
export const IMC_DISCLAIMER = VOID_SOVEREIGN_DISCLAIMER;

export function productBySku(sku: string): VoidProductDef | undefined {
  return VOID_PRODUCTS.find((p) => p.skus.includes(sku));
}
