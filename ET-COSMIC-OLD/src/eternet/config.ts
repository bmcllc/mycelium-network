/**
 * Configuração ETERNET — motor de entropia e APIs.
 */

import type { EternetEngineMode } from "./types";

const raw = (import.meta.env.VITE_ETERNET_ENGINE as string | undefined)?.toLowerCase();

export function getEternetEngineMode(): EternetEngineMode {
  if (raw === "legacy" || raw === "bruno" || raw === "lusus" || raw === "hybrid") {
    return raw;
  }
  return "hybrid";
}

export function isEternetEntropyEnabled(): boolean {
  return getEternetEngineMode() !== "legacy";
}

export const ETERNET_API_BASE =
  import.meta.env.VITE_ETERNET_API_URL ?? "/api/eternet";
