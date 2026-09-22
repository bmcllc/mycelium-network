//! Planos de comunicação do Mycelium VEIL Ω: LIVE (interativo) e MIX (assíncrono).

pub mod live;
pub mod mix;

pub use live::{CircuitHopNode, LiveCircuit, LiveCircuitManager};
pub use mix::{MixMessage, MixPlane};
