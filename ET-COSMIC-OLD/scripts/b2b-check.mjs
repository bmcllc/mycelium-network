#!/usr/bin/env node
/**
 * Valida alinhamento routeCatalog ↔ componentMap ↔ ROUTE_PRIMARY_SKU.
 * Uso: npm run b2b:check
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractPathsFromCatalog() {
  const src = readFileSync(join(root, 'src/b2b/routeCatalog.ts'), 'utf8');
  const paths = [];
  const re = /"path":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) paths.push(m[1]);
  return paths;
}

function extractPathsFromComponentMap() {
  const src = readFileSync(join(root, 'src/b2b/componentMap.ts'), 'utf8');
  const m = src.match(/export const PANEL_COMPONENT_MAP[^=]*=\s*(\{[\s\S]*?\n\})/);
  if (!m) throw new Error('PANEL_COMPONENT_MAP not found');
  const map = Function(`"use strict"; return (${m[1]})`)();
  return Object.keys(map);
}

function extractPathsFromSkuManifest() {
  const src = readFileSync(join(root, 'src/b2b/skuManifest.ts'), 'utf8');
  const m = src.match(/export const ROUTE_PRIMARY_SKU[^=]*=\s*(\{[\s\S]*?\n\};)/);
  if (!m) throw new Error('ROUTE_PRIMARY_SKU not found');
  const map = Function(`"use strict"; return (${m[1].slice(0, -1)})`)();
  return Object.keys(map);
}

const catalog = extractPathsFromCatalog().sort();
const components = extractPathsFromComponentMap().sort();
const skus = extractPathsFromSkuManifest().sort();

function diff(a, b, label) {
  const onlyA = a.filter((x) => !b.includes(x));
  const onlyB = b.filter((x) => !a.includes(x));
  if (onlyA.length || onlyB.length) {
    console.error(`\n❌ ${label}`);
    if (onlyA.length) console.error('  só em A:', onlyA.join(', '));
    if (onlyB.length) console.error('  só em B:', onlyB.join(', '));
    return false;
  }
  return true;
}

let ok = true;
ok = diff(catalog, components, 'routeCatalog vs componentMap') && ok;
ok = diff(catalog, skus, 'routeCatalog vs ROUTE_PRIMARY_SKU') && ok;

console.log(`\nRotas: ${catalog.length}`);
console.log(`Componentes: ${components.length}`);
console.log(`SKUs primários: ${skus.length}`);

if (ok) {
  console.log('\n✓ Catálogo B2B alinhado (72 rotas esperadas).');
  process.exit(0);
}
process.exit(1);
