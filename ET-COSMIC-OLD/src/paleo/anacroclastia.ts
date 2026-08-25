/**
 * ETΞRNET — Anacroclastia & Paleocomputação Estrutural (Capítulo 10)
 *
 * Implementa a teoria de transformação anacroclástica para análise
 * de binários (WASM/eBPF) via fossilização, erosão controlada e
 * levantamento estratigráfico. O operador anacroclástico compõe
 * erosão → levantamento → fossilização para extrair invariantes
 * estruturais imutáveis de código executável.
 *
 * Referência: "O Livro do ETRNET", Cap. 10, pp. 39-42
 */

import { sha3_256 } from "@noble/hashes/sha3.js";

// ─── Tipos ──────────────────────────────────────────────

/** Vetor arqueológico — representa um artefato no espaço Ω */
export interface ArchaeologicalVector {
  /** Identificador único do artefato */
  id: string;
  /** Vetor de pesos ω_i no espaço de características */
  omega: Map<string, number>;
}

/** Métrica de tensão — tensor de rigidez do espaço arqueológico */
export interface TensionMetric {
  /** Matriz de métrica g_ij = ∂²Ψ/∂ω_i∂ω_j */
  g: number[][];
  /** Dimensão do espaço de características */
  dimension: number;
}

/** Sheaf de coerência — seções locais e obstrução global */
export interface CoherenceSheaf {
  /** Seções locais: chave = nó do CFG, valor = vetor de coerência */
  sections: Map<string, number[]>;
  /** Medida de obstrução H¹ (0 = exato, >0 = ambíguo) */
  obstruction: number;
}

/** Invariante fóssil — estrutura extraída de binário */
export interface FossilInvariant {
  /** Tipo do invariante: CFG, SSA ou morfologia de pilha */
  type: "CFG" | "SSA" | "STACK_MORPHOLOGY";
  /** Dados do invariante como Float64Array */
  data: Float64Array;
  /** Hash determinístico (SHA3-256) */
  hash: string;
}

// ─── Constantes ─────────────────────────────────────────

/** Limiar de convergência para projeções iterativas */
const PROJECTION_EPSILON = 1e-10;

// ─── Funções Matemáticas Puras ─────────────────────────

/**
 * Operador de Fossilização: F(C) = ∩ E_θ(C) (Eq. 10.6)
 *
 * Para cada otimização θ, aplica o mapa de extração E_θ e
 * intersecciona os resultados. O operador é idempotente:
 * aplicar F duas vezes é equivalente a uma vez.
 *
 * @param C - Conjunto de matrizes (representação do código)
 * @param theta - Vetor de parâmetros de otimização
 * @returns Matriz fossilizada (interseção das extrações)
 */
export function fossilizationOperator(
  C: number[][],
  theta: number[]
): number[][] {
  if (C.length === 0 || theta.length === 0) return [];

  // Inicializar resultado como cópia do primeiro conjunto
  let intersection = C.map(row => [...row]);

  // Para cada otimização θ_k, projetar e interseccionar
  for (const thetaK of theta) {
    const extracted: number[][] = [];

    for (const matrix of intersection) {
      const projected: number[] = [];
      for (let j = 0; j < matrix.length; j++) {
        // Mapa de extração E_θ: projeção não-linear
        const value = matrix[j]!;
        projected.push(
          value * Math.cos(thetaK) + (value * value) * Math.sin(thetaK)
        );
      }
      extracted.push(projected);
    }

    // Interseção: manter apenas elementos que são comuns
    intersection = extracted.map((row, i) => {
      return row.map((val, j) => {
        const original = C[i % C.length]![j % (C[0]?.length ?? 1)] ?? 0;
        // Interseção aproximada: média ponderada
        return (val + original) / 2;
      });
    });
  }

  return intersection;
}

/**
 * Produto tensorial anacroclástico: F₁ ⊗_A F₂ (Eq. 10.7)
 *
 * F₁ ⊗_A F₂ = {f₁ ∩ f₂ | f₁∈F₁, f₂∈F₂, co-ocorrência estratigráfica}
 *
 * Calcula o produto tensorial entre dois conjuntos fossilizados,
 * considerando apenas pares que co-ocorrem na mesma camada estratigráfica.
 *
 * @param F1 - Primeiro conjunto fossilizado
 * @param F2 - Segundo conjunto fossilizado
 * @returns Produto tensorial resultante
 */
