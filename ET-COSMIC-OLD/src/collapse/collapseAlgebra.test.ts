import { describe, it, expect } from 'vitest';
import {
  klDivergence,
  actionFunctional,
  irreversibilityMeasure,
  defectDensityField,
  CollapseAlgebra,
  getCollapseAlgebra,
  createInitialState,
  type CollapseState,
} from './collapseAlgebra';

// ─── Helpers ───────────────────────────────────────────

function makeFloat64(...values: number[]): Float64Array {
  return new Float64Array(values);
}

function makeState(overrides: Partial<CollapseState> = {}): CollapseState {
  return {
    phi: makeFloat64(1, 2, 3, 4, 5),
    memoryKernel: makeFloat64(1, 1, 1, 1, 1),
    chiField: makeFloat64(0, 0, 0, 0, 0),
    t: 0,
    dt: 0.01,
    lambda: 0.05,
    history: [],
    ...overrides,
  };
}

// ─── klDivergence ──────────────────────────────────────

describe('collapseAlgebra', () => {
  describe('klDivergence', () => {
    it('retorna 0 para distribuições idênticas', () => {
      const p = makeFloat64(0.25, 0.25, 0.25, 0.25);
      const result = klDivergence(p, p);
      expect(result).toBeCloseTo(0, 10);
    });

    it('retorna valor positivo para distribuições diferentes', () => {
      const p = makeFloat64(0.8, 0.2);
      const q = makeFloat64(0.5, 0.5);
      const result = klDivergence(p, q);
      expect(result).toBeGreaterThan(0);
      // D_KL = 0.8·ln(0.8/0.5) + 0.2·ln(0.2/0.5) ≈ 0.1927
      expect(result).toBeCloseTo(0.1927, 2);
    });

    it('lança erro para tamanhos diferentes', () => {
      const p = makeFloat64(0.5, 0.5);
      const q = makeFloat64(0.3, 0.3, 0.4);
      expect(() => klDivergence(p, q)).toThrow(
        'P e Q devem ter o mesmo tamanho'
      );
    });

    it('não retorna valor negativo', () => {
      // KL divergence is always >= 0, but implementation clamps with Math.max(0, kl)
      const p = makeFloat64(0.1, 0.9);
      const q = makeFloat64(0.9, 0.1);
      expect(klDivergence(p, q)).toBeGreaterThanOrEqual(0);
    });

    it('lida com valores zero via epsilon', () => {
      const p = makeFloat64(0, 1);
      const q = makeFloat64(1, 0);
      // Deve usar KL_EPSILON=1e-15, não lançar erro
      const result = klDivergence(p, q);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThan(0);
    });
  });

  // ─── actionFunctional ──────────────────────────────────

  describe('actionFunctional', () => {
    it('retorna termos cinético e de defeitos para estado sem história', () => {
      const state = makeState({
        phi: makeFloat64(1, 1, 1, 1, 1),
        memoryKernel: makeFloat64(1, 1, 1, 1, 1),
        chiField: makeFloat64(0, 0, 0, 0, 0),
        history: [],
      });
      const result = actionFunctional(state);
      // phi constante → gradiente = 0 → kineticTerm = 0
      expect(result.kineticTerm).toBeCloseTo(0, 10);
      // sem história → memoryTerm = 0
      expect(result.memoryTerm).toBe(0);
      // chiField = 0 → defectTerm = 0
      expect(result.defectTerm).toBe(0);
      expect(result.S).toBeCloseTo(0, 10);
    });

    it('calcula termo cinético para phi não-constante', () => {
      const state = makeState({
        phi: makeFloat64(0, 1, 0, 1, 0),
        history: [],
        chiField: makeFloat64(0, 0, 0, 0, 0),
      });
      const result = actionFunctional(state);
      // gradiente central: cada ponto com vizinhos diferentes → termo > 0
      expect(result.kineticTerm).toBeGreaterThan(0);
      expect(result.S).toBe(result.kineticTerm);
    });

    it('calcula termo de memória com histórico', () => {
      const prevPhi = makeFloat64(0, 0, 0, 0, 0);
      const currPhi = makeFloat64(1, 1, 1, 1, 1);
      const state = makeState({
        phi: currPhi,
        memoryKernel: makeFloat64(1, 1, 1, 1, 1),
        dt: 1.0,
        history: [prevPhi],
        chiField: makeFloat64(0, 0, 0, 0, 0),
      });
      const result = actionFunctional(state);
      // dphiDt = (1-0)/1 = 1, h=1, memoryTerm = Σ 1·1·1·1 = 5
      expect(result.memoryTerm).toBeCloseTo(5, 5);
    });

    it('calcula termo de defeitos', () => {
      const state = makeState({
        phi: makeFloat64(1, 1, 1, 1, 1),
        chiField: makeFloat64(1, 2, 3, 4, 5),
        history: [],
      });
      const result = actionFunctional(state);
      // defectTerm = Σ chi² = 1+4+9+16+25 = 55
      expect(result.defectTerm).toBeCloseTo(55, 5);
    });

    it('S = kineticTerm + memoryTerm + defectTerm', () => {
      const state = makeState({
        phi: makeFloat64(0, 2, 0, 2, 0),
        chiField: makeFloat64(1, 0, 1, 0, 1),
        history: [makeFloat64(1, 1, 1, 1, 1)],
        dt: 0.5,
      });
      const result = actionFunctional(state);
      expect(result.S).toBeCloseTo(
        result.kineticTerm + result.memoryTerm + result.defectTerm,
        8
      );
    });
  });

  // ─── irreversibilityMeasure ────────────────────────────

  describe('irreversibilityMeasure', () => {
    it('retorna 0 para distribuições idênticas', () => {
      const f = makeFloat64(1, 2, 3, 4);
      const result = irreversibilityMeasure(f, f);
      expect(result).toBeCloseTo(0, 5);
    });

    it('retorna valor positivo para distribuições diferentes', () => {
      const forward = makeFloat64(1, 0, 0, 0);
      const backward = makeFloat64(0, 0, 0, 1);
      const result = irreversibilityMeasure(forward, backward);
      expect(result).toBeGreaterThan(0);
    });

    it('normaliza distribuições antes de calcular KL', () => {
      // Fatores de escala não devem afetar o resultado
      const f1 = makeFloat64(1, 2, 3);
      const b1 = makeFloat64(3, 2, 1);
      const f2 = makeFloat64(10, 20, 30);
      const b2 = makeFloat64(30, 20, 10);

      const r1 = irreversibilityMeasure(f1, b1);
      const r2 = irreversibilityMeasure(f2, b2);
      expect(r1).toBeCloseTo(r2, 8);
    });

    it('simétrico se forward e backward trocados', () => {
      // KL(P||Q) != KL(Q||P), mas o valor deve ser finito
      const f = makeFloat64(0.8, 0.2);
      const b = makeFloat64(0.3, 0.7);
      const r1 = irreversibilityMeasure(f, b);
      const r2 = irreversibilityMeasure(b, f);
      expect(Number.isFinite(r1)).toBe(true);
      expect(Number.isFinite(r2)).toBe(true);
      // KL divergences are not symmetric
      expect(r1).not.toBeCloseTo(r2, 2);
    });

    it('lida com valores absolutos (usa Math.abs)', () => {
      const f = makeFloat64(-1, 2, -3);
      const b = makeFloat64(3, -2, 1);
      const result = irreversibilityMeasure(f, b);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  // ─── defectDensityField ────────────────────────────────

  describe('defectDensityField', () => {
    it('retorna zeros para phi constante', () => {
      const phi = makeFloat64(5, 5, 5, 5, 5);
      const chi = defectDensityField(phi);
      for (let i = 0; i < chi.length; i++) {
        expect(chi[i]).toBeCloseTo(0, 10);
      }
    });

    it('retorna valores positivos para phi variável', () => {
      const phi = makeFloat64(0, 1, 0, 1, 0);
      const chi = defectDensityField(phi);
      let hasPositive = false;
      for (let i = 0; i < chi.length; i++) {
        if (chi[i]! > 0) hasPositive = true;
      }
      expect(hasPositive).toBe(true);
    });

    it('retorna array do mesmo tamanho que phi', () => {
      const phi = makeFloat64(1, 2, 3, 4, 5, 6, 7, 8);
      const chi = defectDensityField(phi);
      expect(chi.length).toBe(phi.length);
    });

    it('chi(x) = |∇²φ|/(1+|∇φ|²) para ponto interno', () => {
      // phi = [0, 3, 0] → grad² = (0 - 2*3 + 0)/1 = -6 → |∇²φ| = 6
      // grad = (0 - 0)/(2*1) = 0 → |∇φ|² = 0
      // chi = 6/(1+0) = 6
      // Mas com condição periódica para 3 elementos:
      // i=1: prev=0, next=0, center=3
      // grad = (0 - 0)/(2) = 0, grad2 = (0 - 6 + 0)/1 = -6 → chi = 6
      const phi = makeFloat64(0, 3, 0);
      const chi = defectDensityField(phi);
      expect(chi[1]).toBeCloseTo(6, 5);
    });
  });

  // ─── CollapseAlgebra ───────────────────────────────────

  describe('CollapseAlgebra', () => {
    describe('accumulate', () => {
      it('avança o tempo', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ t: 0, dt: 0.1 });
        const result = alg.accumulate(state, 1);
        expect(result.t).toBeCloseTo(0.1, 10);
      });

      it('atualiza lambda proporcionalmente', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ lambda: 0 });
        const result = alg.accumulate(state, 10);
        // lambda += amount * 0.01 = 0 + 10*0.01 = 0.1
        expect(result.lambda).toBeCloseTo(0.1, 5);
      });

      it('decai o kernel de memória', () => {
        const alg = new CollapseAlgebra();
        const memoryKernel = makeFloat64(1, 1, 1);
        const state = makeState({ memoryKernel });
        const result = alg.accumulate(state, 1);
        // MEMORY_DECAY = 0.95
        for (let i = 0; i < 3; i++) {
          expect(result.memoryKernel[i]).toBeCloseTo(0.95, 5);
        }
      });

      it('adiciona ao histórico', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ history: [] });
        const result = alg.accumulate(state, 1);
        expect(result.history.length).toBe(1);
      });
    });

    describe('release', () => {
      it('não faz nada se lambda <= DEFECT_THRESHOLD (0.1)', () => {
        const alg = new CollapseAlgebra();
        const phi = makeFloat64(1, 2, 3);
        const state = makeState({ phi, lambda: 0.05 });
        const result = alg.release(state, 1.0);
        // Deve retornar estado inalterado
        for (let i = 0; i < 3; i++) {
          expect(result.phi[i]).toBe(phi[i]);
        }
      });

      it('reduz phi quando lambda excede limiar', () => {
        const alg = new CollapseAlgebra();
        const phi = makeFloat64(1, 2, 3, 4, 5);
        const state = makeState({
          phi,
          lambda: 0.5,
          memoryKernel: makeFloat64(1, 1, 1, 1, 1),
        });
        const result = alg.release(state, 0.5);
        // phi *= exp(-rate * dt * h) = exp(-0.5*0.01*1) ≈ 0.995
        for (let i = 0; i < 5; i++) {
          expect(result.phi[i]).toBeLessThan(phi[i]!);
        }
      });

      it('avança o tempo', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ t: 5, dt: 0.1, lambda: 0.5 });
        const result = alg.release(state, 1);
        expect(result.t).toBeCloseTo(5.1, 10);
      });
    });

    describe('collapse', () => {
      it('avança o tempo', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ t: 0, dt: 0.1 });
        const result = alg.collapse(state);
        expect(result.t).toBeCloseTo(0.1, 10);
      });

      it('reduz lambda pela metade', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ lambda: 1.0 });
        const result = alg.collapse(state);
        expect(result.lambda).toBeCloseTo(0.5, 10);
      });

      it('reduz phi onde chiField excede limiar', () => {
        const alg = new CollapseAlgebra();
        // phi com alta curvatura → alto chiField
        const phi = makeFloat64(0, 10, 0, 10, 0);
        const state = makeState({ phi });
        const result = alg.collapse(state);
        // Após colapso, phi deve ser reduzido nos pontos de alto defeito
        for (let i = 0; i < 5; i++) {
          expect(result.phi[i]).toBeLessThanOrEqual(phi[i]!);
        }
      });

      it('adiciona ao histórico', () => {
        const alg = new CollapseAlgebra();
        const state = makeState({ history: [] });
        const result = alg.collapse(state);
        expect(result.history.length).toBe(1);
      });
    });

    describe('tripleProduct', () => {
      it('retorna booleano indicando não-associatividade', () => {
        const alg = new CollapseAlgebra();
        const a = makeState({ phi: makeFloat64(1, 2, 3, 4, 5), lambda: 0.5 });
        const b = makeState({ phi: makeFloat64(5, 4, 3, 2, 1), lambda: 0.5 });
        const c = makeState({ phi: makeFloat64(1, 1, 1, 1, 1), lambda: 0.5 });
        const result = alg.tripleProduct(a, b, c);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('reconstructMemory', () => {
      it('retorna o número correto de camadas', () => {
        const alg = new CollapseAlgebra();
        const state = makeState();
        const result = alg.reconstructMemory(state, 3);
        expect(result.layers.length).toBe(3);
      });

      it('camadas são numeradas de 1 a N', () => {
        const alg = new CollapseAlgebra();
        const state = makeState();
        const result = alg.reconstructMemory(state, 5);
        for (let i = 0; i < 5; i++) {
          expect(result.layers[i]!.layer).toBe(i + 1);
        }
      });

      it('totalCoherence é a média das coerências', () => {
        const alg = new CollapseAlgebra();
        const state = makeState();
        const result = alg.reconstructMemory(state, 3);
        const avg =
          result.layers.reduce((sum, l) => sum + l.coherence, 0) /
          result.layers.length;
        expect(result.totalCoherence).toBeCloseTo(avg, 10);
      });

      it('retorna estado atualizado', () => {
        const alg = new CollapseAlgebra();
        const state = makeState();
        const result = alg.reconstructMemory(state);
        expect(result.state).toBeDefined();
      });

      it('padrão usa 5 camadas', () => {
        const alg = new CollapseAlgebra();
        const state = makeState();
        const result = alg.reconstructMemory(state);
        expect(result.layers.length).toBe(5);
      });
    });
  });

  // ─── getCollapseAlgebra ────────────────────────────────

  describe('getCollapseAlgebra', () => {
    it('retorna instância válida', () => {
      const alg = getCollapseAlgebra();
      expect(alg).toBeInstanceOf(CollapseAlgebra);
    });

    it('retorna mesma instância (singleton)', () => {
      const a = getCollapseAlgebra();
      const b = getCollapseAlgebra();
      expect(a).toBe(b);
    });
  });

  // ─── createInitialState ────────────────────────────────

  describe('createInitialState', () => {
    it('cria estado com tamanho padrão 64', () => {
      const state = createInitialState();
      expect(state.phi.length).toBe(64);
      expect(state.memoryKernel.length).toBe(64);
      expect(state.chiField.length).toBe(64);
    });

    it('aceita tamanho customizado', () => {
      const state = createInitialState(32);
      expect(state.phi.length).toBe(32);
    });

    it('memoryKernel é inicializado com 1.0', () => {
      const state = createInitialState(8);
      for (let i = 0; i < 8; i++) {
        expect(state.memoryKernel[i]).toBe(1.0);
      }
    });

    it('tempo inicial é 0', () => {
      const state = createInitialState();
      expect(state.t).toBe(0);
    });

    it('dt é 0.01', () => {
      const state = createInitialState();
      expect(state.dt).toBe(0.01);
    });

    it('lambda inicial é 0.05', () => {
      const state = createInitialState();
      expect(state.lambda).toBe(0.05);
    });

    it('histórico começa vazio', () => {
      const state = createInitialState();
      expect(state.history).toEqual([]);
    });

    it('chiField é calculado a partir de phi', () => {
      const state = createInitialState(8);
      expect(state.chiField.length).toBe(8);
      // chiField deve ser um Float64Array válido
      expect(state.chiField).toBeInstanceOf(Float64Array);
    });
  });
});
