//! **VOID-00 — License Handshake nativo** (ML-DSA-87 + device binding).
//!
//! Port fiel de `ET-COSMIC-OLD/void_core/src/license.rs`.
//! Payload canónico de 121 bytes assinado pelo vendor; o handshake verifica
//! a assinatura ML-DSA-87, binding do dispositivo e janela temporal.
//!
//! Requer feature `license` (dep: `ml-dsa =0.1.0`).

use sha3::{Digest, Sha3_256};

use ml_dsa::signature::Verifier;
use ml_dsa::{EncodedVerifyingKey, MlDsa87, Signature, VerifyingKey};

// ─── Constantes (idênticas ao void_core) ────────────────────────────────────

const MAGIC: &[u8; 8] = b"VOID00LC";
const VERSION: u8 = 1;
pub const DEVICE_ID_LEN: usize = 32;
pub const SKU_HASH_LEN: usize = 32;
pub const LICENSE_ID_LEN: usize = 16;
const NONCE_LEN: usize = 16;
/// 8 + 1 + 32 + 32 + 16 + 8 + 8 + 16 = 121
pub const LICENSE_PAYLOAD_LEN: usize =
    8 + 1 + DEVICE_ID_LEN + SKU_HASH_LEN + LICENSE_ID_LEN + 8 + 8 + NONCE_LEN;

const MLDSA87_VK_BYTES: usize = 2592;
const MLDSA87_SIG_BYTES: usize = 4627;

// ─── Helpers internos ────────────────────────────────────────────────────────

fn sku_hash(sku: &str) -> [u8; 32] {
    let mut h = Sha3_256::new();
    h.update(b"void-00-sku-v1");
    h.update(sku.as_bytes());
    let mut out = [0u8; 32];
    out.copy_from_slice(h.finalize().as_slice());
    out
}

/// SHA3-256("void-00-device-v1" ‖ device_entropy ‖ sku) — ID estável do
/// dispositivo para licenciamento (fiel a `compute_device_id`).
pub fn compute_device_id(device_entropy: &[u8], sku: &str) -> [u8; 32] {
    let mut h = Sha3_256::new();
    h.update(b"void-00-device-v1");
    h.update(device_entropy);
    h.update(sku.as_bytes());
    let mut out = [0u8; 32];
    out.copy_from_slice(h.finalize().as_slice());
    out
}

// ─── Build / Parse do payload canónico (121 bytes) ──────────────────────────

/// Monta payload canónico (emissor / ferramenta de licenciamento).
pub fn build_license_payload(
    device_id: &[u8; 32],
    sku: &str,
    license_id: &[u8; 16],
    not_before: u64,
    not_after: u64,
    nonce: &[u8; 16],
) -> [u8; LICENSE_PAYLOAD_LEN] {
    let sk = sku_hash(sku);
    let mut out = [0u8; LICENSE_PAYLOAD_LEN];
    let mut o = 0;
    out[o..o + 8].copy_from_slice(MAGIC);
    o += 8;
    out[o] = VERSION;
    o += 1;
    out[o..o + 32].copy_from_slice(device_id);
    o += 32;
    out[o..o + 32].copy_from_slice(&sk);
    o += 32;
    out[o..o + 16].copy_from_slice(license_id);
    o += 16;
    out[o..o + 8].copy_from_slice(&not_before.to_le_bytes());
    o += 8;
    out[o..o + 8].copy_from_slice(&not_after.to_le_bytes());
    o += 8;
    out[o..o + 16].copy_from_slice(nonce);
    out
}

/// Estrutura decodificada de um payload VOID-00 (conteúdo canónico).
type ParsedPayload = ([u8; 32], [u8; 32], [u8; 16], u64, u64, [u8; 16]);

