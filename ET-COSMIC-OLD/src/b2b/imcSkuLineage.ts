/**
 * Linhagem de SKUs — precursores → motores IMC v2 (rumo único).
 */

export const SKU_LINEAGE: Record<string, { successor: string; rationale: string }> = {
  "VOID-76": {
    successor: "VOID-521",
    rationale: "QRNG Service → Entropy-as-a-Service com sensores nativos (510 mesh).",
  },
  "VOID-80": {
    successor: "VOID-600",
    rationale: "LUSUS Terminal fundido no IMC Core; LUSUS API permanece em /api/lusus.",
  },
  "VOID-120": {
    successor: "VOID-520",
    rationale: "Mining PoW inútil → Marketplace (VOID-520) em nós VOID-700 nos visitantes.",
  },
  "VOID-70": {
    successor: "VOID-180",
    rationale: "LSC Engine → AQRE/LSC limits via Anacroclastia + IMC coordinator.",
  },
  "VOID-215": {
    successor: "VOID-512",
    rationale: "Acoustic FSK → Room IR handshake (Web Audio, chave da sala).",
  },
  "VOID-288": {
    successor: "VOID-513",
    rationale: "BB84 emulado removido → Chaos-Bell mesh sync (clássico).",
  },
  "VOID-54": {
    successor: "VOID-514",
    rationale: "Bruno Theory UI + Thomas-Fermi distribuído para materiais.",
  },
  "VOID-500": { successor: "VOID-511", rationale: "Ising servidor → Ising mesh + Nostr 31224/31225." },
  "VOID-501": { successor: "VOID-510", rationale: "QRNG térmico GPIO → Sensor Entropy Mesh." },
  "VOID-502": { successor: "VOID-512", rationale: "Helmholtz modelo → IR medido na sala." },
  "VOID-504": { successor: "VOID-513", rationale: "Chaos-Bell auth → mesh sync." },
  "VOID-503": { successor: "VOID-514", rationale: "TF local → TF sharded." },
  "VOID-58": {
    successor: "VOID-700",
    rationale: "Infra cloud → cada site/VPS auto-hospeda a malha (Service Worker + void-node).",
  },
};

/** Economia SOV — moeda pela malha (sem parasitismo). */
export const SOV_ECONOMY_SKUS = [
  {
    id: "HOST-REVENUE",
    sku: "VOID-704",
    problem: "Hospedagem = custo fixo AWS",
    solution: "SOV por visitantes/tráfego na malha VOID-700; dono do site ganha passivo.",
  },
  {
    id: "BINARY-BAZAAR",
    sku: "VOID-703",
    problem: "Lojas centralizadas de software",
    solution: "Bazaar P2P: qualquer binário, SHA-256, preço SOV, taxa 10 bps.",
  },
  {
    id: "ETHICAL-MINE",
    sku: "VOID-705",
    problem: "PoW destrói hardware sem valor",
    solution: "Arsenal IMC (Ising, TF, CDN) + LSC; crédito SOV por trabalho útil.",
  },
  {
    id: "SOV-LEDGER",
    sku: "VOID-710",
    problem: "Moeda dependente de bancos",
    solution: "Ledger µSOV unificado: hospedagem + binários + mineração ética.",
  },
] as const;

/** VOID-700 série — propagação silenciosa (guerra de infra). */
export const SILENT_MESH_SKUS = [
  {
    id: "SILENT-HOST",
    sku: "VOID-700",
    problem: "AWS/Cloudflare como gatekeepers",
    solution: "Script de uma linha + SW: visitante vira nó; VPS com systemd 3% CPU.",
  },
  {
    id: "MESH-CDN",
    sku: "VOID-701",
    problem: "Hospedagem estática cara",
    solution: "CDN P2P via CacheStorage + WebRTC; gateway na malha.",
  },
  {
    id: "NODE-MGR",
    sku: "VOID-702",
    problem: "Operador cego sobre contribuição",
    solution: "Painel de ganhos, heartbeats LSC, consentimento granular.",
  },
] as const;

/** Problemas críticos → SKU que resolve (visão Jobs: uma dor, uma solução). */
export const CRITICAL_PROBLEM_SKUS = [
  {
    id: "SYBIL-SENSOR",
    sku: "VOID-510",
    severity: "critical",
    problem: "Sybil com PRNG previsível em air-gap",
    solution: "Entropia de microfone+acelerómetro mesclada na malha; adversário precisa da maioria dos sensores físicos.",
  },
  {
    id: "MITM-ROOM",
    sku: "VOID-512",
    severity: "severe",
    problem: "MITM em pairing Bluetooth/Nostr",
    solution: "Chave derivada da IR da sala — atacante remoto não reproduz a geometria.",
  },
  {
    id: "IDLE-HASH",
    sku: "VOID-520",
    severity: "critical",
    problem: "PoW queima energia sem valor",
    solution: "Marketplace paga por Ising/TF útil; protocolo fica com 10 bps transparentes.",
  },
  {
    id: "ENTROPY-STARVATION",
    sku: "VOID-521",
    severity: "severe",
    problem: "GhostID sem QRNG de laboratório",
    solution: "EaaS: sensores + Bruno frame + mesh XOR; nunca rotula quantum_verified sem hardware.",
  },
  {
    id: "RARE-SPLIT-BRAIN",
    sku: "VOID-522",
    severity: "rare",
    problem: "Verificação ZK centralizada cai",
    solution: "Agregação Merkle distribuída de provas o1js; validadores paralelos na malha.",
  },
  {
    id: "OPT-INTRACTABLE",
    sku: "VOID-511",
    severity: "severe",
    problem: "Roteamento/logística NP-hard em tempo real",
    solution: "Ising mesh com shards Nostr; fósseis de melhor solução propagam entre nós.",
  },
] as const;
