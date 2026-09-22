//! Servidor Proxy SOCKS5 Local (RFC 1928) com Prevenção de Vazamento de DNS.
//!
//! Nomes de domínio (ATYP=0x03) NUNCA são resolvidos na máquina local:
//! são encapsulados diretamente dentro do túnel Veil e resolvidos apenas no nó Exit.

use crate::VeilError;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

/// Tipos de endereço de destino SOCKS5.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Socks5Target {
    Ip(SocketAddr),
    Domain(String, u16),
}

impl Socks5Target {
    pub fn to_target_string(&self) -> String {
        match self {
            Socks5Target::Ip(addr) => addr.to_string(),
            Socks5Target::Domain(domain, port) => format!("{domain}:{port}"),
        }
    }

    /// Serializa o destino para o formato padronizado SOCKS5 [ATYP + Addr + Port].
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        match self {
            Socks5Target::Ip(SocketAddr::V4(v4)) => {
                buf.push(0x01);
                buf.extend_from_slice(&v4.ip().octets());
                buf.extend_from_slice(&v4.port().to_be_bytes());
            }
            Socks5Target::Ip(SocketAddr::V6(v6)) => {
                buf.push(0x04);
                buf.extend_from_slice(&v6.ip().octets());
                buf.extend_from_slice(&v6.port().to_be_bytes());
            }
            Socks5Target::Domain(domain, port) => {
                buf.push(0x03);
                buf.push(domain.len() as u8);
                buf.extend_from_slice(domain.as_bytes());
                buf.extend_from_slice(&port.to_be_bytes());
            }
        }
        buf
    }

    /// Desserializa bytes no formato padronizado SOCKS5.
    pub fn decode(bytes: &[u8]) -> Result<Self, VeilError> {
        if bytes.is_empty() {
            return Err(VeilError::Socks5("Dados de destino vazios".into()));
        }
        match bytes[0] {
            0x01 => {
                if bytes.len() < 7 {
                    return Err(VeilError::Socks5("Tamanho de IPv4 inválido".into()));
                }
                let ip = Ipv4Addr::new(bytes[1], bytes[2], bytes[3], bytes[4]);
                let port = u16::from_be_bytes([bytes[5], bytes[6]]);
                Ok(Socks5Target::Ip(SocketAddr::new(IpAddr::V4(ip), port)))
            }
            0x03 => {
                if bytes.len() < 2 {
                    return Err(VeilError::Socks5("Tamanho de domínio inválido".into()));
                }
                let len = bytes[1] as usize;
                if bytes.len() < 2 + len + 2 {
                    return Err(VeilError::Socks5("Dados de domínio incompletos".into()));
                }
                let domain = String::from_utf8_lossy(&bytes[2..2 + len]).to_string();
                let port = u16::from_be_bytes([bytes[2 + len], bytes[3 + len]]);
                Ok(Socks5Target::Domain(domain, port))
            }
            0x04 => {
                if bytes.len() < 19 {
                    return Err(VeilError::Socks5("Tamanho de IPv6 inválido".into()));
                }
                let mut octets = [0u8; 16];
                octets.copy_from_slice(&bytes[1..17]);
                let ip = Ipv6Addr::from(octets);
                let port = u16::from_be_bytes([bytes[17], bytes[18]]);
                Ok(Socks5Target::Ip(SocketAddr::new(IpAddr::V6(ip), port)))
            }
            other => Err(VeilError::Socks5(format!("Tipo ATYP desconhecido: 0x{other:02x}"))),
        }
    }
}

/// Servidor SOCKS5 local.
pub struct Socks5Server {
    bind_addr: SocketAddr,
}

impl Socks5Server {
    pub fn new(bind_addr: SocketAddr) -> Self {
        Self { bind_addr }
    }

