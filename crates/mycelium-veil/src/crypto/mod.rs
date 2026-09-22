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
    #[error("reutilização ou replay de célula detectado (seq: {0})")]
    ReplayDetected(u64),
    #[error("esgotamento do contador de sequência criptográfica")]
    SequenceExhaustion,
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

/// Limite de segurança de sequência antes da rotação obrigatória de chaves (2^48).
pub const MAX_HOP_CIPHER_SEQ: u64 = 1 << 48;

/// Encriptador AEAD por salto com ChaCha20-Poly1305 e controle monotônico de nonce.
pub struct HopEncryptor {
    cipher: ChaCha20Poly1305,
    seq: u64,
}

impl HopEncryptor {
    pub fn new(key: &[u8; 32]) -> Self {
        Self {
            cipher: ChaCha20Poly1305::new(Key::from_slice(key)),
            seq: 0,
        }
    }

    pub fn current_seq(&self) -> u64 {
        self.seq
    }

    #[cfg(test)]
    pub fn set_seq_for_test(&mut self, seq: u64) {
        self.seq = seq;
    }

    /// Gera o próximo nonce de 12 bytes combinando padding e contador monotônico.
    fn next_nonce(&mut self) -> Result<[u8; 12], CryptoError> {
        if self.seq >= MAX_HOP_CIPHER_SEQ {
            return Err(CryptoError::SequenceExhaustion);
        }
        let mut n = [0u8; 12];
        n[4..12].copy_from_slice(&self.seq.to_be_bytes());
        self.seq += 1;
        Ok(n)
    }

    /// Cifra dados com tag de autenticação Poly1305 garantindo nonce único monotônico.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let nonce_bytes = self.next_nonce()?;
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| CryptoError::Aead(e.to_string()))?;

        let mut out = Vec::with_capacity(12 + ciphertext.len());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        Ok(out)
    }
}

/// Decifrador AEAD por salto com ChaCha20-Poly1305 e proteção estrita anti-replay.
pub struct HopDecryptor {
    cipher: ChaCha20Poly1305,
    next_expected_seq: u64,
    seen_seqs: std::collections::HashSet<u64>,
}

impl HopDecryptor {
    pub fn new(key: &[u8; 32]) -> Self {
        Self {
            cipher: ChaCha20Poly1305::new(Key::from_slice(key)),
            next_expected_seq: 0,
            seen_seqs: std::collections::HashSet::new(),
        }
    }

    pub fn last_seq(&self) -> u64 {
        self.next_expected_seq
    }

    /// Decifra dados verificando integridade AEAD e rejeitando repetição ou replay de sequência.
    pub fn decrypt(&mut self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if data.len() < 12 + 16 {
            return Err(CryptoError::InvalidLength(
                "Dados insuficientes para nonce e tag AEAD".into(),
            ));
        }

        let nonce_bytes = &data[0..12];
        let ciphertext = &data[12..];
        let seq = u64::from_be_bytes(nonce_bytes[4..12].try_into().unwrap());

        // Verificação anti-replay: rejeita sequências repetidas ou anteriores à janela
        if self.seen_seqs.contains(&seq) || seq < self.next_expected_seq {
            return Err(CryptoError::ReplayDetected(seq));
        }

        let nonce = Nonce::from_slice(nonce_bytes);
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| CryptoError::CorruptedCell)?;

        self.seen_seqs.insert(seq);
        if seq >= self.next_expected_seq {
            self.next_expected_seq = seq + 1;
        }

        // Mantém janela anti-replay limpa
        if self.seen_seqs.len() > 4096 {
            let cutoff = self.next_expected_seq.saturating_sub(2048);
            self.seen_seqs.retain(|&s| s >= cutoff);
        }

        Ok(plaintext)
    }
}

/// Wrapper compatível com estado duplo de encriptação e decifração.
pub struct HopCipher {
    pub encryptor: HopEncryptor,
    pub decryptor: HopDecryptor,
}

