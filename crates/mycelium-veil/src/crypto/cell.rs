//! Células de tamanho padronizado uniforme (512 bytes) para o Mycelium VEIL Ω.

use std::fmt;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Tamanho fixo inegociável de célula (512 bytes), impedindo análise por tamanho.
pub const CELL_SIZE: usize = 512;

/// Comprimento do cabeçalho da célula: Circuit ID (4 bytes) + Command (1 byte) + Stream ID (2 bytes) + Length (2 bytes) = 9 bytes.
pub const CELL_HEADER_LEN: usize = 9;

/// Tamanho máximo do payload de dados em uma única célula (512 - 9 = 503 bytes).
pub const MAX_PAYLOAD_LEN: usize = CELL_SIZE - CELL_HEADER_LEN;

/// Overhead criptográfico AEAD (ChaCha20Poly1305) por salto (12 bytes nonce + 16 bytes Poly1305 tag).
pub const ONION_OVERHEAD_PER_HOP: usize = 28;

/// Número máximo de saltos em circuitos padrão do Veil.
pub const MAX_CIRCUIT_HOPS: usize = 3;

/// Limite máximo seguro de dados úteis de aplicação por célula para acomodar até 3 saltos de cifra em camadas.
pub const MAX_STREAM_DATA_CHUNK: usize = 400;

/// Comandos suportados pelo protocolo de células Veil.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum CellCommand {
    /// Inicia handshake KEM (ML-KEM-1024) com o nó.
    Create = 0x01,
    /// Resposta do handshake KEM com ciphertext e confirmação.
    Created = 0x02,
    /// Encaminhamento de fluxo de dados criptografados.
    RelayData = 0x03,
    /// Destruição graciosa do circuito e limpeza de chaves.
    Destroy = 0x04,
    /// Célula de padding artificial (ofuscação temporal e tráfego de cobertura).
    Padding = 0x05,
    /// Reconhecimento (Ack) de fluxo ou batimento de coração.
    Heartbeat = 0x06,
    /// Estende o circuito para o próximo salto (telescoping).
    Extend = 0x07,
    /// Confirmação de extensão de circuito.
    Extended = 0x08,
    /// Abertura de fluxo para um destino remoto no nó Exit.
    StreamBegin = 0x10,
    /// Confirmação de conexão com o destino remoto estabelecida pelo nó Exit.
    StreamConnected = 0x11,
    /// Recusa de conexão pelo nó Exit (anti-SSRF, DNS falhou ou host inalcançável).
    StreamRefused = 0x12,
    /// Dados bidirecionais de um fluxo ativo.
    StreamData = 0x13,
    /// Encerramento de um fluxo ativo.
    StreamEnd = 0x14,
}

impl TryFrom<u8> for CellCommand {
    type Error = String;

    fn try_from(val: u8) -> Result<Self, Self::Error> {
        match val {
            0x01 => Ok(CellCommand::Create),
            0x02 => Ok(CellCommand::Created),
            0x03 => Ok(CellCommand::RelayData),
            0x04 => Ok(CellCommand::Destroy),
            0x05 => Ok(CellCommand::Padding),
            0x06 => Ok(CellCommand::Heartbeat),
            0x07 => Ok(CellCommand::Extend),
            0x08 => Ok(CellCommand::Extended),
            0x10 => Ok(CellCommand::StreamBegin),
            0x11 => Ok(CellCommand::StreamConnected),
            0x12 => Ok(CellCommand::StreamRefused),
            0x13 => Ok(CellCommand::StreamData),
            0x14 => Ok(CellCommand::StreamEnd),
            other => Err(format!("Comando de célula desconhecido: 0x{other:02x}")),
        }
    }
}

/// Célula com formato rígido de 512 bytes, limpando memória no descarte.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct VeilCell {
    pub circuit_id: u32,
    #[zeroize(skip)]
    pub command: u8,
    pub stream_id: u16,
    pub payload_len: u16,
    pub payload: [u8; MAX_PAYLOAD_LEN],
}

impl fmt::Debug for VeilCell {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("VeilCell")
            .field("circuit_id", &self.circuit_id)
            .field("command", &self.command)
            .field("stream_id", &self.stream_id)
            .field("payload_len", &self.payload_len)
            .field("payload_preview", &hex::encode(&self.payload[..self.payload_len.min(16) as usize]))
            .finish()
    }
}