    /// Executa o handshake SOCKS5 com o cliente e obtém o alvo solicitado.
    pub async fn handle_handshake(stream: &mut TcpStream) -> Result<Socks5Target, VeilError> {
        // 1. Negociação de versão e método de autenticação
        let mut ver_buf = [0u8; 2];
        stream
            .read_exact(&mut ver_buf)
            .await
            .map_err(|e| VeilError::Socks5(format!("Erro ao ler versão SOCKS5: {e}")))?;

        if ver_buf[0] != 0x05 {
            return Err(VeilError::Socks5(format!(
                "Versão SOCKS inválida: 0x{:02x} (esperado 0x05)",
                ver_buf[0]
            )));
        }

        let num_methods = ver_buf[1] as usize;
        let mut methods = vec![0u8; num_methods];
        stream
            .read_exact(&mut methods)
            .await
            .map_err(|e| VeilError::Socks5(format!("Erro ao ler métodos de autenticação: {e}")))?;

        // Responde com método 0x00 (sem autenticação)
        stream
            .write_all(&[0x05, 0x00])
            .await
            .map_err(|e| VeilError::Socks5(format!("Erro ao responder método: {e}")))?;

        // 2. Leitura da solicitação de conexão (Request)
        let mut req_header = [0u8; 4];
        stream
            .read_exact(&mut req_header)
            .await
            .map_err(|e| VeilError::Socks5(format!("Erro ao ler cabeçalho de solicitação: {e}")))?;

        if req_header[0] != 0x05 {
            return Err(VeilError::Socks5("Versão inválida na solicitação".into()));
        }

        let cmd = req_header[1];
        if cmd != 0x01 {
            // Apenas comando CONNECT (0x01) é suportado no momento
            let _ = stream.write_all(&[0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]).await;
            return Err(VeilError::Socks5(format!(
                "Comando SOCKS5 0x{:02x} não suportado (apenas CONNECT)",
                cmd
            )));
        }

        let atyp = req_header[3];
        let target = match atyp {
            0x01 => {
                // IPv4: 4 bytes + 2 bytes de porta
                let mut addr_buf = [0u8; 4];
                stream
                    .read_exact(&mut addr_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler IPv4: {e}")))?;
                let mut port_buf = [0u8; 2];
                stream
                    .read_exact(&mut port_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler porta IPv4: {e}")))?;
                let ip = Ipv4Addr::from(addr_buf);
                let port = u16::from_be_bytes(port_buf);
                Socks5Target::Ip(SocketAddr::new(IpAddr::V4(ip), port))
            }
            0x03 => {
                // Domain Name: 1 byte de tamanho + N bytes de domínio + 2 bytes de porta
                let mut len_buf = [0u8; 1];
                stream
                    .read_exact(&mut len_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler tamanho de domínio: {e}")))?;
                let domain_len = len_buf[0] as usize;
                let mut domain_buf = vec![0u8; domain_len];
                stream
                    .read_exact(&mut domain_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler domínio: {e}")))?;
                let mut port_buf = [0u8; 2];
                stream
                    .read_exact(&mut port_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler porta de domínio: {e}")))?;

                let domain = String::from_utf8_lossy(&domain_buf).to_string();
                let port = u16::from_be_bytes(port_buf);

                // NÃO resolve DNS aqui! Preserva como domínio para resolução remota no Exit
                Socks5Target::Domain(domain, port)
            }
            0x04 => {
                // IPv6: 16 bytes + 2 bytes de porta
                let mut addr_buf = [0u8; 16];
                stream
                    .read_exact(&mut addr_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler IPv6: {e}")))?;
                let mut port_buf = [0u8; 2];
                stream
                    .read_exact(&mut port_buf)
                    .await
                    .map_err(|e| VeilError::Socks5(format!("Erro ao ler porta IPv6: {e}")))?;
                let ip = Ipv6Addr::from(addr_buf);
                let port = u16::from_be_bytes(port_buf);
                Socks5Target::Ip(SocketAddr::new(IpAddr::V6(ip), port))
            }
            other => {
                let _ = stream.write_all(&[0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]).await;
                return Err(VeilError::Socks5(format!(
                    "Tipo de endereço ATYP=0x{other:02x} não suportado"
                )));
            }
        };

        Ok(target)
    }

    /// Inicia o listener SOCKS5 local em background.
    pub async fn bind(&self) -> Result<TcpListener, VeilError> {
        TcpListener::bind(self.bind_addr)
            .await
            .map_err(|e| VeilError::Socks5(format!("Falha no bind SOCKS5 em {}: {e}", self.bind_addr)))
    }
}

use crate::planes::live::LiveCircuitClient;
use crate::tunnel::KillSwitch;
use std::sync::Arc;

/// Executa a ponte bidirecional completa entre o stream TCP do cliente SOCKS5
/// e o circuito onion Veil (sem nenhuma conexão direta local ao destino).
pub async fn proxy_socks5_connection(
    mut client_stream: TcpStream,
    circuit: Arc<LiveCircuitClient>,
    kill_switch: KillSwitch,
) -> Result<(), VeilError> {
    kill_switch.allow_traffic()?;

    // 1. Handshake SOCKS5 (obtém o target sem resolução de DNS local!)
    let target = Socks5Server::handle_handshake(&mut client_stream).await?;

    // 2. Abre fluxo através do circuito onion (apenas o nó Exit remoto conecta ao destino)
    let stream = match circuit.open_stream(&target).await {
        Ok(s) => {
            // [VER=0x05] [REP=0x00 SUCESSO] [RSV=0x00] [ATYP=0x01 IPv4] [127.0.0.1] [PORT=1080]
            client_stream
                .write_all(&[0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0x04, 0x38])
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao enviar confirmação CONNECT: {e}")))?;
            s
        }
        Err(e) => {
            let rep = match &e {
                VeilError::Exit(msg)
                    if msg.contains("proibido")
                        || msg.contains("privado")
                        || msg.contains("restrita")
                        || msg.contains("bloqueada") =>
                {
                    0x02 // Connection not allowed by ruleset (anti-SSRF / política)
                }
                _ => 0x04, // Host unreachable / General failure
            };
            let _ = client_stream
                .write_all(&[0x05, rep, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
                .await;
            return Err(e);
        }
    };

    let (mut client_reader, mut client_writer) = client_stream.into_split();
    let (mut stream_reader, stream_writer) = stream.split();

    let ks_c2r = kill_switch.clone();

    // Tarefa: Cliente Local -> Circuito Onion (células de 512 bytes)
    let client_to_circuit = async move {
        let mut buf = [0u8; 8192];
        loop {
            ks_c2r.allow_traffic()?;
            let n = client_reader
                .read(&mut buf)
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao ler do cliente: {e}")))?;
            if n == 0 {
                let _ = stream_writer.close().await;
                break;
            }
            ks_c2r.allow_traffic()?;
            stream_writer.send_data(&buf[..n]).await?;
        }
        Ok::<(), VeilError>(())
    };

    let ks_r2c = kill_switch.clone();

    // Tarefa: Circuito Onion (células de 512 bytes) -> Cliente Local
    let circuit_to_client = async move {
        loop {
            ks_r2c.allow_traffic()?;
            match stream_reader.receive_data().await? {
                Some(data) => {
                    ks_r2c.allow_traffic()?;
                    client_writer
                        .write_all(&data)
                        .await
                        .map_err(|e| VeilError::Socks5(format!("Erro ao escrever no cliente: {e}")))?;
                }
                None => break, // Fim do fluxo / EOF
            }
        }
        Ok::<(), VeilError>(())
    };

    tokio::select! {
        res = client_to_circuit => res,
        res = circuit_to_client => res,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn socks5_target_string_representation() {
        let ip_target = Socks5Target::Ip("93.184.216.34:80".parse().unwrap());
        assert_eq!(ip_target.to_target_string(), "93.184.216.34:80");

        let domain_target = Socks5Target::Domain("check.torproject.org".into(), 443);
        assert_eq!(domain_target.to_target_string(), "check.torproject.org:443");
    }
}
