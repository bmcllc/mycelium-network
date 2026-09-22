//! `mycelium-zkp` — primitivas criptográficas / zero‑knowledge nativas,
//! portadas de **ET‑COSMIC‑OLD / `void_core/src/lib.rs`**.
//!
//! Sempre offline (features desabilitadas):
//! - [`hash_chronicle`] — feed causal sem relógio (blake3).
//! - [`pedersen_commit`] / [`pedersen_open`] / [`pedersen_commit_random`]
//!   — commitment de Pedersen sobre Ed25519 (Vault/Entropy).
//! - [`ghost_id`] — identidade Ed25519 `hydra_◆_{hex}`.
//! - [`hashcash`] — PoW SHA3 anti‑Sybil.
//!
//! Features (network):
//! - `range-proof`: Bulletproofs prove_single + agregador Merkle/FRI.
//! - `license`: VOID-00 handshake licença comercial (ML-DSA-87 + device binding).
//! - `bolt11`: BOLT11 Lightning invoice parsing (para voucher economy).

use blake3::Hasher as Blake3;
use curve25519_dalek::constants::ED25519_BASEPOINT_POINT;
use curve25519_dalek::scalar::Scalar;
use rand_core::{OsRng, RngCore};
use sha3::{Digest, Sha3_256, Sha3_512};

// ─── 1. HASH CHRONICLES — consenso causal sem relógio (blake3) ────────────────
//
// Fiel a `create_hash_chronicle`: pais (32 B cada, concatenados) ➜ payload.
// NOTE: void_core NÃO adiciona domínio ao HashChronicle (apenas pais+payload);
// o domínio "void-stark-fri-domain-v8" é exclusivo do agregador FRI.

/// Chronicle: raiz causal de `payload` dado `parents` (blake3).
pub fn hash_chronicle(payload: &[u8], parents: &[[u8; 32]]) -> [u8; 32] {
    let mut h = Blake3::new();
    for p in parents {
        h.update(p);
    }
    h.update(payload);
    let mut out = [0u8; 32];
    out.copy_from_slice(h.finalize().as_bytes());
    out
}

#[cfg(test)]
mod chronicle_tests {
    use super::hash_chronicle;

    fn p(s: &str) -> [u8; 32] {
        let mut a = [0u8; 32];
        a[..s.len()].copy_from_slice(s.as_bytes());
        a
    }

    #[test]
    fn deterministico() {
        let a = hash_chronicle(b"ping", &[]);
        assert_eq!(a, hash_chronicle(b"ping", &[]));
    }

    #[test]
    fn causa_e_efeito_ordem() {
        let pais = [p("alpha"), p("beta")];
        let base = hash_chronicle(b"x", &pais);
        assert_ne!(base, hash_chronicle(b"y", &pais)); // payload
        assert_ne!(base, hash_chronicle(b"x", &[pais[1], pais[0]])); // ordem causal
    }
}

// ─── 2. PEDERSEN COMMITMENTS — C = r·G + v·H (esconde o valor) ────────────────
//
// G = ED25519_BASEPOINT_POINT; H = G · from_bytes_mod_order_wide(
//   SHA3-512("hydra-pedersen-H-generator-v8"))  (nothing‑up‑my‑sleeve).
// Fiel a `get_h_generator`/`create_pedersen_commitment` de void_core.

fn pedersen_h_point() -> curve25519_dalek::edwards::EdwardsPoint {
    // Audit fix: generate independent generator H where discrete log log_G(H) is unknown (nothing-up-my-sleeve).
    // Uses hash-to-curve with domain separation by finding the first valid curve point from SHA3-256
    // and multiplying by the curve cofactor to clear small-order components.
    for counter in 0u32..1000 {
        let mut h = Sha3_256::new();
        h.update(b"mycelium-veil-pedersen-H-generator-v1");
        h.update(counter.to_be_bytes());
        let digest: [u8; 32] = h.finalize().into();
        let compressed = curve25519_dalek::edwards::CompressedEdwardsY(digest);
        if let Some(pt) = compressed.decompress() {
            let cleared = pt.mul_by_cofactor();
            if !cleared.is_small_order() {
                return cleared;
            }
        }
    }
    panic!("Failed to derive independent Pedersen H generator");
}

