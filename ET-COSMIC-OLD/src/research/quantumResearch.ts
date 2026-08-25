/**
 * Pesquisa quântica — camada honesta sobre quantumBridge.
 * Requer consentimento QUANTUM_SIMULATION.
 */

import { consentContract } from "../ethics/consentContract";
import { generateQuantumEntropy, type QuantumEntropy } from "../crypto/quantumBridge";

export type QuantumMode = "simulated" | "offline_csprng";

export interface QuantumResearchResult extends QuantumEntropy {
  mode: QuantumMode;
  disclaimer: string;
}

const DISCLAIMER =
  "Simulação numérica (quimb/numpy). Não é hardware quântico nem QKD físico.";

export async function fetchResearchEntropy(
  bits = 256,
): Promise<QuantumResearchResult> {
  consentContract.requireConsent("QUANTUM_SIMULATION");

  try {
    const result = await generateQuantumEntropy(bits);
    if (result) {
      return {
        ...result,
        mode: result.quantum_verified ? "simulated" : "offline_csprng",
        disclaimer: DISCLAIMER,
      };
    }
  } catch {
    /* offline abaixo */
  }
  const bytes = new Uint8Array(bits / 8);
  crypto.getRandomValues(bytes);
  const entropy_hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    entropy_hex,
    sha3_256: entropy_hex,
    bits,
    source: "offline_csprng",
    n_measurements: 0,
    quantum_verified: false,
    mode: "offline_csprng",
    disclaimer: DISCLAIMER,
  };
}
