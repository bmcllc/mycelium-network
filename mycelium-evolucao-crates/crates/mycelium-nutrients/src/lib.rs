//! # mycelium-nutrients
//!
//! Economia do Substrato: não há cobrança em dinheiro fiat. Quem alimenta
//! a rede é alimentado pela rede. Este ledger é local e sem consenso
//! distribuído nesta fase — cada nó contabiliza os nutrientes que produz
//! e consome; a liquidação via gossip é trabalho futuro.

use mycelium_core::{ContentId, NodeId, Nutrient, Resources};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ed25519_dalek::{Signer, Verifier};

/// Erros da economia bioquímica.
#[derive(Debug, thiserror::Error)]
pub enum NutrientError {
    #[error("saldo insuficiente de {nutrient}: tem {have}, precisa de {need}")]
    Starved {
        nutrient: Nutrient,
        have: u64,
        need: u64,
    },
    #[error("voucher: payer_key não deriva o payer declarado")]
    KeyMismatch,
    #[error("voucher: assinatura ed25519 inválida")]
    BadSignature(#[from] ed25519_dalek::SignatureError),
    #[error("voucher já resgatado (replay)")]
    Replayed,
    #[error("voucher: invoice BOLT11 inválido (Lightning não validou)")]
    InvalidBolt11,
}

/// Um lançamento no ledger.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Exchange {
    pub counterparty: Option<NodeId>,
    pub nutrient: Nutrient,
    /// Positivo = ganho; negativo = gasto.
    pub delta: i64,
    pub memo: String,
}

/// Ledger local de nutrientes de um nó.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Ledger {
    balances: HashMap<Nutrient, u64>,
    history: Vec<Exchange>,
    /// IDs dos vouchers já resgatados (guarda anti-replay).
    #[serde(default)]
    redeemed: std::collections::HashSet<ContentId>,
}

/// Payload canônico do voucher — exatamente o que é assinado.
#[derive(Serialize)]
struct VoucherPayload<'a> {
    payer: &'a NodeId,
    payee: &'a NodeId,
    nutrient: Nutrient,
    amount: u64,
    memo: &'a str,
    clock: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    bolt11: Option<&'a str>,
}

/// Voucher de liquidação: o **pagador** assina a transferência de nutrientes
/// ao **beneficiário**, que credita o saldo só com assinatura válida.
/// Consenso leve sem Raft — não-repudiabilidade por ed25519 + guarda
/// anti-replay no ledger do beneficiário.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Voucher {
    pub payer: NodeId,
    pub payee: NodeId,
    pub nutrient: Nutrient,
    pub amount: u64,
    pub memo: String,
    /// Relógio lógico (unix secs na emissão).
    pub clock: u64,
    /// Chave pública ed25519 do pagador (NodeId::derive(payer_key) == payer).
    pub payer_key: [u8; 32],
    /// Assinatura ed25519 sobre o payload canônico.
    pub signature: Vec<u8>,
    /// Invoice BOLT11 (Lightning) opcional — quando presente, o resgate exige
    /// e valida o invoice antes de creditar (economia voucher autenticada por
    /// Lightning). Coberto pela assinatura ed25519 (não-repudiável).
    pub bolt11: Option<String>,
}

impl Voucher {
    /// Payload canônico — exatamente o que deve ser assinado.
    pub fn payload_bytes(&self) -> Vec<u8> {
        serde_json::to_vec(&VoucherPayload {
            payer: &self.payer,
            payee: &self.payee,
            nutrient: self.nutrient,
            amount: self.amount,
            memo: &self.memo,
            clock: self.clock,
            bolt11: self.bolt11.as_deref(),
        })
        .unwrap_or_default()
    }

    /// Identidade content-addressed do voucher (payload + assinatura).
    pub fn id(&self) -> ContentId {
        let mut bytes = self.payload_bytes();
        bytes.extend_from_slice(&self.signature);
        ContentId::of(&bytes)
    }

    /// Assina com a chave do pagador (sobrescreve payer pela chave usada).
    pub fn sign(mut self, signing: &ed25519_dalek::SigningKey) -> Self {
        let vk = signing.verifying_key();
        self.payer_key = vk.to_bytes();
        self.payer = mycelium_core::NodeId::derive(vk.as_bytes());
        self.signature = signing.sign(&self.payload_bytes()).to_bytes().to_vec();
        self
    }