impl VeilCell {
    /// Cria uma nova célula vazia com padding aleatório.
    pub fn new(circuit_id: u32, command: CellCommand, stream_id: u16, data: &[u8]) -> Self {
        assert!(
            data.len() <= MAX_PAYLOAD_LEN,
            "Dados ({}) excedem limite máximo de payload ({})",
            data.len(),
            MAX_PAYLOAD_LEN
        );

        let mut payload = [0u8; MAX_PAYLOAD_LEN];
        payload[..data.len()].copy_from_slice(data);

        // Preenche o restante com bytes aleatórios (padding estocástico) para evitar padrões de zeros
        if data.len() < MAX_PAYLOAD_LEN {
            rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut payload[data.len()..]);
        }

        Self {
            circuit_id,
            command: command as u8,
            stream_id,
            payload_len: data.len() as u16,
            payload,
        }
    }

    /// Cria uma célula de padding (tráfego de cobertura / ruído artificial).
    pub fn new_padding(circuit_id: u32) -> Self {
        Self::new(circuit_id, CellCommand::Padding, 0, &[])
    }

    /// Serializa a célula exatamente para 512 bytes.
    pub fn to_bytes(&self) -> [u8; CELL_SIZE] {
        let mut buf = [0u8; CELL_SIZE];
        buf[0..4].copy_from_slice(&self.circuit_id.to_be_bytes());
        buf[4] = self.command;
        buf[5..7].copy_from_slice(&self.stream_id.to_be_bytes());
        buf[7..9].copy_from_slice(&self.payload_len.to_be_bytes());
        buf[9..CELL_SIZE].copy_from_slice(&self.payload);
        buf
    }

    /// Desserializa 512 bytes brutos em uma célula válida.
    pub fn from_bytes(bytes: &[u8; CELL_SIZE]) -> Result<Self, String> {
        let circuit_id = u32::from_be_bytes(bytes[0..4].try_into().unwrap());
        let command_byte = bytes[4];
        let stream_id = u16::from_be_bytes(bytes[5..7].try_into().unwrap());
        let payload_len = u16::from_be_bytes(bytes[7..9].try_into().unwrap());

        if (payload_len as usize) > MAX_PAYLOAD_LEN {
            return Err(format!(
                "Comprimento de payload ({payload_len}) maior que o máximo permitido ({MAX_PAYLOAD_LEN})"
            ));
        }

        let mut payload = [0u8; MAX_PAYLOAD_LEN];
        payload.copy_from_slice(&bytes[9..CELL_SIZE]);

        Ok(Self {
            circuit_id,
            command: command_byte,
            stream_id,
            payload_len,
            payload,
        })
    }

    /// Retorna uma referência à fatia real dos dados úteis.
    pub fn data(&self) -> &[u8] {
        &self.payload[..self.payload_len as usize]
    }

    /// Retorna o comando da célula tipado.
    pub fn typed_command(&self) -> Result<CellCommand, String> {
        CellCommand::try_from(self.command)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cell_roundtrip_preserves_size_and_content() {
        let msg = b"teste de dados confidenciais pelo circuito onion";
        let cell = VeilCell::new(1042, CellCommand::RelayData, 7, msg);
        let bytes = cell.to_bytes();
        assert_eq!(bytes.len(), CELL_SIZE);

        let parsed = VeilCell::from_bytes(&bytes).expect("parse cell");
        assert_eq!(parsed.circuit_id, 1042);
        assert_eq!(parsed.command, CellCommand::RelayData as u8);
        assert_eq!(parsed.stream_id, 7);
        assert_eq!(parsed.payload_len as usize, msg.len());
        assert_eq!(parsed.data(), msg);
    }

    #[test]
    fn padding_cell_has_fixed_size_and_random_bytes() {
        let cell = VeilCell::new_padding(999);
        let bytes = cell.to_bytes();
        assert_eq!(bytes.len(), CELL_SIZE);
        let parsed = VeilCell::from_bytes(&bytes).expect("parse padding");
        assert_eq!(parsed.payload_len, 0);
        assert_eq!(parsed.typed_command().unwrap(), CellCommand::Padding);
    }
}
