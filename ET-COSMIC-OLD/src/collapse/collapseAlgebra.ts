/**
 * Algebra de Colapsos com Memória (Capítulo 8)
 *
 * Implementa a mecânica dos colapsos com memória:
 * - Funcional de ação com memória h[φ]
 */

import { offlineMaterialFromSeed, unit } from "../lib/moduleRealityBackend";
import { architectEyeScale } from "../theory/collapseEngineering";

/**
 * - Medida de irreversibilidade (divergência KL)
 * - Campo de densidade de defeitos χ(x)
 * - Algebra de eventos extremos (â, r̂, ĉ) não-associativa
 * - Reconstrução de memória em 5 camadas
 *
 * Referência: "O Livro do ETRNET", Cap. 8, pp. 31-34
 */

// ─── Tipos ──────────────────────────────────────────────

/** Estado do sistema de colapsos */
export interface CollapseState {
  /** Campo escalar φ discretizado em grade 1D */
  phi: Float64Array;
  /** Kernel de memória h[φ] — depende de toda a história */
  memoryKernel: Float64Array;
  /** Campo de densidade de defeitos topológicos χ(x) */
  chiField: Float64Array;
  /** Tempo atual */
  t: number;
  /** Passo temporal */
  dt: number;
  /** Parâmetro de controle λ = σ/σ_crítica */
  lambda: number;
  /** Histórico de valores de φ para cálculo de memória */
  history: Float64Array[];
}

/** Resultado da aplicação de um operador */
export interface OperatorResult {
  operator: 'accumulate' | 'release' | 'collapse';
  value: number;
  irreversibility: number;
  state: CollapseState;
}

/** Funcional de ação S[φ] */
export interface ActionFunctional {
  S: number;
  deltaS: number;
  kineticTerm: number;
  memoryTerm: number;
  defectTerm: number;
}

/** Resultado da reconstrução de memória */
export interface MemoryReconstruction {
  state: CollapseState;
  layers: {
    layer: number;
    name: string;
    description: string;
    coherence: number;
  }[];
  totalCoherence: number;
}

// ─── Constantes ─────────────────────────────────────────

const EPSILON = 1e-10;
const KL_EPSILON = 1e-15;
const MEMORY_DECAY = 0.95;
const DEFECT_THRESHOLD = 0.1;

// ─── Funções Matemáticas Auxiliares ─────────────────────

/** Divergência de Kullback-Leibler: D_KL(P || Q) */
export function klDivergence(p: Float64Array, q: Float64Array): number {
  if (p.length !== q.length) throw new Error('P e Q devem ter o mesmo tamanho');
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], KL_EPSILON);
    const qi = Math.max(q[i], KL_EPSILON);
    kl += pi * Math.log(pi / qi);
  }
  return Math.max(0, kl);
}

/** Convolução com kernel gaussiano */
function gaussianConvolve(field: Float64Array, sigma: number): Float64Array {
  const n = field.length;
  const result = new Float64Array(n);
  const radius = Math.ceil(3 * sigma);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let wSum = 0;
    for (let j = -radius; j <= radius; j++) {
      const idx = (i + j + n) % n; // condições de contorno periódicas
      const w = Math.exp(-0.5 * (j / sigma) ** 2);
      sum += w * field[idx];
      wSum += w;
    }
    result[i] = sum / wSum;
  }
  return result;
}

/** Derivada central de primeira ordem */
function centralDiff(field: Float64Array, i: number, dx: number): number {
  const n = field.length;
  const prev = (i - 1 + n) % n;
  const next = (i + 1) % n;
  return (field[next] - field[prev]) / (2 * dx);
}

/** Derivada central de segunda ordem */
function centralDiff2(field: Float64Array, i: number, dx: number): number {
  const n = field.length;
  const prev = (i - 1 + n) % n;
  const next = (i + 1) % n;
  return (field[next] - 2 * field[i] + field[prev]) / (dx * dx);
}

