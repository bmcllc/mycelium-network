//! Transporte seguro pós-quântico de enlace para o Mycelium VEIL Ω.
//!
//! Envolve streams de rede (ex.: TCP) com aperto de mão ML-KEM-1024 e cifragem simétrica
//! de quadros ChaCha20-Poly1305 com nonces monotônicos e chaves direcionais segregadas.

use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use mycelium_pqc::{mlkem_decapsulate, mlkem_encapsulate, KemKeyPair};
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, ReadBuf};

use crate::VeilError;

enum RxState {
    ReadingHeader { buf: [u8; 14], pos: usize },
    ReadingBody { nonce: [u8; 12], buf: Vec<u8>, pos: usize, target: usize },
}

/// Fluxo de transporte PQC de enlace com enquadramento autenticado ChaCha20-Poly1305.
pub struct VeilSecureStream<S> {
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

impl<S> VeilSecureStream<S> {
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

impl<S: AsyncRead + Unpin> AsyncRead for VeilSecureStream<S> {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();

        loop {
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

            if buf.remaining() == 0 {
                return Poll::Ready(Ok(()));
            }

            match &mut this.rx_state {
                RxState::ReadingHeader { buf: h_buf, pos } => {
                    while *pos < 14 {
                        let mut read_slice = ReadBuf::new(&mut h_buf[*pos..14]);
                        match Pin::new(&mut this.inner).poll_read(cx, &mut read_slice) {
                            Poll::Ready(Ok(())) => {
                                let n = read_slice.filled().len();
                                if n == 0 {
                                    if *pos == 0 {
                                        return Poll::Ready(Ok(()));
                                    } else {
                                        return Poll::Ready(Err(std::io::Error::new(
                                            std::io::ErrorKind::UnexpectedEof,
                                            "EOF prematuro no cabeçalho do quadro Veil",
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
                                        "EOF prematuro no corpo do quadro Veil",
                                    )));
                                }
                                *pos += n;
                            }
                            Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                            Poll::Pending => return Poll::Pending,
                        }
                    }

                    let seq = u64::from_be_bytes(nonce_val[4..12].try_into().unwrap());
                    if seq != this.rx_seq {
                        return Poll::Ready(Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            format!("Sequência de enlace Veil inválida: {seq} (esperado: {})", this.rx_seq),
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

impl<S: AsyncWrite + Unpin> AsyncWrite for VeilSecureStream<S> {
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        let this = self.get_mut();

        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao drenar quadro de enlace Veil",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => return Poll::Pending,
            }
        }

        this.write_buf.clear();
        this.write_pos = 0;

        if buf.is_empty() {
            return Poll::Ready(Ok(0));
        }

        let max_chunk = 16384;
        let chunk_len = std::cmp::min(buf.len(), max_chunk);
        let chunk = &buf[..chunk_len];

        let mut nonce_bytes = [0u8; 12];
        nonce_bytes[4..12].copy_from_slice(&this.tx_seq.to_be_bytes());
        this.tx_seq += 1;

        let ciphertext = this.tx_cipher
            .encrypt(Nonce::from_slice(&nonce_bytes), chunk)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

        let frame_len = ciphertext.len();
        if frame_len > u16::MAX as usize {
            return Poll::Ready(Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Quadro de enlace excede u16::MAX",
            )));
        }

        let mut frame = Vec::with_capacity(14 + frame_len);
        frame.extend_from_slice(&(frame_len as u16).to_be_bytes());
        frame.extend_from_slice(&nonce_bytes);
        frame.extend_from_slice(&ciphertext);

        this.write_buf = frame;
        this.write_pos = 0;

        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao iniciar quadro de enlace Veil",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => {
                    return Poll::Ready(Ok(chunk_len));
                }
            }
        }

        this.write_buf.clear();
        this.write_pos = 0;
        Poll::Ready(Ok(chunk_len))
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        let this = self.get_mut();
        while this.write_pos < this.write_buf.len() {
            match Pin::new(&mut this.inner).poll_write(cx, &this.write_buf[this.write_pos..]) {
                Poll::Ready(Ok(0)) => {
                    return Poll::Ready(Err(std::io::Error::new(
                        std::io::ErrorKind::WriteZero,
                        "write zero ao flush de quadro Veil",
                    )));
                }
                Poll::Ready(Ok(n)) => {
                    this.write_pos += n;
                }
                Poll::Ready(Err(e)) => return Poll::Ready(Err(e)),
                Poll::Pending => return Poll::Pending,
            }
        }
        this.write_buf.clear();
        this.write_pos = 0;
        Pin::new(&mut this.inner).poll_flush(cx)
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        Pin::new(&mut self.inner).poll_shutdown(cx)
    }
}

/// Estabelece o canal autenticado PQC no cliente enviando a decapsulação ML-KEM-1024.
pub async fn link_handshake_client<S: AsyncReadExt + AsyncWriteExt + Unpin>(
    mut stream: S,
    peer_kem_key: &[u8],
) -> Result<VeilSecureStream<S>, VeilError> {
    let enc = mlkem_encapsulate(peer_kem_key)
        .map_err(|e| VeilError::Crypto(format!("Falha no KEM encapsulate de enlace: {e}")))?;
    stream.write_all(&enc.ciphertext).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    stream.flush().await.map_err(|e| VeilError::Circuit(e.to_string()))?;

    let tx_key = blake3::derive_key("mycelium-veil-link-tx-v1", &enc.shared_secret);
    let rx_key = blake3::derive_key("mycelium-veil-link-rx-v1", &enc.shared_secret);
    Ok(VeilSecureStream::new(stream, tx_key, rx_key))
}

/// Estabelece o canal autenticado PQC no servidor recebendo a decapsulação ML-KEM-1024.
pub async fn link_handshake_server<S: AsyncReadExt + AsyncWriteExt + Unpin>(
    mut stream: S,
    keypair: &KemKeyPair,
) -> Result<VeilSecureStream<S>, VeilError> {
    let mut ct = vec![0u8; 1568];
    stream.read_exact(&mut ct).await.map_err(|e| VeilError::Circuit(e.to_string()))?;
    let shared = mlkem_decapsulate(keypair.private_bytes(), &ct)
        .map_err(|e| VeilError::Crypto(format!("Falha no KEM decapsulate de enlace: {e}")))?;

    let rx_key = blake3::derive_key("mycelium-veil-link-tx-v1", &shared);
    let tx_key = blake3::derive_key("mycelium-veil-link-rx-v1", &shared);
    Ok(VeilSecureStream::new(stream, tx_key, rx_key))
}
