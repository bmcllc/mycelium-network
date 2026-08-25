/**
 * Stress tests QRC / tensor networks — escalada de bond dimension e sites.
 * Correr: npm run stress:qrc  ou  vitest run src/qrc/tensorNetwork.stress.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  contractTensors,
  marketToMPS,
  marketToQuantumAmplitudes,
  truncatedSVD,
  type MarketState,
} from './tensorNetwork';
import { simulateQuantumSwitch } from './quantumSwitch';

function makeMarket(n = 4): MarketState {
  const prices = new Float64Array(n);
  const volumes = new Float64Array(n);
  const volatilities = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    prices[i] = 0.2 + (i / n) * 0.6;
    volumes[i] = 0.5 + Math.random() * 0.5;
    volatilities[i] = 0.05 + Math.random() * 0.15;
  }
  return { prices, volumes, volatilities, timestamp: Date.now() };
}

function hermitianResidual(matrix: Float64Array, rows: number, cols: number): number {
  let max = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = matrix[i * cols + j];
      const b = matrix[j * cols + i];
      max = Math.max(max, Math.abs(a - b));
    }
  }
  return max;
}

describe('QRC stress — tensor networks', () => {
  it('escala amplitudes até 16 ativos mantendo norma unitária', () => {
    for (const n of [2, 4, 8, 16]) {
      const prices = Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
      const vols = Array.from({ length: n }, () => 0.1);
      const amps = marketToQuantumAmplitudes(prices, vols);
      const norm = amps.reduce((s, v) => s + v * v, 0);
      expect(norm).toBeCloseTo(1, 8);
    }
  });

  it('MPS bondDim 8→64 com sites 2–8 (latência < 5s cada)', { timeout: 60_000 }, () => {
    const timings: number[] = [];
    for (const bond of [8, 16, 32, 64]) {
      for (const sites of [2, 4, 8]) {
        const t0 = performance.now();
        const mps = marketToMPS(makeMarket(sites), {
          numSites: sites,
          physDim: 2,
          maxBondDim: bond,
        });
        timings.push(performance.now() - t0);
        expect(mps.cores.length).toBe(sites);
        expect(mps.maxBondDim).toBe(bond);
      }
    }
    const maxMs = Math.max(...timings);
    expect(maxMs).toBeLessThan(5000);
  });

  it('SVD repetida 500× rank 8 (throughput)', { timeout: 30_000 }, () => {
    const matrix = new Float64Array(64 * 64);
    for (let i = 0; i < matrix.length; i++) matrix[i] = Math.sin(i * 0.1);
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) {
      truncatedSVD(matrix, 64, 64, 8);
    }
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(25_000);
  });

  it('contracção em cadeia 200× sem deriva numérica explosiva', { timeout: 20_000 }, () => {
    let acc = new Float64Array([1, 0, 0, 1]);
    for (let i = 0; i < 200; i++) {
      const b = new Float64Array([0.99, 0.01, 0.01, 0.99]);
      const c = contractTensors(acc, 2, 2, b, 2, 2);
      acc = c.result;
      const sum = Array.from(acc).reduce((s, v) => s + Math.abs(v), 0);
      expect(Number.isFinite(sum)).toBe(true);
      expect(sum).toBeLessThan(1e6);
    }
  });

  it('matriz identidade 4×4 é Hermitiana (residual ≈ 0)', () => {
    const id = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(hermitianResidual(id, 4, 4)).toBeLessThan(1e-10);
  });

  it('Quantum Switch 50 trajetórias CPU', { timeout: 45_000 }, async () => {
    const market = makeMarket(4);
    const t0 = performance.now();
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        simulateQuantumSwitch(
          market,
          { targetAsset: '$SOV', timeSteps: 5, bondDim: 16, useGPU: false },
          null,
        ),
      ),
    );
    const elapsed = performance.now() - t0;
    expect(results.every((r) => r.paths.length === 3)).toBe(true);
    expect(elapsed).toBeLessThan(40_000);
  });
});

describe('QRC stress — limites documentados', () => {
  it('rejeita contração incompatível sob carga', () => {
    const a = new Float64Array(4);
    const b = new Float64Array(2);
    for (let i = 0; i < 100; i++) {
      expect(() => contractTensors(a, 2, 2, b, 1, 2)).toThrow('Dimensões incompatíveis');
    }
  });
});