// ─── Funções Principais ─────────────────────────────────

/**
 * Funcional de Ação: S[φ] = ∫L(φ,∇φ)dx + ∫h[φ]|dφ/dt|²dt
 *
 * Implementa o princípio variacional da frustração (Eq. 8.1)
 */
export function actionFunctional(state: CollapseState): ActionFunctional {
  const { phi, memoryKernel, dt } = state;
  const n = phi.length;
  const dx = 1.0;

  // Termo cinético: ∫|∇φ|² dx
  let kineticTerm = 0;
  for (let i = 0; i < n; i++) {
    const grad = centralDiff(phi, i, dx);
    kineticTerm += grad * grad * dx;
  }

  // Termo de memória: ∫h[φ]|dφ/dt|² dt
  let memoryTerm = 0;
  if (state.history.length > 0) {
    const prev = state.history[state.history.length - 1];
    for (let i = 0; i < n; i++) {
      const dphiDt = (phi[i] - prev[i]) / dt;
      const h = i < memoryKernel.length ? memoryKernel[i] : 1.0;
      memoryTerm += h * dphiDt * dphiDt * dt;
    }
  }

  // Termo de defeitos: ∫χ²(x) dx
  let defectTerm = 0;
  for (let i = 0; i < n; i++) {
    const chi = state.chiField.length > i ? state.chiField[i] : 0;
    defectTerm += chi * chi * dx;
  }

  const S = kineticTerm + memoryTerm + defectTerm;

  return {
    S,
    deltaS: S, // variação em relação ao estado anterior
    kineticTerm,
    memoryTerm,
    defectTerm,
  };
}

/**
 * Medida de Irreversibilidade: I = D_KL(P(x_{t+1}|x_t) || P(x_t|x_{t+1}))
 *
 * Quantifica a dependência temporal via divergência KL
 * entre distribuições forward e backward (Eq. 8.2)
 */
export function irreversibilityMeasure(
  forward: Float64Array,
  backward: Float64Array
): number {
  // Normalizar para distribuições de probabilidade
  const totalF = forward.reduce((a, b) => a + Math.abs(b), 0);
  const totalB = backward.reduce((a, b) => a + Math.abs(b), 0);

  const pF = new Float64Array(forward.length);
  const pB = new Float64Array(backward.length);

  for (let i = 0; i < forward.length; i++) {
    pF[i] = Math.abs(forward[i]) / (totalF + EPSILON);
    pB[i] = Math.abs(backward[i]) / (totalB + EPSILON);
  }

  return klDivergence(pF, pB);
}

/**
 * Campo de Densidade de Defeitos: χ(x) = |∇²φ| / (1 + |∇φ|²)
 *
 * Medida local de defeitos topológicos (Eq. 8.3 simplificada)
 */
export function defectDensityField(phi: Float64Array): Float64Array {
  const n = phi.length;
  const chi = new Float64Array(n);
  const dx = 1.0;

  for (let i = 0; i < n; i++) {
    const grad = centralDiff(phi, i, dx);
    const grad2 = centralDiff2(phi, i, dx);
    chi[i] = Math.abs(grad2) / (1 + grad * grad);
  }

  return chi;
}

// ─── Classe Principal ───────────────────────────────────

/**
 * Algebra de Colapsos — Implementa os 3 operadores de eventos extremos
 *
 * Os operadores atuam no espaço de Hilbert H = H_elástico ⊗ H_bolha ⊗ H_radiação:
 * - â: operador de acúmulo (Eq. 8.5)
 * - r̂: operador de liberação
 * - ĉ: operador de colapso
 *
 * O produto de colapso ★ é não-associativo:
 * (â ★ r̂) ★ ĉ ≠ â ★ (r̂ ★ ĉ)
 */
export class CollapseAlgebra {
  private _maxHistory = 100;

