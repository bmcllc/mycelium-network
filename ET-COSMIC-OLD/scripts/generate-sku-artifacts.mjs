#!/usr/bin/env node
/**
 * Gera src/b2b/skuArtifacts.generated.ts — paths verificáveis por SKU.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'docs/B2B-PRODUCT-LINES.md'), 'utf8');

function loadComponentMap() {
  const src = readFileSync(join(root, 'src/b2b/componentMap.ts'), 'utf8');
  const map = {};
  const re = /"(\/[^"]+)":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = m[2];
  return map;
}

function loadRoutePrimarySku() {
  const src = readFileSync(join(root, 'src/b2b/skuManifest.ts'), 'utf8');
  const skuByPath = {};
  const re = /"(\/[^"]+)":\s*"(VOID-[^"]+)"/g;
  let m;
  while ((m = re.exec(src))) skuByPath[m[1]] = m[2];
  return skuByPath;
}

function extractSkuIds() {
  const ids = new Set();
  const re = /\*\*VOID-([0-9A-F]{1,3})\*\*/g;
  let m;
  while ((m = re.exec(md))) ids.add(`VOID-${m[1]}`);
  for (const b of [
    'SOVEREIGN-CITIZEN', 'CRYPTO-LAB', 'ENTROPY-APPLIANCE', 'FINANCE-NODE', 'COMPUTE-WORKER',
    'GPU-ORCHESTRATION', 'RESEARCH-INSTITUTE', 'EDGE-INTELLIGENCE', 'PRIVACY-MAX',
    'MESSENGER-ENTERPRISE', 'AMP-GOVERNANCE-PACK', 'PERFIL-B-HOME', 'CERTIFIED-PRODUCTION',
    'QUANTUM-LAB-PACK', 'VPS-OPERATOR-PACK', 'WHITE-LABEL-OEM', 'ANIMUS-OS-PREVIEW',
    'FULL-ENTERPRISE', 'VOID-CATALOG-FULL', 'VOID-ALL',
  ]) ids.add(b);
  return [...ids];
}

const SKIP_TOKENS = new Set([
  'Real', 'Real+', 'SDK', 'Bundle', 'Serviço', 'Infra', 'Android', 'Harmony', 'Messenger',
  'backend', 'Labs', 'OEM', 'preview', 'A', 'B', 'VPS', 'IDE', 'hardware', 'terceiros',
  'Integração', 'emulador', 'parceiro', 'Carga', 'referência', 'terceiros',
]);

function pathExists(p) {
  if (p.includes('*')) {
    const idx = p.indexOf('*');
    const base = join(root, p.slice(0, idx).replace(/\/$/, ''));
    const suffix = p.slice(idx + 1);
    if (!existsSync(base)) return false;
    const walk = (dir) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
          if (walk(full)) return true;
        } else if (ent.name.endsWith(suffix.replace(/^\./, '')) || suffix === '' || ent.name.includes(suffix)) {
          return true;
        }
      }
      return false;
    };
    return walk(base);
  }
  const full = join(root, p);
  return existsSync(full);
}

