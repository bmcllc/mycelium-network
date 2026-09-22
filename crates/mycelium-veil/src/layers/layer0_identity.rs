//! Camada 0 — Identidade: GhostID efêmero + MAC administrado localmente.
//!
//! Desacopla a identidade permanente do nó (`gland.seed`, NodeId da DHT, VOID-00)
//! de qualquer sessão do circuito anônimo.

use crate::layers::VeilLayer;
use crate::VeilError;
use mycelium_ghostid::GhostId;
use rand::RngCore;
use std::sync::{Arc, Mutex};

/// Endereço MAC efêmero administrado localmente (Locally Administered Unicast).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EphemeralMac {
    pub bytes: [u8; 6],
    pub rotation_count: u64,
}

impl EphemeralMac {
    /// Formata como string hexadecimal de MAC padrão (ex.: "02:ab:cd:ef:12:34").
    pub fn to_mac_string(&self) -> String {
        format!(
            "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            self.bytes[0], self.bytes[1], self.bytes[2], self.bytes[3], self.bytes[4], self.bytes[5]
        )
    }
}

/// Gerenciador de rotação segura de MAC efêmero.
#[derive(Clone)]
pub struct EphemeralMacManager {
    current: Arc<Mutex<EphemeralMac>>,
}

impl Default for EphemeralMacManager {
    fn default() -> Self {
        Self::new()
    }
}

impl EphemeralMacManager {
    pub fn new() -> Self {
        let mac = Self::generate_local_mac(0);
        Self {
            current: Arc::new(Mutex::new(mac)),
        }
    }

    /// Gera um MAC seguro localmente administrado (bit 1=1, bit 0=0 do primeiro byte).
    fn generate_local_mac(rotation: u64) -> EphemeralMac {
        let mut bytes = [0u8; 6];
        rand::thread_rng().fill_bytes(&mut bytes);
        // Garante locally administered (0x02) e unicast (0x01 desativado)
        bytes[0] |= 0x02;
        bytes[0] &= 0xfe;
        EphemeralMac {
            bytes,
            rotation_count: rotation,
        }
    }

    /// Executa rotação controlada (em momentos de novo circuito ou reinício de sessão).
    pub fn rotate(&self) -> EphemeralMac {
        let mut lock = self.current.lock().unwrap();
        let next_count = lock.rotation_count + 1;
        let new_mac = Self::generate_local_mac(next_count);
        *lock = new_mac.clone();
        new_mac
    }

    /// Retorna o MAC atual.
    pub fn current(&self) -> EphemeralMac {
        self.current.lock().unwrap().clone()
    }
}

/// Camada 0 do Veil: Identidade e isolamento de hardware.
pub struct IdentityLayer {
    active: bool,
    mac_manager: EphemeralMacManager,
    session_ghost_id: Arc<Mutex<Option<GhostId>>>,
}

impl Default for IdentityLayer {
    fn default() -> Self {
        Self::new()
    }
}

impl IdentityLayer {
    pub fn new() -> Self {
        Self {
            active: true,
            mac_manager: EphemeralMacManager::new(),
            session_ghost_id: Arc::new(Mutex::new(None)),
        }
    }

    /// Inicializa a identidade efêmera GhostID para uma nova sessão.
    pub fn spawn_session(&self, ttl_secs: u64) -> Result<String, VeilError> {
        let gid = GhostId::spawn_quick(ttl_secs)
            .map_err(|e| VeilError::Crypto(format!("falha ao spawnar GhostID: {e}")))?;
        let pubkey_hex = gid.nostr_pubkey_hex();
        *self.session_ghost_id.lock().unwrap() = Some(gid);
        self.mac_manager.rotate();
        Ok(pubkey_hex)
    }

    /// Retorna o endereço MAC efêmero ativo.
    pub fn current_mac(&self) -> EphemeralMac {
        self.mac_manager.current()
    }
}

impl VeilLayer for IdentityLayer {
    fn name(&self) -> &'static str {
        "Camada 0 — Identidade (GhostID + MAC Efêmero)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        // Gera um token de sessão efêmero pseudoaleatório de 32 bytes
        let mut session_nonce = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut session_nonce);

        // Prepara envelope: [32B nonce] + [6B MAC] + [dados]
        let mac = self.mac_manager.current().bytes;
        let mut out = Vec::with_capacity(38 + data.len());
        out.extend_from_slice(&session_nonce);
        out.extend_from_slice(&mac);
        out.extend_from_slice(data);
        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < 38 {
            return Err(VeilError::Layer("Payload menor que o cabeçalho de identidade".into()));
        }
        // Descarta o prefixo efêmero e recupera o payload
        Ok(data[38..].to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ephemeral_mac_is_locally_administered_and_unicast() {
        let mgr = EphemeralMacManager::new();
        let mac = mgr.current();
        assert_eq!(mac.bytes[0] & 0x02, 0x02, "bit locally administered deve estar ativo");
        assert_eq!(mac.bytes[0] & 0x01, 0x00, "bit multicast deve estar desativado");

        let rotated = mgr.rotate();
        assert_eq!(rotated.rotation_count, 1);
        assert_ne!(mac.bytes, rotated.bytes);
    }

    #[test]
    fn identity_layer_roundtrip() {
        let layer = IdentityLayer::new();
        let payload = b"ping de aplicacao";
        let processed = layer.process(payload).expect("process");
        assert_eq!(processed.len(), 38 + payload.len());

        let recovered = layer.recover(&processed).expect("recover");
        assert_eq!(recovered, payload);
    }
}