fn parse_payload(payload: &[u8]) -> Option<ParsedPayload> {
    if payload.len() != LICENSE_PAYLOAD_LEN || &payload[0..8] != MAGIC || payload[8] != VERSION {
        return None;
    }
    let mut device_id = [0u8; 32];
    let mut sku_h = [0u8; 32];
    let mut license_id = [0u8; 16];
    let mut nonce = [0u8; 16];
    device_id.copy_from_slice(&payload[9..41]);
    sku_h.copy_from_slice(&payload[41..73]);
    license_id.copy_from_slice(&payload[73..89]);
    let not_before = u64::from_le_bytes(payload[89..97].try_into().ok()?);
    let not_after = u64::from_le_bytes(payload[97..105].try_into().ok()?);
    nonce.copy_from_slice(&payload[105..121]);
    Some((device_id, sku_h, license_id, not_before, not_after, nonce))
}

// ─── ML-DSA-87 Verify (nativo, sem wasm_bindgen) ─────────────────────────────

/// Verifica assinatura ML-DSA-87. `public_key` = 2592 bytes, `signature` = 4627 bytes.
/// Retorna `true` se válida (fiel a `mldsa_verify` de void_core/pqc.rs).
pub fn mldsa_verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> bool {
    if public_key.len() != MLDSA87_VK_BYTES || signature.len() != MLDSA87_SIG_BYTES {
        return false;
    }

    let enc_vk = match EncodedVerifyingKey::<MlDsa87>::try_from(public_key) {
        Ok(e) => e,
        Err(_) => return false,
    };
    let vk = VerifyingKey::<MlDsa87>::decode(&enc_vk);

    let sig = match Signature::<MlDsa87>::try_from(signature) {
        Ok(s) => s,
        Err(_) => return false,
    };

    vk.verify(message, &sig).is_ok()
}

// ─── Handshake completo ──────────────────────────────────────────────────────

/// Resultado do handshake VOID-00.
#[derive(Debug, Clone)]
pub struct LicenseHandshakeResult {
    pub ok: bool,
    pub device_id_hex: String,
    pub reason: String,
}

/// Handshake: verifica ML-DSA-87 + binding dispositivo + janela temporal.
pub fn license_verify_handshake(
    vendor_public_key: &[u8],
    device_entropy: &[u8],
    sku: &str,
    license_payload: &[u8],
    signature: &[u8],
    unix_now_secs: u64,
) -> LicenseHandshakeResult {
    let device_id = compute_device_id(device_entropy, sku);
    let device_id_hex = hex::encode(device_id);

    let fail = |reason: &str| LicenseHandshakeResult {
        ok: false,
        device_id_hex: device_id_hex.clone(),
        reason: reason.to_string(),
    };

    let Some((payload_device, payload_sku_h, _license_id, not_before, not_after, _nonce)) =
        parse_payload(license_payload)
    else {
        return fail("payload inválido (magic/versão/tamanho)");
    };

    if payload_device != device_id {
        return fail("device_id não coincide com entropia do dispositivo");
    }

    if payload_sku_h != sku_hash(sku) {
        return fail("SKU do token não coincide");
    }

    if unix_now_secs < not_before {
        return fail("licença ainda não válida (not_before)");
    }
    if unix_now_secs > not_after {
        return fail("licença expirada (not_after)");
    }

    if !mldsa_verify(vendor_public_key, license_payload, signature) {
        return fail("assinatura ML-DSA-87 inválida");
    }

    LicenseHandshakeResult {
        ok: true,
        device_id_hex,
        reason: "ok".to_string(),
    }
}

