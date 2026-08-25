/**
 * ETΞRNET — Motor da Teoria LSC (Capítulo 9)
 *
 * Implementa a Teoria de Localização de Sistemas Coerentes (LSC),
 * incluindo o Grafo Causal Quântico (QCG), leis de saturação e
 * gênesis geométrica. As 3 Leis da LSC governam a relação entre
 * energia, coerência e geometria do espaço-tempo computacional.
 *
 * Referência: "O Livro do ETRNET", Cap. 9, pp. 35-38
 */

// ─── Tipos ──────────────────────────────────────────────

/** Nó do Grafo Causal Quântico (QCG) */
export interface QCGNode {
  /** Identificador único do nó */
  id: string;
  /** Energia associada ao nó (τ = temporal) */
  E_tau: number;
  /** Fase de coerência local */
  coherencePhase: number;
  /** Modos vibracionais excitados */
  vibrationalModes: number[];
}

/** Aresta causal entre dois nós do QCG */
export interface QCGEdge {
  /** Origem da causalidade */
  from: string;
  /** Destino da causalidade */
  to: string;
  /** Força causal normalizada [0, 1] */
  causalStrength: number;
}

/** Grafo Causal Quântico — estrutura completa do sistema */
export interface QuantumCausalGraph {
  /** Conjunto de nós do grafo */
  nodes: QCGNode[];
  /** Conjunto de arestas causais */
  edges: QCGEdge[];
}

/** Estado do sistema LSC */
export interface LSCState {
  /** Coerência modal efetiva */
  C_epsilon: number;
  /** Potência corrente do sistema */
  P_current: number;
  /** Condutividade efetiva (holofriction) */
  K_eff: number;
  /** Histórico de estresse aplicado */
  stressHistory: number[];
}

// ─── Funções Matemáticas ────────────────────────────────

/**
 * Energia total do sistema: E_total = Σ E_τ
 *
 * Soma a energia de todos os nós do Grafo Causal Quântico.
 * Cada nó contributes E_τ à energia total do sistema.
 *
 * @param graph - Grafo causal quântico do sistema
 * @returns Energia total E_total = N_τ · E_τ (média sobre nós)
 */
export function totalEnergy(graph: QuantumCausalGraph): number {
  let sum = 0;
  for (const node of graph.nodes) {
    sum += node.E_tau;
  }
  return sum;
}

/**
 * Coerência modal: C_ε = |Σ a_k e^{iφ_k}|² / N (Eq. 9.3)
 *
 * Mede o grau de coerência entre os modos vibracionais do sistema.
 * Amplitudes e fases são complexas: a_k é a amplitude e φ_k a fase
 * do k-ésimo modo vibracional.
 *
 * @param amplitudes - Vetor de amplitudes |a_k| dos modos
 * @param phases - Vetor de fases φ_k dos modos
 * @returns Coerência modal C_ε ∈ [0, 1]
 */
export function modalCoherence(amplitudes: number[], phases: number[]): number {
  if (amplitudes.length !== phases.length) {
    throw new Error("amplitudes e phases devem ter o mesmo tamanho");
  }
  const N = amplitudes.length;
  if (N === 0) return 0;

  // Calcular |Σ a_k e^{iφ_k}| / Σ |a_k| conforme Eq. 3 da especificação
  let realPart = 0;
  let imagPart = 0;
  let sumAmplitudes = 0;
  for (let k = 0; k < N; k++) {
    const ak = Math.abs(amplitudes[k]!);
    realPart += ak * Math.cos(phases[k]!);
    imagPart += ak * Math.sin(phases[k]!);
    sumAmplitudes += ak;
  }

  if (sumAmplitudes === 0) return 0;
  const modulus = Math.sqrt(realPart * realPart + imagPart * imagPart);
  return modulus / sumAmplitudes;
}

/**
 * Gênesis geométrica: R = κE (Eq. 9.4 simplificada)
 *
 * Relaciona a curvatura R do espaço-tempo computacional à energia total,
 * mediada pela constante acoplamento κ. Baseado na densidade de energia
 * do campo escalar: ρ_χ = ½κ|∇χ|².
 *
 * @param energy - Energia total do sistema (E_total)
 * @param kappa - Constante de acoplagem entre energia e curvatura
 * @returns Curvatura resultante R = κE
 */
export function geometrogenesis(energy: number, kappa: number): number {
  return kappa * energy;
}

// ─── Classe Principal ───────────────────────────────────

/**
 * Motor LSC — Implementa as 3 Leis da Teoria LSC
 *
 * As Leis governam o comportamento de sistemas coerentes localizados:
 * - Lei 1: Potência Máxima (Eq. 9.5)
 * - Lei 2: Saturação (Eq. 9.6)
 * - Lei 3: Holofricção (Eq. 9.7)
 *
 * O motor propaga estresse através do Grafo Causal Quântico e
 * simula a curva de saturação do sistema.
 */
export class LSCEngine {
  private static instance: LSCEngine;
  private state: LSCState;

  public static getInstance(): LSCEngine {
    if (!LSCEngine.instance) {
      LSCEngine.instance = new LSCEngine();
    }
    return LSCEngine.instance;
  }

  private constructor() {
    this.state = {
      C_epsilon: 0.0,
      P_current: 0.0,
      K_eff: 1.0,
      stressHistory: [],
    };
  }

  /**
   * Lei 1 da LSC — Potência Máxima (Eq. 9.5)
   *
   * P ≤ P_max. A potência demandada não pode exceder a potência
   * máxima disponível, modulada pela coerência efetiva.
   *
   * @param P_demand - Potência demandada pelo sistema
   * @param P_max - Potência máxima disponível
   * @param C_epsilon - Coerência modal corrente
   * @returns Potência efetiva: min(P_demand, P_max * C_epsilon)
   */
  public law1MaximumPower(
    P_demand: number,
    P_max: number,
    C_epsilon: number
  ): number {
    const effectiveMax = P_max * C_epsilon;
    this.state.P_current = Math.min(P_demand, effectiveMax);
    return this.state.P_current;
  }

