//! Transporte PQC (ML-KEM-1024) — TCP + KEM + pipeline Noise+Yamux.
//!
//! O Transport fornece conexões TCP brutas após handshake KEM.
//! O Noise roda por cima (autenticação), seguido de Yamux (multiplex).
//!
//! A segurança é híbrida: o KEM protege contra quantum, o Noise provê
//! autenticação ed25519. Ambos os segredos são combinados no handshake híbrido.
//!
//! Multiaddr: `/unix/mycelium-pqc/<pk_hex>`

use futures::channel::mpsc;
use futures::future::{ready, Ready};
use futures::prelude::*;
use libp2p::core::muxing::StreamMuxerBox;
use libp2p::core::transport::{DialOpts, ListenerId, TransportError, TransportEvent};
use libp2p::core::upgrade::Version;
use libp2p::core::Transport;
use libp2p::multiaddr::{Multiaddr, Protocol};
use libp2p::{noise, yamux, PeerId};
use mycelium_pqc::{mlkem_decapsulate, mlkem_encapsulate, mlkem_keygen};
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use thiserror::Error;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;
use tokio::net::{TcpListener, TcpStream};
use tokio_util::compat::TokioAsyncReadCompatExt;

use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use tokio::io::{AsyncRead, AsyncWrite, ReadBuf};

#[derive(Debug, Error)]
pub enum PqcTransportError {
    #[error("{0}")]
    Msg(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

enum RxState {
    ReadingHeader { buf: [u8; 14], pos: usize },
    ReadingBody { nonce: [u8; 12], buf: Vec<u8>, pos: usize, target: usize },
}

/// Fluxo de transporte pós-quântico com criptografia de quadro simétrica ChaCha20-Poly1305.
pub struct PqcSecureStream<S> {
    inner: S,
    tx_cipher: ChaCha20Poly1305,
    tx_seq: u64,
    rx_cipher: ChaCha20Poly1305,
    rx_seq: u64,
    rx_state: RxState,
    read_buf: Vec<u8>,
    read_pos: usize,
    write_buf: Vec<u8>,
    write_pos: usize,
}

impl<S> PqcSecureStream<S> {
    pub fn new(inner: S, tx_key: [u8; 32], rx_key: [u8; 32]) -> Self {
        Self {
            inner,
            tx_cipher: ChaCha20Poly1305::new(Key::from_slice(&tx_key)),
            tx_seq: 0,
            rx_cipher: ChaCha20Poly1305::new(Key::from_slice(&rx_key)),
            rx_seq: 0,
            rx_state: RxState::ReadingHeader { buf: [0u8; 14], pos: 0 },
            read_buf: Vec::new(),
            read_pos: 0,
            write_buf: Vec::new(),
            write_pos: 0,
        }
    }

    pub fn get_ref(&self) -> &S {
        &self.inner
    }

    pub fn get_mut(&mut self) -> &mut S {
        &mut self.inner
    }
}

impl<S: AsyncRead + Unpin> AsyncRead for PqcSecureStream<S> {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();

        loop {
            // Se temos dados decifrados no buffer de leitura, entregamos ao chamador
            if this.read_pos < this.read_buf.len() {
                let to_copy = std::cmp::min(buf.remaining(), this.read_buf.len() - this.read_pos);
                buf.put_slice(&this.read_buf[this.read_pos..this.read_pos + to_copy]);
                this.read_pos += to_copy;
                if this.read_pos == this.read_buf.len() {
                    this.read_buf.clear();
                    this.read_pos = 0;
                }
                return Poll::Ready(Ok(()));
            }

            // Caso o chamador não tenha espaço no buffer, retornamos Ok
            if buf.remaining() == 0 {
                return Poll::Ready(Ok(()));
            }

            // Máquina de estados para ler o próximo quadro do stream subjacente
            match &mut this.rx_state {
                RxState::ReadingHeader { buf: h_buf, pos } => {
                    while *pos < 14 {
                        let mut read_slice = ReadBuf::new(&mut h_buf[*pos..14]);
                        match Pin::new(&mut this.inner).poll_read(cx, &mut read_slice) {
                            Poll::Ready(Ok(())) => {
                                let n = read_slice.filled().len();
                                if n == 0 {
                                    if *pos == 0 {
                                        // Fechamento limpo na fronteira do quadro
                                        return Poll::Ready(Ok(()));
                                    } else {
                                        return Poll::Ready(Err(std::io::Error::new(
                                            std::io::ErrorKind::UnexpectedEof,
                                            "EOF prematuro no cabeçalho do quadro PQC",
                                        )));
                                    }
                                }
                                *pos += n;
                            }
                            Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                            Poll::Pending => return Poll::Pending,
                        }
                    }

                    let target = u16::from_be_bytes([h_buf[0], h_buf[1]]) as usize;
                    let mut nonce = [0u8; 12];
                    nonce.copy_from_slice(&h_buf[2..14]);

                    this.rx_state = RxState::ReadingBody {
                        nonce,
                        buf: vec![0u8; target],
                        pos: 0,
                        target,
                    };
                }
                RxState::ReadingBody { nonce, buf: b_buf, pos, target } => {
                    let target_len = *target;
                    let nonce_val = *nonce;
                    while *pos < target_len {
                        let mut read_slice = ReadBuf::new(&mut b_buf[*pos..target_len]);
                        match Pin::new(&mut this.inner).poll_read(cx, &mut read_slice) {
                            Poll::Ready(Ok(())) => {
                                let n = read_slice.filled().len();
                                if n == 0 {
                                    return Poll::Ready(Err(std::io::Error::new(
                                        std::io::ErrorKind::UnexpectedEof,
                                        "EOF prematuro no corpo do quadro PQC",
                                    )));
                                }
                                *pos += n;
                            }
                            Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                            Poll::Pending => return Poll::Pending,
                        }
                    }

                    // Verifica número de sequência monotônico do nonce
                    let seq = u64::from_be_bytes(nonce_val[4..12].try_into().unwrap());
                    if seq != this.rx_seq {
                        return Poll::Ready(Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            format!("Sequência PQC inesperada: {seq} (esperado: {})", this.rx_seq),
                        )));
                    }
                    this.rx_seq += 1;

                    let pt = this.rx_cipher
                        .decrypt(Nonce::from_slice(&nonce_val), b_buf.as_slice())
                        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;

                    this.read_buf = pt;
                    this.read_pos = 0;
                    this.rx_state = RxState::ReadingHeader { buf: [0u8; 14], pos: 0 };
                }
            }
        }
    }
}

