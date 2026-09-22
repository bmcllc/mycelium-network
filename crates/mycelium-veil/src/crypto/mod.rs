//! Criptografia em camadas pós-quântica e rotinas Sphinx para o Mycelium VEIL Ω.

pub mod cell;
pub use cell::{CellCommand, VeilCell, CELL_SIZE, MAX_PAYLOAD_LEN, MAX_STREAM_DATA_CHUNK};

use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use mycelium_pqc::{mlkem_decapsulate, mlkem_encapsulate, KemKeyPair};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Erros de criptografia do Veil.
#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("falha AEAD: {0}")]
    Aead(String),
    #[error("falha KEM pós-quântico: {0}")]
    Kem(#[from] mycelium_pqc::PqcError),
    #[error("tamanho de dados inválido: {0}")]
    InvalidLength(String),
    #[error("célula corrompida ou tag de integridade inválida")]
    CorruptedCell,
}

/// Chaves de salto (Hop) derivadas a partir do handshake pós-quântico ML-KEM-1024.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct HopKeys {
    /// Chave simétrica para tráfego no sentido Forward (Origem -> Saída).
    pub forward_key: [u8; 32],
    /// Chave simétrica para tráfego no sentido Backward (Saída -> Origem).
    pub backward_key: [u8; 32],
}

impl HopKeys {
    /// Deriva o par de chaves Forward/Backward a partir do segredo ML-KEM compartilhado.
    pub fn derive(shared_secret: &[u8], salt: &[u8]) -> Self {
        let mut forward = [0u8; 32];
        let mut backward = [0u8; 32];

        let mut h1 = blake3::Hasher::new_keyed(&[
            0x56, 0x45, 0x49, 0x4c, 0x2d, 0x46, 0x4f, 0x52, // VEIL-FOR
            0x57, 0x41, 0x52, 0x44, 0x2d, 0x4b, 0x45, 0x59, // WARD-KEY
            0x2d, 0x53, 0x45, 0x43, 0x52, 0x45, 0x54, 0x2d, // -SECRET-
            0x56, 0x30, 0x2e, 0x31, 0x2e, 0x30, 0x00, 0x01, // V0.1.0..
        ]);
        h1.update(shared_secret);
        h1.update(salt);
        forward.copy_from_slice(h1.finalize().as_bytes());

        let mut h2 = blake3::Hasher::new_keyed(&[
            0x56, 0x45, 0x49, 0x4c, 0x2d, 0x42, 0x41, 0x43, // VEIL-BAC
            0x4b, 0x57, 0x41, 0x52, 0x44, 0x2d, 0x4b, 0x45, // KWARD-KE
            0x59, 0x2d, 0x53, 0x45, 0x43, 0x52, 0x45, 0x54, // Y-SECRET
            0x2d, 0x56, 0x30, 0x2e, 0x31, 0x2e, 0x30, 0x02, // -V0.1.0.
        ]);
        h2.update(shared_secret);
        h2.update(salt);
        backward.copy_from_slice(h2.finalize().as_bytes());

        Self {
            forward_key: forward,
            backward_key: backward,
        }
    }
}

/// Encriptador/Decifrador AEAD por salto com ChaCha20-Poly1305.
pub struct HopCipher {
    cipher: ChaCha20Poly1305,
    seq: u64,
}

impl HopCipher {
    pub fn new(key: &[u8; 32]) -> Self {
        Self {
            cipher: ChaCha20Poly1305::new(Key::from_slice(key)),
            seq: 0,
        }
    }

    /// Gera um nonce monotônico de 12 bytes combinando sequência e identificador.
    fn next_nonce(&mut self) -> [u8; 12] {
        let mut n = [0u8; 12];
        n[4..12].copy_from_slice(&self.seq.to_be_bytes());
        self.seq = self.seq.wrapping_add(1);
        n
    }

    /// Cifra dados com tag de autenticação Poly1305.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let nonce_bytes = self.next_nonce();
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| CryptoError::Aead(e.to_string()))?;

        // Anexa o nonce no início (12 bytes)
        let mut out = Vec::with_capacity(12 + ciphertext.len());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        Ok(out)
    }

    /// Decifra dados autenticados verificando a integridade.
    pub fn decrypt(&mut self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if data.len() < 12 + 16 {
            return Err(CryptoError::InvalidLength(
                "Dados insuficientes para nonce e tag AEAD".into(),
            ));
        }

        let nonce_bytes = &data[0..12];
        let ciphertext = &data[12..];
        let nonce = Nonce::from_slice(nonce_bytes);

        self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| CryptoError::CorruptedCell)
    }
}

