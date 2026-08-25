/** Utilitários partilhados para benchmarks de stress do ecossistema VOID. */

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function benchSync(label, fn, iterations = 1) {
  const latencies = [];
  let ok = 0;
  let fail = 0;
  let lastError = null;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const s = performance.now();
    try {
      fn(i);
      ok++;
      latencies.push(performance.now() - s);
    } catch (e) {
      fail++;
      lastError = e;
      latencies.push(performance.now() - s);
    }
  }
  latencies.sort((a, b) => a - b);
  return {
    label,
    iterations,
    ok,
    fail,
    lastError: lastError ? String(lastError.message ?? lastError) : null,
    totalMs: performance.now() - t0,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    opsPerSec: ok / ((performance.now() - t0) / 1000),
  };
}

export async function benchAsync(label, fn, iterations = 1) {
  const latencies = [];
  let ok = 0;
  let fail = 0;
  let lastError = null;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const s = performance.now();
    try {
      await fn(i);
      ok++;
      latencies.push(performance.now() - s);
    } catch (e) {
      fail++;
      lastError = e;
      latencies.push(performance.now() - s);
    }
  }
  latencies.sort((a, b) => a - b);
  return {
    label,
    iterations,
    ok,
    fail,
    lastError: lastError ? String(lastError.message ?? lastError) : null,
    totalMs: performance.now() - t0,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    opsPerSec: ok / ((performance.now() - t0) / 1000),
  };
}

/** Pool de concorrência fixa sobre lista de tarefas async. */
export async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      const s = performance.now();
      try {
        const value = await tasks[i]();
        results.push({ i, ok: true, ms: performance.now() - s, value });
      } catch (e) {
        results.push({ i, ok: false, ms: performance.now() - s, error: String(e.message ?? e) });
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function formatRow(r, extra = "") {
  const rate429 = r.lsc429 ?? 0;
  return [
    r.label.padEnd(22),
    String(r.iterations).padStart(6),
    String(r.ok).padStart(6),
    String(r.fail).padStart(5),
    String(rate429).padStart(5),
    r.p50.toFixed(2).padStart(7),
    r.p95.toFixed(2).padStart(7),
    r.p99.toFixed(2).padStart(7),
    r.opsPerSec.toFixed(0).padStart(8),
    extra,
  ].join(" ");
}

export const STRESS_HEADER =
  "Domain                  Ops      OK  Fail   429   p50ms   p95ms   p99ms     ops/s";
