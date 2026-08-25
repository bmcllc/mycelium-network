import { describe, it, expect } from 'vitest';
import { secureRandomId, secureRandomInt, secureRandom } from './secureRandom';

describe('secureRandom', () => {
  describe('secureRandomId', () => {
    it('retorna string hex com tamanho correto', () => {
      const id = secureRandomId(4);
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[0-9a-f]{8}$/);
    });

    it('retorna tamanho diferente para bytes diferentes', () => {
      expect(secureRandomId(8)).toHaveLength(16);
      expect(secureRandomId(16)).toHaveLength(32);
    });

    it('retorna valores diferentes em chamadas consecutivas', () => {
      const ids = new Set(Array.from({ length: 100 }, () => secureRandomId(8)));
      expect(ids.size).toBeGreaterThan(90); // colisão extremamente improvável
    });
  });

  describe('secureRandomInt', () => {
    it('retorna 0 para max <= 0', () => {
      expect(secureRandomInt(0)).toBe(0);
      expect(secureRandomInt(-5)).toBe(0);
    });

    it('retorna valor em [0, max)', () => {
      for (let i = 0; i < 1000; i++) {
        const val = secureRandomInt(10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(10);
      }
    });

    it('distribuição aproximadamente uniforme (sem modulo bias)', () => {
      const buckets = new Array(10).fill(0);
      const N = 10000;
      for (let i = 0; i < N; i++) {
        buckets[secureRandomInt(10)]++;
      }
      // Cada bucket deveria ter ~1000 ± margem
      for (const count of buckets) {
        expect(count).toBeGreaterThan(800);
        expect(count).toBeLessThan(1200);
      }
    });
  });

  describe('secureRandom', () => {
    it('retorna valor em [0, 1)', () => {
      for (let i = 0; i < 1000; i++) {
        const val = secureRandom();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('retorna valores diferentes', () => {
      const vals = new Set(Array.from({ length: 100 }, () => secureRandom()));
      expect(vals.size).toBeGreaterThan(90);
    });
  });
});