/// Commitment: C = r·G + v·H (blinding fornecido pelo caller).
pub fn pedersen_commit(value: u64, blinding: [u8; 32]) -> [u8; 32] {
    let r = Scalar::from_bytes_mod_order(blinding);
    let v = Scalar::from(value);
    let h = pedersen_h_point();
    let c = (ED25519_BASEPOINT_POINT * r) + (h * v);
    c.compress().to_bytes()
}

/// Commitment com blinding aleatório (paridade a `create_pedersen_commitment`).
pub fn pedersen_commit_random(value: u64) -> ([u8; 32], [u8; 32]) {
    let mut blind = [0u8; 32];
    OsRng.fill_bytes(&mut blind);
    (pedersen_commit(value, blind), blind)
}

/// Abre/revela: recompõe C e compara.
pub fn pedersen_open(commitment: &[u8; 32], value: u64, blinding: [u8; 32]) -> bool {
    pedersen_commit(value, blinding) == *commitment
}

#[cfg(test)]
mod pedersen_tests {
    use super::*;

    #[test]
    fn roundtrip_e_abierto() {
        let blind = [0xABu8; 32];
        let cm = pedersen_commit(42, blind);
        assert!(pedersen_open(&cm, 42, blind));
        assert!(!pedersen_open(&cm, 43, blind));
        let mut bad = blind;
        bad[0] ^= 0xFF;
        assert!(!pedersen_open(&cm, 42, bad));
    }

    #[test]
    fn random_e_aberto() {
        let (cm, blind) = pedersen_commit_random(123456789);
        assert!(pedersen_open(&cm, 123456789, blind));
        assert!(!pedersen_open(&cm, 0, blind));
    }
}

// ─── 3. GHOST IDENTITY (Ed25519) — handle "hydra_◆_{hex}" ─────────────────────
// Fiel a `derive_ghost_id` ("void-ghost-id-v8"; hex minúsculo).

/// Deriva (pubkey, secret, handle) `hydra_◆_{hex8}` a partir de entropia.
pub fn ghost_id(entropy: &[u8]) -> ([u8; 32], [u8; 32], String) {
    let mut h = Sha3_512::new();
    h.update(b"void-ghost-id-v8");
    h.update(entropy);
    let derived_seed = h.finalize();
    let secret = Scalar::from_bytes_mod_order_wide(derived_seed.as_slice().try_into().unwrap());
    let public = ED25519_BASEPOINT_POINT * secret;
    let pub_bytes = public.compress().to_bytes();

    let handle_hash = Sha3_256::digest(pub_bytes);
    let handle = format!("hydra_◆_{}", hex::encode(&handle_hash[0..8]));
    (pub_bytes, secret.to_bytes(), handle)
}

#[cfg(test)]
mod ghost_tests {
    use super::ghost_id;

    #[test]
    fn formato_deterministico() {
        let (pk, sk, h) = ghost_id(b"seed-exemplo");
        assert!(h.starts_with("hydra_◆_"), "handle: {h}");
        assert_eq!(h.chars().count(), 24, "8 do prefixo + 16 hex (8 bytes)");
        let (pk2, _, h2) = ghost_id(b"seed-exemplo");
        assert_eq!(pk, pk2);
        assert_eq!(h, h2);
        let (_, sk2, _) = ghost_id(b"outro-seed");
        assert_ne!(sk, sk2);
    }
}

// ─── 4. HASHCASH PoW — anti-Sybil (SHA3, sem VDF bigint) ─────────────────────

/// Verdade se `digest` tem `zero_bits` leading bits a zero.
pub fn hashcash_check(digest: &[u8], zero_bits: u8) -> bool {
    if zero_bits == 0 {
        return true;
    }
    let full = (zero_bits / 8) as usize;
    let len = digest.len();
    if len < full.max(1) {
        return false;
    }
    for &b in &digest[..full] {
        if b != 0 {
            return false;
        }
    }
    if !zero_bits.is_multiple_of(8) && len > full {
        let mask = 0xFFu8 << (8 - (zero_bits % 8));
        if (digest[full] & mask) != 0 {
            return false;
        }
    }
    true
}