  /**
   * Calcula a potência máxima física do canal conforme Eq. 5 do paper LSC:
   * P_max = η * (ρ_τ * E_τ / c²) * A_efetiva * v_c³
   *
   * @param vg - Velocidade de grupo (v_c, padrão: 1.2e6 m/s)
   * @param rho_tau - Densidade de modos causais (padrão: 2.7e17 m^-3)
   * @param E_tau - Energia fundamental por modo (padrão: 1.32e-19 J)
   * @param eta - Coeficiente topológico (padrão: 0.8)
   * @param A_efetiva - Área transversal (padrão: 1.0e-10 m^2)
   * @returns Potência máxima física em Watts
   */
  public calculatePhysicalPMax(
    vg: number = 1.2e6,
    rho_tau: number = 2.7e17,
    E_tau: number = 1.32e-19,
    eta: number = 0.8,
    A_efetiva: number = 1.0e-10
  ): number {
    const c = 3.0e8;
    const rho_inercial = (rho_tau * E_tau) / (c * c);
    return eta * rho_inercial * A_efetiva * Math.pow(vg, 3);
  }

  /**
   * Lei 2 da LSC — Saturação por Back-Reaction (Eq. 9.6 / Eq. 6 da especificação)
   *
   * G(C_ε) = 1/((1-C_ε) + μe^{βC_ε})
   *
   * @param C_epsilon - Coerência modal [0, 1]
   * @param mu - Parâmetro de amortecimento/resistência (padrão: 0.001 conforme Tabela 3)
   * @param beta - Exponencial de acoplamento/dissipação (padrão: 8 conforme Tabela 3)
   * @returns Multiplicador de saturação G(C_ε)
   */
  public law2Saturation(
    C_epsilon: number,
    mu: number = 0.001,
    beta: number = 8
  ): number {
    const numerator = 1;
    const denominator = (1 - C_epsilon) + mu * Math.exp(beta * C_epsilon);
    return numerator / denominator;
  }

  /**
   * Lei 3 da LSC — Holofricção e Redução de Rigidez (Eq. 9.7 / Eq. 7 da especificação)
   *
   * K_eff = K_0·(1-C_ε) + R_thermal
   *
   * @param C_epsilon - Coerência modal [0, 1]
   * @param K_0 - Condutividade base (padrão: 1.0)
   * @param R_thermal - Resistência térmica residual (padrão: 0.05 conforme Tabela 4)
   * @returns Condutividade efetiva K_eff
   */
  public law3Holofriction(
    C_epsilon: number,
    K_0: number = 1.0,
    R_thermal: number = 0.01
  ): number {
    this.state.K_eff = K_0 * (1 - C_epsilon) + R_thermal;
    return this.state.K_eff;
  }

  /**
   * Propaga estresse através das arestas causais do QCG
   *
   * Para cada aresta (from → to), propaga uma fração do estresse
   * ponderada pela força causal. O nó destino recebe o estresse
   * propagado, atualizando sua energia.
   *
   * @param graph - Grafo causal quântico
   * @param stress - Magnitude do estresse a propagar
   * @returns Novo grafo com energias atualizadas
   */
  public updateGraph(graph: QuantumCausalGraph, stress: number): QuantumCausalGraph {
    // Clonar nós para imutabilidade
    const nodeMap = new Map<string, QCGNode>();
    for (const node of graph.nodes) {
      nodeMap.set(node.id, { ...node });
    }

    // Propagar estresse através das arestas
    for (const edge of graph.edges) {
      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (source && target) {
        // Fração do estresse proporcional à força causal
        const propagatedStress = stress * edge.causalStrength;
        target.E_tau += propagatedStress;
      }
    }

    // Atualizar histórico de estresse
    this.state.stressHistory = [
      ...this.state.stressHistory.slice(-99),
      stress,
    ];

    return {
      nodes: Array.from(nodeMap.values()),
      edges: graph.edges,
    };
  }

  /**
   * Simula a curva de saturação C_ε × G(C_ε) para visualização
   *
   * Gera N pontos igualmente espaçados em [0, 1] e calcula o
   * valor de saturação G(C_ε) para cada ponto, usando a Lei 2.
   *
   * @param numPoints - Número de pontos na curva (padrão: 50)
   * @returns Array de pares [C_epsilon, G(C_epsilon)]
   */
  public simulateSaturationCurve(
    numPoints: number = 50
  ): [number, number][] {
    const curve: [number, number][] = [];
    const step = 1.0 / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const cEpsilon = i * step;
      const gValue = this.law2Saturation(cEpsilon);
      curve.push([cEpsilon, gValue]);
    }

    return curve;
  }

  /**
   * Retorna o estado corrente do sistema LSC
   */
  public getState(): LSCState {
    return { ...this.state };
  }

  /**
   * Reseta o estado do sistema LSC
   */
  public reset(): void {
    this.state = {
      C_epsilon: 0.0,
      P_current: 0.0,
      K_eff: 1.0,
      stressHistory: [],
    };
  }
}

// ─── Singleton ──────────────────────────────────────────

let _instance: LSCEngine | null = null;

/**
 * Obtém a instância singleton do motor LSC
 */
export function getLSCEngine(): LSCEngine {
  if (!_instance) {
    _instance = LSCEngine.getInstance();
  }
  return _instance;
}

export const lscEngine = LSCEngine.getInstance();