/// Executa o handshake de cliente com um nó da rota usando ML-KEM-1024.
pub fn client_kem_handshake(
    peer_public_key: &[u8],
    salt: &[u8],
) -> Result<(HopKeys, Vec<u8>), CryptoError> {
    let enc = mlkem_encapsulate(peer_public_key)?;
    let hop_keys = HopKeys::derive(&enc.shared_secret, salt);
    Ok((hop_keys, enc.ciphertext.clone()))
}

/// Executa o handshake no nó intermediário/saída recebendo o ciphertext KEM.
pub fn server_kem_handshake(
    keypair: &KemKeyPair,
    ciphertext: &[u8],
    salt: &[u8],
) -> Result<HopKeys, CryptoError> {
    let shared = mlkem_decapsulate(keypair.private_bytes(), ciphertext)?;
    let hop_keys = HopKeys::derive(&shared, salt);
    Ok(hop_keys)
}

/// Cifra um payload em camadas no estilo Onion (Exit -> Middle -> Guard).
pub fn onion_encrypt_layers(
    inner_payload: &[u8],
    hop_keys: &[HopKeys],
) -> Result<Vec<u8>, CryptoError> {
    let mut current = inner_payload.to_vec();

    // Itera na ordem reversa: primeiro cifra para o Exit, depois Middle, depois Guard
    for keys in hop_keys.iter().rev() {
        let mut cipher = HopCipher::new(&keys.forward_key);
        current = cipher.encrypt(&current)?;
    }

    Ok(current)
}

/// Decifra uma camada de cebola em um nó intermediário (sentido forward).
pub fn onion_peel_layer(
    layer_data: &[u8],
    keys: &HopKeys,
) -> Result<Vec<u8>, CryptoError> {
    let mut cipher = HopCipher::new(&keys.forward_key);
    cipher.decrypt(layer_data)
}

/// Decifra uma camada de cebola no cliente (sentido backward).
pub fn onion_peel_layer_backward(
    layer_data: &[u8],
    keys: &HopKeys,
) -> Result<Vec<u8>, CryptoError> {
    let mut cipher = HopCipher::new(&keys.backward_key);
    cipher.decrypt(layer_data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use mycelium_pqc::mlkem_keygen;

    #[test]
    fn hop_cipher_encrypt_decrypt_roundtrip() {
        let key = [42u8; 32];
        let mut enc = HopCipher::new(&key);
        let mut dec = HopCipher::new(&key);

        let msg = b"teste de cifra de fluxo onion veil";
        let ct = enc.encrypt(msg).expect("encrypt");
        let pt = dec.decrypt(&ct).expect("decrypt");
        assert_eq!(pt, msg);
    }

    #[test]
    fn hybrid_kem_handshake_roundtrip() {
        let server_kp = mlkem_keygen();
        let salt = b"circuito-404-salt";

        let (client_keys, ciphertext) =
            client_kem_handshake(&server_kp.public_key, salt).expect("client handshake");
        let server_keys =
            server_kem_handshake(&server_kp, &ciphertext, salt).expect("server handshake");

        assert_eq!(client_keys.forward_key, server_keys.forward_key);
        assert_eq!(client_keys.backward_key, server_keys.backward_key);
    }

    #[test]
    fn multi_hop_onion_encryption_and_peeling() {
        // Simula 3 saltos: Guard (0), Middle (1), Exit (2)
        let hops = vec![
            HopKeys { forward_key: [1u8; 32], backward_key: [11u8; 32] },
            HopKeys { forward_key: [2u8; 32], backward_key: [22u8; 32] },
            HopKeys { forward_key: [3u8; 32], backward_key: [33u8; 32] },
        ];

        let payload = b"mensagem secreta que alcanca a internet via Exit";

        // Cliente encapsula em 3 camadas
        let onion = onion_encrypt_layers(payload, &hops).expect("onion encrypt");

        // Salto 0 (Guard) descasca camada 0
        let peeled_guard = onion_peel_layer(&onion, &hops[0]).expect("guard peel");
        // Salto 1 (Middle) descasca camada 1
        let peeled_middle = onion_peel_layer(&peeled_guard, &hops[1]).expect("middle peel");
        // Salto 2 (Exit) descasca camada 2 e recupera payload original
        let recovered = onion_peel_layer(&peeled_middle, &hops[2]).expect("exit peel");

        assert_eq!(recovered, payload);
    }
}
