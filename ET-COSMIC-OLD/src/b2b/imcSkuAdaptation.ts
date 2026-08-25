/**
 * Adaptação IMC v2 — todos os SKUs do ecossistema (nome, rota, era, successor).
 * Usado pelo gerador de catálogo e pelo painel SKU Cosmos.
 */

export type SkuEra = "foundation" | "trust" | "finance" | "mesh" | "arsenal" | "economy" | "lab" | "vault" | "terminal" | "ops" | "retired";

export interface AdaptedSku {
  id: string;
  legacyName: string;
  name: string;
  era: SkuEra;
  path?: string;
  successor?: string;
  tagline: string;
}

/** Rotas legadas → IMC (sem /quantum/*). */
export const PATH_MIGRATION: Record<string, string> = {
  "/quantum/lsc": "/lab/lsc",
  "/quantum/qrc": "/lab/qrc-topology",
  "/quantum/paleo": "/lab/paleo",
  "/quantum/collapse": "/lab/collapse-algebra",
  "/quantum/anacroclastia": "/lab/anacroclastia",
  "/quantum/lusus": "/lab/lusus",
  "/quantum/aqre": "/lab/aqre-limits",
  "/quantum/oracle": "/network/nostr-oracle",
  "/quantum/qrng": "/lab/eaas",
  "/quantum/qrstocks": "/finance/rwa",
  "/quantum/heptary": "/lab/anacroclastia",
  "/quantum/isossupra": "/compute/imc",
  "/defi/phopper": "/vault/phopper",
  "/defi/aegis": "/vault/aegis",
  "/defi/yield": "/vault/yield",
  "/defi/ghost-locker": "/vault/ghost-locker",
  "/defi/faucet": "/vault/faucet",
  "/terminal/mining": "/terminal/marketplace",
};

/** Nomes adaptados por ID (legado → produto IMC). */
export const NAME_ADAPTATION: Record<string, { name: string; era: SkuEra; tagline: string; successor?: string }> = {
  "VOID-03": { name: "IMC Bridge (legado CQR)", era: "retired", tagline: "Motor Python removido — usar VOID-600", successor: "VOID-600" },
  "VOID-76": { name: "EaaS Precursor", era: "retired", tagline: "QRNG → sensores mesh", successor: "VOID-521" },
  "VOID-120": { name: "PoW Mining (legado)", era: "retired", tagline: "Hash vazio → marketplace", successor: "VOID-520" },
  "VOID-70": { name: "LSC Engine", era: "lab", tagline: "Lei 1 — limites termodinâmicos", successor: "VOID-180" },
  "VOID-71": { name: "QRC Topology", era: "lab", tagline: "Topologia clássica de rede" },
  "VOID-72": { name: "Paleo Engine", era: "lab", tagline: "Entropia temporal clássica" },
  "VOID-73": { name: "Collapse Algebra", era: "lab", tagline: "Termodinâmica financeira" },
  "VOID-74": { name: "Anacroclastia", era: "lab", tagline: "Honestidade clássica vs hype" },
  "VOID-80": { name: "LUSUS Terminal", era: "lab", tagline: "Ising, TF, caos — /api/lusus" },
  "VOID-81": { name: "Entropy Appliance Pack", era: "arsenal", tagline: "Bundle EaaS + PQC", successor: "VOID-521" },
  "VOID-288": { name: "BB84 (retirado)", era: "retired", tagline: "Emulação removida", successor: "VOID-513" },
  "VOID-500": { name: "Ising Server (legado)", era: "retired", successor: "VOID-511", tagline: "→ mesh Nostr 31224" },
  "VOID-501": { name: "Sensor GPIO (legado)", era: "retired", successor: "VOID-510", tagline: "→ entropy mesh" },
  "VOID-502": { name: "Helmholtz Model", era: "retired", successor: "VOID-512", tagline: "→ IR da sala" },
  "VOID-503": { name: "TF Local", era: "retired", successor: "VOID-514", tagline: "→ TF sharded" },
  "VOID-504": { name: "Chaos-Bell Auth", era: "arsenal", tagline: "Sync mesh VOID-513" },
  "VOID-510": { name: "Sensor Entropy Mesh", era: "arsenal", tagline: "Anti-Sybil físico" },
  "VOID-511": { name: "Ising Mesh", era: "arsenal", tagline: "NP-hard na malha" },
  "VOID-512": { name: "Acoustic Room Key", era: "arsenal", tagline: "A sala é a chave" },
  "VOID-513": { name: "Chaos Mesh Sync", era: "arsenal", tagline: "Semente distribuída" },
  "VOID-514": { name: "Thomas-Fermi Sharded", era: "arsenal", tagline: "Materiais na malha" },
  "VOID-520": { name: "Compute Marketplace", era: "economy", tagline: "Trabalho útil, 10 bps" },
  "VOID-521": { name: "Entropy-as-a-Service", era: "arsenal", tagline: "GhostID sem laboratório" },
  "VOID-522": { name: "ZK Aggregate Mesh", era: "arsenal", tagline: "Provas paralelas" },
  "VOID-600": { name: "VOID Sovereign Stack Core", era: "arsenal", tagline: "Orquestrador BRIDGE·PCI·MESH" },
  "VOID-700": { name: "Silent Mesh Hosting", era: "mesh", tagline: "Site = nó" },
  "VOID-701": { name: "Mesh CDN", era: "mesh", tagline: "Sites na malha" },
  "VOID-702": { name: "Web Node Manager", era: "mesh", tagline: "Ganhos + LSC" },
  "VOID-703": { name: "Binary Bazaar", era: "economy", tagline: "Vende qualquer binário em SOV" },
  "VOID-704": { name: "Hosting Revenue", era: "economy", tagline: "Tráfego → SOV" },
  "VOID-705": { name: "Ethical Mining Pool", era: "economy", tagline: "Arsenal sem dano" },
  "VOID-710": { name: "SOV Ledger", era: "economy", tagline: "Moeda da malha" },
  "VOID-180": { name: "LSC Resource Guard", era: "lab", tagline: "CPU/RAM — nunca parasita" },
  "VOID-125": { name: "SKU Cosmos Hub", era: "lab", tagline: "Mapa visual do ecossistema IMC" },
};

