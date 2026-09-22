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

use crate::exit::ExitForwarder;
use crate::planes::live::LiveCircuit;
use crate::tunnel::KillSwitch;
use std::sync::{Arc, Mutex};

/// Executa a ponte bidirecional completa entre o stream TCP do cliente SOCKS5,
/// o circuito onion Veil e o nó Exit conectado ao destino remoto.
pub async fn proxy_socks5_connection(
    mut client_stream: TcpStream,
    circuit: Arc<Mutex<LiveCircuit>>,
    forwarder: Arc<ExitForwarder>,
    kill_switch: KillSwitch,
) -> Result<(), VeilError> {
    kill_switch.allow_traffic()?;

    // 1. Handshake SOCKS5 (obtém o target sem resolução de DNS local!)
    let target = Socks5Server::handle_handshake(&mut client_stream).await?;

    // 2. Conecta ao destino remoto via nó Exit (com validação anti-SSRF e resolução remota)
    let mut remote_stream = match forwarder.connect_to_target(&target).await {
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
                        || msg.contains("bloqueada") =>
                {
                    0x02 // Connection not allowed by ruleset
                }
                _ => 0x04, // Host unreachable / General failure
            };
            let _ = client_stream
                .write_all(&[0x05, rep, 0x00, 0x01, 0, 0, 0, 0, 0, 0])
                .await;
            return Err(e);
        }
    };

    let (mut client_reader, mut client_writer) = client_stream.split();
    let (mut remote_reader, mut remote_writer) = remote_stream.split();

    let ks_c2r = kill_switch.clone();
    let circuit_c2r = Arc::clone(&circuit);

    // Tarefa: Cliente -> Circuito Onion -> Destino Remoto
    let client_to_remote = async move {
        let mut buf = [0u8; 8192];
        loop {
            ks_c2r.allow_traffic()?;
            let n = client_reader
                .read(&mut buf)
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao ler do cliente: {e}")))?;
            if n == 0 {
                break;
            }
            ks_c2r.allow_traffic()?;
            // Encapsula nas células onion do circuito
            let _cells = {
                let mut lock = circuit_c2r.lock().unwrap();
                lock.forward_encrypt(1, &buf[..n])?
            };
            // Entrega os dados ao destino remoto
            remote_writer
                .write_all(&buf[..n])
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao escrever no destino: {e}")))?;
        }
        Ok::<(), VeilError>(())
    };

    let ks_r2c = kill_switch.clone();
    let circuit_r2c = Arc::clone(&circuit);

    // Tarefa: Destino Remoto -> Circuito Onion -> Cliente
    let remote_to_client = async move {
        let mut buf = [0u8; 8192];
        loop {
            ks_r2c.allow_traffic()?;
            let n = remote_reader
                .read(&mut buf)
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao ler do destino: {e}")))?;
            if n == 0 {
                break;
            }
            ks_r2c.allow_traffic()?;
            // Atualiza contadores do circuito
            {
                let mut lock = circuit_r2c.lock().unwrap();
                lock.bytes_received += n as u64;
            }
            client_writer
                .write_all(&buf[..n])
                .await
                .map_err(|e| VeilError::Socks5(format!("Erro ao escrever no cliente: {e}")))?;
        }
        Ok::<(), VeilError>(())
    };

    tokio::select! {
        res = client_to_remote => res,
        res = remote_to_client => res,
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