impl<S: AsyncWrite + Unpin> AsyncWrite for PqcSecureStream<S> {
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        let this = self.get_mut();

        // 1. Drena buffer pendente caso haja gravação em andamento
        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao drenar quadro PQC",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => return Poll::Pending,
            }
        }

        if this.write_pos == this.write_buf.len() {
            this.write_buf.clear();
            this.write_pos = 0;
        }

        if buf.is_empty() {
            return Poll::Ready(Ok(0));
        }

        // 2. Fragmenta até 16KB por quadro criptografado ChaCha20-Poly1305
        let chunk_size = std::cmp::min(buf.len(), 16384);
        let chunk = &buf[..chunk_size];

        let mut nonce = [0u8; 12];
        nonce[4..12].copy_from_slice(&this.tx_seq.to_be_bytes());
        this.tx_seq += 1;

        let ciphertext = this.tx_cipher
            .encrypt(Nonce::from_slice(&nonce), chunk)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        let frame_len = ciphertext.len() as u16;
        let mut frame = Vec::with_capacity(2 + 12 + ciphertext.len());
        frame.extend_from_slice(&frame_len.to_be_bytes());
        frame.extend_from_slice(&nonce);
        frame.extend_from_slice(&ciphertext);

        this.write_buf = frame;
        this.write_pos = 0;

        // Tenta gravar imediatamente parte do quadro montado
        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao gravar quadro PQC",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => break,
            }
        }

        Poll::Ready(Ok(chunk_size))
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();
        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao flush PQC",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => return Poll::Pending,
            }
        }
        if this.write_pos == this.write_buf.len() {
            this.write_buf.clear();
            this.write_pos = 0;
        }
        Pin::new(&mut this.inner).poll_flush(cx)
    }

    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();
        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => break,
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => return Poll::Pending,
            }
        }
        Pin::new(&mut this.inner).poll_shutdown(cx)
    }
}