// ─── Testes ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use ml_dsa::signature::{Keypair, Signer};
    use ml_dsa::{Generate, MlDsa87, SigningKey};

    /// ML-DSA-87 usa matemática polinomial pesada; em debug (sem otimização) o
    /// stack pode estourar. Roda o corpo numa thread com stack sobressalente
    /// para o `cargo test` (debug) também passar.
    fn run_big_stack(f: impl FnOnce() + Send + 'static) {
        std::thread::Builder::new()
            .stack_size(32 * 1024 * 1024)
            .spawn(f)
            .expect("spawn big-stack thread")
            .join()
            .expect("big-stack thread panicked");
    }

    fn test_keygen() -> (SigningKey<MlDsa87>, Vec<u8>) {
        let sk = SigningKey::<MlDsa87>::generate();
        let vk = sk.verifying_key();
        (sk, vk.encode().as_slice().to_vec())
    }

    #[test]
    fn handshake_completo_roundtrip() {
        run_big_stack(|| {
            let (sk, vk_bytes) = test_keygen();
            let device_entropy = b"meu-dispositivo-secreto-32bytes!!";
            let sku = "SKU-A-ENTIDADE-PRO";
            let license_id = [0x42u8; 16];
            let nonce = [0xAAu8; 16];
            let not_before = 1_700_000_000;
            let not_after = 1_900_000_000;

            let device_id = compute_device_id(device_entropy, sku);
            let payload = build_license_payload(&device_id, sku, &license_id, not_before, not_after, &nonce);

            let sig = sk.try_sign(&payload).expect("ML-DSA sign");
            let sig_bytes = sig.encode();
            assert_eq!(sig_bytes.as_slice().len(), MLDSA87_SIG_BYTES);

            let now = 1_800_000_000;
            let r = license_verify_handshake(&vk_bytes, device_entropy, sku, &payload, sig_bytes.as_slice(), now);
            assert!(r.ok, "handshake deve ser ok: {}", r.reason);
            assert_eq!(r.device_id_hex, hex::encode(device_id));
        });
    }

    #[test]
    fn falha_se_expirada() {
        run_big_stack(|| {
            let (sk, vk_bytes) = test_keygen();
            let dev = b"device-entropy-32-bytes-here-ok!!!";
            let sku = "SKU-B";
            let lid = [1u8; 16];
            let nonce = [2u8; 16];
            let device_id = compute_device_id(dev, sku);
            let payload = build_license_payload(&device_id, sku, &lid, 1000, 2000, &nonce);
            let sig = sk.try_sign(&payload).unwrap();
            let sig_b = sig.encode();

            let r = license_verify_handshake(&vk_bytes, dev, sku, &payload, &sig_b, 3000);
            assert!(!r.ok);
            assert!(r.reason.contains("expirada"));
        });
    }

    #[test]
    fn falha_se_device_errado() {
        run_big_stack(|| {
            let (sk, vk_bytes) = test_keygen();
            let dev = b"dispositivo-correto-32-bytes-xxxxx";
            let sku = "SKU-C";
            let lid = [3u8; 16];
            let nonce = [4u8; 16];
            let device_id = compute_device_id(dev, sku);
            let payload = build_license_payload(&device_id, sku, &lid, 0, u64::MAX, &nonce);
            let sig = sk.try_sign(&payload).unwrap();
            let sig_b = sig.encode();

            let wrong_dev = b"dispositivo-INCORRETO-32-bytes!!!";
            let r = license_verify_handshake(&vk_bytes, wrong_dev, sku, &payload, &sig_b, 100);
            assert!(!r.ok);
            assert!(r.reason.contains("device_id"));
        });
    }

    #[test]
    fn falha_se_assinatura_errada() {
        run_big_stack(|| {
            let (_sk, vk_bytes) = test_keygen();
            let dev = b"device-entropy-for-sign-test!!!!!";
            let sku = "SKU-D";
            let lid = [5u8; 16];
            let nonce = [6u8; 16];
            let device_id = compute_device_id(dev, sku);
            let payload = build_license_payload(&device_id, sku, &lid, 0, u64::MAX, &nonce);
            let fake_sig = [0xABu8; MLDSA87_SIG_BYTES];

            let r = license_verify_handshake(&vk_bytes, dev, sku, &payload, &fake_sig, 100);
            assert!(!r.ok);
            assert!(r.reason.contains("inválida"));
        });
    }
}
