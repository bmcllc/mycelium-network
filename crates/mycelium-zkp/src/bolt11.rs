//! **BOLT11 Invoice Parsing nativo** — port de `ET-COSMIC-OLD/void_core/src/ldk.rs`.
//!
//! Parse + validação de BOLT11 Lightning invoices para a camada de voucher
//! economy (ATP/Plasma). Sem geração (uso NWC/NIP-47 em vez de secp256k1
//! signing direto, como no void_core).
//!
//! Requer feature `bolt11` (dep: `lightning-invoice =0.33.2`).

use lightning_invoice::{Bolt11Invoice, Currency};

// ─── Tipos públicos ──────────────────────────────────────────────────────────

/// Resumo de um invoice BOLT11 parseado (paridade com `parse_bolt11` do void_core,
/// mas como struct em vez de JSON string).
#[derive(Debug, Clone, PartialEq)]
pub struct InvoiceSummary {
    pub amount_sat: u64,
    pub description: String,
    pub payment_hash: String,
    pub timestamp: u64,
    pub expiry: u64,
    pub network: Network,
}

/// Rede Bitcoin associada ao invoice.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Network {
    Bitcoin,
    Testnet,
    Regtest,
    Simnet,
    Signet,
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Network::Bitcoin => write!(f, "bitcoin"),
            Network::Testnet => write!(f, "testnet"),
            Network::Regtest => write!(f, "regtest"),
            Network::Simnet => write!(f, "simnet"),
            Network::Signet => write!(f, "signet"),
        }
    }
}

fn currency_to_network(c: &Currency) -> Network {
    match c {
        Currency::Bitcoin => Network::Bitcoin,
        Currency::BitcoinTestnet => Network::Testnet,
        Currency::Regtest => Network::Regtest,
        Currency::Simnet => Network::Simnet,
        Currency::Signet => Network::Signet,
    }
}

// ─── API pública ─────────────────────────────────────────────────────────────

/// Parse de invoice BOLT11 → `InvoiceSummary`. Equivalente a `parse_bolt11` do
/// void_core (retorna struct em vez de JSON).
pub fn parse_bolt11(bolt11_str: &str) -> Result<InvoiceSummary, String> {
    let invoice: Bolt11Invoice = bolt11_str
        .parse()
        .map_err(|e| format!("falha ao parsear BOLT11: {e}"))?;

    let amount_sat = invoice.amount_milli_satoshis().unwrap_or(0) / 1000;

    let description = match invoice.description() {
        lightning_invoice::Bolt11InvoiceDescriptionRef::Direct(s) => s.to_string(),
        lightning_invoice::Bolt11InvoiceDescriptionRef::Hash(_) => "[hash]".to_string(),
    };

    let payment_hash = invoice.payment_hash().to_string();
    let timestamp = invoice.duration_since_epoch().as_secs();
    let expiry = invoice.expiry_time().as_secs();
    let network = currency_to_network(&invoice.currency());

    Ok(InvoiceSummary {
        amount_sat,
        description,
        payment_hash,
        timestamp,
        expiry,
        network,
    })
}

/// Validade de invoice BOLT11. Equivalente a `validate_bolt11` do void_core.
pub fn validate_bolt11(bolt11_str: &str) -> bool {
    bolt11_str.parse::<Bolt11Invoice>().is_ok()
}

/// Extrai payment hash de invoice BOLT11. Equivalente a `extract_payment_hash` do void_core.
pub fn extract_payment_hash(bolt11_str: &str) -> Result<String, String> {
    let invoice: Bolt11Invoice = bolt11_str
        .parse()
        .map_err(|e| format!("falha ao parsear BOLT11: {e}"))?;
    Ok(invoice.payment_hash().to_string())
}

// ─── Testes ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // Invoice BOLT11 de teste (bitcoin, com payment secret — obrigatório nas
    // versões atuais do lightning-invoice). Vetor tirado dos testes oficiais do crate.
    const TEST_INVOICE_MAINNET: &str = "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql";

    #[test]
    fn parse_mainnet_ok() {
        let s = parse_bolt11(TEST_INVOICE_MAINNET).unwrap();
        assert_eq!(s.network, Network::Bitcoin);
        assert_eq!(s.amount_sat, 0); // Sem valor explícito — donor decide
        assert_eq!(s.description, "Please consider supporting this project");
        assert!(!s.payment_hash.is_empty());
        assert!(s.expiry > 0);
    }

    #[test]
    fn validate_true_e_false() {
        assert!(validate_bolt11(TEST_INVOICE_MAINNET));
        assert!(!validate_bolt11("lnbcgibberish"));
        assert!(!validate_bolt11(""));
    }

    #[test]
    fn extract_payment_hash_roundtrip() {
        let ph = extract_payment_hash(TEST_INVOICE_MAINNET).unwrap();
        assert_eq!(ph, parse_bolt11(TEST_INVOICE_MAINNET).unwrap().payment_hash);
    }
}
