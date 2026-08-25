/**
 * ZK-STARK Research — RecursiveSTARK + EcoNet (PMU §3.7 / VSC)
 */

import { consentContract } from "../ethics/consentContract";
import { compressState, type CompressedState } from "../crypto/zkCompressor";
import type { RangeProofLike } from "../crypto/zkCompressor";
import { RecursiveSTARK } from "../protocol/amp/recursiveStark";

export interface ZkResearchResult {
  compressed: CompressedState;
  starkRecursive: true;
  recursiveProof: Awaited<ReturnType<typeof RecursiveSTARK.compose>> | null;
  disclaimer: string;
}

export async function runZkMerkleResearch(
  utxoIds: string[],
  proofs: RangeProofLike[],
): Promise<ZkResearchResult> {
  consentContract.requireConsent("ZK_STARK_RESEARCH");

  const compressed = compressState(utxoIds, proofs);

  let recursiveProof = null;
  if (proofs.length > 0) {
    const concat = new Uint8Array(
      proofs.reduce((n, p) => n + p.proof.length + p.commitment.length, 0),
    );
    let off = 0;
    for (const p of proofs) {
      concat.set(p.proof, off);
      off += p.proof.length;
      concat.set(p.commitment, off);
      off += p.commitment.length;
    }
    recursiveProof = await RecursiveSTARK.compose(concat, 64);
  }

  return {
    compressed,
    starkRecursive: true,
    recursiveProof,
    disclaimer:
      "VSC: Bulletproofs + composição RecursiveSTARK (void_core). Sem consenso global — verificação local O(log N).",
  };
}
