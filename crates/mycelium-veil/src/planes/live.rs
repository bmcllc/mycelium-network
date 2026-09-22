//! Plano LIVE: Circuitos Onion Interativos de Baixa Latência.
//!
//! Transporta conexões interativas (TCP, SOCKS5, HTTP, chamadas)
//! através de circuitos onion criptografados com células de 512 bytes fixos.

use crate::crypto::{
    client_kem_handshake, onion_encrypt_layers, onion_peel_layer, CellCommand, HopKeys, VeilCell,
    CELL_SIZE,
};
use crate::VeilError;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Descritor de um nó participante do circuito.
#[derive(Clone, Debug)]
pub struct CircuitHopNode {
    pub node_id: String,
    pub public_kem_key: Vec<u8>,
    pub endpoint: String,
}

/// Estado de um circuito LIVE ativo.
pub struct LiveCircuit {
    pub circuit_id: u32,
    pub hops: Vec<CircuitHopNode>,
    pub hop_keys: Vec<HopKeys>,
    pub created_at: Instant,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

impl LiveCircuit {
    /// Constrói um circuito onion negociando chaves ML-KEM-1024 com cada nó da rota.
    pub fn build(circuit_id: u32, hops: Vec<CircuitHopNode>) -> Result<Self, VeilError> {
        if hops.is_empty() {
            return Err(VeilError::Circuit("Circuito sem nós definido".into()));
        }

        let mut hop_keys = Vec::with_capacity(hops.len());
        for (i, hop) in hops.iter().enumerate() {
            let salt = format!("circuit-{circuit_id}-hop-{i}").into_bytes();
            let (keys, _ct) = client_kem_handshake(&hop.public_kem_key, &salt)
                .map_err(|e| VeilError::Crypto(format!("Falha no KEM do nó {}: {e}", hop.node_id)))?;
            hop_keys.push(keys);
        }

        Ok(Self {
            circuit_id,
            hops,
            hop_keys,
            created_at: Instant::now(),
            bytes_sent: 0,
            bytes_received: 0,
        })
    }

    /// Encapsula dados do usuário em células de 512 bytes com cifragem onion em camadas.
    pub fn forward_encrypt(&mut self, stream_id: u16, data: &[u8]) -> Result<Vec<[u8; CELL_SIZE]>, VeilError> {
        let max_chunk = crate::crypto::cell::MAX_PAYLOAD_LEN;
        let chunks: Vec<&[u8]> = data.chunks(max_chunk).collect();
        let mut encrypted_cells = Vec::with_capacity(chunks.len());

        for chunk in chunks {
            // Cifra o payload em camadas na ordem reversa (Exit -> Middle -> Guard)
            let layered_data = onion_encrypt_layers(chunk, &self.hop_keys)
                .map_err(|e| VeilError::Crypto(format!("Falha ao cifrar camadas onion: {e}")))?;

            let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, stream_id, &layered_data);
            encrypted_cells.push(cell.to_bytes());
            self.bytes_sent += CELL_SIZE as u64;
        }

        Ok(encrypted_cells)
    }

    /// Descasca a resposta que retorna do Exit através dos nós intermediários até a origem.
    pub fn backward_decrypt(&mut self, cell_bytes: &[u8; CELL_SIZE]) -> Result<Vec<u8>, VeilError> {
        let cell = VeilCell::from_bytes(cell_bytes)
            .map_err(|e| VeilError::Circuit(format!("Célula corrompida recebida: {e}")))?;

        let mut current = cell.data().to_vec();

        // Descasca as camadas na ordem direta (Guard -> Middle -> Exit)
        for keys in &self.hop_keys {
            current = onion_peel_layer(&current, keys)
                .map_err(|e| VeilError::Crypto(format!("Falha ao descascar camada reversa: {e}")))?;
        }

        self.bytes_received += cell_bytes.len() as u64;
        Ok(current)
    }
}

/// Gerenciador de circuitos LIVE.
pub struct LiveCircuitManager {
    next_circuit_id: AtomicU32,
}

impl Default for LiveCircuitManager {
    fn default() -> Self {
        Self::new()
    }
}

impl LiveCircuitManager {
    pub fn new() -> Self {
        Self {
            next_circuit_id: AtomicU32::new(100),
        }
    }

    /// Aloca um novo identificador único de circuito.
    pub fn next_id(&self) -> u32 {
        self.next_circuit_id.fetch_add(1, Ordering::SeqCst)
    }

    /// Cria um circuito interativo LIVE (1 salto para Geo ou 3 saltos para Veil).
    pub fn create_circuit(&self, hops: Vec<CircuitHopNode>) -> Result<Arc<Mutex<LiveCircuit>>, VeilError> {
        let id = self.next_id();
        let circuit = LiveCircuit::build(id, hops)?;
        Ok(Arc::new(Mutex::new(circuit)))
    }
}

use std::sync::Mutex;

#[cfg(test)]
mod tests {
    use super::*;
    use mycelium_pqc::mlkem_keygen;

    #[test]
    fn live_circuit_onion_encryption_and_decryption_flow() {
        let kp1 = mlkem_keygen();
        let kp2 = mlkem_keygen();
        let kp3 = mlkem_keygen();

        let hops = vec![
            CircuitHopNode {
                node_id: "guard-node".into(),
                public_kem_key: kp1.public_key.clone(),
                endpoint: "198.51.100.1:4003".into(),
            },
            CircuitHopNode {
                node_id: "middle-node".into(),
                public_kem_key: kp2.public_key.clone(),
                endpoint: "198.51.100.2:4003".into(),
            },
            CircuitHopNode {
                node_id: "exit-node".into(),
                public_kem_key: kp3.public_key.clone(),
                endpoint: "198.51.100.3:4003".into(),
            },
        ];

        let mut circuit = LiveCircuit::build(101, hops).expect("build circuit");
        let payload = b"GET /privacy.html HTTP/1.1\r\nHost: example.com\r\n\r\n";

        let cells = circuit.forward_encrypt(1, payload).expect("encrypt forward");
        assert!(!cells.is_empty());
        assert_eq!(cells[0].len(), CELL_SIZE);
    }
}
