/**
 * Proof-of-Connectivity (PoC) — Distribuição de $DMC-G baseada em contribuição de rede
 *
 * Nós ganham reputação baseada em:
 * - Tempo online (uptime)
 * - Vizinhos conectados (peers)
 * - Bytes roteados (traffic)
 * - Transports ativos (BLE, LoRa, WebRTC, HCN)
 *
 * Usa G-Counter CRDT para merge distribuído sem conflito.
 */

import { creditDMCG } from "./dmcToken.js";

// ─── PoC Configuration ───────────────────────────────────────────────────────

const UPTIME_WEIGHT = 0.4;      // 40% do score
const PEERS_WEIGHT = 0.25;      // 25% do score
const TRAFFIC_WEIGHT = 0.25;    // 25% do score
const TRANSPORT_WEIGHT = 0.1;   // 10% do score

const DISTRIBUTION_INTERVAL_MS = 3600_000; // distribuir a cada hora
const MIN_SCORE_THRESHOLD = 0.1; // score mínimo para receber

// ─── Node State (CRDT-compatible) ────────────────────────────────────────────

const nodeState = new Map(); // nodeId → { uptime, peers, traffic, transports, lastSeen, score }

/**
 * Registra ou atualiza estado de conectividade de um nó.
 *
 * @param {string} nodeId - identificador do nó
 * @param {object} metrics - métricas de conectividade
 */
export function reportConnectivity(nodeId, metrics = {}) {
  let node = nodeState.get(nodeId);
  if (!node) {
    node = { uptime: 0, peers: 0, traffic: 0, transports: 0, lastSeen: Date.now(), score: 0, totalDmcg: 0 };
  }

  // Atualizar métricas (merge: max para contadores, sum para tráfego)
  node.uptime = Math.max(node.uptime, metrics.uptime ?? node.uptime);
  node.peers = Math.max(node.peers, metrics.peers ?? node.peers);
  node.traffic += metrics.trafficBytes ?? 0;
  node.transports = Math.max(node.transports, metrics.activeTransports ?? node.transports);
  node.lastSeen = Date.now();

  // Calcular score
  node.score = computeScore(node);
  nodeState.set(nodeId, node);
  return { nodeId, score: node.score, metrics: { uptime: node.uptime, peers: node.peers, traffic: node.traffic, transports: node.transports } };
}

/** Calcula score de conectividade (0-1). */
function computeScore(node) {
  const uptimeScore = Math.min(1, node.uptime / 86400); // normalizado para 24h
  const peersScore = Math.min(1, node.peers / 50);       // normalizado para 50 peers
  const trafficScore = Math.min(1, node.traffic / (1024 * 1024 * 100)); // normalizado para 100MB
  const transportScore = Math.min(1, node.transports / 4); // normalizado para 4 transports

  return (
    uptimeScore * UPTIME_WEIGHT +
    peersScore * PEERS_WEIGHT +
    trafficScore * TRAFFIC_WEIGHT +
    transportScore * TRANSPORT_WEIGHT
  );
}

/**
 * Distribui $DMC-G para todos os nós qualificados.
 * Chamada periodicamente (a cada hora).
 */
export function distributeDmcgRewards() {
  const results = [];
  let totalDistributed = 0;

  // Calcular soma total de scores
  let totalScore = 0;
  for (const node of nodeState.values()) {
    if (node.score >= MIN_SCORE_THRESHOLD) {
      totalScore += node.score;
    }
  }

  if (totalScore === 0) return { distributed: 0, nodes: 0 };

  // Pool de distribuição: 1000 $DMC-G por hora (em micro)
  const distributionPool = 1_000_000_000; // 1000 * 1M micro

  for (const [nodeId, node] of nodeState.entries()) {
    if (node.score < MIN_SCORE_THRESHOLD) continue;

    const share = Math.floor((node.score / totalScore) * distributionPool);
    if (share <= 0) continue;

    const result = creditDMCG(nodeId, share, "poc:connectivity");
    if (!result.error) {
      node.totalDmcg += share;
      totalDistributed += share;
      results.push({ nodeId, score: node.score, dmcg: share });
    }
  }

  return { distributed: totalDistributed, nodes: results.length, details: results };
}

/** Merge CRDT: combina estado de dois nós (usado para sincronização mesh). */
export function mergeNodeState(nodeId, remoteState) {
  const local = nodeState.get(nodeId);
  if (!local) {
    nodeState.set(nodeId, { ...remoteState, score: computeScore(remoteState), totalDmcg: 0 });
    return;
  }

  // Element-wise max (G-Counter merge)
  local.uptime = Math.max(local.uptime, remoteState.uptime ?? 0);
  local.peers = Math.max(local.peers, remoteState.peers ?? 0);
  local.traffic = Math.max(local.traffic, remoteState.traffic ?? 0);
  local.transports = Math.max(local.transports, remoteState.transports ?? 0);
  local.lastSeen = Math.max(local.lastSeen, remoteState.lastSeen ?? 0);
  local.score = computeScore(local);

  nodeState.set(nodeId, local);
}

/** Retorna status de um nó. */
export function getNodeStatus(nodeId) {
  const node = nodeState.get(nodeId);
  if (!node) return { registered: false };
  return { registered: true, ...node };
}

/** Retorna estatísticas agregadas da rede. */
export function getPoCStats() {
  let totalNodes = 0;
  let activeNodes = 0;
  let totalScore = 0;
  let totalDmcg = 0;
  const now = Date.now();

  for (const node of nodeState.values()) {
    totalNodes++;
    totalScore += node.score;
    totalDmcg += node.totalDmcg;
    if (now - node.lastSeen < 300_000) activeNodes++; // ativo se visto nos últimos 5min
  }

  return {
    totalNodes,
    activeNodes,
    avgScore: totalNodes > 0 ? Math.round((totalScore / totalNodes) * 1000) / 1000 : 0,
    totalDmcgDistributed: totalDmcg,
    distributionInterval: DISTRIBUTION_INTERVAL_MS,
  };
}