function resolveCandidates(raw) {
  const out = [];
  const add = (p) => { if (p && !out.includes(p)) out.push(p); };

  add(normalizeArtifact(raw));
  add(raw.replace(/^\.\//, ''));

  if (raw.startsWith('@')) add('eternet_ts/package.json');
  if (raw === 'docker-compose' || raw.startsWith('docker-compose ')) add('docker-compose.sovereign.yml');
  if (raw.includes('pi_worker.wasm')) add('artifacts/pi_worker.wasm');
  if (raw === 'collapse/' || raw === 'collapse') add('src/collapse/collapseAlgebra.ts');

  if (/^[A-Z][a-zA-Z0-9]+(Panel|Lab|Dashboard|Setup|Core|Bridge|Terminal)$/.test(raw)) {
    add(`src/components/${raw}.tsx`);
  }
  if (/^[A-Z][a-zA-Z0-9]+\.tsx$/.test(raw)) add(`src/components/${raw}`);
  if (/^[a-z][a-zA-Z0-9-]*\.sh$/.test(raw)) add(`scripts/${raw}`);
  if (/^[a-zA-Z][a-zA-Z0-9]*\.ts$/.test(raw)) {
    for (const dir of ['crypto', 'storage', 'crdt', 'pmu', 'core', 'lib', 'compute', 'protocol', 'harvesters', 'lsc', 'theory', 'collapse']) {
      add(`src/${dir}/${raw}`);
    }
    add(`src/${raw}`);
    add(`eternet_ts/src/crypto/${raw}`);
  }
  if (/^[a-z][a-zA-Z0-9_/]*\.(ts|tsx|sol|lua|py|mjs|sh)$/.test(raw) && !raw.startsWith('src/') && !raw.startsWith('scripts/')) {
    add(`src/${raw}`);
  }
  if (/^[a-z][a-zA-Z0-9_/]+$/.test(raw) && !raw.includes('.')) {
    add(`src/${raw}.ts`);
    add(`src/${raw}.tsx`);
  }
  if (raw.includes('*')) {
    add(raw.startsWith('scripts/') ? raw : `scripts/${raw}`);
    add(raw);
  }

  const STATIC_ALIASES = {
    'crypto/steganography.ts': 'src/omega/steganography.ts',
    'crypto/singularityHarvester': 'src/crypto/singularityHarvester.ts',
    'storage/utxoStore': 'src/storage/utxoStore.ts',
    'components/JanusFinance': 'src/components/JanusFinancePanel.tsx',
    'harvester exports': 'src/harvesters/scrapScanner.ts',
  };
  if (STATIC_ALIASES[raw]) add(STATIC_ALIASES[raw]);
  if (raw.endsWith('Panel') || raw.endsWith('Lab')) add(`src/components/${raw}.tsx`);

  return out;
}

function resolveExistingPath(raw) {
  for (const c of resolveCandidates(raw)) {
    if (pathExists(c)) return c;
  }
  return null;
}

/** Extrai paths de backticks numa linha de tabela markdown. */
function pathsFromLine(line) {
  const out = new Set();
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(line))) {
    const raw = m[1].trim();
    if (raw.startsWith('/')) continue;
    if (raw.includes('→') || raw.includes('npm run')) continue;
    if (SKIP_TOKENS.has(raw)) continue;
    if (/^\d+–\d+/.test(raw) || /^\d+\s*\+/.test(raw)) continue;
    out.add(raw);
  }
  return [...out];
}

function normalizeArtifact(raw) {
  let p = raw.replace(/^\.\//, '');
  if (p.startsWith('src/') || p.startsWith('scripts/') || p.startsWith('core/') || p.startsWith('quantum/') ||
      p.startsWith('void_') || p.startsWith('android/') || p.startsWith('server/') ||
      p.startsWith('contracts/') || p.startsWith('docs/') || p.startsWith('eternet_ts/') ||
      p.startsWith('DOC/') || p.startsWith('artifacts/') ||
      p.startsWith('Dockerfile') || p.startsWith('docker-compose')) {
    return p;
  }
  if (p.includes('/') && !p.startsWith('@')) {
    if (p.startsWith('crypto/') || p.startsWith('storage/') || p.startsWith('core/') ||
        p.startsWith('lib/') || p.startsWith('collapse/') || p.startsWith('utils/') ||
        p.startsWith('ethics/') || p.startsWith('hooks/') || p.startsWith('vps/') ||
        p.startsWith('network/') || p.startsWith('crdt/') || p.startsWith('protocol/') ||
        p.startsWith('harvesters/')) {
      return `src/${p}`;
    }
    return p;
  }
  if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.sh') || p.endsWith('.mjs') ||
      p.endsWith('.lua') || p.endsWith('.py') || p.endsWith('.sol')) {
    return `src/${p}`;
  }
  if (p.endsWith('Panel') || p.endsWith('Lab') || p.endsWith('Dashboard')) {
    return `src/components/${p}.tsx`;
  }
  return null;
}

const artifactsBySku = {};
for (const id of extractSkuIds()) artifactsBySku[id] = new Set();

for (const line of md.split('\n')) {
  const skuM = line.match(/\*\*VOID-([0-9A-F]{1,3})\*\*/);
  if (!skuM) continue;
  const id = `VOID-${skuM[1]}`;
  for (const p of pathsFromLine(line)) {
    const n = normalizeArtifact(p);
    if (n) artifactsBySku[id]?.add(n);
  }
}

const componentMap = loadComponentMap();
const routeSku = loadRoutePrimarySku();
for (const [path, comp] of Object.entries(componentMap)) {
  const sku = routeSku[path];
  if (!sku) continue;
  if (!artifactsBySku[sku]) artifactsBySku[sku] = new Set();
  artifactsBySku[sku].add(`src/components/${comp}.tsx`);
}

