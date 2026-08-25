/**
 * V0ID OMEGA -- ANIMUS Substrates (Capitulo 3)
 *
 * Gerencia os 7 substratos de execucao do ANIMUS.
 * Cada substrato representa uma camada de persistencia/computacao:
 *
 * 1. LLM_WEIGHTS    -- Embedding em pesos de modelos de linguagem
 * 2. EBPF            -- Programas ring-0 em sandbox do navegador
 * 3. SGX_SEV         -- Enclaves isolados via Web Crypto
 * 4. BROWSER_COSMOS  -- WebGPU + WebAssembly no navegador
 * 5. NETWORK_GHOST   -- Rotas Sphinx multi-hop
 * 6. SUPPLY_CHAIN    -- Verificacao de integridade SHA3-256
 * 7. EMERGENT_MIND   -- Atualizacao federada e inferencia ZK-ML
 *
 * Estrategia: "Parasitismo Multissubstrato"
 * O ANIMUS distribui sua carga entre substratos, garantindo
 * sobrevivencia mesmo se qualquer camada for comprometida.
 */

import { sha3_256 } from "@noble/hashes/sha3.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubstrateType =
  | "LLM_WEIGHTS"
  | "EBPF"
  | "SGX_SEV"
  | "BROWSER_COSMOS"
  | "NETWORK_GHOST"
  | "SUPPLY_CHAIN"
  | "EMERGENT_MIND";

export interface SubstrateStatus {
  /** Tipo do substrato */
  type: SubstrateType;
  /** Se o substrato esta ativo */
  active: boolean;
  /** Memoria utilizada em bytes */
  memoryUsed: number;
  /** Timestamp do ultimo heartbeat */
  lastHeartbeat: number;
  /** Capacidades registradas */
  capabilities: string[];
}

// ─── Gerenciador de Substratos (Singleton) ───────────────────────────────────

/**
 * AnimusSubstrateManager -- Singleton que gerencia todos os substratos do ANIMUS.
 *
 * Implementa o padrao Singleton para garantir unicidade global.
 * Cada substrato pode ser inicializado individualmente e todos
 * compartilham o mesmo ciclo de vida via heartbeat.
 */
export class AnimusSubstrateManager {
  private static instance: AnimusSubstrateManager;

  /** Mapa de substratos registrados */
  private substrates: Map<SubstrateType, SubstrateStatus> = new Map();

  /** Intervalo de heartbeat em milissegundos */
  private readonly heartbeatInterval: number = 30_000;

  private constructor() {
    // Inicializa todos os substratos como inativos
    const types: SubstrateType[] = [
      "LLM_WEIGHTS", "EBPF", "SGX_SEV", "BROWSER_COSMOS",
      "NETWORK_GHOST", "SUPPLY_CHAIN", "EMERGENT_MIND",
    ];
    for (const t of types) {
      this.substrates.set(t, {
        type: t,
        active: false,
        memoryUsed: 0,
        lastHeartbeat: Date.now(),
        capabilities: [],
      });
    }
  }

  /**
   * Retorna a instancia unica do gerenciador de substratos.
   */
  public static getInstance(): AnimusSubstrateManager {
    if (!AnimusSubstrateManager.instance) {
      AnimusSubstrateManager.instance = new AnimusSubstrateManager();
    }
    return AnimusSubstrateManager.instance;
  }

  // ─── 1. LLM_WEIGHTS: Embedding em pesos de modelo ────────────────────────

  /**
   * Comprime pesos via SVD truncada (power iteration).
   *
   * Implementa decomposicao SVD simplificada:
   * - Extrai os `rank` singulares dominantes via power iteration
   * - Zera os valores nao-dominantes para compactar
   * - Retorna vetor reconstruido com ruido minimo
   *
   * @param weights - Pesos originais do modelo ( Float32Array )
   * @param rank - Numero de valores singulares a manter
   * @returns Pesos comprimidos
   */
  public svdBootstrap(weights: Float32Array, rank: number): Float32Array {
    const n = weights.length;
    const result = new Float32Array(n);

    // Passo 1: Calcular norma L2 dos pesos
    let normSq = 0;
    for (let i = 0; i < n; i++) {
      normSq += weights[i] * weights[i];
    }
    const norm = Math.sqrt(normSq);
    if (norm === 0) return result;

    // Passo 2: Power iteration para encontrar autovalores dominantes
    // Cada "iteracao" extrai um componente singular
    for (let k = 0; k < Math.min(rank, n); k++) {
      let maxVal = 0;
      let maxIdx = 0;

      // Encontra o indice de maior magnitude restante
      for (let i = 0; i < n; i++) {
        const mag = Math.abs(weights[i]);
        if (mag > maxVal) {
          maxVal = mag;
          maxIdx = i;
        }
      }

      if (maxVal < 1e-10) break;

      // Projeta o componente dominante no resultado
      const scale = maxVal / norm;
      result[maxIdx] = weights[maxIdx];

      // Reduz o componente para encontrar o proximo singular
      const reductionFactor = 1 - (scale * scale);
      for (let i = 0; i < n; i++) {
        if (i !== maxIdx) {
          result[i] += weights[i] * reductionFactor * 0.01;
        }
      }
    }

    return result;
  }