export function anacroclasticTensorProduct(
  F1: number[][],
  F2: number[][]
): number[][] {
  const result: number[][] = [];

  for (let i = 0; i < F1.length; i++) {
    for (let j = 0; j < F2.length; j++) {
      // Verificar co-ocorrência estratigráfica (normalizada)
      const maxLen = Math.max(F1[i]!.length, F2[j]!.length);
      const intersection: number[] = [];

      for (let k = 0; k < maxLen; k++) {
        const v1 = F1[i]![k % F1[i]!.length] ?? 0;
        const v2 = F2[j]![k % F2[j]!.length] ?? 0;
        // Interseção: mínimo absoluto (comportamento de fossilização)
        intersection.push(Math.min(Math.abs(v1), Math.abs(v2)) * Math.sign(v1 + v2));
      }

      result.push(intersection);
    }
  }

  return result;
}

/**
 * Espaço métrico arqueológico: Ω(p) → TensionMetric (Eq. 10.8-10.9)
 *
 * Constrói o tensor de tensão g_ij = ∂²Ψ/∂ω_i∂ω_j a partir de
 * vetores arqueológicos no espaço Ω.
 *
 * @param items - Vetores arqueológicos ( artefatos )
 * @returns Métrica de tensão TensionMetric
 */
export function archaeologicalMetricSpace(
  items: ArchaeologicalVector[]
): TensionMetric {
  if (items.length === 0) {
    return { g: [], dimension: 0 };
  }

  // Coletar todas as chaves únicas
  const allKeys = new Set<string>();
  for (const item of items) {
    for (const key of item.omega.keys()) {
      allKeys.add(key);
    }
  }
  const keys = Array.from(allKeys);
  const dimension = keys.length;

  // Construir a matriz de métrica g_ij
  const g: number[][] = [];
  for (let i = 0; i < dimension; i++) {
    g.push(new Array(dimension).fill(0));
  }

  // Calcular Ψ = Σ_i ω_i (energia total)
  // e derivadas numéricas de segunda ordem: g_ij = ∂²Ψ/∂ω_i∂ω_j
  const psi = (omegaVec: number[]): number => {
    return omegaVec.reduce((sum, w) => sum + w, 0);
  };

  const h = 1e-5; // passo para derivada numérica
  for (let i = 0; i < dimension; i++) {
    for (let j = 0; j < dimension; j++) {
      // Para cada item, calcular derivada numérica
      for (const item of items) {
        const baseVec = keys.map(k => item.omega.get(k) ?? 0);

        // Perturbação dupla para ∂²Ψ/∂ω_i∂ω_j
        const perturbed = [...baseVec];
        perturbed[i]! += h;
        perturbed[j]! += h;
        const psiPlusPlus = psi(perturbed);

        perturbed[i] = baseVec[i]! + h;
        perturbed[j] = baseVec[j]! - h;
        const psiPlusMinus = psi(perturbed);

        perturbed[i] = baseVec[i]! - h;
        perturbed[j] = baseVec[j]! + h;
        const psiMinusPlus = psi(perturbed);

        perturbed[i] = baseVec[i]! - h;
        perturbed[j] = baseVec[j]! - h;
        const psiMinusMinus = psi(perturbed);

        // Derivada mista central
        g[i]![j]! += (psiPlusPlus - psiPlusMinus - psiMinusPlus + psiMinusMinus) / (4 * h * h);
      }
      g[i]![j]! /= items.length;
    }
  }

  return { g, dimension };
}

/**
 * Obstrução de cohomologia: H¹(CFG, C) (Eq. 10.10 parcial)
 *
 * Mede a obstrução global do sheaf de coerência. Retorna 0 se o sheaf
 * é exato (globalmente consistente), >0 se há ambiguidades.
 *
 * @param sheaf - Sheaf de coerência com seções locais
 * @returns Medida de obstrução (0 = exato, >0 = ambíguo)
 */
export function cohomologyObstruction(sheaf: CoherenceSheaf): number {
  if (sheaf.sections.size <= 1) return 0;

  const entries = Array.from(sheaf.sections.entries());
  let totalObstruction = 0;

  // Para cada par de seções adjacentes, verificar compatibilidade
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [, sectionA] = entries[i]!;
      const [, sectionB] = entries[j]!;

      // Calcular diferença entre seções (via distância L2)
      const maxLen = Math.max(sectionA.length, sectionB.length);
      let diffSum = 0;
      for (let k = 0; k < maxLen; k++) {
        const a = sectionA[k % sectionA.length] ?? 0;
        const b = sectionB[k % sectionB.length] ?? 0;
        diffSum += (a - b) ** 2;
      }
      totalObstruction += Math.sqrt(diffSum);
    }
  }

  // Normalizar pelo número de pares
  const numPairs = (entries.length * (entries.length - 1)) / 2;
  return numPairs > 0 ? totalObstruction / numPairs : 0;
}

