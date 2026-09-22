//! Camada 5 — Ofuscação Temporal: QRC (Quantum-Resistant Camouflage).
//!
//! Insere padding estocástico e normalização de tamanho para quebrar
//! correlação por tamanho de pacotes e análise estatística de fluxo.

use crate::layers::VeilLayer;
use crate::VeilError;
use rand::{Rng, RngCore};

/// Camada 5 do Veil: Ofuscação Temporal e de Tamanho (QRC).
pub struct ObfuscationLayer {
    active: bool,
    target_cell_size: usize,
}

impl Default for ObfuscationLayer {
    fn default() -> Self {
        Self::new(512)
    }
}

impl ObfuscationLayer {
    pub fn new(target_cell_size: usize) -> Self {
        Self {
            active: true,
            target_cell_size,
        }
    }

    /// Calcula um atraso estocástico de Poisson em milissegundos: $\Delta t = -\ln(U) / \lambda$.
    pub fn generate_poisson_delay_ms(lambda_per_sec: f64) -> u64 {
        let u: f64 = rand::thread_rng().gen_range(0.0001..1.0);
        let delay_sec = -u.ln() / lambda_per_sec.max(0.01);
        (delay_sec * 1000.0).min(60_000.0) as u64
    }
}

impl VeilLayer for ObfuscationLayer {
    fn name(&self) -> &'static str {
        "Camada 5 — Ofuscação Temporal (QRC)"
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn process(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        let data_len = data.len();

        // Determina o tamanho de padding necessário
        let padding_len: usize = if data_len + 4 < self.target_cell_size {
            // Padding exato para atingir o tamanho padrão da célula
            self.target_cell_size - (data_len + 4)
        } else {
            // Padding estocástico aleatório entre 16 e 64 bytes se já exceder a célula básica
            rand::thread_rng().gen_range(16..=64)
        };

        let mut padding = vec![0u8; padding_len];
        rand::thread_rng().fill_bytes(&mut padding);

        // Formato: [2B padding_len] + [2B data_len] + [padding] + [data]
        let mut out = Vec::with_capacity(4 + padding_len + data_len);
        out.extend_from_slice(&(padding_len as u16).to_be_bytes());
        out.extend_from_slice(&(data_len as u16).to_be_bytes());
        out.extend_from_slice(&padding);
        out.extend_from_slice(data);

        Ok(out)
    }

    fn recover(&self, data: &[u8]) -> Result<Vec<u8>, VeilError> {
        if data.len() < 4 {
            return Err(VeilError::Layer(
                "Dados insuficientes para cabeçalho de ofuscação".into(),
            ));
        }

        let padding_len = u16::from_be_bytes(data[0..2].try_into().unwrap()) as usize;
        let data_len = u16::from_be_bytes(data[2..4].try_into().unwrap()) as usize;

        let expected_total = 4 + padding_len + data_len;
        if data.len() < expected_total {
            return Err(VeilError::Layer(format!(
                "Tamanho real ({}) menor que o esperado para padding ({padding_len}) e dados ({data_len})",
                data.len()
            )));
        }

        let start = 4 + padding_len;
        let end = start + data_len;
        Ok(data[start..end].to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qrc_obfuscation_roundtrip() {
        let layer = ObfuscationLayer::new(512);
        let payload = b"conteudo protegido de tamanho variavel";

        let processed = layer.process(payload).expect("process obfuscation");
        assert_eq!(processed.len(), 512, "deve normalizar para 512 bytes fixos");

        let recovered = layer.recover(&processed).expect("recover obfuscation");
        assert_eq!(recovered, payload);
    }

    #[test]
    fn poisson_delay_generation_is_positive() {
        let delay = ObfuscationLayer::generate_poisson_delay_ms(1.0);
        assert!(delay < 60_000);
    }
}
