/**
 * EIM/EIL — Ephemeral Identity Lattice (PMU §3.1, Listing 1)
 *
 * Implementação prática sobre ghostid + WASM.
 * Sem reconhecimento biométrico — apenas entropia de sensores.
 */

import { assertOperationAllowed } from "./consentLattice";
import { consentReceiptStore } from "./consentReceiptStore";
import {
  collectBiometricEntropy,
  spawnGhostId,
  destroyGhostId,
  type GhostIdentity,
  type SpawnProgress,
} from "../../crypto/ghostid";

export interface SensorEntropy {
  accelerometerVariance: Float64Array;
  microphoneNoiseFloor: Float64Array;
  touchTimingDelta: Float64Array;
}

/** Extrai entropia no formato PMU a partir da coleta existente. */
export async function collectSensorEntropy(): Promise<SensorEntropy> {
  assertOperationAllowed(consentReceiptStore.getMaxLevel(), "spawn_identity");
  const bio = await collectBiometricEntropy();
  return {
    accelerometerVariance: Float64Array.from(bio.accelerometerPattern),
    microphoneNoiseFloor: new Float64Array(bio.microphoneNoise),
    touchTimingDelta: new Float64Array(bio.keystrokeDynamics),
  };
}

export async function generateIdentity(
  onProgress?: (p: SpawnProgress) => void,
): Promise<GhostIdentity> {
  assertOperationAllowed(consentReceiptStore.getMaxLevel(), "spawn_identity");
  return spawnGhostId(onProgress);
}

export function destroyIdentity(id: GhostIdentity): void {
  destroyGhostId(id);
}