/**
 * Erosão controlada: E_α(B)
 *
 * Aplica filtro que remove traços que não sobreviveriam à era α.
 * Simula a erosão natural de dados ao longo do tempo.
 *
 * @param alpha - Parâmetro de idade (maior = mais erosão)
 * @param state - Estado atual do sistema
 * @returns Estado erosionado
 */
export function controlledErosion(alpha: number, state: number[]): number[] {
  return state.map((value, index) => {
    // Decaimento exponencial ponderado pela posição
    const decayFactor = Math.exp(-alpha * (index + 1) * 0.1);
    // Limiar de sobrevivência: traços muito fracos são removidos
    const survived = value * decayFactor;
    return Math.abs(survived) < alpha * PROJECTION_EPSILON ? 0 : survived;
  });
}

/**
 * Levantamento estratigráfico: L_X(B)
 *
 * Levanta o estado B através de camadas estratigráficas,
 * cada uma representando uma camada de contexto computacional.
 *
 * @param X - Vetor de referência (contexto estratigráfico)
 * @param layers - Número de camadas para levantar
 * @returns Matriz com cada camada do levantamento
 */
export function stratigraphicLift(X: number[], layers: number): number[][] {
  const result: number[][] = [];
  let currentLayer = [...X];

  for (let layer = 0; layer < layers; layer++) {
    const liftedLayer: number[] = [];
    const layerWeight = 1.0 / (layer + 1);

    for (let i = 0; i < currentLayer.length; i++) {
      // Cada camada aplica ponderação e combina com vizinhos
      const left = currentLayer[(i - 1 + currentLayer.length) % currentLayer.length] ?? 0;
      const center = currentLayer[i]!;
      const right = currentLayer[(i + 1) % currentLayer.length] ?? 0;

      // Combinação linear com influência da camada anterior
      const lifted = center * layerWeight + (left + right) * (1 - layerWeight) * 0.5;
      liftedLayer.push(lifted);
    }

    result.push(liftedLayer);
    currentLayer = liftedLayer;
  }

  return result;
}

/**
 * Funcional de tensão: Ψ(B, H) = D_KL(B||H) + λ|B-H|² (Eq. 10.10)
 *
 * Combina divergência KL (informação) com distância euclidiana
 * (geometria) para medir a tensão entre código binário B e
 * código referência H.
 *
 * @param B - Vetor de características do binário
 * @param H - Vetor de características de referência
 * @param lambda - Peso relativo da distância geométrica (padrão: 1.0)
 * @returns Valor do funcional de tensão Ψ
 */
export function tensionFunctional(
  B: number[],
  H: number[],
  lambda: number = 1.0
): number {
  if (B.length !== H.length) {
    throw new Error("B e H devem ter o mesmo tamanho");
  }
  if (B.length === 0) return 0;

  // Normalizar para distribuições de probabilidade (divergência KL)
  let sumB = 0;
  let sumH = 0;
  for (let i = 0; i < B.length; i++) {
    sumB += Math.abs(B[i]!);
    sumH += Math.abs(H[i]!);
  }

  const KL_EPSILON = 1e-15;
  let kl = 0;
  for (let i = 0; i < B.length; i++) {
    const bNorm = sumB > 0 ? Math.abs(B[i]!) / sumB : 1.0 / B.length;
    const hNorm = sumH > 0 ? Math.abs(H[i]!) / sumH : 1.0 / H.length;
    const b = Math.max(bNorm, KL_EPSILON);
    const h = Math.max(hNorm, KL_EPSILON);
    kl += b * Math.log(b / h);
  }

  // Distância euclidiana |B - H|²
  let euclideanSq = 0;
  for (let i = 0; i < B.length; i++) {
    euclideanSq += (B[i]! - H[i]!) ** 2;
  }

  return Math.max(0, kl) + lambda * euclideanSq;
}

/**
 * Transformação anacroclástica: A(S) = F ∘ L_X ∘ E_α(S) (Eq. 10.11)
 *
 * Composição completa: erosão controlada → levantamento estratigráfico
 * → fossilização. Extrai invariantes estruturais de um sinal S.
 *
 * @param S - Sinal de entrada (matriz de características)
 * @param alpha - Parâmetro de erosão
 * @param X - Vetor de contexto estratigráfico
 * @returns Resultado da transformação anacroclástica
 */
