/**
 * STARK-Locked Compute Channel (SLCC) — PMU §3.7
 *
 * Pagamento Lightning quadro-a-quadro liberado só com prova STARK recursiva válida.
 */

import { assertOperationAllowed } from "./consentLattice";
import { consentReceiptStore } from "./consentReceiptStore";
import { RecursiveSTARK, type StarkProof } from "./recursiveStark";
import { vHGPUClient } from "./vhgpuClient";

import type { HgpuResearchMetrics } from "../../research/hgpuResearch";

export interface SlccFrameResult {
  coeffs: HgpuResearchMetrics;
  proof: StarkProof;
  microPaymentHash: string;
}

export class SLCCChannel {
  private prevProof: StarkProof | null = null;

  /**
   * Solicita compute verificável a um worker; libera micro-pagamento se a prova compõe na cadeia.
   */
  async requestFrame(
    proofsConcat: Uint8Array,
    singleProofSize = 64,
  ): Promise<SlccFrameResult> {
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "webgpu_compute");
    assertOperationAllowed(consentReceiptStore.getMaxLevel(), "nwc_payment");

    const { metrics } = await vHGPUClient.runFrame(64);
    const proof = await RecursiveSTARK.compose(proofsConcat, singleProofSize);

    if (!RecursiveSTARK.verify(proof, this.prevProof)) {
      throw new Error("SLCC: prova STARK recursiva inválida");
    }

    this.prevProof = proof;
    const microPaymentHash = RecursiveSTARK.hash(proof);

    return {
      coeffs: metrics,
      proof,
      microPaymentHash,
    };
  }

  resetChain(): void {
    this.prevProof = null;
  }
}

export const slccChannel = new SLCCChannel();
