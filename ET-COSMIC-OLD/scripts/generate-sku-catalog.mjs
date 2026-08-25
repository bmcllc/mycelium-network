#!/usr/bin/env node
/**
 * Gera src/b2b/skuCatalog.generated.ts a partir de docs/B2B-PRODUCT-LINES.md
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptName, adaptPath } from './imc-sku-adaptation-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'docs/B2B-PRODUCT-LINES.md'), 'utf8');

const skuRe = /\*\*VOID-([0-9A-F]{1,3})\*\*\s*\|\s*\*\*([^*]+)\*\*/g;
const entries = new Map();
let m;
while ((m = skuRe.exec(md))) {
  const id = `VOID-${m[1]}`;
  if (!entries.has(id)) entries.set(id, m[2].trim());
}

const routeBySku = {};
const routeMatrixRe = /\|\s*`(\/[^`]+)`\s*\|\s*VOID-([0-9A-F]{1,3})\s*\|/g;
while ((m = routeMatrixRe.exec(md))) {
  routeBySku[`VOID-${m[2]}`] = m[1];
}

const routeTableRe =
  /\*\*VOID-([0-9A-F]{1,3})\*\*[^|\n]*\|[^|\n]*\|\s*`?(\/[\w/-]+)`?\s*\|/g;
while ((m = routeTableRe.exec(md))) {
  if (m[2]?.startsWith('/')) routeBySku[`VOID-${m[1]}`] = m[2];
}

const bundleIds = new Set([
  'VOID-26', 'VOID-39', 'VOID-46', 'VOID-62', 'VOID-81', 'VOID-97', 'VOID-159', 'VOID-174',
  'VOID-188', 'VOID-189', 'VOID-199', 'VOID-205', 'VOID-219', 'VOID-244', 'VOID-263', 'VOID-264',
  'VOID-279', 'VOID-294', 'VOID-295', 'VOID-296', 'VOID-299', 'VOID-328', 'VOID-327', 'VOID-329',
  'VOID-ALL', 'VOID-319',
]);

const commercialBundles = [
  'SOVEREIGN-CITIZEN', 'CRYPTO-LAB', 'ENTROPY-APPLIANCE', 'FINANCE-NODE', 'COMPUTE-WORKER',
  'GPU-ORCHESTRATION', 'RESEARCH-INSTITUTE', 'EDGE-INTELLIGENCE', 'PRIVACY-MAX',
  'MESSENGER-ENTERPRISE', 'AMP-GOVERNANCE-PACK', 'PERFIL-B-HOME', 'CERTIFIED-PRODUCTION',
  'QUANTUM-LAB-PACK', 'VPS-OPERATOR-PACK', 'WHITE-LABEL-OEM', 'ANIMUS-OS-PREVIEW',
  'FULL-ENTERPRISE',
];

const commercialLabels = {
  'SOVEREIGN-CITIZEN': 'Sovereign Citizen',
  'CRYPTO-LAB': 'Crypto Lab',
  'ENTROPY-APPLIANCE': 'Entropy Appliance',
  'FINANCE-NODE': 'Finance Node',
  'COMPUTE-WORKER': 'Compute Worker',
  'GPU-ORCHESTRATION': 'GPU Orchestration',
  'RESEARCH-INSTITUTE': 'Research Institute',
  'EDGE-INTELLIGENCE': 'Edge Intelligence',
  'PRIVACY-MAX': 'Privacy Max',
  'MESSENGER-ENTERPRISE': 'Messenger Enterprise',
  'AMP-GOVERNANCE-PACK': 'AMP Governance Pack',
  'PERFIL-B-HOME': 'Perfil B Home Lab',
  'CERTIFIED-PRODUCTION': 'Certified Production',
  'QUANTUM-LAB-PACK': 'IMC Lab Pack (ex-Quantum)',
  'VPS-OPERATOR-PACK': 'VPS Operator Pack',
  'WHITE-LABEL-OEM': 'White-label OEM',
  'ANIMUS-OS-PREVIEW': 'Animus OS Preview',
  'FULL-ENTERPRISE': 'Full VOID Enterprise',
};
for (const [b, label] of Object.entries(commercialLabels)) {
  entries.set(b, label);
}

function kindFor(id) {
  if (commercialBundles.includes(id) || bundleIds.has(id)) return 'bundle';
  if (routeBySku[id]) return 'route';
  const n = parseInt(id.replace('VOID-', ''), 16);
  if (!Number.isNaN(n) && n <= 0x0f) return 'infra';
  if (!Number.isNaN(n) && n >= 300) return 'service';
  if ([13, 14, 15, 16, 17, 18, 130, 131, 132, 133, 320, 321, 322, 323, 324, 325, 326, 327].includes(n))
    return 'ux';
  return 'infra';
}

const ids = [...entries.keys()].sort((a, b) => {
  const pa = a.startsWith('VOID-') ? parseInt(a.slice(5), 16) : 9999;
  const pb = b.startsWith('VOID-') ? parseInt(b.slice(5), 16) : 9999;
  if (pa !== pb) return pa - pb;
  return a.localeCompare(b);
});

const catalog = ids.map((id) => {
  const legacyPath = routeBySku[id];
  const adaptedPath = adaptPath(legacyPath);
  return {
    id,
    name: adaptName(id, entries.get(id)),
    kind: kindFor(id),
    ...(adaptedPath ? { path: adaptedPath } : {}),
    ...(legacyPath && legacyPath !== adaptedPath ? { legacyPath } : {}),
  };
});

const out = `/** Gerado por scripts/generate-sku-catalog.mjs — não editar à mão. */
import type { SkuKind } from "./skuTypes";

export interface SkuCatalogEntry {
  id: string;
  name: string;
  kind: SkuKind;
  path?: string;
  legacyPath?: string;
}

export const SKU_CATALOG: readonly SkuCatalogEntry[] = ${JSON.stringify(catalog, null, 2)} as const;

/** Todos os VOID-00…VOID-329 (e bundles comerciais) definidos no catálogo. */
export const MASTER_SKU_IDS: readonly string[] = SKU_CATALOG.map((s) => s.id);

export const SKU_BY_ID: Record<string, SkuCatalogEntry> = Object.fromEntries(
  SKU_CATALOG.map((s) => [s.id, s]),
);
`;

writeFileSync(join(root, 'src/b2b/skuCatalog.generated.ts'), out);

const masterListPath = join(root, 'src/b2b/masterSkuList.json');
writeFileSync(masterListPath, `${JSON.stringify(ids, null, 2)}\n`);
console.log(`SKU_CATALOG: ${catalog.length} entradas, ${Object.keys(routeBySku).length} rotas`);
console.log(`masterSkuList.json: ${ids.length} IDs (sincronizado)`);