const ERA_BY_RANGE: [number, number, SkuEra][] = [
  [0, 15, "foundation"],
  [16, 29, "trust"],
  [30, 39, "finance"],
  [40, 49, "mesh"],
  [50, 69, "arsenal"],
  [70, 89, "lab"],
  [90, 109, "vault"],
  [110, 129, "terminal"],
  [280, 329, "ops"],
  [500, 522, "arsenal"],
  [600, 600, "arsenal"],
  [700, 710, "mesh"],
];

function parseVoidNum(id: string): number | null {
  if (!id.startsWith("VOID-")) return null;
  const n = parseInt(id.slice(5), 16);
  return Number.isNaN(n) ? null : n;
}

export function eraForSku(id: string): SkuEra {
  const explicit = NAME_ADAPTATION[id]?.era;
  if (explicit) return explicit;
  const n = parseVoidNum(id);
  if (n == null) return "ops";
  for (const [lo, hi, era] of ERA_BY_RANGE) {
    if (n >= lo && n <= hi) return era;
  }
  return "ops";
}

export function adaptSkuName(id: string, legacyName: string): string {
  const a = NAME_ADAPTATION[id];
  if (a) return a.name;
  return legacyName
    .replace(/Quantum Engine/i, "IMC Bridge")
    .replace(/Quantum /i, "Lab ")
    .replace(/QRNG/i, "EaaS")
    .replace(/Heptary Quantum/i, "Anacroclastia Limits")
    .replace(/Mining \(CPU\)/i, "Compute Marketplace")
    .replace(/GPU Mining/i, "Mesh GPU Worker")
    .replace(/Homotopy Mining/i, "Homotopy Validator");
}

export function adaptSkuPath(legacyPath?: string): string | undefined {
  if (!legacyPath) return undefined;
  return PATH_MIGRATION[legacyPath] ?? legacyPath;
}

export function adaptSkuTagline(id: string, legacyName: string): string {
  const a = NAME_ADAPTATION[id];
  if (a) return a.tagline;
  const era = eraForSku(id);
  const hints: Record<SkuEra, string> = {
    foundation: "Base WASM + gateway soberano",
    trust: "GhostID · PQC · ZKP",
    finance: "SOV · DEX · pools",
    mesh: "Malha Nostr · hosting silencioso",
    arsenal: "IMC motores 510–522",
    economy: "Hospedagem · binários · mineração ética",
    lab: "Clássico honesto — sem qubit",
    vault: "Cofres soberanos",
    terminal: "Workers · Lua · mixnet",
    ops: "Deploy · cert · OEM",
    retired: "Precursor — ver successor",
  };
  return hints[era] ?? legacyName;
}

export function getSuccessor(id: string): string | undefined {
  return NAME_ADAPTATION[id]?.successor;
}

/** Cinco camadas do ecossistema (visão Jobs). */
export const ECOSYSTEM_LAYERS = [
  { id: "foundation", label: "Fundação", color: "#a3a3a3", range: "VOID-00–0F", skuCount: 16 },
  { id: "body", label: "Corpo (Malha)", color: "#3b82f6", range: "VOID-40–49, 700–702", skuCount: 0 },
  { id: "arsenal", label: "Arsenal IMC", color: "#8b5cf6", range: "VOID-500–522, 600", skuCount: 0 },
  { id: "economy", label: "Economia SOV", color: "#10b981", range: "VOID-703–710, 520", skuCount: 0 },
  { id: "surface", label: "Superfície UI", color: "#b6ff3a", range: "VOID-10–129 painéis", skuCount: 0 },
] as const;

export function buildAdaptedCatalogEntry(id: string, legacyName: string, legacyPath?: string) {
  return {
    id,
    legacyName,
    name: adaptSkuName(id, legacyName),
    era: eraForSku(id),
    path: adaptSkuPath(legacyPath),
    successor: getSuccessor(id),
    tagline: adaptSkuTagline(id, legacyName),
  };
}
