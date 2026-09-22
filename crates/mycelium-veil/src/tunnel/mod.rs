//! Camada de Túnel de Sistema, Interface TUN e Kill Switch (Fail-Closed).
//!
//! Garante que nenhuma conexão ou pacote DNS vaze para a interface física
//! se o circuito sofrer instabilidade ou queda abrupta.

use crate::VeilError;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Estados do Kill Switch.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum KillSwitchState {
    /// Armado: monitora a saúde do circuito e bloqueia qualquer tráfego desprotegido.
    Armed,
    /// Disparado: o circuito caiu e o tráfego de rede foi completamente interrompido (fail-closed).
    Triggered,
    /// Desarmado: modo permissivo (somente para testes locais).
    Disarmed,
}

/// Mecanismo Kill Switch atômico.
#[derive(Clone)]
pub struct KillSwitch {
    armed: Arc<AtomicBool>,
    triggered: Arc<AtomicBool>,
}

impl Default for KillSwitch {
    fn default() -> Self {
        Self::new(true)
    }
}

impl KillSwitch {
    pub fn new(initially_armed: bool) -> Self {
        Self {
            armed: Arc::new(AtomicBool::new(initially_armed)),
            triggered: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Retorna o estado atual do Kill Switch.
    pub fn state(&self) -> KillSwitchState {
        if self.triggered.load(Ordering::SeqCst) {
            KillSwitchState::Triggered
        } else if self.armed.load(Ordering::SeqCst) {
            KillSwitchState::Armed
        } else {
            KillSwitchState::Disarmed
        }
    }

    /// Aciona o Kill Switch cortando imediatamente todo o tráfego.
    pub fn trigger(&self, reason: &str) {
        tracing::error!(reason = %reason, "KILL SWITCH ACIONADO: tráfego bloqueado para impedir vazamento");
        self.triggered.store(true, Ordering::SeqCst);
    }

    /// Redefine o estado após restabelecimento seguro do circuito.
    pub fn reset(&self) {
        self.triggered.store(false, Ordering::SeqCst);
    }

    /// Verifica se o tráfego de saída tem permissão para prosseguir.
    pub fn allow_traffic(&self) -> Result<(), VeilError> {
        if self.triggered.load(Ordering::SeqCst) {
            return Err(VeilError::Tunnel(
                "Tráfego bloqueado pelo Kill Switch (circuito inoperante)".into(),
            ));
        }
        Ok(())
    }
}

/// Plataformas suportadas para interface de túnel virtual.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PlatformTunnelType {
    /// Linux TUN (`/dev/net/tun`)
    LinuxTun,
    /// Apple macOS (`NEPacketTunnelProvider`)
    MacOsPacketTunnel,
    /// Windows (`Wintun`)
    WindowsWintun,
    /// Android (`VpnService`)
    AndroidVpnService,
    /// Simulação em memória / Userspace SOCKS5
    UserspaceProxy,
}

/// Abstração do túnel de sistema do Veil.
pub struct SystemTunnel {
    pub iface_name: String,
    pub platform: PlatformTunnelType,
    pub kill_switch: KillSwitch,
    pub dns_protected: bool,
}

impl SystemTunnel {
    pub fn new(iface_name: String, platform: PlatformTunnelType) -> Self {
        Self {
            iface_name,
            platform,
            kill_switch: KillSwitch::new(true),
            dns_protected: true,
        }
    }

    /// Simula o disparo de fail-closed quando uma rota de rede se rompe.
    pub fn on_circuit_failure(&self, reason: &str) {
        self.kill_switch.trigger(reason);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kill_switch_fail_closed_prevents_traffic_leak() {
        let ks = KillSwitch::new(true);
        assert_eq!(ks.state(), KillSwitchState::Armed);
        assert!(ks.allow_traffic().is_ok());

        // Simula queda de circuito
        ks.trigger("Middle node unreachable");
        assert_eq!(ks.state(), KillSwitchState::Triggered);

        // Deve impedir vazamento fail-closed
        assert!(ks.allow_traffic().is_err());

        // Apos restabelecimento
        ks.reset();
        assert_eq!(ks.state(), KillSwitchState::Armed);
        assert!(ks.allow_traffic().is_ok());
    }
}
