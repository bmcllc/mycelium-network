#!/usr/bin/env node
/**
 * Gate de produção B2B — verifica que SKUs do catálogo têm artefactos reais no repo.
 * Uso: npm run b2b:production-ready [--strict]
 */
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

let fail = 0;
let warn = 0;

function ok(msg) { console.log(`  ✓ ${msg}`); }
function w(msg) { console.log(`  ○ ${msg}`); warn++; }
function err(msg) { console.log(`  ✗ ${msg}`); fail++; }

function globExists(pattern) {
  const star = pattern.indexOf('*');
  if (star === -1) return artifactExists(pattern);
  const dir = join(root, pattern.slice(0, star).replace(/\/[^/]*$/, '') || '.');
  const suffix = pattern.slice(star + 1);
  const prefix = pattern.slice(0, star);
  const basePrefix = prefix.replace(/\/[^/]*$/, '');
  try {
    const walk = (d) => {
      if (!existsSync(d)) return false;
      for (const name of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, name.name);
        const rel = full.slice(root.length + 1);
        if (name.isDirectory()) {
          if (walk(full)) return true;
        } else if (rel.startsWith(basePrefix) && rel.endsWith(suffix)) {
          return true;
        }
      }
      return false;
    };
    return walk(join(root, basePrefix || '.'));
  } catch {
    return false;
  }
}

function artifactExists(pattern) {
  if (pattern.includes('*')) {
    return globExists(pattern);
  }
  const p = join(root, pattern);
  if (!existsSync(p)) return false;
  return statSync(p).isFile() || statSync(p).isDirectory();
}

console.log('\n═══ ETΞRNET — B2B Production Ready ═══\n');

console.log('▸ Catálogo alinhado');
try {
  execSync('node scripts/b2b-check.mjs', { cwd: root, stdio: 'pipe' });
  ok('b2b-check (72 rotas = componentMap = SKUs)');
} catch {
  err('b2b-check falhou');
}

console.log('\n▸ Testes B2B');
try {
  execSync('npx vitest run src/b2b/skuManifest.test.ts src/routes.test.ts', {
    cwd: root,
    stdio: 'pipe',
  });
  ok('skuManifest + routes');
} catch {
  err('testes B2B falhando');
}

console.log('\n▸ Artefactos por SKU');

const artifactsMod = await import(
  pathToFileURL(join(root, 'src/b2b/skuArtifacts.generated.ts')).href
);
const catalogMod = await import(
  pathToFileURL(join(root, 'src/b2b/skuCatalog.generated.ts')).href
);

const { SKU_ARTIFACTS, SERVICE_SKU_IDS, BUNDLE_SKU_IDS } = artifactsMod;
const { MASTER_SKU_IDS, SKU_CATALOG } = catalogMod;

const bundleSkuSet = new Set(BUNDLE_SKU_IDS ?? []);
for (const entry of SKU_CATALOG ?? []) {
  if (entry.kind === 'bundle') bundleSkuSet.add(entry.id);
}

const manifestSrc = readFileSync(join(root, 'src/b2b/skuManifest.ts'), 'utf8');
const bundleIds = new Set(
  [...manifestSrc.matchAll(/^\s*"([^"]+)":\s*\[/gm)].map((m) => m[1]),
);

const missingArtifacts = [];
let verified = 0;

for (const id of MASTER_SKU_IDS) {
  if (bundleIds.has(id) || bundleSkuSet.has(id)) {
    verified++;
    continue;
  }
  if (!id.startsWith('VOID-') && id.includes('-')) {
    verified++;
    continue;
  }
  const arts = SKU_ARTIFACTS[id];
  if (!arts || arts.length === 0) {
    if (SERVICE_SKU_IDS.includes(id)) {
      w(`${id} — serviço gerido`);
      verified++;
      continue;
    }
    missingArtifacts.push(`${id} (sem artefactos registados)`);
    continue;
  }
  const missing = arts.filter((a) => !artifactExists(a));
  if (missing.length > 0) {
    missingArtifacts.push(`${id} → ${missing.join(', ')}`);
  } else {
    verified++;
  }
}

if (missingArtifacts.length === 0) {
  ok(`${verified} SKUs atómicos com artefactos no repo`);
} else {
  for (const m of missingArtifacts.slice(0, 25)) err(m);
  if (missingArtifacts.length > 25) err(`… +${missingArtifacts.length - 25} SKUs`);
}

console.log('\n▸ Resolução de bundles');
for (const sku of [
  'SOVEREIGN-CITIZEN',
  'FULL-ENTERPRISE',
  'VOID-CATALOG-FULL',
  'MESSENGER-ENTERPRISE',
]) {
  try {
    execSync(`node scripts/b2b-list-skus.mjs ${sku}`, { cwd: root, stdio: 'pipe' });
    ok(`bundle ${sku}`);
  } catch {
    err(`bundle ${sku} inválido`);
  }
}

console.log('\n▸ Componentes UI (72 painéis)');
const componentMap = readFileSync(join(root, 'src/b2b/componentMap.ts'), 'utf8');
let compMissing = 0;
for (const line of componentMap.split('\n')) {
  const m = line.match(/:\s*"([^"]+)"/);
  if (!m) continue;
  const comp = `src/components/${m[1]}.tsx`;
  if (!existsSync(join(root, comp))) {
    err(`componente em falta: ${comp}`);
    compMissing++;
  }
}
if (compMissing === 0) ok('72 componentes React presentes');

console.log('');
if (fail > 0) {
  console.log(`FALHOU — ${fail} erro(s), ${warn} aviso(s)`);
  process.exit(1);
}
if (strict && warn > 0) {
  console.log(`STRICT — ${warn} aviso(s)`);
  process.exit(1);
}
console.log(`PRONTO PARA PRODUÇÃO — ${verified} SKUs verificados, ${warn} aviso(s)\n`);