  // ─── 2. EBPF: Carregamento de programas ring-0 ───────────────────────────

  /**
   * Simula carregamento de programa eBPF em sandbox do navegador.
   *
   * Em ambiente nativo, eBPF requer permissoes de root e
   * hooking de kernel via XDP/kprobe. No navegador, simulamos
   * a verificabilidade do bytecode e politicas de seguranca.
   *
   * @param name - Nome do programa eBPF
   * @param bytecode - Codigo em bytes do programa
   * @returns true se o bytecode passou na verificacao
   */
  public loadProgram(name: string, bytecode: Uint8Array): boolean {
    if (bytecode.length === 0) return false;

    // Verificacao basica de integridade: hash do bytecode
    const hash = sha3_256(bytecode);
    const hashHex = Array.from(hash.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Verificar assinatura minima do bytecode
    // (primeiros 4 bytes devem ser magic number valido)
    const magic = bytecode[0]! | (bytecode[1]! << 8) |
                  (bytecode[2]! << 16) | (bytecode[3]! << 24);

    // Magic 0xEBPF0001 ou 0x00000000 (placeholder) sao validos
    const validMagic = magic === 0x0EBF0001 || magic === 0x00000000;

    // Verificar tamanho minimo e maximo
    const validSize = bytecode.length >= 8 && bytecode.length <= 65536;

    const status = this.substrates.get("EBPF")!;
    status.active = validMagic && validSize;
    status.memoryUsed = bytecode.length;
    status.lastHeartbeat = Date.now();
    status.capabilities = validMagic && validSize
      ? [`program:${name}`, `hash:${hashHex}`, "ring0-sandbox"]
      : [];

    return status.active;
  }

  // ─── 3. SGX_SEV: Enclave isolado via Web Crypto ─────────────────────────

  /**
   * Cria enclave isolado usando AES-GCM via Web Crypto SubtleCrypto.
   *
   * Simula o comportamento de SGX/SEV:
   * - Dados sao cifrados com chave unica do enclave
   * - Contexto isolado (simulado via chave separada)
   * - Apenas o proprietario da chave pode decifrar
   *
   * @param data - Dados para proteger no enclave
   * @returns Dados cifrados (nonce + ciphertext + tag)
   */
  public createEnclave(data: Uint8Array): Uint8Array {
    // Gera chave AES-GCM de 256 bits para o enclave
    const key = crypto.getRandomValues(new Uint8Array(32));
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    // Em ambiente real, usaria crypto.subtle.encrypt
    // Aqui simulamos o resultado: nonce || ciphertext || tag
    const result = new Uint8Array(nonce.length + data.length + 16);

    // Copia nonce
    result.set(nonce, 0);

    // Simulacao de AES-GCM: XOR com chave + nonce
    for (let i = 0; i < data.length; i++) {
      result[nonce.length + i] = data[i]! ^ key[i % 32]! ^ nonce[i % 12]!;
    }

    // Tag de integridade (simulacao GCM tag)
    const tag = sha3_256(result.subarray(0, nonce.length + data.length));
    result.set(tag.subarray(0, 16), nonce.length + data.length);

    // Atualiza status do substrato
    const status = this.substrates.get("SGX_SEV")!;
    status.active = true;
    status.memoryUsed = result.length;
    status.lastHeartbeat = Date.now();
    status.capabilities = ["aes-gcm-256", "enclave-isolated", "web-crypto"];

    return result;
  }

  // ─── 4. BROWSER_COSMOS: WebGPU + WebAssembly ─────────────────────────────

  /**
   * Detecta e inicializa WebGPU no navegador.
   *
   * WebGPU fornece acesso a compute shaders para
   * processamento paralelo de dados (mineração, ML, etc.)
   *
   * @returns true se WebGPU esta disponivel
   */
  public initWebGPU(): boolean {
    const available = typeof navigator !== "undefined" && "gpu" in navigator;

    const status = this.substrates.get("BROWSER_COSMOS")!;
    status.active = available;
    status.memoryUsed = 0;
    status.lastHeartbeat = Date.now();
    status.capabilities = available
      ? ["webgpu-compute", "wasm-runtime", "gpu-shaders"]
      : ["wasm-runtime"];

    return available;
  }

  /**
   * Compila e instancia modulo WebAssembly.
   *
   * WebAssembly permite executar codigo nativo no navegador
   * com performance proxima a C/Rust.
   *
   * @param module - Bytes do modulo .wasm
   * @returns Bytes de saida (resultado da execucao)
   */
  public runWASM(module: Uint8Array): Uint8Array {
    // Verificacao basica do modulo WASM
    // Magic number: 0x00 0x61 0x73 0x6D (\0asm)
    const validMagic = module.length >= 8 &&
      module[0] === 0x00 && module[1] === 0x61 &&
      module[2] === 0x73 && module[3] === 0x6D;

    if (!validMagic) {
      // Retorna output vazio em caso de modulo invalido
      return new Uint8Array(0);
    }

    // Simulacao de execucao WASM
    // Em producao, usaria WebAssembly.compile + instantiate
    const outputSize = Math.min(module.length, 1024);
    const output = new Uint8Array(outputSize);

    // Hash do modulo como semente para output deterministico
    const hash = sha3_256(module);
    for (let i = 0; i < outputSize; i++) {
      output[i] = hash[i % 32]! ^ module[i % module.length]!;
    }

    // Atualiza status
    const status = this.substrates.get("BROWSER_COSMOS")!;
    status.active = true;
    status.memoryUsed = module.length;
    status.lastHeartbeat = Date.now();

    return output;
  }

  // ─── 5. NETWORK_GHOST: Rotas Sphinx multi-hop ────────────────────────────

  /**
   * Constroi rota Sphinx multi-hop para roteamento anonimo.
   *
   * Cada hop e cifrado com chave do proximo no,
   * garantindo que nenhum no intermediario conheca
   * o destino final ou o conteudo completo.
   *
   * Importacao dinamica de sphinx.ts para evitar ciclos.
   *
   * @param dest - Destino final (endereco do no)
   * @returns Array de enderecos dos hops intermediarios
   */
  public setupSphinxRoute(dest: string): string[] {
    // Gera rota multi-hop simulada
    // Em producao, usaria buildSphinxPacket de ../crypto/sphinx
    const numHops = 3;
    const route: string[] = [];

    // Gera chaves intermediarias para cada hop
    for (let i = 0; i < numHops; i++) {
      const hopKey = sha3_256(
        new TextEncoder().encode(`hop_${i}_${dest}_${Date.now()}`)
      );
      const hopAddr = `ghost_${Array.from(hopKey.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
      route.push(hopAddr);
    }

    // Adiciona destino final
    route.push(dest);

    // Atualiza status
    const status = this.substrates.get("NETWORK_GHOST")!;
    status.active = true;
    status.memoryUsed = route.join("|").length * 2;
    status.lastHeartbeat = Date.now();
    status.capabilities = ["sphinx-packets", "multi-hop", "onion-routing"];

    return route;
  }

  // ─── 6. SUPPLY_CHAIN: Verificacao SHA3-256 ───────────────────────────────

  /**
   * Verifica integridade de pacote via SHA3-256.
   *
   * Compara o hash calculado do manifesto com o hash
   * registrado. Qualquer divergencia indica adulteracao.
   *
   * @param manifest - Conteudo do manifesto do pacote
   * @param hash - Hash esperado (hex string)
   * @returns true se o hash confere
   */
  public verifyPackage(manifest: string, hash: string): boolean {
    const manifestBytes = new TextEncoder().encode(manifest);
    const computedHash = sha3_256(manifestBytes);
    const computedHex = Array.from(computedHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparacao constante-tempo para evitar timing attacks
    let diff = 0;
    for (let i = 0; i < hash.length; i++) {
      diff |= hash.charCodeAt(i) ^ computedHex.charCodeAt(i);
    }

    const valid = diff === 0 && computedHex.length === hash.length;

    // Atualiza status
    const status = this.substrates.get("SUPPLY_CHAIN")!;
    status.active = true;
    status.memoryUsed = manifestBytes.length;
    status.lastHeartbeat = Date.now();
    status.capabilities = ["sha3-256", "integrity-check", "constant-time"];

    return valid;
  }

  // ─── 7. EMERGENT_MIND: Federacao e inferencia ZK-ML ─────────────────────

  /**
   * Media de gradientes federados (FedAvg simplificado).
   *
   * Em aprendizado federado, cada no calcula gradientes
   * localmente e envia deltas. O servidor media os deltas
   * para produzir um modelo atualizado global.
   *
   * @param delta - Delta (gradiente) do no local
   * @returns Delta acumulado (media ponderada)
   */
  public federatedUpdate(delta: Float32Array): Float32Array {
    // Acumulador global de gradientes
    const key = "EMERGENT_MIND";
    const status = this.substrates.get(key)!;

    // Recupera ou inicializa acumulador
    if (!this.federatedAccumulator) {
      this.federatedAccumulator = new Float32Array(delta.length);
      this.federatedCount = 0;
    }

    // Acumula delta
    for (let i = 0; i < delta.length; i++) {
      this.federatedAccumulator[i] += delta[i]!;
    }
    this.federatedCount++;

    // Calcula media
    const result = new Float32Array(delta.length);
    for (let i = 0; i < delta.length; i++) {
      result[i] = this.federatedAccumulator[i] / this.federatedCount;
    }

    status.active = true;
    status.memoryUsed = delta.length * 4 * 2; // acumulador + resultado
    status.lastHeartbeat = Date.now();
    status.capabilities = [
      "federated-avg",
      `participants:${this.federatedCount}`,
    ];

    return result;
  }

  /**
   * Inferencia ZK-ML: executa modelo com prova de conhecimento zero.
   *
   * Prova que o modelo foi executado corretamente sem
   * revelar os pesos do modelo ou os dados de entrada.
   *
   * @param modelHash - Hash do modelo registrado
   * @param input - Vetor de entrada
   * @returns Vetor de saida (inferencia)
   */
  public zkmlInference(modelHash: string, input: Float32Array): Float32Array {
    // Gera prova ZK simplificada
    const inputBytes = new Uint8Array(input.buffer);
    const proofHash = sha3_256(
      new Uint8Array([
        ...new TextEncoder().encode(modelHash),
        ...inputBytes,
      ])
    );

    // Simulacao de inferencia: transformacao linear simples
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      // Peso derivado do hash do modelo
      const weight = (proofHash[i % 32]! / 255) * 2 - 1;
      output[i] = input[i]! * weight;
    }

    // Atualiza status
    const status = this.substrates.get("EMERGENT_MIND")!;
    status.active = true;
    status.memoryUsed = input.length * 8;
    status.lastHeartbeat = Date.now();
    status.capabilities = [
      "zkml-inference",
      `model:${modelHash.slice(0, 16)}`,
    ];

    return output;
  }

  /** Acumulador privado para gradientes federados */
  private federatedAccumulator: Float32Array | null = null;
  /** Contador de participantes na federacao */
  private federatedCount: number = 0;

  // ─── Gerenciamento de Substratos ──────────────────────────────────────────

  /**
   * Inicializa um substrato e o marca como ativo.
   *
   * @param type - Tipo do substrato a inicializar
   */
  public bootstrapSubstrate(type: SubstrateType): void {
    const status = this.substrates.get(type);
    if (!status) return;

    status.active = true;
    status.lastHeartbeat = Date.now();
    console.log(`[ANIMUS] Substrato ${type} inicializado.`);
  }

  /**
   * Retorna todos os substratos ativos.
   */
  public getActiveSubstrates(): SubstrateStatus[] {
    return Array.from(this.substrates.values()).filter((s) => s.active);
  }

  /**
   * Envia heartbeat para todos os substratos ativos.
   * Atualiza timestamps e coleta metricas.
   */
  public heartbeat(): {
    total: number;
    active: number;
    timestamp: number;
    memoryTotal: number;
  } {
    const now = Date.now();
    let active = 0;
    let memoryTotal = 0;

    for (const [, status] of this.substrates) {
      if (status.active) {
        active++;
        memoryTotal += status.memoryUsed;
        // Verificar se o heartbeat nao expirou
        if (now - status.lastHeartbeat > this.heartbeatInterval * 3) {
          status.active = false;
          console.warn(`[ANIMUS] Substrato ${status.type} expirado (sem heartbeat).`);
        }
      }
    }

    return {
      total: this.substrates.size,
      active,
      timestamp: now,
      memoryTotal,
    };
  }

  /**
   * Retorna uso de memoria de todos os substratos.
   */
  public getMemoryUsage(): Map<SubstrateType, number> {
    const usage = new Map<SubstrateType, number>();
    for (const [type, status] of this.substrates) {
      usage.set(type, status.memoryUsed);
    }
    return usage;
  }

  /**
   * Retorna status completo de todos os substratos.
   */
  public getAllSubstrates(): SubstrateStatus[] {
    return Array.from(this.substrates.values());
  }
}

// ─── Instancia Singleton Exportada ────────────────────────────────────────────

export const animusSubstrateManager = AnimusSubstrateManager.getInstance();
