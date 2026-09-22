//! Configuração e modos de operação do Mycelium VEIL Ω.

use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

/// Modos de operação do Veil, balanceando anonimato vs. desempenho.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VeilMode {
    /// 1 salto: Conectividade direta cifrada até um Exit voluntário de outra região.
    /// Baixa latência, localização aparente alterada.
    /// ATENÇÃO: O nó Exit conhece seu IP real de origem! Não oferece anonimato forte.
    Geo,
    /// 3 saltos: Circuito Onion completo (Guard -> Middle -> Exit).
    /// Separação estrita de informações de rede; latência interativa (< 200ms).
    Veil,
    /// Mixnet com atrasos de Poisson, embaralhamento em lotes e tráfego de cobertura.
    /// Alta resistência contra adversários globais passivos (GPA); latência elevada.
    Mix,
}

impl Default for VeilMode {
    fn default() -> Self {
        Self::Veil
    }
}

/// Política de encaminhamento do Nó de Saída (Exit Node).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExitPolicy {
    /// Se verdadeiro, bloqueia estritamente todos os endereços RFC 1918, loopback e CGNAT.
    pub block_private_networks: bool,
    /// Portas TCP permitidas (lista vazia = todas permitidas exceto bloqueadas).
    pub allowed_ports: Vec<u16>,
    /// Portas TCP explicitamente bloqueadas (ex.: 25 para SMTP).
    pub blocked_ports: Vec<u16>,
    /// Limite de taxa de largura de banda por circuito em bytes por segundo (0 = ilimitado).
    pub max_bandwidth_bps: u64,
}

impl Default for ExitPolicy {
    fn default() -> Self {
        Self {
            block_private_networks: true,
            allowed_ports: vec![],
            blocked_ports: vec![25, 465, 587], // Bloqueia envio de spam por padrão
            max_bandwidth_bps: 10 * 1024 * 1024, // 10 MB/s por padrão
        }
    }
}

/// Configuração central do cliente e motor Veil.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VeilConfig {
    /// Modo operacional ativo.
    pub mode: VeilMode,
    /// Quantidade de saltos intermediários (padrão: 3 para Veil, 1 para Geo).
    pub max_hops: usize,
    /// Tamanho uniforme de fragmentos e células (padrão: 512 bytes).
    pub cell_size: usize,
    /// Intervalo de rotação do endereço MAC local administrado em segundos.
    pub ephemeral_mac_rotation_secs: u64,
    /// Modo Zero-Trace: operação exclusivamente em RAM com descarte seguro (`Zeroize`).
    pub zero_trace_mode: bool,
    /// Kill Switch ativo: interrompe imediatamente qualquer tráfego desprotegido em caso de falha.
    pub kill_switch_enabled: bool,
    /// Endereço de bind local para o proxy SOCKS5 (ex.: "127.0.0.1:1080").
    pub socks5_bind: SocketAddr,
    /// Política de saída caso este nó também atue voluntariamente como Exit.
    pub exit_policy: ExitPolicy,
    /// Taxa média de emissão de tráfego de cobertura no modo MIX (mensagens por segundo).
    pub mix_cover_rate_hz: f64,
    /// Atraso médio de Poisson no modo MIX em milissegundos.
    pub mix_poisson_mean_delay_ms: u64,
}

impl Default for VeilConfig {
    fn default() -> Self {
        Self {
            mode: VeilMode::Veil,
            max_hops: 3,
            cell_size: 512,
            ephemeral_mac_rotation_secs: 3600, // 1 hora (evita instabilidade de Wi-Fi)
            zero_trace_mode: true,
            kill_switch_enabled: true,
            socks5_bind: "127.0.0.1:1080".parse().expect("valid socks5 addr"),
            exit_policy: ExitPolicy::default(),
            mix_cover_rate_hz: 0.2, // 1 mensagem de cobertura a cada 5 segundos
            mix_poisson_mean_delay_ms: 1500, // 1.5s de delay médio
        }
    }
}

impl VeilConfig {
    /// Cria configuração para modo Geo (rápido, 1 salto, streaming).
    pub fn new_geo(socks5_port: u16) -> Self {
        Self {
            mode: VeilMode::Geo,
            max_hops: 1,
            socks5_bind: SocketAddr::from(([127, 0, 0, 1], socks5_port)),
            ..Default::default()
        }
    }

    /// Cria configuração para modo Veil (padrão, 3 saltos, onion routing).
    pub fn new_veil(socks5_port: u16) -> Self {
        Self {
            mode: VeilMode::Veil,
            max_hops: 3,
            socks5_bind: SocketAddr::from(([127, 0, 0, 1], socks5_port)),
            ..Default::default()
        }
    }

    /// Cria configuração para modo Mix (alta latência, mixnet com tráfego de cobertura).
    pub fn new_mix() -> Self {
        Self {
            mode: VeilMode::Mix,
            max_hops: 3,
            ..Default::default()
        }
    }
}
