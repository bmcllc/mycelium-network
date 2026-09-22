//! Nó de Saída (Exit Node): Encaminhamento e Política de Egress.
//!
//! Conecta à internet pública, resolve DNS remotamente, protege redes
//! internas voluntárias contra SSRF e aplica quotas de tráfego.

use crate::config::ExitPolicy;
use crate::socks5::Socks5Target;
use crate::VeilError;
use std::net::IpAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::TcpStream;

/// Validador de política de saída e segurança contra abusos/SSRF.
pub struct ExitPolicyValidator {
    policy: ExitPolicy,
    total_bytes_forwarded: Arc<AtomicU64>,
}

impl ExitPolicyValidator {
    pub fn new(policy: ExitPolicy) -> Self {
        Self {
            policy,
            total_bytes_forwarded: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Verifica se um endereço IP é considerado privado/interno/não roteável na internet pública.
    pub fn is_private_or_restricted(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(v4) => {
                let octets = v4.octets();
                // 127.0.0.0/8 (Loopback)
                octets[0] == 127
                // 10.0.0.0/8 (RFC 1918)
                || octets[0] == 10
                // 172.16.0.0/12 (RFC 1918)
                || (octets[0] == 172 && (16..=31).contains(&octets[1]))
                // 192.168.0.0/16 (RFC 1918)
                || (octets[0] == 192 && octets[1] == 168)
                // 169.254.0.0/16 (Link-Local)
                || (octets[0] == 169 && octets[1] == 254)
                // 100.64.0.0/10 (Shared Address Space / CGNAT)
                || (octets[0] == 100 && (64..=127).contains(&octets[1]))
                // 0.0.0.0/8 (Current network)
                || octets[0] == 0
                // 192.0.0.0/24 (IETF Protocol Assignments)
                || (octets[0] == 192 && octets[1] == 0 && octets[2] == 0)
                // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation)
                || (octets[0] == 192 && octets[1] == 0 && octets[2] == 2)
                || (octets[0] == 198 && octets[1] == 51 && octets[2] == 100)
                || (octets[0] == 203 && octets[1] == 0 && octets[2] == 113)
                // 198.18.0.0/15 (Benchmarking)
                || (octets[0] == 198 && (18..=19).contains(&octets[1]))
                // 224.0.0.0/4 (Multicast e Reservado)
                || octets[0] >= 224
            }
            IpAddr::V6(v6) => {
                let segments = v6.segments();
                let octets = v6.octets();

                // IPv4-mapped IPv6 (::ffff:0:0/96)
                if let Some(v4) = v6.to_ipv4_mapped() {
                    return Self::is_private_or_restricted(&IpAddr::V4(v4));
                }

                // ::1 (Loopback) ou :: (Unspecified)
                v6.is_loopback() || v6.is_unspecified()
                // fc00::/7 (Unique Local Addresses - ULA / Private)
                || (octets[0] & 0xfe) == 0xfc
                // fe80::/10 (Link-Local Unicast)
                || (octets[0] == 0xfe && (octets[1] & 0xc0) == 0x80)
                // fec0::/10 (Site-Local deprecated)
                || (octets[0] == 0xfe && (octets[1] & 0xc0) == 0xc0)
                // ff00::/8 (Multicast)
                || octets[0] == 0xff
                // 2001:db8::/32 (Documentation)
                || (segments[0] == 0x2001 && segments[1] == 0x0db8)
                // 100::/64 (Discard-only)
                || (segments[0] == 0x0100 && segments[1] == 0)
            }
        }
    }

    /// Valida se o destino solicitado é permitido pelas regras do nó Exit.
    pub fn validate_target(&self, target: &Socks5Target) -> Result<(), VeilError> {
        let port = match target {
            Socks5Target::Ip(addr) => addr.port(),
            Socks5Target::Domain(_, p) => *p,
        };

        // Verifica portas bloqueadas
        if self.policy.blocked_ports.contains(&port) {
            return Err(VeilError::Exit(format!(
                "Porta {port} bloqueada pela política de saída deste nó"
            )));
        }

        // Verifica portas permitidas (se a lista não estiver vazia)
        if !self.policy.allowed_ports.is_empty() && !self.policy.allowed_ports.contains(&port) {
            return Err(VeilError::Exit(format!(
                "Porta {port} não está na lista de portas permitidas deste nó"
            )));
        }

        // Se o alvo for IP direto e o bloqueio de rede privada estiver ativo
        if self.policy.block_private_networks {
            if let Socks5Target::Ip(addr) = target {
                if Self::is_private_or_restricted(&addr.ip()) {
                    return Err(VeilError::Exit(
                        "Acesso a redes privadas/internas proibido (proteção anti-SSRF)".into()
                    ));
                }
            }
        }

        Ok(())
    }

    /// Registra bytes encaminhados para contabilidade e controle de taxa.
    pub fn record_bytes(&self, bytes: u64) {
        self.total_bytes_forwarded.fetch_add(bytes, Ordering::Relaxed);
    }
}

/// Encaminhador do Nó de Saída (conecta ao destino na internet real).
pub struct ExitForwarder {
    validator: ExitPolicyValidator,
}

impl ExitForwarder {
    pub fn new(policy: ExitPolicy) -> Self {
        Self {
            validator: ExitPolicyValidator::new(policy),
        }
    }

