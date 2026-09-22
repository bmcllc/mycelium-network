//! Camada 2 — Transporte Fantasma: DistanceBridge e roteamento multi-canal.
//!
//! Gerencia a seleção de canais físicos e o encapsulamento de saltos,
//! integrado com os mecanismos de pontuação do `mycelium-distancebridge`.

use crate::layers::VeilLayer;
use crate::VeilError;
use rand::Rng;

/// Tipos de canais físicos e virtuais suportados pelo DistanceBridge.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ChannelType {
    TcpQuic = 0,
    CircuitRelay = 1,
    DistanceBridgeMesh = 2, // BLE / LoRa / Wi-Fi Direct
    HcnDtn = 3,             // High-latency Delay-Tolerant Networking
}

impl From<u8> for ChannelType {
    fn from(val: u8) -> Self {
        match val {
            0 => ChannelType::TcpQuic,
            1 => ChannelType::CircuitRelay,
            2 => ChannelType::DistanceBridgeMesh,
            3 => ChannelType::HcnDtn,
            _ => ChannelType::TcpQuic,
        }
    }
}

/// Cabeçalho de roteamento multi-canal da Camada 2 (32 bytes).
/// [1B canal] + [1B hop_index] + [2B reservado] + [28B blake3 digest truncado]
pub const TRANSPORT_HEADER_LEN: usize = 32;

/// Camada 2 do Veil: Transporte Fantasma.
pub struct TransportLayer {
    active: bool,
    preferred_channel: ChannelType,
}

impl Default for TransportLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl TransportLayer {
    pub fn new() -> Self {
        Self {
            active: true,
            preferred_channel: ChannelType::TcpQuic,
        }
    }

    pub fn set_preferred_channel(&mut self, channel: ChannelType) {
        self.preferred_channel = channel;
    }
}

impl VeilLayer for TransportLayer {
    fn name(&self) -> &'static str {
        "Camada 2 — Transporte Fantasma (DistanceBridge)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut header = [0u8; TRANSPORT_HEADER_LEN];

        // Seleciona canal (pode variar de forma estocástica ou manter preferido)
        header[0] = self.preferred_channel as u8;
        header[1] = rand::thread_rng().gen_range(0..4); // Hop count / channel hint
        header[2] = 0x01; // Versão de transporte
        header[3] = 0x00; // Flags

        // Blake3 digest truncado dos dados para verificação de rota e integridade do salto
        let hash = blake3::hash(data);
        header[4..TRANSPORT_HEADER_LEN].copy_from_slice(&hash.as_bytes()[..28]);

        let mut out = Vec::with_capacity(TRANSPORT_HEADER_LEN + data.len());
        out.extend_from_slice(&header);
        out.extend_from_slice(data);
        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < TRANSPORT_HEADER_LEN {
            return Err(VeilError::Layer(
                "Dados insuficientes para cabeçalho de transporte".into(),
            ));
        }

        let expected_hash = &data[4..TRANSPORT_HEADER_LEN];
        let payload = &data[TRANSPORT_HEADER_LEN..];

        let actual_hash = blake3::hash(payload);
        if &actual_hash.as_bytes()[..28] != expected_hash {
            return Err(VeilError::Layer(
                "Falha de integridade do cabeçalho de transporte (hash mismatch)".into(),
            ));
        }

        Ok(payload.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transport_layer_roundtrip() {
        let layer = TransportLayer::new();
        let data = b"pacote de rota multi-canal distancebridge";

        let processed = layer.process(data).expect("process transport");
        assert_eq!(processed.len(), TRANSPORT_HEADER_LEN + data.len());

        let recovered = layer.recover(&processed).expect("recover transport");
        assert_eq!(recovered, data);
    }

    #[test]
    fn tampered_payload_is_rejected_by_transport_layer() {
        let layer = TransportLayer::new();
        let data = b"pacote integro";
        let mut processed = layer.process(data).expect("process");

        // Corrompe um byte do payload
        let last = processed.len() - 1;
        processed[last] ^= 0xff;

        assert!(layer.recover(&processed).is_err());
    }
}
