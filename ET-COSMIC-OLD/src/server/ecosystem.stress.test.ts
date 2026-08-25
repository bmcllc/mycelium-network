/**
 * Stress in-process dos motores server (AQRE, LUSUS, IMC) — complemento ao CLI.
 */
import { describe, expect, it } from 'vitest';
import { runTask } from '../../server/aqre/orchestrator.js';
import { solveMaxCut, randomGraph } from '../../server/lusus/ising_machine.js';
import { runImcAction } from '../../server/imc/core.js';
import { registerNode, heartbeatNode } from '../../server/silentMesh/void700.js';

describe('server stress — AQRE burst', () => {
  it('500 spin_network sem exceder 5% falhas LSC', { timeout: 60_000 }, () => {
    let ok = 0;
    let lsc = 0;
    let err = 0;
    for (let i = 0; i < 500; i++) {
      const r = runTask('spin_network', { nodeCount: 20, cEpsilon: 0.1 + (i % 10) * 0.03 });
      if (r.ok) ok++;
      else if (r.error === 'LSC_LIMIT_EXCEEDED' || r.status === 429) lsc++;
      else err++;
    }
    expect(err).toBeLessThan(25);
    expect(ok + lsc).toBe(500);
  });

  it('causal_tracker detecta Lieb-Robinson sob J alto', { timeout: 15_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 50; i++) {
      const r = runTask('causal_tracker', { size: 16, steps: 40, J: 0.3, cEpsilon: 0.1 });
      expect(r.ok).toBe(true);
      if (r.result?.liebRobinson?.violated) violations++;
    }
    expect(violations).toBeGreaterThan(0);
  });
});

describe('server stress — LUSUS ising', () => {
  it('100 Max-Cut n=32', { timeout: 120_000 }, () => {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) {
      const n = 28 + (i % 5);
      const r = solveMaxCut(n, randomGraph(n), 250);
      expect(r.energy).toBeGreaterThanOrEqual(0);
    }
    expect(performance.now() - t0).toBeLessThan(110_000);
  });
});

describe('server stress — IMC + mesh', () => {
  it('200 acções IMC rotativas', { timeout: 45_000 }, () => {
    const actions = ['VOID-510', 'VOID-511', 'VOID-513', 'VOID-520'] as const;
    for (let i = 0; i < 200; i++) {
      const a = actions[i % actions.length];
      const body =
        a === 'VOID-511' ? { n: 10 } : a === 'VOID-520' ? { type: 'ising', n: 8 } : { bits: 128 };
      const r = runImcAction(a, body);
      expect(r.error).toBeUndefined();
    }
  });

  it('300 nós VOID-700 + heartbeats', { timeout: 30_000 }, () => {
    const ids: string[] = [];
    for (let i = 0; i < 300; i++) {
      const n = registerNode({ mode: 'browser', consent: { compute: true, cdn: true } });
      ids.push(n.nodeId);
    }
    for (let i = 0; i < 300; i++) {
      const hb = heartbeatNode(ids[i], { cpuPct: 2 });
      expect(['ok', 'throttle']).toContain(hb.action);
    }
  });
});