type IncomingTx = mpsc::UnboundedSender<(PqcSecureStream<TcpStream>, Multiaddr)>;

struct ListenerState {
    addr: Multiaddr,
    tell_new_addr: bool,
    incoming_rx: mpsc::UnboundedReceiver<(PqcSecureStream<TcpStream>, Multiaddr)>,
}

/// Transporte TCP + KEM com encriptação AEAD simétrica de fio (ChaCha20-Poly1305).
pub struct PqcTransport {
    local_kp: Arc<mycelium_pqc::KemKeyPair>,
    local_pk_hex: String,
    listeners: HashMap<ListenerId, ListenerState>,
}

impl PqcTransport {
    pub fn new() -> Result<Self, PqcTransportError> {
        let kp = mlkem_keygen();
        let pk_hex = hex::encode(&kp.public_key);
        Ok(Self {
            local_kp: Arc::new(kp),
            local_pk_hex: pk_hex,
            listeners: HashMap::new(),
        })
    }

    pub fn public_key_hex(&self) -> &str {
        &self.local_pk_hex
    }

    /// Multiaddr de listen: `/tcp/<port>/unix/mycelium-pqc/<pk_hex>`
    fn encode_multiaddr(&self, port: u16) -> Multiaddr {
        let path = format!("mycelium-pqc/{}", self.local_pk_hex);
        Multiaddr::empty()
            .with(Protocol::Tcp(port))
            .with(Protocol::Unix(path.into()))
    }

    fn parse_pk_hex(addr: &Multiaddr) -> Option<String> {
        let mut iter = addr.iter();
        let _port = iter.next()?; // Tcp
        match iter.next()? {
            Protocol::Unix(path) => path.strip_prefix("mycelium-pqc/").map(|s| s.to_string()),
            _ => None,
        }
    }

    /// Extrai o host e porta de destino a partir do Multiaddr (suporta IPv4, IPv6 e DNS).
    pub fn parse_remote_target(addr: &Multiaddr) -> Result<String, PqcTransportError> {
        let mut host = "127.0.0.1".to_string();
        let mut port = None;
        for proto in addr.iter() {
            match proto {
                Protocol::Ip4(ip) => host = ip.to_string(),
                Protocol::Ip6(ip) => host = format!("[{ip}]"),
                Protocol::Dns(d) | Protocol::Dns4(d) | Protocol::Dns6(d) | Protocol::Dnsaddr(d) => {
                    host = d.to_string();
                }
                Protocol::Tcp(p) => port = Some(p),
                _ => {}
            }
        }
        let port = port.ok_or_else(|| PqcTransportError::Msg("Multiaddr missing TCP port".into()))?;
        Ok(format!("{host}:{port}"))
    }
}

/// Deriva uma chave de sessão simétrica autenticada a partir do segredo ML-KEM compartilhado e contexto.
pub fn derive_pqc_session_key(shared_secret: &[u8], context: &[u8]) -> [u8; 32] {
    let mut h = blake3::Hasher::new_keyed(&[
        0x56, 0x45, 0x49, 0x4c, 0x2d, 0x50, 0x51, 0x43, // VEIL-PQC
        0x53, 0x45, 0x53, 0x53, 0x49, 0x4f, 0x4e, 0x2d, // SESSION-
        0x4b, 0x45, 0x59, 0x2d, 0x44, 0x45, 0x52, 0x49, // KEY-DERI
        0x56, 0x41, 0x54, 0x49, 0x4f, 0x4e, 0x2d, 0x31, // VATION-1
    ]);
    h.update(shared_secret);
    h.update(context);
    *h.finalize().as_bytes()
}

