/**
 * Rede de spin SU(2) — simulação clássica de grafo (máx. 20 nós).
 */

const MAX_NODES = 20;

export function createSpinNetwork(nodeCount = 8, edgeDensity = 0.3) {
  const n = Math.min(MAX_NODES, Math.max(2, Math.floor(nodeCount)));
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: i,
    spin: Math.random() > 0.5 ? 0.5 : -0.5,
    area: 0.25 + Math.random() * 0.5,
  }));
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < edgeDensity) {
        edges.push({ from: i, to: j, weight: 0.1 + Math.random() * 0.9 });
      }
    }
  }
  return {
    nodes,
    edges,
    nodeCount: n,
    maxNodes: MAX_NODES,
    disclaimer: "Grafo clássico com regras de reescrita — não rede de spin quântica real.",
  };
}

export function pachnerMove(network, move = "2-3") {
  if (network.nodes.length >= MAX_NODES) {
    return { ok: false, error: "MAX_NODES", network };
  }
  const copy = {
    ...network,
    nodes: [...network.nodes],
    edges: [...network.edges],
  };
  if (move === "2-3" && copy.nodes.length < MAX_NODES) {
    const newId = copy.nodes.length;
    copy.nodes.push({ id: newId, spin: 0.5, area: 0.3 });
    copy.edges.push({ from: newId, to: 0, weight: 0.5 });
  }
  return { ok: true, move, network: copy };
}

export function boltzmannAmplitude(network) {
  const spins = network.nodes.map((n) => n.spin);
  const sum = spins.reduce((a, s) => a + s, 0);
  return {
    amplitude: Math.exp(-Math.abs(sum) * 0.1),
    history_cost: network.edges.length * 0.01,
    note: "Soma de histórias truncada — espumas grandes são #P-completas.",
  };
}