    /// Verifica ligação chave↔payer e a assinatura ed25519.
    pub fn verify(&self) -> Result<(), NutrientError> {
        if mycelium_core::NodeId::derive(&self.payer_key) != self.payer {
            return Err(NutrientError::KeyMismatch);
        }
        let key = ed25519_dalek::VerifyingKey::from_bytes(&self.payer_key)?;
        let sig = ed25519_dalek::Signature::from_slice(&self.signature)?;
        key.verify(&self.payload_bytes(), &sig)?;
        Ok(())
    }
}

impl Ledger {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn balance(&self, nutrient: Nutrient) -> u64 {
        self.balances.get(&nutrient).copied().unwrap_or(0)
    }

    pub fn history(&self) -> &[Exchange] {
        &self.history
    }

    /// Credita nutrientes ganhos por uma contribuição.
    pub fn feed(&mut self, nutrient: Nutrient, amount: u64, memo: impl Into<String>) {
        *self.balances.entry(nutrient).or_default() += amount;
        self.history.push(Exchange {
            counterparty: None,
            nutrient,
            delta: amount as i64,
            memo: memo.into(),
        });
    }

    /// Consome nutrientes para trocar por recursos de outro nó.
    pub fn metabolize(
        &mut self,
        nutrient: Nutrient,
        amount: u64,
        counterparty: Option<NodeId>,
        memo: impl Into<String>,
    ) -> Result<(), NutrientError> {
        let have = self.balance(nutrient);
        if have < amount {
            return Err(NutrientError::Starved {
                nutrient,
                have,
                need: amount,
            });
        }
        *self.balances.entry(nutrient).or_default() -= amount;
        self.history.push(Exchange {
            counterparty,
            nutrient,
            delta: -(amount as i64),
            memo: memo.into(),
        });
        Ok(())
    }

    /// Credita a recompensa inicial pela contribuição declarada de recursos,
    /// segundo a tabela do manifesto:
    /// CPU→ATP, RAM→Enzymes, Storage→Mycelia, Bandwidth→Spores.
    pub fn pledge(&mut self, resources: &Resources) {
        if resources.cpu_cores > 0 {
            self.feed(
                Nutrient::Atp,
                resources.cpu_cores as u64 * 10,
                "pledge: cpu",
            );
        }
        if resources.ram_mib > 0 {
            self.feed(Nutrient::Enzymes, resources.ram_mib / 512, "pledge: ram");
        }
        if resources.storage_gib > 0 {
            self.feed(Nutrient::Mycelia, resources.storage_gib, "pledge: storage");
        }
        if resources.bandwidth_mbps > 0 {
            self.feed(
                Nutrient::Spores,
                resources.bandwidth_mbps,
                "pledge: bandwidth",
            );
        }
    }

    /// Recompensa contínua por uptime (chamada periodicamente).
    pub fn heartbeat(&mut self, hours: u64) {
        self.feed(Nutrient::Resilience, hours, "uptime heartbeat");
    }