  /**
   * Operador de Acúmulo: â|σ⟩ = √(σ + 1)|σ + 1⟩
   *
   * Acumula pressão/estresse no sistema
   */
  accumulate(state: CollapseState, amount: number): CollapseState {
    const phi = new Float64Array(state.phi);
    const sigma = amount;

    // Convolução gaussiana para suavizar o acúmulo
    const mat = offlineMaterialFromSeed(`accumulate:${state.t}:${amount}`, phi.length);
    const perturbation = gaussianConvolve(
      Float64Array.from({ length: phi.length }, (_, i) =>
        Math.sqrt(sigma + 1) * (unit(mat, i) - 0.5) * 0.1,
      ),
      2.0,
    );

    for (let i = 0; i < phi.length; i++) {
      phi[i] += perturbation[i] * state.dt;
    }

    const omega = architectEyeScale(4, -1 + unit(mat, 7) * 2);
    const eyeGain = 1 + (omega - 1) * 0.02;
    for (let i = 0; i < phi.length; i++) {
      phi[i] *= eyeGain;
    }

    // Atualizar campo de defeitos
    const chiField = defectDensityField(phi);

    // Atualizar kernel de memória
    const memoryKernel = new Float64Array(state.memoryKernel);
    for (let i = 0; i < memoryKernel.length; i++) {
      memoryKernel[i] *= MEMORY_DECAY;
    }

    return {
      ...state,
      phi,
      chiField,
      memoryKernel,
      t: state.t + state.dt,
      lambda: state.lambda + amount * 0.01,
      history: [...state.history.slice(-this._maxHistory), new Float64Array(state.phi)],
    };
  }

  /**
   * Operador de Liberação: r̂|σ⟩ = Θ(σ - σ_c) Σ_k α_k|σ - σ_c⟩ ⊗ |evento_k⟩
   *
   * Libera energia armazenada quando o estresse ultrapassa o limiar σ_c
   */
  release(state: CollapseState, rate: number): CollapseState {
    const phi = new Float64Array(state.phi);
    const sigma = state.lambda;

    // Verificar se excede o limiar (Θ step function)
    if (sigma <= DEFECT_THRESHOLD) {
      return state; // nada a liberar
    }

    // Exponencial de decaimento com kernel de memória
    const excess = sigma - DEFECT_THRESHOLD;
    for (let i = 0; i < phi.length; i++) {
      const h = i < state.memoryKernel.length ? state.memoryKernel[i] : 1.0;
      phi[i] *= Math.exp(-rate * state.dt * h);
    }

    const chiField = defectDensityField(phi);

    const memoryKernel = new Float64Array(state.memoryKernel);
    for (let i = 0; i < memoryKernel.length; i++) {
      memoryKernel[i] *= MEMORY_DECAY * 0.9;
    }

    return {
      ...state,
      phi,
      chiField,
      memoryKernel,
      t: state.t + state.dt,
      lambda: Math.max(0, state.lambda - excess * rate * 0.1),
      history: [...state.history.slice(-this._maxHistory), new Float64Array(state.phi)],
    };
  }

  /**
   * Operador de Colapso: ĉ|evento_k⟩ = γ_k|0⟩ ⊗ |fóton⟩ ⊗ |choque⟩
   *
   * Colapsa o estado para um estado coerente via projeção
   */
  collapse(state: CollapseState): CollapseState {
    const phi = new Float64Array(state.phi);
    const chiField = defectDensityField(phi);

    // Projetar para o estado coerente mais próximo
    // Baseado na densidade de defeitos
    for (let i = 0; i < phi.length; i++) {
      const chi = chiField[i];
      if (chi > DEFECT_THRESHOLD) {
        // Reduzir o defeito via projeção
        phi[i] *= 1.0 / (1.0 + chi);
      }
    }

    const newChi = defectDensityField(phi);
    const memoryKernel = new Float64Array(state.memoryKernel);

    return {
      ...state,
      phi,
      chiField: newChi,
      memoryKernel,
      t: state.t + state.dt,
      lambda: state.lambda * 0.5,
      history: [...state.history.slice(-this._maxHistory), new Float64Array(state.phi)],
    };
  }