    /// Conecta ao destino público solicitado pelo cliente através do circuito.
    pub async fn connect_to_target(&self, target: &Socks5Target) -> Result<TcpStream, VeilError> {
        self.validator.validate_target(target)?;

        let connect_addr = match target {
            Socks5Target::Ip(addr) => {
                if self.validator.policy.block_private_networks && ExitPolicyValidator::is_private_or_restricted(&addr.ip()) {
                    return Err(VeilError::Exit("Acesso a endereço IP privado/restrito proibido (anti-SSRF)".into()));
                }
                *addr
            }
            Socks5Target::Domain(domain, port) => {
                // Valida antes de conectar: resolução DNS remota no Exit
                let resolved_addrs = tokio::net::lookup_host((domain.as_str(), *port))
                    .await
                    .map_err(|e| VeilError::Exit(format!("Falha na resolução remota de DNS: {e}")))?;

                let mut chosen = None;
                for addr in resolved_addrs {
                    if self.validator.policy.block_private_networks && ExitPolicyValidator::is_private_or_restricted(&addr.ip()) {
                        return Err(VeilError::Exit("Domínio resolve para rede privada/restrita; abortado por proteção anti-SSRF".into()));
                    }
                    if chosen.is_none() {
                        chosen = Some(addr);
                    }
                }

                chosen.ok_or_else(|| VeilError::Exit("Nenhum endereço resolvido para o domínio".into()))?
            }
        };

        // Log sem dados identificáveis de tráfego de navegação (Zero Logging)
        tracing::debug!("Nó Exit abrindo conexão de saída autorizada");

        let stream = TcpStream::connect(connect_addr)
            .await
            .map_err(|e| VeilError::Exit(format!("Falha ao conectar no destino remoto: {e}")))?;

        // Dupla validação pós-conexão para prevenir race conditions de DNS rebinding
        if self.validator.policy.block_private_networks {
            if let Ok(peer) = stream.peer_addr() {
                if ExitPolicyValidator::is_private_or_restricted(&peer.ip()) {
                    return Err(VeilError::Exit("Conexão estabelecida com IP privado; abortada por anti-SSRF".into()));
                }
            }
        }

        Ok(stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_ip_filtering_detects_rfc1918_and_loopback() {
        assert!(ExitPolicyValidator::is_private_or_restricted(&"127.0.0.1".parse().unwrap()));
        assert!(ExitPolicyValidator::is_private_or_restricted(&"10.0.0.1".parse().unwrap()));
        assert!(ExitPolicyValidator::is_private_or_restricted(&"172.16.1.1".parse().unwrap()));
        assert!(ExitPolicyValidator::is_private_or_restricted(&"192.168.1.1".parse().unwrap()));
        assert!(ExitPolicyValidator::is_private_or_restricted(&"100.64.0.1".parse().unwrap()));

        // IPs públicos reais não devem ser bloqueados
        assert!(!ExitPolicyValidator::is_private_or_restricted(&"93.184.216.34".parse().unwrap()));
        assert!(!ExitPolicyValidator::is_private_or_restricted(&"1.1.1.1".parse().unwrap()));
    }

    #[test]
    fn policy_blocks_smtp_port_by_default() {
        let validator = ExitPolicyValidator::new(ExitPolicy::default());
        let smtp_target = Socks5Target::Domain("mail.example.com".into(), 25);
        assert!(validator.validate_target(&smtp_target).is_err());

        let https_target = Socks5Target::Domain("example.com".into(), 443);
        assert!(validator.validate_target(&https_target).is_ok());
    }
}
