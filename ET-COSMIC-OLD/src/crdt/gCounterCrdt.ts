/**
 * G-Set / contador CRDT (PMU Apêndice B)
 *
 * merge(C1, C2) = max(C1, C2) element-wise
 * Comutativo, associativo, idempotente.
 */

export type GCounterState = Record<string, number>;

/**
 * Merge de dois estados CRDT (element-wise max).
 */
export function mergeGCounter(a: GCounterState, b: GCounterState): GCounterState {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: GCounterState = {};
  for (const k of keys) {
    out[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  }
  return out;
}

/** Incremento local (só no nó atual). */
export function incrementGCounter(state: GCounterState, nodeId: string, delta = 1): GCounterState {
  return { ...state, [nodeId]: (state[nodeId] ?? 0) + delta };
}

/** Valor agregado (soma dos contadores por nó — padrão PN-counter simplificado). */
export function readGCounter(state: GCounterState): number {
  return Object.values(state).reduce((s, v) => s + v, 0);
}

/** Entropia de Shannon S = -Σ p_i ln p_i (nats) sobre distribuição normalizada dos contadores. */
export function shannonEntropy(state: GCounterState): number {
  const values = Object.values(state).filter((v) => v > 0);
  if (values.length === 0) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let s = 0;
  for (const v of values) {
    const p = v / total;
    s -= p * Math.log(p);
  }
  return s;
}

/**
 * Definição 3.2 (PMU): S(D') ≤ min(S(D1), S(D2)) após merge de estados disjuntos.
 * Para contadores em nós distintos, merge reduz incerteza relativa.
 */
export function mergeEntropyBound(
  s1: number,
  s2: number,
  merged: number,
): boolean {
  const m = Math.min(s1, s2);
  return merged <= m + 1e-9;
}