impl HopCipher {
    pub fn new(key: &[u8; 32]) -> Self {
        Self {
            encryptor: HopEncryptor::new(key),
            decryptor: HopDecryptor::new(key),
        }
    }

    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        self.encryptor.encrypt(plaintext)
    }

    pub fn decrypt(&mut self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        self.decryptor.decrypt(data)
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

/// Cifra um payload em camadas no estilo Onion usando encryptors com estado persistente.
pub fn onion_encrypt_layers_stateful(
    inner_payload: &[u8],
    encryptors: &mut [HopEncryptor],
) -> Result<Vec<u8>, CryptoError> {
    let mut current = inner_payload.to_vec();
    for enc in encryptors.iter_mut().rev() {
        current = enc.encrypt(&current)?;
    }
    Ok(current)
}

/// Descasca camadas no sentido backward no cliente usando decryptors com estado persistente.
pub fn onion_peel_backward_stateful(
    layer_data: &[u8],
    decryptors: &mut [HopDecryptor],
) -> Result<Vec<u8>, CryptoError> {
    let mut current = layer_data.to_vec();
    for dec in decryptors.iter_mut() {
        current = dec.decrypt(&current)?;
    }
    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::*;
    use mycelium_pqc::mlkem_keygen;

    #[test]
    fn test_two_consecutive_cells_do_not_reuse_nonce() {
        let key = [99u8; 32];
        let mut encryptor = HopEncryptor::new(&key);

        let msg1 = b"primeira celula no circuito";
        let msg2 = b"segunda celula no circuito";

        let ct1 = encryptor.encrypt(msg1).expect("encrypt 1");
        let ct2 = encryptor.encrypt(msg2).expect("encrypt 2");

        let nonce1 = &ct1[0..12];
        let nonce2 = &ct2[0..12];

        // Nonces devem ser estritamente diferentes
        assert_ne!(nonce1, nonce2);

        let seq1 = u64::from_be_bytes(nonce1[4..12].try_into().unwrap());
        let seq2 = u64::from_be_bytes(nonce2[4..12].try_into().unwrap());
        assert_eq!(seq1, 0);
        assert_eq!(seq2, 1);
        assert_eq!(encryptor.current_seq(), 2);
    }

    #[test]
    fn test_replayed_cell_is_strictly_rejected() {
        let key = [77u8; 32];
        let mut encryptor = HopEncryptor::new(&key);
        let mut decryptor = HopDecryptor::new(&key);

        let msg = b"celula protegida contra replay";
        let ct = encryptor.encrypt(msg).expect("encrypt");

        // Primeira decifração: aceita com sucesso
        let pt = decryptor.decrypt(&ct).expect("primeira decifracao deve suceder");
        assert_eq!(pt, msg);

        // Replay imediato da mesma célula: deve falhar com ReplayDetected
        let replay_err = decryptor.decrypt(&ct);
        match replay_err {
            Err(CryptoError::ReplayDetected(seq)) => {
                assert_eq!(seq, 0);
            }
            other => panic!("Esperado ReplayDetected, obtido: {other:?}"),
        }
    }

    #[test]
    fn test_sequence_counter_exhaustion_terminates_session() {
        let key = [55u8; 32];
        let mut encryptor = HopEncryptor::new(&key);

        encryptor.set_seq_for_test(MAX_HOP_CIPHER_SEQ);

        let msg = b"tentativa apos esgotamento do contador de sequencia";
        let res = encryptor.encrypt(msg);

        match res {
            Err(CryptoError::SequenceExhaustion) => {}
            other => panic!("Esperado SequenceExhaustion, obtido: {other:?}"),
        }
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
    fn stateful_multi_hop_onion_encryption_and_peeling() {
        let hop1 = [1u8; 32];
        let hop2 = [2u8; 32];
        let hop3 = [3u8; 32];

        let mut client_encryptors = vec![
            HopEncryptor::new(&hop1),
            HopEncryptor::new(&hop2),
            HopEncryptor::new(&hop3),
        ];

        let mut guard_decryptor = HopDecryptor::new(&hop1);
        let mut middle_decryptor = HopDecryptor::new(&hop2);
        let mut exit_decryptor = HopDecryptor::new(&hop3);

        let payload = b"estado persistente atraves dos saltos";

        let onion = onion_encrypt_layers_stateful(payload, &mut client_encryptors).unwrap();

        let peeled1 = guard_decryptor.decrypt(&onion).unwrap();
        let peeled2 = middle_decryptor.decrypt(&peeled1).unwrap();
        let recovered = exit_decryptor.decrypt(&peeled2).unwrap();

        assert_eq!(recovered, payload);
    }
}