impl Transport for PqcTransport {
    type Output = tokio_util::compat::Compat<PqcSecureStream<TcpStream>>;
    type Error = PqcTransportError;
    type ListenerUpgrade = Ready<Result<Self::Output, Self::Error>>;
    type Dial = Pin<Box<dyn Future<Output = Result<Self::Output, Self::Error>> + Send>>;

    fn listen_on(
        &mut self,
        id: ListenerId,
        addr: Multiaddr,
    ) -> Result<(), TransportError<Self::Error>> {
        let port = match Self::parse_pk_hex(&addr) {
            Some(_) => match addr.iter().next() {
                Some(Protocol::Tcp(p)) => p,
                _ => return Err(TransportError::MultiaddrNotSupported(addr)),
            },
            None => return Err(TransportError::MultiaddrNotSupported(addr)),
        };
        let bind = format!("0.0.0.0:{port}")
            .parse::<std::net::SocketAddr>()
            .map_err(|e| TransportError::Other(PqcTransportError::Msg(e.to_string())))?;

        let kp = Arc::clone(&self.local_kp);
        let listen_addr = self.encode_multiaddr(port);
        let (tx, rx): (IncomingTx, _) = mpsc::unbounded();

        tokio::spawn(async move {
            let listener = match TcpListener::bind(bind).await {
                Ok(l) => l,
                Err(e) => {
                    tracing::warn!(error = %e, "pqc listen");
                    return;
                }
            };
            loop {
                match listener.accept().await {
                    Ok((mut stream, peer_addr)) => {
                        let mut ct = vec![0u8; 1568];
                        if stream.read_exact(&mut ct).await.is_err() {
                            continue;
                        }
                        let ss = match mlkem_decapsulate(kp.private_bytes(), &ct) {
                            Ok(s) => s,
                            Err(_) => continue,
                        };
                        // Vincula o segredo pós-quântico compartilhado à transcrição simétrica da sessão
                        let session_key = derive_pqc_session_key(&ss, b"mycelium-pqc-v1-hybrid-transcript");
                        let mut client_auth = [0u8; 32];
                        if stream.read_exact(&mut client_auth).await.is_err() {
                            continue;
                        }
                        let expected_client_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-client-auth");
                        if client_auth != *expected_client_auth.as_bytes() {
                            tracing::warn!("handshake PQC: falha na autenticação do cliente");
                            continue;
                        }
                        let server_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-server-auth");
                        if stream.write_all(server_auth.as_bytes()).await.is_err() {
                            continue;
                        }
                        if stream.flush().await.is_err() {
                            continue;
                        }

                        // Encripta todo o tráfego subsequente no fio com ChaCha20-Poly1305
                        let rx_key = blake3::keyed_hash(&session_key, b"pqc-wire-client-to-server");
                        let tx_key = blake3::keyed_hash(&session_key, b"pqc-wire-server-to-client");
                        let secure_stream = PqcSecureStream::new(stream, *tx_key.as_bytes(), *rx_key.as_bytes());

                        let peer_maddr = Multiaddr::empty()
                            .with(Protocol::Tcp(peer_addr.port()));
                        let _ = tx.unbounded_send((secure_stream, peer_maddr));
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "pqc accept");
                        break;
                    }
                }
            }
        });

