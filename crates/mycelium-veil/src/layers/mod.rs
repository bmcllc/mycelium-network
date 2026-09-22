//! As 7 Camadas de Privacidade e Anonimato do Mycelium VEIL Ω (Fusão ET-COSMIC-OLD).

pub mod layer0_identity;
pub mod layer1_fragmentation;
pub mod layer2_transport;
pub mod layer3_consensus;
pub mod layer4_execution;
pub mod layer5_obfuscation;
pub mod layer6_zerotrace;

pub use layer0_identity::IdentityLayer;
pub use layer1_fragmentation::FragmentationLayer;
pub use layer2_transport::TransportLayer;
pub use layer3_consensus::ConsensusLayer;
pub use layer4_execution::ExecutionLayer;
pub use layer5_obfuscation::ObfuscationLayer;
pub use layer6_zerotrace::ZeroTraceLayer;

use crate::VeilError;

/// Trait comum para todas as 7 camadas do Veil.
pub trait VeilLayer: Send + Sync {
    /// Nome descritivo da camada.
    fn name(&self) -> &'static str;

    /// Indica se a camada está ativa na sessão corrente.
    fn is_active(&self) -> bool;

    /// Ativa ou desativa a camada dinamicamente.
    fn set_active(&mut self, active: bool);

    /// Processa dados no sentido de saída (aplicação -> rede / encapsulamento).
    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError>;

    /// Recupera dados no sentido de entrada (rede -> aplicação / desencapsulamento).
    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError>;
}

/// Pipeline orquestrador das 7 camadas de processamento.
pub struct LayerPipeline {
    pub layers: Vec<Box<dyn VeilLayer>>,
}

impl Default for LayerPipeline {
    fn default() -> Self {
        Self::new()
    }
}

impl LayerPipeline {
    /// Cria o pipeline com as 7 camadas inicializadas em ordem (0 a 6).
    pub fn new() -> Self {
        Self {
            layers: vec![
                Box::new(IdentityLayer::new()),
                Box::new(FragmentationLayer::new(2, 3)), // Shamir 2-of-3 por padrão
                Box::new(TransportLayer::new()),
                Box::new(ConsensusLayer::new()),
                Box::new(ExecutionLayer::new()),
                Box::new(ObfuscationLayer::new(512)),
                Box::new(ZeroTraceLayer::new()),
            ],
        }
    }

    /// Ativa todas as camadas do pipeline.
    pub fn activate_all(&mut self) {
        for layer in &mut self.layers {
            layer.set_active(true);
        }
    }

    /// Processa dados sequencialmente através de todas as camadas ativas (0 -> 6).
    pub fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut current = data.to_vec();
        for layer in &self.layers {
            if layer.is_active() {
                current = layer.process(&current)?;
            }
        }
        Ok(current)
    }

    /// Recupera dados na ordem reversa das camadas ativas (6 -> 0).
    pub fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let mut current = data.to_vec();
        for layer in self.layers.iter().rev() {
            if layer.is_active() {
                current = layer.recover(&current)?;
            }
        }
        Ok(current)
    }
}
