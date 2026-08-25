/**
 * ANIMUS Engine — Steganographic Parasitism Layer
 * 
 * Resolve o dilema da visibilidade: como transportar shards sem que 
 * firewalls ou ISPs identifiquem o tráfego VØID?
 * 
 * Estratégia: Esteganografia Computacional Profunda.
 * 1. IMAGE_LSB: Esconde shards nos bits menos significativos de imagens PNG/WebP.
 * 2. LLM_PERTURBATION: Esconde shards em matrizes de pesos de IA (espaço nulo).
 */

export interface StegoResult {
  carrierId: string;
  data: Uint8Array;
  capacity: number;
  noiseLevel: number;
}

/**
 * LSB Steganography: Esconde dados em um array de pixels (RGBA).
 * 
 * Cada byte de dado é espalhado por 8 pixels (1 bit por pixel no canal Alpha ou Azul).
 */
export function hideInPixels(pixelData: Uint8ClampedArray, shardData: Uint8Array): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData);
  
  // Header: 4 bytes para o tamanho do dado
  const header = new Uint32Array([shardData.length]);
  const headerBytes = new Uint8Array(header.buffer);
  const fullData = new Uint8Array(headerBytes.length + shardData.length);
  fullData.set(headerBytes);
  fullData.set(shardData, headerBytes.length);

  if (fullData.length * 8 > pixelData.length) {
    throw new Error("Capacidade da imagem insuficiente para o shard.");
  }

  for (let i = 0; i < fullData.length; i++) {
    const byte = fullData[i] || 0;
    for (let bit = 0; bit < 8; bit++) {
      const pixelIdx = (i * 8 + bit) * 4 + 2; // Usa o canal Blue (menos perceptível)
      const bitValue = (byte >> bit) & 1;
      
      // Ajusta o bit menos significativo
      result[pixelIdx] = (result[pixelIdx] & 0xFE) | bitValue;
    }
  }

  return result;
}

/**
 * Extrai dados escondidos em pixels via LSB.
 */
export function extractFromPixels(pixelData: Uint8ClampedArray): Uint8Array {
  // Extrai header (4 bytes)
  const headerBytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      const pixelIdx = (i * 8 + bit) * 4 + 2;
      const bitValue = pixelData[pixelIdx] & 1;
      byte |= (bitValue << bit);
    }
    headerBytes[i] = byte;
  }

  const dataLength = new Uint32Array(headerBytes.buffer)[0] || 0;
  if (dataLength === 0 || dataLength > pixelData.length / 8) {
    throw new Error("Nenhum dado VØID detectado na imagem.");
  }

  const result = new Uint8Array(dataLength);
  for (let i = 0; i < dataLength; i++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      const pixelIdx = ((i + 4) * 8 + bit) * 4 + 2;
      const bitValue = pixelData[pixelIdx] & 1;
      byte |= (bitValue << bit);
    }
    result[i] = byte;
  }

  return result;
}

/**
 * LLM Null-Space Embedding (Simulado):
 * Esconde shards em uma matriz de pesos de uma camada de IA.
 * 
 * A ideia é que pequenas variações (ruído) em modelos de bilhões de 
 * parâmetros são estatisticamente indistinguíveis de erros de quantização.
 */
export function embedInWeights(weights: Float32Array, shardData: Uint8Array): Float32Array {
  const result = new Float32Array(weights);
  
  // Converte shardData para bits
  for (let i = 0; i < shardData.length; i++) {
    const byte = shardData[i] || 0;
    for (let bit = 0; bit < 8; bit++) {
      const weightIdx = i * 8 + bit;
      if (weightIdx >= weights.length) break;

      // Adiciona um ruído ínfimo determinístico baseado no bit
      // Se bit=1, adiciona 1e-7; se bit=0, subtrai 1e-7
      const bitValue = (byte >> bit) & 1;
      const perturbation = bitValue === 1 ? 1e-7 : -1e-7;
      
      result[weightIdx] += perturbation;
    }
  }

  return result;
}

/**
 * Detecta e extrai shards de "pesos infectados".
 * Exige a matriz original (ou um hash diferencial) para reconstruir.
 */
export function recoverFromWeights(infectedWeights: Float32Array, originalWeights: Float32Array, length: number): Uint8Array {
  const result = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit++) {
      const idx = i * 8 + bit;
      const infected = infectedWeights[idx] || 0;
      const original = originalWeights[idx] || 0;
      const diff = infected - original;
      
      if (diff > 0) byte |= (1 << bit);
    }
    result[i] = byte;
  }

  return result;
}