        self.listeners.insert(
            id,
            ListenerState {
                addr: listen_addr,
                tell_new_addr: true,
                incoming_rx: rx,
            },
        );
        Ok(())
    }

    fn remove_listener(&mut self, id: ListenerId) -> bool {
        self.listeners.remove(&id).is_some()
    }

    fn dial(
        &mut self,
        addr: Multiaddr,
        _opts: DialOpts,
    ) -> Result<Self::Dial, TransportError<Self::Error>> {
        let pk_hex = Self::parse_pk_hex(&addr)
            .ok_or_else(|| TransportError::MultiaddrNotSupported(addr.clone()))?;
        let remote = Self::parse_remote_target(&addr)
            .map_err(TransportError::Other)?;
        let _kp = Arc::clone(&self.local_kp);

        Ok(Box::pin(async move {
            let mut stream = TcpStream::connect(&remote).await?;
            let peer_pk = hex::decode(&pk_hex)
                .map_err(|e| PqcTransportError::Msg(e.to_string()))?;
            let enc = mlkem_encapsulate(&peer_pk)
                .map_err(|e| PqcTransportError::Msg(e.to_string()))?;
            // Vincula o segredo pós-quântico compartilhado à transcrição simétrica da discagem
            let session_key = derive_pqc_session_key(&enc.shared_secret, b"mycelium-pqc-v1-hybrid-transcript");
            let client_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-client-auth");

            stream.write_all(&enc.ciphertext).await?;
            stream.write_all(client_auth.as_bytes()).await?;
            stream.flush().await?;

            let mut server_auth = [0u8; 32];
            stream.read_exact(&mut server_auth).await?;
            let expected_server_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-server-auth");
            if server_auth != *expected_server_auth.as_bytes() {
                return Err(PqcTransportError::Msg("Autenticação mútua do servidor PQC falhou".into()));
            }

            // Encripta todo o tráfego de discagem no fio com ChaCha20-Poly1305
            let tx_key = blake3::keyed_hash(&session_key, b"pqc-wire-client-to-server");
            let rx_key = blake3::keyed_hash(&session_key, b"pqc-wire-server-to-client");
            let secure_stream = PqcSecureStream::new(stream, *tx_key.as_bytes(), *rx_key.as_bytes());

            Ok(secure_stream.compat())
        }))
    }

    fn poll(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<TransportEvent<Self::ListenerUpgrade, Self::Error>> {
        let this = self.get_mut();
        let ids: Vec<ListenerId> = this.listeners.keys().copied().collect();
        for id in ids {
            let listener = match this.listeners.get_mut(&id) {
                Some(l) => l,
                None => continue,
            };
            if listener.tell_new_addr {
                listener.tell_new_addr = false;
                return Poll::Ready(TransportEvent::NewAddress {
                    listener_id: id,
                    listen_addr: listener.addr.clone(),
                });
            }
            match listener.incoming_rx.poll_next_unpin(cx) {
                Poll::Ready(Some((stream, peer_addr))) => {
                    return Poll::Ready(TransportEvent::Incoming {
                        listener_id: id,
                        upgrade: ready(Ok(stream.compat())),
                        local_addr: listener.addr.clone(),
                        send_back_addr: peer_addr,
                    });
                }
                Poll::Ready(None) => {
                    this.listeners.remove(&id);
                    return Poll::Ready(TransportEvent::ListenerClosed {
                        listener_id: id,
                        reason: Ok(()),
                    });
                }
                Poll::Pending => {}
            }
        }
        Poll::Pending
    }
}

// --- Handshake híbrido (pós-Noise) ---

pub struct HybridSecret {
    pub combined: [u8; 32],
    pub pqc_raw: Vec<u8>,
}

pub fn generate_pqc_keypair() -> mycelium_pqc::KemKeyPair {
    mlkem_keygen()
}

pub fn client_handshake(
    server_pk: &[u8],
    noise_secret: &[u8; 32],
) -> Result<(HybridSecret, Vec<u8>), String> {
    let enc = mlkem_encapsulate(server_pk).map_err(|e| e.to_string())?;
    let combined = blake3::hash(&[noise_secret.as_slice(), &enc.shared_secret].concat());
    let ct = enc.ciphertext.clone();
    Ok((
        HybridSecret {
            combined: *combined.as_bytes(),
            pqc_raw: enc.shared_secret.clone(),
        },
        ct,
    ))
}