/** Infra / UX / serviços — artefactos canónicos (código real no monorepo). */
const CANONICAL = {
  'VOID-00': ['void_core/pkg', 'void_core/src'],
  'VOID-01': ['eternet_ts/src', 'eternet_ts/package.json'],
  'VOID-02': ['void_runner/src', 'void_runner/Cargo.toml'],
  'VOID-03': ['core/', 'Dockerfile.quantum'],
  'VOID-04': ['server/server.js'],
  'VOID-05': ['docker-compose.sovereign.yml'],
  'VOID-06': ['contracts/'],
  'VOID-07': ['android/', 'capacitor.config.ts'],
  'VOID-08': ['vite.config.ts', 'src/App.tsx'],
  'VOID-09': ['docs/archive/bruno-theory/'],
  'VOID-0A': ['artifacts/pi_worker.wasm', 'void_runner/src'],
  'VOID-0B': ['eternet_ts/package.json', 'docs/ARCH-EVOLUTION.md'],
  'VOID-0D': ['Cargo.toml'],
  'VOID-0E': ['Dockerfile.production'],
  'VOID-13': ['src/AppLanding.tsx'],
  'VOID-14': ['src/components/Onboarding.tsx'],
  'VOID-15': ['src/components/GhostIDSetup.tsx'],
  'VOID-16': ['src/components/DevSetupBanner.tsx'],
  'VOID-17': ['src/panelTiers.ts', 'src/components/PanelTierBadge.tsx'],
  'VOID-18': ['src/components/NetworkSimCore.tsx'],
  'VOID-130': ['src/router.tsx', 'src/layouts/AppLayout.tsx'],
  'VOID-131': ['src/protocol/amp/slcc.ts', 'src/App.tsx'],
  'VOID-132': ['src/core/cosmicVoidOrchestrator.ts', 'src/theory/'],
  'VOID-133': ['docker-compose.sovereign.yml', 'src/App.tsx'],
  'VOID-320': ['src/layouts/AppLayout.tsx'],
  'VOID-321': ['src/router.tsx', 'src/b2b/'],
  'VOID-322': ['src/lib/httpJson.ts'],
  'VOID-323': ['src/utils/qr.tsx'],
  'VOID-324': ['src/utils/devLog.ts'],
  'VOID-325': ['src/index.css'],
  'VOID-326': ['src/b2b/skuManifest.ts', 'scripts/vite-b2b-loaders.ts'],
  'VOID-300': ['docker-compose.sovereign.yml', 'scripts/stack-status.sh'],
  'VOID-301': ['Dockerfile.quantum', 'scripts/docker-quantum-prepare.sh'],
  'VOID-302': ['src/compute/animusSubstrates.ts', 'core/'],
  'VOID-303': ['scripts/pmu-audit.mjs'],
  'VOID-304': ['scripts/pmu-anchor-propose.mjs', 'scripts/pmu-anchor-finalize-node.mjs'],
  'VOID-305': ['scripts/build-b2b.sh', 'vite.config.ts'],
  'VOID-306': ['scripts/android-build-b2b.sh'],
  'VOID-307': ['scripts/cqr-tunnel-quick.sh', 'DOC/FILOSOFIA-DEPLOY.md'],
  'VOID-308': ['docs/archive/bruno-theory/', 'scripts/sync-theory-archive.sh'],
  'VOID-309': ['src/theory/brunoTheoryEngine.ts'],
  'VOID-310': ['src/harvesters/scrapScanner.ts'],
  'VOID-311': ['docker-compose.sovereign.yml'],
  'VOID-312': ['scripts/lnd-create-wallet.sh', 'scripts/lnd-entrypoint.sh'],
  'VOID-313': ['scripts/production-preflight.sh'],
  'VOID-314': ['eternet_ts/README.md'],
  'VOID-315': ['src/protocol/amp/recursiveStark.ts', 'src/components/ZKPLab.tsx'],
  'VOID-316': ['src/components/SupplyChainSecurity.tsx'],
  'VOID-317': ['src/components/SphinxMixnetPanel.tsx'],
  'VOID-318': ['scripts/production-preflight.sh', 'docker-compose.sovereign.yml'],
  'VOID-145': ['src/omega/steganography.ts'],
  'VOID-155': ['src/crypto/singularityHarvester.ts'],
  'VOID-161': ['src/protocol/amp/slcc.ts'],
  'VOID-162': ['src/protocol/amp/consentReceiptStore.ts'],
  'VOID-163': ['src/protocol/amp/consentLattice.ts'],
  'VOID-165': ['src/protocol/amp/pmuOmegaPipeline.ts'],
  'VOID-166': ['src/protocol/amp/pmuComputeOrchestrator.ts'],
  'VOID-167': ['src/protocol/amp/vhgpuClient.ts'],
  'VOID-168': ['src/protocol/amp/recursiveStark.ts'],
  'VOID-170': ['src/protocol/amp/knownLimitations.ts'],
  'VOID-171': ['src/protocol/sovereignty/protocolRoyalty.ts'],
  'VOID-182': ['src/harvesters/social/telegramScraper.ts'],
  'VOID-183': ['src/harvesters/exchanges/binanceScraper.ts'],
  'VOID-184': ['src/harvesters/exchanges/mercadoBitcoinScraper.ts'],
  'VOID-187': ['src/harvesters/scrapScanner.ts'],
  'VOID-204': ['src/storage/utxoStore.ts'],
  'VOID-276': ['src/components/JanusFinancePanel.tsx', 'src/crypto/janusFinance.ts'],
  'VOID-285': ['scripts/pmu-anchor-propose.mjs', 'scripts/pmu-anchor-finalize-node.mjs'],
  'VOID-287': ['scripts/android-build-sovereign.sh', 'scripts/android-sync.sh'],
  'VOID-289': ['scripts/load-nwc-uri.mjs', 'scripts/validate-nwc-uri.mjs', 'scripts/nwc-interop.sh'],
  'VOID-290': ['scripts/lnd-create-wallet.sh', 'scripts/lnd-entrypoint.sh'],
  'VOID-291': ['scripts/relay-health.mjs'],
  'VOID-292': ['scripts/bootstrap-sepolia-dev.mjs'],
  'VOID-293': ['scripts/verify-anchor-sourcify.sh'],
  'VOID-298': ['scripts/docker-quantum-prepare.sh', 'scripts/quantum-docker-entrypoint.sh'],
  'VOID-319': ['scripts/b2b-production-ready.mjs', 'docs/B2B-PRODUCT-LINES.md'],
  'VOID-CATALOG-FULL': ['src/b2b/skuCatalog.generated.ts', 'scripts/b2b-production-ready.mjs'],
  'VOID-ALL': ['src/b2b/routeCatalog.ts'],
  'FULL-ENTERPRISE': ['src/b2b/skuManifest.ts'],
};

