/// Foundation Models — ML para inferência de hardware.
///
/// Modelos especializados (não LLM genérico) para:
/// - Classificação de blocos (Doorbell, FIFO, DMA, Status)
/// - Predição de timing (latência por operação)
/// - Nomeação de registradores (baseado em offset + valores)
///
/// Dataset gerado a partir do SpecterProbe (10.000+ firmwares ARM64).
pub mod dataset;
pub mod classifier;

pub use dataset::*;
pub use classifier::*;