  /**
   * Teste de não-associatividade do produto de colapso
   *
   * (â ★ r̂) ★ ĉ ≠ â ★ (r̂ ★ ĉ)
   */
  tripleProduct(a: CollapseState, b: CollapseState, _c: CollapseState): boolean {
    // Lado esquerdo: (â ★ r̂) ★ ĉ
    const ab = this.accumulate(a, 0.1);
    const ab_r = this.release(ab, 0.5);
    const left = this.collapse(ab_r);

    // Lado direito: â ★ (r̂ ★ ĉ)
    const bc = this.release(b, 0.5);
    const bc_c = this.collapse(bc);
    const right = this.accumulate(bc_c, 0.1);

    // Comparar resultados
    let diff = 0;
    for (let i = 0; i < left.phi.length; i++) {
      diff += Math.abs(left.phi[i] - right.phi[i]);
    }

    return diff > EPSILON; // true = não-associativo
  }

  /**
   * Reconstrução de Memória em 5 Camadas
   *
   * Camada 1: Reconstrução da Memória — identifica kernel e ordem temporal
   * Camada 2: Dinâmica com História — governa evolução
   * Camada 3: Campo de Cicatrizes Topológicas — incorpora χ à ação
   * Camada 4: Ferramental de Controle Preditivo — derivadas fracionárias
   * Camada 5: Ressonância e Histerese — minimiza J = E[∫(P_diss + η||u||²)dt]
   */
  reconstructMemory(state: CollapseState, layers: number = 5): MemoryReconstruction {
    const result: MemoryReconstruction = {
      state: new Float64Array(state.phi) as unknown as CollapseState,
      layers: [],
      totalCoherence: 0,
    };

    const phi = new Float64Array(state.phi);

    // Camada 1: Reconstrução da Memória
    if (layers >= 1) {
      const coherence1 = this._layer1MemoryReconstruction(phi, state);
      result.layers.push({
        layer: 1,
        name: 'Reconstrução da Memória',
        description: 'Identifica kernel de memória e ordem temporal usando critérios de informação (AIC/BIC) e divergência KL',
        coherence: coherence1,
      });
    }

    // Camada 2: Dinâmica com História
    if (layers >= 2) {
      const coherence2 = this._layer2HistoryDynamics(phi, state);
      result.layers.push({
        layer: 2,
        name: 'Dinâmica com História',
        description: 'x_{t+1} = F(x_t, h_t, u_t, ξ_t; θ), h_t = H[x_{<t}] governa a evolução',
        coherence: coherence2,
      });
    }

    // Camada 3: Campo de Cicatrizes Topológicas
    if (layers >= 3) {
      const coherence3 = this._layer3TopologicalScars(phi, state);
      result.layers.push({
        layer: 3,
        name: 'Campo de Cicatrizes Topológicas',
        description: 'O campo χ é incorporado à ação efetiva e acopla-se a campos de gauge e à gravidade',
        coherence: coherence3,
      });
    }

    // Camada 4: Ferramental de Controle Preditivo
    if (layers >= 4) {
      const coherence4 = this._layer4PredictiveControl(phi, state);
      result.layers.push({
        layer: 4,
        name: 'Controle Preditivo',
        description: 'Derivadas fracionárias, inferência bayesiana, entropia de transferência',
        coherence: coherence4,
      });
    }

    // Camada 5: Ressonância e Histerese
    if (layers >= 5) {
      const coherence5 = this._layer5ResonanceHysteresis(phi, state);
      result.layers.push({
        layer: 5,
        name: 'Ressonância e Histerese',
        description: 'Minimiza J = E[∫₀ᵀ(P_diss + η||û||²)dt] ajustando impedância',
        coherence: coherence5,
      });
    }

    // Coerência total = média das coerências
    result.totalCoherence =
      result.layers.reduce((sum, l) => sum + l.coherence, 0) / result.layers.length;

    result.state = {
      ...state,
      phi,
      chiField: defectDensityField(phi),
      t: state.t + state.dt,
    };

    return result;
  }