for (const [id, paths] of Object.entries(CANONICAL)) {
  if (!artifactsBySku[id]) artifactsBySku[id] = new Set();
  for (const p of paths) artifactsBySku[id].add(p);
}

/** Mantém só paths que existem no repo (resolução canónica). */
for (const id of Object.keys(artifactsBySku)) {
  const resolved = new Set();
  for (const p of artifactsBySku[id]) {
    const hit = resolveExistingPath(p) ?? (pathExists(p) ? p : null);
    if (hit) resolved.add(hit);
  }
  artifactsBySku[id] = resolved;
}

const catalogSrc = readFileSync(join(root, 'src/b2b/skuCatalog.generated.ts'), 'utf8');
const BUNDLE_SKU_IDS = [];
for (const block of catalogSrc.matchAll(/\{\s*"id": "([^"]+)",[\s\S]*?"kind": "bundle"\s*\}/g)) {
  BUNDLE_SKU_IDS.push(block[1]);
}

const SERVICE_IDS = new Set(
  [...extractSkuIds()].filter((id) => {
    const n = parseInt(id.replace('VOID-', ''), 10);
    return !Number.isNaN(n) && n >= 300 && n <= 319;
  }),
);

const out = {};
for (const [id, set] of Object.entries(artifactsBySku)) {
  const arr = [...set].sort();
  if (arr.length === 0 && !id.includes('-') && id.startsWith('VOID-')) continue;
  out[id] = arr;
}

writeFileSync(
  join(root, 'src/b2b/skuArtifacts.generated.ts'),
  `/** Gerado por scripts/generate-sku-artifacts.mjs */
export type SkuDeliveryKind = "code" | "bundle" | "service" | "meta";

export interface SkuArtifactEntry {
  id: string;
  artifacts: readonly string[];
  delivery: SkuDeliveryKind;
}

export const SERVICE_SKU_IDS: readonly string[] = ${JSON.stringify([...SERVICE_IDS].sort())};

export const BUNDLE_SKU_IDS: readonly string[] = ${JSON.stringify([...new Set(BUNDLE_SKU_IDS)].sort())};

export const SKU_ARTIFACTS: Record<string, readonly string[]> = ${JSON.stringify(out, null, 2)};

export const SKU_ARTIFACT_INDEX: readonly SkuArtifactEntry[] = Object.entries(SKU_ARTIFACTS).map(
  ([id, artifacts]) => ({
    id,
    artifacts,
    delivery: SERVICE_SKU_IDS.includes(id)
      ? "service"
      : id.includes("-") && !id.startsWith("VOID-")
        ? "bundle"
        : artifacts.length > 0
          ? "code"
          : "meta",
  }),
);
`,
);

console.log(`SKU_ARTIFACTS: ${Object.keys(out).length} SKUs com artefactos`);
