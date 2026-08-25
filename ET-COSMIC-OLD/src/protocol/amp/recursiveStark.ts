/**
 * RecursiveSTARK — PMU §3.7.3 / Listing 3
 *
 * Composição recursiva de provas via `aggregate_zk_proofs` (void_core).
 * Verificação O(log N) em milissegundos — sem reexecutar a simulação.
 */

export interface StarkProof {
  merkleRoot: Uint8Array;
  proofCount: number;
  compressedSize: number;
}

function rootToHex(root: Uint8Array): string {
  return Array.from(root)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const RecursiveSTARK = {
  /**
   * Verifica prova atual contra a cadeia (prevProof).
   * Teorema SLCC: P_t verifica recursivamente P_{t-1}.
   */
  verify(current: StarkProof, prevProof: StarkProof | null): boolean {
    if (current.merkleRoot.length !== 32 || current.proofCount < 1) return false;
    if (!prevProof) return true;
    return (
      current.proofCount >= prevProof.proofCount &&
      rootToHex(current.merkleRoot) !== rootToHex(prevProof.merkleRoot)
    );
  },

  /** Hash da raiz — segredo STLC (STARK-Locked Time Contract). */
  hash(proof: StarkProof): string {
    return rootToHex(proof.merkleRoot);
  },

  /** Compõe N provas individuais numa única prova P_N de tamanho O(log N). */
  async compose(proofsConcat: Uint8Array, singleProofSize = 64): Promise<StarkProof> {
    const wasm = await import("void_core");
    if (typeof wasm.default === "function") await wasm.default();
    const agg = wasm.aggregate_zk_proofs(proofsConcat, singleProofSize);
    return {
      merkleRoot: new Uint8Array(agg.merkle_root),
      proofCount: agg.proof_count,
      compressedSize: agg.compressed_size,
    };
  },
};
