//! Gera uma licença VOID-00 de exemplo e imprime os hex para uso com
//! `mycelium license-verify` (requer feature `license`).
//!
//! Uso:
//!   cargo run -p mycelium-zkp --features license --example gen_license
//!   # então rode o nó e:
//!   mycelium --home <home> license-verify \
//!       --vendor-key <VENDOR_PK> --device-entropy <DEVICE_ENTROPY> --sku <SKU> \
//!       --payload <PAYLOAD> --signature <SIGNATURE> --now <NOW>

use ml_dsa::signature::{Keypair, Signer};
use ml_dsa::{Generate, MlDsa87, SigningKey};
use mycelium_zkp::license::{build_license_payload, compute_device_id};

fn main() {
    let sk = SigningKey::<MlDsa87>::generate();
    let vk = sk.verifying_key();
    println!("VENDOR_PK={}", hex::encode(vk.encode().as_slice()));

    let device_entropy = b"device-do-Bruno-32-bytes!!!!!";
    println!("DEVICE_ENTROPY={}", hex::encode(device_entropy));

    let sku = "SKU-A-ENTIDADE-PRO";
    let device_id = compute_device_id(device_entropy, sku);
    let license_id = [0x42u8; 16];
    let nonce = [0xAAu8; 16];
    let not_before = 1_700_000_000u64;
    let not_after = 1_999_999_999u64;
    let payload = build_license_payload(&device_id, sku, &license_id, not_before, not_after, &nonce);
    println!("PAYLOAD={}", hex::encode(payload));

    let sig = sk.try_sign(&payload).unwrap();
    println!("SIGNATURE={}", hex::encode(sig.encode().as_slice()));
    println!("NOW=1800000000");
    println!("SKU={sku}");
}