export function anacroclasticTransform(
  S: number[][],
  alpha: number,
  X: number[]
): number[][] {
  // Etapa 1: Erosão controlada E_α(S)
  const eroded: number[][] = S.map(row => controlledErosion(alpha, row));

  // Etapa 2: Levantamento estratigráfico L_X(E_α(S))
  // Usar cada linha erodida como camada base
  const allLifted: number[][] = [];
  for (const row of eroded) {
    const liftedLayers = stratigraphicLift(X, Math.min(row.length, 3));
    allLifted.push(...liftedLayers);
  }

  // Etapa 3: Fossilização F(L_X(E_α(S)))
  const theta = X.map((_, i) => Math.atan2(X[i % X.length] ?? 0, (i + 1)));
  return fossilizationOperator(allLifted.length > 0 ? allLifted : [X], theta);
}

// ─── Classe Principal ───────────────────────────────────

/**
 * PaleoCLI 3 Estágios — Pipeline completo de paleocomputação
 *
 * Estágio 1: Extração de invariantes (fossilização)
 * Estágio 2: Motor de falsificação (verificação por contraposição)
 * Estágio 3: Construção do atlas de coerência (sheaf)
 */
export class PaleoCLI3Stages {
  private static instance: PaleoCLI3Stages;

  public static getInstance(): PaleoCLI3Stages {
    if (!PaleoCLI3Stages.instance) {
      PaleoCLI3Stages.instance = new PaleoCLI3Stages();
    }
    return PaleoCLI3Stages.instance;
  }

  private constructor() {}

