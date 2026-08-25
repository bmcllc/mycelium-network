/** Dados de adaptação IMC — usado por generate-sku-catalog.mjs */

export const PATH_MIGRATION = {
  '/quantum/lsc': '/lab/lsc',
  '/quantum/qrc': '/lab/qrc-topology',
  '/quantum/paleo': '/lab/paleo',
  '/quantum/collapse': '/lab/collapse-algebra',
  '/quantum/anacroclastia': '/lab/anacroclastia',
  '/quantum/lusus': '/lab/lusus',
  '/quantum/aqre': '/lab/aqre-limits',
  '/quantum/oracle': '/network/nostr-oracle',
  '/quantum/qrng': '/lab/eaas',
  '/quantum/qrstocks': '/finance/rwa',
  '/quantum/heptary': '/lab/anacroclastia',
  '/defi/phopper': '/vault/phopper',
  '/defi/aegis': '/vault/aegis',
  '/defi/yield': '/vault/yield',
  '/defi/ghost-locker': '/vault/ghost-locker',
  '/defi/faucet': '/vault/faucet',
  '/terminal/mining': '/terminal/marketplace',
};

export const NAME_ADAPTATION = {
  'VOID-03': { name: 'IMC Bridge (legado CQR)', successor: 'VOID-600' },
  'VOID-76': { name: 'EaaS Precursor', successor: 'VOID-521' },
  'VOID-120': { name: 'PoW Mining (legado)', successor: 'VOID-520' },
  'VOID-70': { name: 'LSC Engine', successor: 'VOID-180' },
  'VOID-500': { name: 'Ising Server (legado)', successor: 'VOID-511' },
  'VOID-501': { name: 'Sensor GPIO (legado)', successor: 'VOID-510' },
  'VOID-502': { name: 'Helmholtz Model', successor: 'VOID-512' },
  'VOID-503': { name: 'TF Local', successor: 'VOID-514' },
  'VOID-288': { name: 'BB84 (retirado)', successor: 'VOID-513' },
  'VOID-510': { name: 'Sensor Entropy Mesh' },
  'VOID-511': { name: 'Ising Mesh' },
  'VOID-512': { name: 'Acoustic Room Key' },
  'VOID-513': { name: 'Chaos Mesh Sync' },
  'VOID-514': { name: 'Thomas-Fermi Sharded' },
  'VOID-520': { name: 'Compute Marketplace' },
  'VOID-521': { name: 'Entropy-as-a-Service' },
  'VOID-522': { name: 'ZK Aggregate Mesh' },
  'VOID-600': { name: 'VOID Sovereign Stack Core' },
  'VOID-700': { name: 'Silent Mesh Hosting' },
  'VOID-701': { name: 'Mesh CDN' },
  'VOID-702': { name: 'Web Node Manager' },
  'VOID-703': { name: 'Binary Bazaar' },
  'VOID-704': { name: 'Hosting Revenue' },
  'VOID-705': { name: 'Ethical Mining Pool' },
  'VOID-710': { name: 'SOV Ledger' },
  'VOID-180': { name: 'LSC Resource Guard' },
};

export function adaptName(id, legacy) {
  const a = NAME_ADAPTATION[id];
  if (a?.name) return a.name;
  return legacy
    .replace(/Quantum Engine/i, 'IMC Bridge')
    .replace(/Quantum /i, 'Lab ')
    .replace(/QRNG/i, 'EaaS')
    .replace(/Heptary Quantum/i, 'Anacroclastia')
    .replace(/Mining \(CPU\)/i, 'Compute Marketplace');
}

export function adaptPath(p) {
  if (!p) return undefined;
  return PATH_MIGRATION[p] ?? p;
}
