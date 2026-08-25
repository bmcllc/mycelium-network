/**
 * Tipos públicos da camada ETERNET — rede eterna / soberana sem emulação quântica enganosa.
 */

export type EternetEngineMode = "hybrid" | "bruno" | "lusus" | "legacy";

export interface EternetEntropyResult {
  entropy_hex: string;
  sha3_256: string;
  bits: number;
  source: "eternet";
  sources: string[];
  n_measurements: number;
  method: "bruno_theory_frame" | "lusus_chaos_bell" | "device_csprng" | "eternet_hybrid";
  simulation: true;
  quantum_verified: false;
  bruno?: {
    version: string;
    resolution: number;
    dtuCoherence?: number;
    rcpFinalEnergy?: number;
  };
  lusus?: {
    correlation?: number;
    simulatedS?: number;
  };
  disclaimer: string;
}

export const ETERNET_DISCLAIMER =
  "ETERNET: entropia por Bruno Theory + LUSUS clássico + CSPRNG. Não é QRNG de laboratório.";