pub fn server_handshake(
    private_key: &[u8],
    ciphertext: &[u8],
    noise_secret: &[u8; 32],
) -> Result<HybridSecret, String> {
    let shared = mlkem_decapsulate(private_key, ciphertext).map_err(|e| e.to_string())?;
    let combined = blake3::hash(&[noise_secret.as_slice(), &shared].concat());
    Ok(HybridSecret {
        combined: *combined.as_bytes(),
        pqc_raw: shared,
    })
}

pub const MLKEM_CIPHERTEXT_LEN: usize = 1568;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hybrid_handshake_roundtrip() {
        let server_kp = generate_pqc_keypair();
        let noise = [42u8; 32];
        let (client_result, ct) = client_handshake(&server_kp.public_key, &noise).unwrap();
        assert_eq!(ct.len(), MLKEM_CIPHERTEXT_LEN);
        let server_result = server_handshake(server_kp.private_bytes(), &ct, &noise).unwrap();
        assert_eq!(client_result.combined, server_result.combined);
    }

    #[test]
    fn different_noise_gives_different_combined() {
        let server_kp = generate_pqc_keypair();
        let (a, _) = client_handshake(&server_kp.public_key, &[1u8; 32]).unwrap();
        let (b, _) = client_handshake(&server_kp.public_key, &[2u8; 32]).unwrap();
        assert_ne!(a.combined, b.combined);
    }

    #[test]
    fn pqc_multiaddr_roundtrip() {
        let path = format!("mycelium-pqc/aabbccdd");
        let addr = Multiaddr::empty()
            .with(Protocol::Tcp(4003))
            .with(Protocol::Unix(path.into()));
        let pk = PqcTransport::parse_pk_hex(&addr).unwrap();
        assert_eq!(pk, "aabbccdd");
    }

    #[test]
    fn pqc_remote_target_parsing() {
        let path = "mycelium-pqc/aabbccdd";
        let addr_v4 = Multiaddr::empty()
            .with(Protocol::Ip4([198, 51, 100, 1].into()))
            .with(Protocol::Tcp(4003))
            .with(Protocol::Unix(path.into()));
        assert_eq!(PqcTransport::parse_remote_target(&addr_v4).unwrap(), "198.51.100.1:4003");

        let addr_dns = Multiaddr::empty()
            .with(Protocol::Dns("exit.veil.network".into()))
            .with(Protocol::Tcp(9050))
            .with(Protocol::Unix(path.into()));
        assert_eq!(PqcTransport::parse_remote_target(&addr_dns).unwrap(), "exit.veil.network:9050");
    }

    #[test]
    fn pqc_session_key_derivation() {
        let shared = [7u8; 32];
        let k1 = derive_pqc_session_key(&shared, b"context-a");
        let k2 = derive_pqc_session_key(&shared, b"context-b");
        assert_ne!(k1, k2);
        assert_eq!(k1, derive_pqc_session_key(&shared, b"context-a"));
    }

    #[tokio::test]
    async fn pqc_mutual_auth_handshake_flow() {
        let server_kp = generate_pqc_keypair();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let srv_priv = server_kp.private_bytes().to_vec();
        let srv_task = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut ct = vec![0u8; 1568];
            stream.read_exact(&mut ct).await.unwrap();
            let ss = mlkem_decapsulate(&srv_priv, &ct).unwrap();
            let session_key = derive_pqc_session_key(&ss, b"mycelium-pqc-v1-hybrid-transcript");
            let mut client_auth = [0u8; 32];
            stream.read_exact(&mut client_auth).await.unwrap();
            assert_eq!(client_auth, *blake3::keyed_hash(&session_key, b"mycelium-pqc-client-auth").as_bytes());
            let server_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-server-auth");
            stream.write_all(server_auth.as_bytes()).await.unwrap();
            stream.flush().await.unwrap();
        });

        let mut client_stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        let enc = mlkem_encapsulate(&server_kp.public_key).unwrap();
        let session_key = derive_pqc_session_key(&enc.shared_secret, b"mycelium-pqc-v1-hybrid-transcript");
        let client_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-client-auth");
        client_stream.write_all(&enc.ciphertext).await.unwrap();
        client_stream.write_all(client_auth.as_bytes()).await.unwrap();
        client_stream.flush().await.unwrap();

        let mut server_auth = [0u8; 32];
        client_stream.read_exact(&mut server_auth).await.unwrap();
        assert_eq!(server_auth, *blake3::keyed_hash(&session_key, b"mycelium-pqc-server-auth").as_bytes());

        srv_task.await.unwrap();
    }

    #[tokio::test]
    async fn test_pqc_stream_wire_ciphertext_verification() {
        let server_kp = generate_pqc_keypair();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let srv_priv = server_kp.private_bytes().to_vec();
        let srv_task = tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.unwrap();
            let mut ct = vec![0u8; 1568];
            stream.read_exact(&mut ct).await.unwrap();
            let ss = mlkem_decapsulate(&srv_priv, &ct).unwrap();
            let session_key = derive_pqc_session_key(&ss, b"mycelium-pqc-v1-hybrid-transcript");
            let mut client_auth = [0u8; 32];
            stream.read_exact(&mut client_auth).await.unwrap();
            let server_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-server-auth");
            stream.write_all(server_auth.as_bytes()).await.unwrap();
            stream.flush().await.unwrap();

            let rx_key = blake3::keyed_hash(&session_key, b"pqc-wire-client-to-server");
            let tx_key = blake3::keyed_hash(&session_key, b"pqc-wire-server-to-client");
            let mut secure = PqcSecureStream::new(stream, *tx_key.as_bytes(), *rx_key.as_bytes());

            let mut buf = vec![0u8; 1024];
            let n = secure.read(&mut buf).await.unwrap();
            assert_eq!(&buf[..n], b"top-secret-pqc-payload");

            secure.write_all(b"resposta-servidor-pqc").await.unwrap();
            secure.flush().await.unwrap();
        });

        let mut client_stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        let enc = mlkem_encapsulate(&server_kp.public_key).unwrap();
        let session_key = derive_pqc_session_key(&enc.shared_secret, b"mycelium-pqc-v1-hybrid-transcript");
        let client_auth = blake3::keyed_hash(&session_key, b"mycelium-pqc-client-auth");
        client_stream.write_all(&enc.ciphertext).await.unwrap();
        client_stream.write_all(client_auth.as_bytes()).await.unwrap();
        client_stream.flush().await.unwrap();

        let mut server_auth = [0u8; 32];
        client_stream.read_exact(&mut server_auth).await.unwrap();

        let tx_key = blake3::keyed_hash(&session_key, b"pqc-wire-client-to-server");
        let rx_key = blake3::keyed_hash(&session_key, b"pqc-wire-server-to-client");
        let mut client_secure = PqcSecureStream::new(client_stream, *tx_key.as_bytes(), *rx_key.as_bytes());

        client_secure.write_all(b"top-secret-pqc-payload").await.unwrap();
        client_secure.flush().await.unwrap();

        let mut resp = vec![0u8; 1024];
        let n = client_secure.read(&mut resp).await.unwrap();
        assert_eq!(&resp[..n], b"resposta-servidor-pqc");

        srv_task.await.unwrap();
    }
}

/// Constrói transporte registável via `SwarmBuilder::with_other_transport`.
pub fn build(
    keypair: &libp2p::identity::Keypair,
) -> Result<libp2p::core::transport::Boxed<(PeerId, StreamMuxerBox)>, String> {
    let noise_cfg = noise::Config::new(keypair).map_err(|e| e.to_string())?;
    let transport = PqcTransport::new()
        .map_err(|e| e.to_string())?
        .upgrade(Version::V1)
        .authenticate(noise_cfg)
        .multiplex(yamux::Config::default())
        .map(|(peer, muxer), _| (peer, StreamMuxerBox::new(muxer)))
        .boxed();
    Ok(transport)
}
