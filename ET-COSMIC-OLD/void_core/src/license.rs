/**
 * VOID-00 — Handshake de licença comercial (ML-DSA-87 + binding de dispositivo).
 *
 * Payload canónico assinado pelo titular (MontêLauro Foundation / vendor PK).
 * O WASM só executa derivação de identidade se o token cobrir o device_id actual.
 */

use wasm_bindgen::prelude::*;
use js_sys::Uint8Array;
use sha3::{Digest, Sha3_256};

use crate::pqc::mldsa_verify;

const MAGIC: &[u8; 8] = b"VOID00LC";
const VERSION: u8 = 1;
const DEVICE_ID_LEN: usize = 32;
const SKU_HASH_LEN: usize = 32;
const LICENSE_ID_LEN: usize = 16;
const NONCE_LEN: usize = 16;
/// 8 + 1 + 32 + 32 + 16 + 8 + 8 + 16 = 121
pub const LICENSE_PAYLOAD_LEN: usize =
    8 + 1 + DEVICE_ID_LEN + SKU_HASH_LEN + LICENSE_ID_LEN + 8 + 8 + NONCE_LEN;

fn sku_hash(sku: &str) -> [u8; 32] {
    let mut h = Sha3_256::new();
    h.update(b"void-00-sku-v1");
    h.update(sku.as_bytes());
    h.finalize().into()
}

/// SHA3-256(device_entropy || sku) — ID estável do dispositivo para licenciamento.
pub fn compute_device_id(device_entropy: &[u8], sku: &str) -> [u8; 32] {
    let mut h = Sha3_256::new();
    h.update(b"void-00-device-v1");
    h.update(device_entropy);
    h.update(sku.as_bytes());
    h.finalize().into()
}

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

fn parse_payload(payload: &[u8]) -> Option<([u8; 32], [u8; 32], [u8; 16], u64, u64, [u8; 16])> {
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

#[wasm_bindgen]
pub struct LicenseHandshakeResult {
    ok: bool,
    device_id_hex: String,
    reason: String,
}

#[wasm_bindgen]
impl LicenseHandshakeResult {
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool {
        self.ok
    }

    #[wasm_bindgen(getter)]
    pub fn device_id_hex(&self) -> String {
        self.device_id_hex.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn reason(&self) -> String {
        self.reason.clone()
    }
}

#[wasm_bindgen]
pub fn license_compute_device_id(device_entropy: &[u8], sku: &str) -> Uint8Array {
    Uint8Array::from(&compute_device_id(device_entropy, sku)[..])
}

/// Monta payload canónico (emissor / ferramenta de licenciamento).
#[wasm_bindgen]
pub fn license_build_payload(
    device_entropy: &[u8],
    sku: &str,
    license_id: &[u8],
    not_before: u64,
    not_after: u64,
    nonce: &[u8],
) -> Result<Uint8Array, JsValue> {
    if license_id.len() != LICENSE_ID_LEN {
        return Err(JsValue::from_str("license_id deve ter 16 bytes"));
    }
    if nonce.len() != NONCE_LEN {
        return Err(JsValue::from_str("nonce deve ter 16 bytes"));
    }
    let mut lid = [0u8; 16];
    let mut n = [0u8; 16];
    lid.copy_from_slice(license_id);
    n.copy_from_slice(nonce);
    let device_id = compute_device_id(device_entropy, sku);
    let payload = build_license_payload(&device_id, sku, &lid, not_before, not_after, &n);
    Ok(Uint8Array::from(&payload[..]))
}

/// Handshake: verifica ML-DSA-87 + binding dispositivo + janela temporal.
#[wasm_bindgen]
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