/// Prova verificável anti-Sybil de Hashcash PoW ligando trabalho ao recurso.
#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct HashcashProof {
    pub resource: Vec<u8>,
    pub nonce: u64,
    pub zero_bits: u8,
    pub digest: [u8; 32],
}

impl HashcashProof {
    /// Verifica se a prova é válida para um recurso esperado e dificuldade mínima.
    pub fn verify(&self, expected_resource: &[u8], min_zero_bits: u8) -> bool {
        if self.resource != expected_resource || self.zero_bits < min_zero_bits {
            return false;
        }
        let mut h = Sha3_256::new();
        h.update(&self.resource);
        h.update(self.nonce.to_be_bytes());
        let computed: [u8; 32] = h.finalize().into();
        computed == self.digest && hashcash_check(&self.digest, self.zero_bits)
    }
}

/// SHA3-256 hashcash: nonce tal que digest(resource ‖ nonce) tem
/// `zero_bits` leading bits a zero. (Mantido por compatibilidade legada, devolve digest.)
pub fn hashcash_mint(resource: &[u8], zero_bits: u8) -> Vec<u8> {
    hashcash_mint_proof(resource, zero_bits).digest.to_vec()
}

/// Gera uma prova verificável HashcashProof ligando o trabalho ao recurso.
pub fn hashcash_mint_proof(resource: &[u8], zero_bits: u8) -> HashcashProof {
    assert!(zero_bits <= 24, "zero_bits <= 24 p/ mint rápido");
    let mut nonce = 0u64;
    loop {
        let mut h = Sha3_256::new();
        h.update(resource);
        h.update(nonce.to_be_bytes());
        let d = h.finalize();
        if hashcash_check(&d, zero_bits) {
            let mut digest = [0u8; 32];
            digest.copy_from_slice(&d);
            return HashcashProof {
                resource: resource.to_vec(),
                nonce,
                zero_bits,
                digest,
            };
        }
        nonce += 1;
        if nonce == u64::MAX {
            panic!("nonce esgotado");
        }
    }
}

/// Verifica uma prova Hashcash de forma autônoma.
pub fn hashcash_verify_proof(proof: &HashcashProof, expected_resource: &[u8], min_zero_bits: u8) -> bool {
    proof.verify(expected_resource, min_zero_bits)
}

#[cfg(test)]
mod hashcash_tests {
    use super::{hashcash_check, hashcash_mint, hashcash_mint_proof, hashcash_verify_proof};
    use sha3::{Digest, Sha3_256};

    #[test]
    fn mint_e_verifica_8bits() {
        let minted = hashcash_mint(b"recurso-x", 8);
        assert_eq!(minted.len(), 32);
        assert!(hashcash_check(&minted, 8));
        let d = Sha3_256::digest(b"algo-totalmente-outro");
        assert!(!hashcash_check(&d, 8));
    }

    #[test]
    fn verifiable_proof_binds_resource_and_nonce() {
        let proof = hashcash_mint_proof(b"auth:session:123", 10);
        assert!(hashcash_verify_proof(&proof, b"auth:session:123", 10));
        assert!(hashcash_verify_proof(&proof, b"auth:session:123", 8));
        // Recurso trocado deve falhar
        assert!(!hashcash_verify_proof(&proof, b"auth:session:999", 10));
        // Dificuldade maior que o trabalho computado deve falhar
        assert!(!hashcash_verify_proof(&proof, b"auth:session:123", 24));
    }
}

// ─── FASE 2: BULLETPROOFS + ZK-STARK (feature `range-proof`) ──────────────────
//
// Port nativo de `void_core` (`create_range_proof`, `verify_range_proof`,
// `aggregate_zk_proofs`). Versões lockadas do void_core:
//   bulletproofs =4.0.0, curve25519-dalek-ng =4.1.1, merlin =3.0.0.
// Fora de feature → stub documental (não atrai deps pesadas no build default).