    /// Resgata um voucher assinado: verifica assinatura, credita o
    /// beneficiário e registra o id anti-replay.
    pub fn redeem_voucher(&mut self, voucher: &Voucher) -> Result<(), NutrientError> {
        voucher.verify()?;
        // **Validação BOLT11**: se o voucher carrega um invoice Lightning, o
        // resgate exige que ele seja válido antes de creditar (economia voucher
        // autenticada por Lightning). Sem a feature, o campo vira só memo.
        #[cfg(feature = "bolt11")]
        if let Some(inv) = &voucher.bolt11 {
            if !mycelium_zkp::bolt11::validate_bolt11(inv) {
                return Err(NutrientError::InvalidBolt11);
            }
        }
        let id = voucher.id();
        if self.redeemed.contains(&id) {
            return Err(NutrientError::Replayed);
        }
        self.feed(
            voucher.nutrient,
            voucher.amount,
            format!(
                "voucher de {}… : {memo}",
                voucher.payer.short(),
                memo = voucher.memo
            ),
        );
        self.redeemed.insert(id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pledge_credits_all_currencies() {
        let mut ledger = Ledger::new();
        let r: Resources = "2cpu,4gb,100gb,50mbps".parse().unwrap();
        ledger.pledge(&r);
        assert_eq!(ledger.balance(Nutrient::Atp), 20);
        assert_eq!(ledger.balance(Nutrient::Enzymes), 8);
        assert_eq!(ledger.balance(Nutrient::Mycelia), 100);
        assert_eq!(ledger.balance(Nutrient::Spores), 50);
        assert_eq!(ledger.balance(Nutrient::Resilience), 0);
    }

    #[test]
    fn cannot_metabolize_more_than_balance() {
        let mut ledger = Ledger::new();
        ledger.feed(Nutrient::Atp, 5, "test");
        let err = ledger
            .metabolize(Nutrient::Atp, 10, None, "deploy")
            .unwrap_err();
        assert!(matches!(
            err,
            NutrientError::Starved {
                have: 5,
                need: 10,
                ..
            }
        ));
        assert!(ledger.metabolize(Nutrient::Atp, 5, None, "deploy").is_ok());
        assert_eq!(ledger.balance(Nutrient::Atp), 0);
    }

    #[test]
    fn history_records_exchanges() {
        let mut ledger = Ledger::new();
        ledger.feed(Nutrient::Spores, 3, "relay");
        ledger.heartbeat(1);
        assert_eq!(ledger.history().len(), 2);
    }

    fn test_keys(seed: u8) -> ed25519_dalek::SigningKey {
        ed25519_dalek::SigningKey::from_bytes(&[seed; 32])
    }

    fn hosting_voucher(signer: &ed25519_dalek::SigningKey, payee: NodeId) -> Voucher {
        Voucher {
            payer: NodeId::derive(&[]), // sign() sobrescreve pela chave
            payee,
            nutrient: Nutrient::Atp,
            amount: 5,
            memo: "réplica de webapp".into(),
            clock: 1_700_000_000,
            payer_key: [0; 32],
            signature: vec![],
            bolt11: None,
        }
        .sign(signer)
    }

    #[test]
    fn voucher_signs_and_verifies() {
        let payer = test_keys(1);
        let payee = NodeId::derive(b"host");
        let v = hosting_voucher(&payer, payee);

        // Ligação chave↔payer é automática.
        assert_eq!(v.payer, NodeId::derive(payer.verifying_key().as_bytes()));
        assert!(v.verify().is_ok());
    }

    #[test]
    fn tampered_voucher_fails_verification() {
        let payer = test_keys(2);
        let payee = NodeId::derive(b"host");
        let mut v = hosting_voucher(&payer, payee);
        v.amount = 999; // payload alterado pós-assinatura
        assert!(matches!(
            v.verify(),
            Err(NutrientError::BadSignature(_))
        ));

        // Chave de outra identidade não passa na ligação payer↔key.
        let impostor = test_keys(3);
        v.signature = Vec::new();
        let mut w = hosting_voucher(&impostor, payee);
        w.payer = NodeId::derive(payer.verifying_key().as_bytes()); // payer roubado
        assert!(matches!(w.verify(), Err(NutrientError::KeyMismatch)));
    }

    #[test]
    fn redeem_credits_once_replays_rejected() {
        let signer = test_keys(4);
        let payee = NodeId::derive(b"host");
        let v = hosting_voucher(&signer, payee);

        let mut ledger = Ledger::new();
        ledger.redeem_voucher(&v).unwrap();
        assert_eq!(ledger.balance(Nutrient::Atp), 5);
        assert!(ledger.history().iter().any(|e| e.delta == 5));

        // Replay do mesmo voucher → Replayed (saldo não muda).
        assert!(matches!(
            ledger.redeem_voucher(&v),
            Err(NutrientError::Replayed)
        ));
        assert_eq!(ledger.balance(Nutrient::Atp), 5);

        // Voucher diferente (memo distinto) do mesmo pagador passa.
        let mut v2 = hosting_voucher(&signer, payee);
        v2.memo = "segunda réplica".into();
        v2 = v2.sign(&signer);
        ledger.redeem_voucher(&v2).unwrap();
        assert_eq!(ledger.balance(Nutrient::Atp), 10);
    }

    #[cfg(feature = "bolt11")]
    #[test]
    fn redeem_voucher_with_valid_bolt11_credits() {
        const INVOICE: &str = "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql";
        let signer = test_keys(5);
        let payee = NodeId::derive(b"host");
        let mut v = hosting_voucher(&signer, payee);
        v.bolt11 = Some(INVOICE.into()); // assinado de novo para cobrir o invoice
        v = v.sign(&signer);

        let mut ledger = Ledger::new();
        ledger.redeem_voucher(&v).unwrap();
        assert_eq!(ledger.balance(Nutrient::Atp), 5);
    }

    #[cfg(feature = "bolt11")]
    #[test]
    fn redeem_voucher_with_invalid_bolt11_rejected() {
        let signer = test_keys(6);
        let payee = NodeId::derive(b"host");
        let mut v = hosting_voucher(&signer, payee);
        v.bolt11 = Some("lnbcgibberish-not-real".into());
        v = v.sign(&signer);

        let mut ledger = Ledger::new();
        assert!(matches!(
            ledger.redeem_voucher(&v),
            Err(NutrientError::InvalidBolt11)
        ));
        // Nada foi creditado.
        assert_eq!(ledger.balance(Nutrient::Atp), 0);
    }
}
