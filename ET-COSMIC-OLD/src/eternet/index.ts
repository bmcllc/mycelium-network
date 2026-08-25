/**
 * @module eternet
 * Camada unificada ETERNET — Bruno Theory + LUSUS + void_core (sem hype quântico).
 */

export {
  getEternetEngineMode,
  isEternetEntropyEnabled,
  ETERNET_API_BASE,
} from "./config";
export {
  generateEternetEntropy,
  eternetToQuantumEntropy,
} from "./entropy";
export { ETERNET_DISCLAIMER, type EternetEntropyResult, type EternetEngineMode } from "./types";
