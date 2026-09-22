//! Plano MIX: Mixnet Assíncrona com Atrasos de Poisson e Tráfego de Cobertura.
//!
//! Resistente a Adversários Globais Passivos (GPA): desassocia o momento
//! de envio do momento de geração de tráfego através de filas estocásticas.

use crate::crypto::{CellCommand, VeilCell};
use crate::layers::layer5_obfuscation::ObfuscationLayer;
use crate::VeilError;
use rand::seq::SliceRandom;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Item agendado na fila do Mixnet.
pub struct MixMessage {
    pub cell: VeilCell,
    pub scheduled_dispatch: Instant,
    pub target_node: String,
}

/// Gerenciador do plano MIX.
pub struct MixPlane {
    queue: Arc<Mutex<VecDeque<MixMessage>>>,
    lambda_rate: f64,
    circuit_id: u32,
}

impl MixPlane {
    pub fn new(circuit_id: u32, lambda_rate: f64) -> Self {
        Self {
            queue: Arc::new(Mutex::new(VecDeque::new())),
            lambda_rate: lambda_rate.max(0.01),
            circuit_id,
        }
    }

    /// Enfileira uma mensagem real aplicando delay de Poisson: $\Delta t = -\ln(U)/\lambda$.
    pub fn enqueue(&self, target_node: String, stream_id: u16, data: &[u8]) -> Result<(), VeilError> {
        let cell = VeilCell::new(self.circuit_id, CellCommand::RelayData, stream_id, data);
        let delay_ms = ObfuscationLayer::generate_poisson_delay_ms(self.lambda_rate);
        let scheduled = Instant::now() + Duration::from_millis(delay_ms);

        let mut lock = self.queue.lock().unwrap();
        lock.push_back(MixMessage {
            cell,
            scheduled_dispatch: scheduled,
            target_node,
        });

        Ok(())
    }

    /// Gera uma mensagem de cobertura (tráfego artificial / ruído) para camuflagem.
    pub fn enqueue_cover(&self, target_node: String) {
        let cell = VeilCell::new_padding(self.circuit_id);
        let delay_ms = ObfuscationLayer::generate_poisson_delay_ms(self.lambda_rate);
        let scheduled = Instant::now() + Duration::from_millis(delay_ms);

        let mut lock = self.queue.lock().unwrap();
        lock.push_back(MixMessage {
            cell,
            scheduled_dispatch: scheduled,
            target_node,
        });
    }

    /// Extrai e embaralha em lote (*batch shuffle*) todas as mensagens cujo tempo de envio expirou.
    pub fn flush_ready(&self) -> Vec<MixMessage> {
        let now = Instant::now();
        let mut lock = self.queue.lock().unwrap();
        let mut ready = Vec::new();
        let mut remaining = VecDeque::new();

        while let Some(msg) = lock.pop_front() {
            if msg.scheduled_dispatch <= now {
                ready.push(msg);
            } else {
                remaining.push_back(msg);
            }
        }

        *lock = remaining;

        // Embaralha o lote para quebrar a ordem causal de chegada
        let mut rng = rand::thread_rng();
        ready.shuffle(&mut rng);

        ready
    }

    /// Quantidade de mensagens atualmente em espera na fila.
    pub fn queue_len(&self) -> usize {
        self.queue.lock().unwrap().len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mix_plane_enqueue_and_flush_ready() {
        let mix = MixPlane::new(404, 1000.0); // Alta taxa para teste imediato
        mix.enqueue("node-exit".into(), 1, b"mensagem assincrona").expect("enqueue");
        mix.enqueue_cover("node-middle".into());

        assert_eq!(mix.queue_len(), 2);

        // Aguarda expiração do delay
        std::thread::sleep(Duration::from_millis(50));

        let dispatched = mix.flush_ready();
        assert!(!dispatched.is_empty(), "mensagens agendadas devem ser despachadas");
    }
}
