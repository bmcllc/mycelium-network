#!/usr/bin/env node
/**
 * Lista SKUs/bundles B2B e rotas resultantes.
 * Uso: node scripts/b2b-list-skus.mjs [SKU,...]
 *      npm run b2b:list
 *      npm run b2b:list -- SOVEREIGN-CITIZEN VOID-54
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadModuleExports(path, exportName) {
  const src = readFileSync(path, 'utf8');
  if (exportName === 'ROUTE_PRIMARY_SKU') {
    const m = src.match(/export const ROUTE_PRIMARY_SKU[^=]*=\s*(\{[\s\S]*?\n\};)/);
    if (!m) throw new Error('ROUTE_PRIMARY_SKU not found');
    return Function(`"use strict"; return (${m[1].slice(0, -1)})`)();
  }
  if (exportName === 'BUNDLE_INCLUDES') {
    const start = src.indexOf('export const BUNDLE_INCLUDES');
    const end = src.indexOf('/** SKUs infra', start);
    if (start < 0 || end < 0) throw new Error('BUNDLE_INCLUDES not found');
    let body = src.slice(start, end).replace(/^export const BUNDLE_INCLUDES[^=]*=\s*/, '').trim();
    if (body.endsWith(';')) body = body.slice(0, -1);
    const masterIds = JSON.stringify(loadModuleExports(join(root, 'src/b2b/skuCatalog.generated.ts'), 'MASTER_SKU_IDS'));
    body = body.replaceAll('MASTER_SKU_IDS', masterIds);
    return Function(`"use strict"; return (${body})`)();
  }
  if (exportName === 'MASTER_SKU_IDS') {
    const catalog = loadModuleExports(join(root, 'src/b2b/skuCatalog.generated.ts'), 'SKU_CATALOG');
    return catalog.map((s) => s.id);
  }
  if (exportName === 'SKU_CATALOG') {
    const gen = readFileSync(join(root, 'src/b2b/skuCatalog.generated.ts'), 'utf8');
    const m = gen.match(/export const SKU_CATALOG[^=]*=\s*(\[[\s\S]*?\]) as const/);
    if (!m) throw new Error('SKU_CATALOG not found');
    return Function(`"use strict"; return (${m[1]})`)();
  }
  if (exportName === 'INFRA_ALIASES') {
    const m = src.match(/const INFRA_ROUTE_ALIASES[^=]*=\s*(\{[\s\S]*?\n\};)/);
    if (!m) throw new Error('INFRA_ROUTE_ALIASES not found');
    return Function(`"use strict"; return (${m[1].slice(0, -1)})`)();
  }
  throw new Error(`Unknown export ${exportName}`);
}

const ROUTE_PRIMARY_SKU = loadModuleExports(join(root, 'src/b2b/skuManifest.ts'), 'ROUTE_PRIMARY_SKU');
const BUNDLE_INCLUDES = loadModuleExports(join(root, 'src/b2b/skuManifest.ts'), 'BUNDLE_INCLUDES');
const INFRA_ROUTE_ALIASES = loadModuleExports(join(root, 'src/b2b/skuManifest.ts'), 'INFRA_ALIASES');
const MASTER_SKU_IDS = loadModuleExports(join(root, 'src/b2b/skuCatalog.generated.ts'), 'MASTER_SKU_IDS');

const ALL_ROUTE_SKU_IDS = [...new Set(Object.values(ROUTE_PRIMARY_SKU))];

function normalizeSkuId(raw) {
  const t = String(raw).trim();
  if (!t) return '';
  const u = t.toUpperCase();
  if (u === 'FULL-ENTERPRISE' || u === 'ALL' || u === '*') return 'VOID-ALL';
  if (u === 'VOID-00-329' || u === 'VOID-00329') return 'VOID-CATALOG-FULL';
  if (u === 'VOID-ALL' || u === 'VOID-CATALOG-FULL') return u;
  if (u.startsWith('VOID-')) return u;
  if (/^[0-9]{1,3}[A-F]?$/i.test(t)) return `VOID-${t.toUpperCase()}`;
  return u;
}

function resolveSkuIds(input) {
  const queue = input.map(normalizeSkuId).filter(Boolean);
  const out = new Set();
  while (queue.length > 0) {
    const id = queue.pop();
    if (out.has(id)) continue;
    if (id === 'VOID-ALL') {
      for (const routeSku of ALL_ROUTE_SKU_IDS) out.add(routeSku);
      continue;
    }
    if (id === 'VOID-CATALOG-FULL') {
      for (const child of MASTER_SKU_IDS) queue.push(child);
      continue;
    }
    out.add(id);
    const bundle = BUNDLE_INCLUDES[id];
    if (bundle) {
      for (const child of bundle) {
        if (child === '__ALL_ROUTES__') {
          for (const routeSku of ALL_ROUTE_SKU_IDS) out.add(routeSku);
        } else {
          queue.push(normalizeSkuId(child));
        }
      }
    }
  }
  return out;
}

function resolveEnabledPaths(input) {
  if (input.length === 0) return null;
  const ids = resolveSkuIds(input);
  const paths = new Set();
  for (const [path, sku] of Object.entries(ROUTE_PRIMARY_SKU)) {
    if (ids.has(sku)) paths.add(path);
  }
  for (const id of ids) {
    const extra = INFRA_ROUTE_ALIASES[id];
    if (extra) for (const p of extra) paths.add(p);
  }
  return paths;
}

const args = process.argv.slice(2).flatMap((a) => a.split(',')).map((s) => s.trim()).filter(Boolean);

if (args.length === 0) {
  console.log('Bundles comerciais (secção 25):');
  for (const id of Object.keys(BUNDLE_INCLUDES).filter((k) => !k.startsWith('VOID-'))) {
    const paths = resolveEnabledPaths([id]);
    console.log(`  ${id} → ${paths?.size ?? 72} rotas`);
  }
  console.log('\nUso: npm run b2b:list -- SOVEREIGN-CITIZEN');
  console.log('     npm run b2b:list -- VOID-54');
  process.exit(0);
}

for (const sku of args) {
  const ids = resolveSkuIds([sku]);
  const paths = resolveEnabledPaths([sku]);
  console.log(`\n=== ${normalizeSkuId(sku)} ===`);
  console.log(`SKUs expandidos (${ids.size}): ${[...ids].sort().join(', ')}`);
  if (paths === null) {
    console.log('Rotas: todas (72)');
  } else {
    console.log(`Rotas (${paths.size}):`);
    for (const p of [...paths].sort()) {
      console.log(`  ${p}  (${ROUTE_PRIMARY_SKU[p] ?? 'infra-alias'})`);
    }
  }
}
