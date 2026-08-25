/**
 * Definição dos 10 produtos ET-COSMIC.
 * Cada produto é um conjunto de SKUs que pode ser vendido independentemente.
 * A separação é lógica (build-time via VITE_B2B_SKUS), não física (sem mover arquivos).
 */

export interface ProductDef {
  id: string;
  name: string;
  description: string;
  skus: string[];
  serverModules: string[];
  frontendRoutes: string[];
  dependencies: string[];
  priceEurYear: number;
  priceSovMonth: number;
  /** Tokens aceitos para pagamento: "sov", "dmc-u", "dmc-g", "eur" */
  acceptedTokens: string[];
}

export const PRODUCTS: Record<string, ProductDef> = {
  "core-sdk": {
    id: "core-sdk",
    name: "ET-COSMIC Core SDK",
    description:
      "Biblioteca criptográfica WASM + SDK TypeScript. GhostID, PQC (ML-KEM/ML-DSA), QEL, Double Ratchet, UTXO. Base para todos os outros produtos.",
    skus: ["VOID-00", "VOID-01", "VOID-0A", "VOID-0D", "VOID-20", "VOID-21"],
    serverModules: [],
    frontendRoutes: [],
    dependencies: [],
    priceEurYear: 45_000,
    priceSovMonth: 50,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "lusus-engine": {
    id: "lusus-engine",
    name: "LUSUS Engine",
    description:
      "Motor de física clássica honesta: Ising machine, Thomas-Fermi solver, Cavity-Planck, Vortex Memory, Chaos-Bell. Para otimização combinatória e simulação de matéria condensada.",
    skus: ["VOID-80"],
    serverModules: ["lusus"],
    frontendRoutes: ["/lab/lusus"],
    dependencies: ["core-sdk"],
    priceEurYear: 120_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "aqre-engine": {
    id: "aqre-engine",
    name: "AQRE Engine",
    description:
      "Orquestador AQRE com monitor LSC, campo chi, geodésicas STA. Limites Lieb-Robinson e rastreamento causal para simulações de longa duração.",
    skus: ["VOID-74", "VOID-70", "VOID-71", "VOID-72", "VOID-73"],
    serverModules: ["aqre"],
    frontendRoutes: ["/lab/aqre-limits", "/lab/lsc", "/lab/qrc-topology", "/lab/paleo", "/lab/collapse-algebra"],
    dependencies: ["lusus-engine"],
    priceEurYear: 95_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "sovereign-economy": {
    id: "sovereign-economy",
    name: "Sovereign Economy",
    description:
      "Ledger SOV, marketplace de binários, hosting revenue, mineração ética. Economia soberana completa com protocolo de taxas automático.",
    skus: ["VOID-710", "VOID-520", "VOID-703", "VOID-704", "VOID-705"],
    serverModules: ["economy"],
    frontendRoutes: ["/finance/sov-economy", "/terminal/marketplace"],
    dependencies: ["core-sdk"],
    priceEurYear: 85_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "void-stack": {
    id: "void-stack",
    name: "VOID Sovereign Stack",
    description:
      "Stack soberano completo: bridge, PCI, mesh compute, silent hosting, CDN, DAT settlement, contratos SLA. Infraestrutura de mesh descentralizada.",
    skus: ["VOID-700", "VOID-701", "VOID-702", "VOID-511", "VOID-512", "VOID-721"],
    serverModules: ["void", "mesh", "silentMesh"],
    frontendRoutes: ["/void/bridge", "/void/pci", "/void/mesh", "/network/silent-hosting", "/network/mesh-cdn", "/mesh/liquidity"],
    dependencies: ["core-sdk"],
    priceEurYear: 165_000,
    priceSovMonth: 2_500,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "imc-isossupra": {
    id: "imc-isossupra",
    name: "IMC / Isossupra Compute",
    description:
      "Arsenal IMC v2.0: Ising mesh, sensor entropy, acoustic room, chaos mesh, TF distributed, compute marketplace, EaaS, ZK aggregate. Motores de computação clássica honesta.",
    skus: ["VOID-600", "VOID-510", "VOID-513", "VOID-514", "VOID-515", "VOID-516", "VOID-517", "VOID-518", "VOID-519", "VOID-520", "VOID-521", "VOID-522"],
    serverModules: ["imc", "isossupra"],
    frontendRoutes: ["/compute/isossupra", "/compute/imc", "/compute/void-stack", "/lab/eaas"],
    dependencies: ["lusus-engine"],
    priceEurYear: 120_000,
    priceSovMonth: 2_500,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "pqc-service": {
    id: "pqc-service",
    name: "PQC-as-a-Service",
    description:
      "Criptografia pós-quântica como serviço: ML-KEM-1024 (encapsulamento) + ML-DSA-87 (assinaturas). API REST para integração com qualquer aplicação.",
    skus: ["VOID-22", "VOID-23"],
    serverModules: ["pqcService"],
    frontendRoutes: ["/crypto/pqc", "/crypto/cqr-pqc"],
    dependencies: ["core-sdk"],
    priceEurYear: 38_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "lightning-payment": {
    id: "lightning-payment",
    name: "Lightning / Payment Gateway",
    description:
      "Gateway de pagamento Lightning Network com NWC (Nostr Wallet Connect), watchtower, faturação SOV e integração LND. Pagamentos instantâneos e privados.",
    skus: ["VOID-37", "VOID-05", "VOID-06", "VOID-113"],
    serverModules: ["lightning"],
    frontendRoutes: ["/finance/payment", "/terminal/watchtower"],
    dependencies: ["core-sdk"],
    priceEurYear: 38_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "qrc-lab": {
    id: "qrc-lab",
    name: "QRC Lab",
    description:
      "Laboratório de computação quântico-relativística: Bruno Theory (FURC/HMCO/DTU/PDC/RCP), tensor networks, WebGPU tensor engine, PMU vHGPU scheduler. Pesquisa avançada em simulação.",
    skus: ["VOID-54", "VOID-57", "VOID-58", "VOID-59", "VOID-60", "VOID-61", "VOID-09"],
    serverModules: [],
    frontendRoutes: ["/compute/bruno-theory", "/compute/cosmic-harmony", "/compute/pmu-truth", "/compute/pmu-roadmap", "/compute/omega", "/compute/hgpu-compute"],
    dependencies: ["lusus-engine"],
    priceEurYear: 178_000,
    priceSovMonth: 2_500,
    acceptedTokens: ["sov", "eur", "dmc-u"],
  },

  "pmu-governance": {
    id: "pmu-governance",
    name: "PMU Governance",
    description:
      "Governança on-chain: DAO, anti-Sybil, consent contracts, âncora Ethereum (ETRNETAnchor.sol), temporal oracle, social recovery. Soberania protocolar com ZK voting.",
    skus: ["VOID-90", "VOID-91", "VOID-92", "VOID-93", "VOID-94", "VOID-95", "VOID-96", "VOID-97", "VOID-103"],
    serverModules: [],
    frontendRoutes: ["/governance/dao", "/governance/anti-sybil", "/governance/double-spend", "/governance/temporal", "/governance/social-recovery", "/governance/consent", "/governance/sovereignty", "/vault/ghost-locker"],
    dependencies: ["core-sdk"],
    priceEurYear: 56_000,
    priceSovMonth: 250,
    acceptedTokens: ["sov", "eur", "dmc-u", "dmc-g"],
  },
};

/** IDs de todos os produtos. */
export const PRODUCT_IDS = Object.keys(PRODUCTS);

/** Obtém a definição de um produto pelo ID. */
export function getProduct(id: string): ProductDef | undefined {
  return PRODUCTS[id];
}

/** Lista todos os SKUs de um produto (incluindo dependências recursivas). */
export function resolveProductSkus(productId: string): Set<string> {
  const product = PRODUCTS[productId];
  if (!product) return new Set();

  const skus = new Set(product.skus);
  for (const dep of product.dependencies) {
    for (const sku of resolveProductSkus(dep)) {
      skus.add(sku);
    }
  }
  return skus;
}

/** Lista todas as rotas de um produto (incluindo dependências recursivas). */
export function resolveProductRoutes(productId: string): Set<string> {
  const product = PRODUCTS[productId];
  if (!product) return new Set();

  const routes = new Set(product.frontendRoutes);
  for (const dep of product.dependencies) {
    for (const route of resolveProductRoutes(dep)) {
      routes.add(route);
    }
  }
  return routes;
}

/** Gera o VITE_B2B_SKUS para um produto específico. */
export function buildSkuEnvForProduct(productId: string): string {
  const skus = resolveProductSkus(productId);
  return JSON.stringify([...skus]);
}

/** Mapeamento reverso: SKU → produto que o contém diretamente. */
export function getDirectProductForSku(skuId: string): ProductDef | undefined {
  for (const product of Object.values(PRODUCTS)) {
    if (product.skus.includes(skuId)) return product;
  }
  return undefined;
}