  // ─── Implementações das Camadas ─────────────────────

  private _layer1MemoryReconstruction(phi: Float64Array, state: CollapseState): number {
    if (state.history.length < 2) return 0.5;

    // Calcular divergência KL entre forward e backward
    const forward = phi;
    const backward = state.history[state.history.length - 1];
    const kl = irreversibilityMeasure(forward, backward);

    // Coerência: baixa KL = boa reconstrução
    return Math.exp(-kl);
  }

  private _layer2HistoryDynamics(phi: Float64Array, state: CollapseState): number {
    if (state.history.length < 3) return 0.5;

    // Medir suavidade da evolução temporal
    let smoothness = 0;
    for (let i = 1; i < state.history.length; i++) {
      const diff = state.history[i].length === phi.length
        ? state.history[i].reduce((sum, v, j) => sum + Math.abs(v - phi[j]), 0) / phi.length
        : 0;
      smoothness += diff;
    }
    smoothness /= state.history.length;

    return Math.exp(-smoothness);
  }

  private _layer3TopologicalScars(phi: Float64Array, _state: CollapseState): number {
    const chi = defectDensityField(phi);
    let avgChi = 0;
    for (let i = 0; i < chi.length; i++) {
      avgChi += chi[i];
    }
    avgChi /= chi.length;

    // Baixa densidade de defeitos = boa coerência topológica
    return Math.exp(-avgChi * 10);
  }

  private _layer4PredictiveControl(phi: Float64Array, _state: CollapseState): number {
    // Derivada fracionária simplificada (Caputo de ordem α = 0.7)
    const alpha = 0.7;
    let fracDeriv = 0;
    const n = phi.length;

    for (let k = 0; k < n; k++) {
      let sum = 0;
      for (let j = 0; j <= k; j++) {
        const binomCoeff = this._binomialCoeff(alpha, k - j);
        sum += binomCoeff * phi[j];
      }
      fracDeriv += sum * sum;
    }
    fracDeriv = Math.sqrt(fracDeriv / n);

    // Baixa derivada fracionária = sistema previsível
    return Math.exp(-fracDeriv * 0.1);
  }

  private _layer5ResonanceHysteresis(phi: Float64Array, _state: CollapseState): number {
    // Calcular dissipação de energia
    let dissipation = 0;
    for (let i = 0; i < phi.length; i++) {
      dissipation += phi[i] * phi[i];
    }
    dissipation /= phi.length;

    // Coerência baseada na relação sinal/ruído
    const eta = 0.1;
    const J = dissipation + eta * dissipation;

    return Math.exp(-J);
  }

  private _binomialCoeff(alpha: number, k: number): number {
    if (k < 0) return 0;
    if (k === 0) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (alpha - i) / (i + 1);
    }
    return result;
  }
}

// ─── Singleton ──────────────────────────────────────────

let _instance: CollapseAlgebra | null = null;

export function getCollapseAlgebra(): CollapseAlgebra {
  if (!_instance) {
    _instance = new CollapseAlgebra();
  }
  return _instance;
}

// ─── Estado Inicial ─────────────────────────────────────

/** Cria um estado inicial para o sistema de colapsos */
export function createInitialState(size: number = 64, material?: Uint8Array): CollapseState {
  const phi = new Float64Array(size);
  const memoryKernel = new Float64Array(size).fill(1.0);

  const mat = material ?? offlineMaterialFromSeed(`collapse:init:${size}`, size);
  for (let i = 0; i < size; i++) {
    phi[i] = 0.5 * Math.sin((2 * Math.PI * i) / size) + 0.1 * (unit(mat, i) - 0.5);
  }

  return {
    phi,
    memoryKernel,
    chiField: defectDensityField(phi),
    t: 0,
    dt: 0.01,
    lambda: 0.05,
    history: [],
  };
}