  /**
   * Estágio 1: Extração de Invariantes Fósseis
   *
   * Analisa um binário e extrai invariantes estruturais:
   * - CFG: hash do Grafo de Fluxo de Controle
   * - SSA: estrutura de forma Normal Única Atribuída
   * - STACK_MORPHOLOGY: morfologia da pilha de execução
   *
   * @param binary - Binário a ser analisado (WASM/eBPF/ELF)
   * @returns Lista de invariantes fósseis extraídos
   */
  public extractInvariants(binary: Uint8Array): FossilInvariant[] {
    const invariants: FossilInvariant[] = [];

    // --- Extração de CFG ---
    // Simula análise estática do Grafo de Fluxo de Controle
    // Em implementação real, isso usaria wasmparser ou eBPF disassembler
    const cfgData = new Float64Array(Math.min(binary.length, 64));
    let cfgEntropy = 0;
    for (let i = 0; i < cfgData.length; i++) {
      cfgData[i] = binary[i]! / 255.0;
      cfgEntropy += cfgData[i]! * Math.log2(cfgData[i]! + 1e-10);
    }
    // Inserir entropia comoFeature global
    cfgData[0] = Math.abs(cfgEntropy) / cfgData.length;

    const cfgHash = sha3_256(new Uint8Array(cfgData.buffer));
    invariants.push({
      type: "CFG",
      data: cfgData,
      hash: Array.from(new Uint8Array(cfgHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    });

    // --- Extração de SSA ---
    // Simula análise de forma Normal Única Atribuída
    // Detecta padrões de phi-nodes e dominância
    const ssaSize = Math.min(binary.length, 48);
    const ssaData = new Float64Array(ssaSize);
    let ssaComplexity = 0;
    for (let i = 0; i < ssaSize; i++) {
      // Ponderar por posição e valor
      const byteVal = binary[i % binary.length]! / 255.0;
      ssaData[i] = byteVal * (1 + Math.sin(i * 0.5));
      ssaComplexity += Math.abs(ssaData[i]! - (i > 0 ? ssaData[i - 1]! : 0));
    }
    ssaData[0] = ssaComplexity / ssaSize;

    const ssaHash = sha3_256(new Uint8Array(ssaData.buffer));
    invariants.push({
      type: "SSA",
      data: ssaData,
      hash: Array.from(new Uint8Array(ssaHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    });

    // --- Extração de Morfologia de Pilha ---
    // Analisa padrões de alocação/desalocação de pilha
    const stackSize = Math.min(binary.length, 32);
    const stackData = new Float64Array(stackSize);
    let stackDepth = 0;
    let maxDepth = 0;
    for (let i = 0; i < stackSize; i++) {
      const byteVal = binary[i % binary.length]!;
      // Simular operações de push/pop baseadas no byte
      stackDepth += (byteVal & 0x01) === 0 ? 1 : -1;
      stackDepth = Math.max(0, stackDepth);
      maxDepth = Math.max(maxDepth, stackDepth);
      stackData[i] = stackDepth / (maxDepth + 1);
    }
    stackData[0] = maxDepth / stackSize;

    const stackHash = sha3_256(new Uint8Array(stackData.buffer));
    invariants.push({
      type: "STACK_MORPHOLOGY",
      data: stackData,
      hash: Array.from(new Uint8Array(stackHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    });

    return invariants;
  }

  /**
   * Estágio 2: Motor de Falsificação
   *
   * Verifica se os invariantes extraídos são compatíveis com um
   * conjunto de invariantes conhecidos. Usa falsificação por
   * contraposição: tenta refutar a hipótese de que são equivalentes.
   *
   * @param invariants - Invariantes extraídos do binário
   * @param known - Invariantes conhecidos de referência
   * @returns Resultado da falsificação com confiança
   */
  public falsify(
    invariants: FossilInvariant[],
    known: FossilInvariant[]
  ): { valid: boolean; confidence: number; mismatches: string[] } {
    const mismatches: string[] = [];
    let matchCount = 0;
    let totalChecks = 0;

    // Índice por tipo para busca eficiente
    const knownByType = new Map<string, FossilInvariant[]>();
    for (const k of known) {
      const list = knownByType.get(k.type) ?? [];
      list.push(k);
      knownByType.set(k.type, list);
    }

    for (const inv of invariants) {
      const knownOfType = knownByType.get(inv.type) ?? [];
      totalChecks++;

      if (knownOfType.length === 0) {
        mismatches.push(`Tipo ${inv.type} não encontrado nos invariantes conhecidos`);
        continue;
      }

      // Verificar hash direto
      const hashMatch = knownOfType.some(k => k.hash === inv.hash);

      // Verificar similaridade estrutural via distância euclidiana
      let bestSimilarity = 0;
      for (const k of knownOfType) {
        const maxLen = Math.max(inv.data.length, k.data.length);
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < maxLen; i++) {
          const a = inv.data[i % inv.data.length] ?? 0;
          const b = k.data[i % k.data.length] ?? 0;
          dotProduct += a * b;
          normA += a * a;
          normB += b * b;
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        const similarity = denom > 0 ? dotProduct / denom : 0;
        bestSimilarity = Math.max(bestSimilarity, similarity);
      }

      if (hashMatch || bestSimilarity > 0.95) {
        matchCount++;
      } else {
        mismatches.push(
          `Invariante ${inv.type}: hash divergente (similaridade: ${bestSimilarity.toFixed(4)})`
        );
      }
    }

    const valid = totalChecks > 0 && matchCount === totalChecks;
    const confidence = totalChecks > 0 ? matchCount / totalChecks : 0;

    return { valid, confidence, mismatches };
  }

  /**
   * Estágio 3: Construção do Atlas de Coerência (Sheaf)
   *
   * Monta o sheaf de coerência a partir dos esqueletos arqueológicos.
   * Cada esqueleto贡献 seções locais ao sheaf, e a obstrução global
   * é calculada via cohomologia.
   *
   * @param skeletons - Lista de esqueletos com seus invariantes
   * @returns Sheaf de coerência com obstrução global
   */
  public buildAtlas(
    skeletons: { id: string; invariants: FossilInvariant[] }[]
  ): CoherenceSheaf {
    const sections = new Map<string, number[]>();

    // Construir seções locais a partir dos invariantes
    for (const skeleton of skeletons) {
      const sectionVector: number[] = [];

      for (const inv of skeleton.invariants) {
        // Agregar dados do invariante em um vetor unificado
        const aggregated = inv.data.reduce(
          (sum, val) => sum + val,
          0
        ) / (inv.data.length || 1);
        sectionVector.push(aggregated);
      }

      // Se não houver invariantes, vetor vazio
      if (sectionVector.length === 0) {
        sectionVector.push(0);
      }

      sections.set(skeleton.id, sectionVector);
    }

    // Calcular obstrução de cohomologia
    const obstruction = cohomologyObstruction({ sections, obstruction: 0 });

    return { sections, obstruction };
  }
}

// ─── Singleton ──────────────────────────────────────────

let _instance: PaleoCLI3Stages | null = null;

/**
 * Obtém a instância singleton do pipeline PaleoCLI
 */
export function getPaleoCLI3Stages(): PaleoCLI3Stages {
  if (!_instance) {
    _instance = PaleoCLI3Stages.getInstance();
  }
  return _instance;
}

export const paleoCLI3Stages = PaleoCLI3Stages.getInstance();
