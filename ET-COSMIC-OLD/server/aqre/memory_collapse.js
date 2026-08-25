/**
 * MCM — operadores a (acúmulo), r (liberação), c (colapso) com buffer circular.
 */

const BUFFER_SIZE = 256;
const buffer = [];
let head = 0;

export function pushMemory(value) {
  buffer[head % BUFFER_SIZE] = { value, t: Date.now() };
  head++;
  return { size: Math.min(head, BUFFER_SIZE), head };
}

export function operatorAccumulate(n = 8) {
  const slice = [];
  for (let i = 0; i < n; i++) {
    const idx = (head - 1 - i + BUFFER_SIZE * 2) % BUFFER_SIZE;
    if (buffer[idx]) slice.push(buffer[idx].value);
  }
  const sum = slice.reduce((a, v) => a + (typeof v === "number" ? v : 0), 0);
  return { op: "a", window: n, result: sum, samples: slice.length };
}

export function operatorRelease(fraction = 0.5) {
  const acc = operatorAccumulate(16);
  const released = acc.result * fraction;
  return { op: "r", fraction, released, prior: acc.result };
}

export function operatorCollapse(threshold = 1) {
  const acc = operatorAccumulate(32);
  const collapsed = acc.result >= threshold ? 1 : 0;
  return {
    op: "c",
    threshold,
    collapsed,
    energy: acc.result,
    irreversibility_note: "KL divergência modelada como perda de informação no colapso clássico.",
  };
}

export function getMemoryState() {
  return {
    bufferCapacity: BUFFER_SIZE,
    entries: Math.min(head, BUFFER_SIZE),
    head,
  };
}