#[cfg(not(feature = "range-proof"))]
#[allow(dead_code)]
pub mod range_proof {
    /// Prova de faixa (Bulletproofs). Habilite a feature `range-proof`
    /// (`cargo test -p mycelium-zkp --features range-proof`).
    pub fn prove_range(_value: u64) -> Vec<u8> {
        unimplemented!("habilite a feature `range-proof` (dep: bulletproofs 4.0.0)")
    }
    /// Verifica prova de faixa. Habilite a feature `range-proof`.
    pub fn verify_range(_proof: &[u8], _commitment: &[u8]) -> bool {
        unimplemented!("habilite a feature `range-proof` (dep: bulletproofs 4.0.0)")
    }
}

#[cfg(feature = "range-proof")]
#[allow(clippy::needless_range_loop, clippy::many_single_char_names)]
pub mod range_proof {
    use curve25519_dalek_ng::ristretto::CompressedRistretto as NgCompressedRistretto;
    use curve25519_dalek_ng::scalar::Scalar as NgScalar;

    use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
    use merlin::Transcript;

    /// Prova de faixa Bulletproofs (void_core: `create_range_proof`).
    #[derive(Clone)]
    pub struct RangeProofResult {
        pub proof: Vec<u8>,
        pub commitment: Vec<u8>, // CompressedRistretto
    }

    pub fn prove_range(value: u64, blinding_factor: &[u8]) -> RangeProofResult {
        let pc_gens = PedersenGens::default();
        let bp_gens = BulletproofGens::new(64, 1);
        let mut transcript = Transcript::new(b"void-range-proof-v8");

        let mut blinding = [0u8; 32];
        if blinding_factor.len() == 32 {
            blinding.copy_from_slice(blinding_factor);
        }
        let blinding_scalar = NgScalar::from_bytes_mod_order(blinding);

        let (proof, commitment) = RangeProof::prove_single(
            &bp_gens,
            &pc_gens,
            &mut transcript,
            value,
            &blinding_scalar,
            32, // 32-bit range: amount até ~4.29B
        )
        .expect("range proof generation failed");

        RangeProofResult {
            proof: proof.to_bytes(),
            commitment: commitment.to_bytes().to_vec(),
        }
    }

    /// Verifica prova de faixa (`.void_core` `verify_range_proof`).
    pub fn verify_range(proof_bytes: &[u8], commitment_bytes: &[u8]) -> bool {
        let pc_gens = PedersenGens::default();
        let bp_gens = BulletproofGens::new(64, 1);
        let mut transcript = Transcript::new(b"void-range-proof-v8");

        let proof = match RangeProof::from_bytes(proof_bytes) {
            Ok(p) => p,
            Err(_) => return false,
        };

        let mut comm_bytes = [0u8; 32];
        if commitment_bytes.len() == 32 {
            comm_bytes.copy_from_slice(commitment_bytes);
        } else {
            return false;
        }
        let commitment = match NgCompressedRistretto(comm_bytes).decompress() {
            Some(c) => c,
            None => return false,
        };
        proof
            .verify_single(&bp_gens, &pc_gens, &mut transcript, &commitment.compress(), 32)
            .is_ok()
    }
}

#[cfg(all(test, feature = "range-proof"))]
mod range_proof_tests {
    use super::range_proof::{prove_range, verify_range};

    #[test]
    fn prove_and_verify_roundtrip() {
        let r = prove_range(100, &[1u8; 32]);
        assert!(verify_range(&r.proof, &r.commitment));
        // commitment ou valor trocado → falha
        let r2 = prove_range(101, &[1u8; 32]);
        assert!(!verify_range(&r2.proof, &r.commitment));
    }
}

// ─── FEATURE: LICENSE (VOID-00 ML-DSA-87 + device binding) ───────────────────

#[cfg(feature = "license")]
pub mod license;

// ─── FEATURE: BOLT11 (Lightning invoice parsing) ─────────────────────────────

#[cfg(feature = "bolt11")]
pub mod bolt11;
