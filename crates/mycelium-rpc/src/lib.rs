//! # mycelium-rpc
//!
//! JSON-RPC soberano para redes EVM sobre a malha Mycelium.
//!
//! O payload RPC é cifrado ponta a ponta com ML-KEM-1024 (FIPS 203) +
//! ChaCha20-Poly1305. A identidade geral da rede ainda mantém Ed25519 em
//! partes do stack; portanto este crate não declara identidade integralmente
//! pós-quântica até a integração híbrida com ML-DSA-87.

use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use mycelium_core::NodeId;
use mycelium_pqc::{
    mlkem_decapsulate, mlkem_encapsulate, mlkem_keygen, mlkem_keypair_from_private, KemKeyPair,
};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use zeroize::ZeroizeOnDrop;

pub const BASE_MAINNET_CHAIN_ID: u64 = 8453;
pub const DEFAULT_RPC_TTL_MS: u64 = 3_000;
pub const DEFAULT_MAX_RPC_BODY_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum RpcError {
    #[error("corpo JSON-RPC excede o limite: {actual} > {limit}")]
    BodyTooLarge { actual: usize, limit: usize },
    #[error("JSON-RPC inválido: {0}")]
    InvalidJsonRpc(String),
    #[error("método RPC bloqueado pela policy: {0}")]
    MethodDenied(String),
    #[error("requisição RPC expirada")]
    Expired,
    #[error("destino RPC incorreto")]
    WrongProvider,
    #[error("resposta RPC não corresponde ao pedido")]
    ResponseMismatch,
    #[error("falha criptográfica RPC: {0}")]
    Crypto(String),
    #[error("falha no upstream Base: {0}")]
    Upstream(String),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    #[serde(default)]
    pub id: Value,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

impl JsonRpcRequest {
    pub fn parse(raw: &[u8]) -> Result<Self, RpcError> {
        let req: Self =
            serde_json::from_slice(raw).map_err(|e| RpcError::InvalidJsonRpc(e.to_string()))?;
        if req.jsonrpc != "2.0" {
            return Err(RpcError::InvalidJsonRpc(
                "somente JSON-RPC 2.0 é aceito".into(),
            ));
        }
        if req.method.trim().is_empty() {
            return Err(RpcError::InvalidJsonRpc("método vazio".into()));
        }
        if req.id.is_null() {
            return Err(RpcError::InvalidJsonRpc(
                "notificações sem id não são aceitas no RPC financeiro".into(),
            ));
        }
        Ok(req)
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RpcMethodClass {
    Read,
    Write,
    Unsafe,
}

pub fn classify_method(method: &str) -> RpcMethodClass {
    match method {
        "eth_sendRawTransaction" | "eth_sendTransaction" => RpcMethodClass::Write,
        "eth_sign"
        | "eth_signTransaction"
        | "eth_signTypedData"
        | "eth_signTypedData_v3"
        | "eth_signTypedData_v4"
        | "eth_subscribe"
        | "eth_unsubscribe" => RpcMethodClass::Unsafe,
        _ if method.starts_with("admin_")
            || method.starts_with("debug_")
            || method.starts_with("engine_")
            || method.starts_with("miner_")
            || method.starts_with("personal_")
            || method.starts_with("trace_")
            || method.starts_with("txpool_") =>
        {
            RpcMethodClass::Unsafe
        }
        _ if method.starts_with("eth_")
            || method.starts_with("net_")
            || method.starts_with("web3_") =>
        {
            RpcMethodClass::Read
        }
        _ => RpcMethodClass::Unsafe,
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcPolicy {
    pub chain_id: u64,
    pub allow_write: bool,
    pub allow_unsafe: bool,
    pub ttl_ms: u64,
    pub max_body_bytes: usize,
}

impl Default for RpcPolicy {
    fn default() -> Self {
        Self {
            chain_id: BASE_MAINNET_CHAIN_ID,
            allow_write: false,
            allow_unsafe: false,
            ttl_ms: DEFAULT_RPC_TTL_MS,
            max_body_bytes: DEFAULT_MAX_RPC_BODY_BYTES,
        }
    }
}

impl RpcPolicy {
    pub fn authorize(&self, request: &JsonRpcRequest) -> Result<RpcMethodClass, RpcError> {
        let class = classify_method(&request.method);
        match class {
            RpcMethodClass::Read => Ok(class),
            RpcMethodClass::Write if self.allow_write => Ok(class),
            RpcMethodClass::Unsafe if self.allow_unsafe => Ok(class),
            _ => Err(RpcError::MethodDenied(request.method.clone())),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcSecurityProfile {
    pub ml_kem_1024: bool,
    pub chacha20_poly1305: bool,
    pub ed25519_identity: bool,
    pub ml_dsa_87_identity: bool,
}

impl RpcSecurityProfile {
    pub fn current_veil_transport() -> Self {
        Self {
            ml_kem_1024: true,
            chacha20_poly1305: true,
            ed25519_identity: true,
            ml_dsa_87_identity: false,
        }
    }

    pub fn has_pq_transport(&self) -> bool {
        self.ml_kem_1024 && self.chacha20_poly1305
    }

    pub fn has_pq_identity(&self) -> bool {
        self.ml_dsa_87_identity
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcProviderAdvertisement {
    pub provider: NodeId,
    pub chain_id: u64,
    pub supports_archive: bool,
    pub supports_get_proof: bool,
    pub supports_send_raw_transaction: bool,
    pub max_qps: u32,
    /// Chave pública ML-KEM-1024 do serviço RPC.
    pub kem_public_key: Vec<u8>,
    pub security: RpcSecurityProfile,
    pub valid_until_ms: u64,
}

impl RpcProviderAdvertisement {
    pub fn is_valid_at(&self, now_ms: u64) -> bool {
        self.valid_until_ms >= now_ms
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcMeshRequest {
    pub request_id: [u8; 32],
    pub requester: NodeId,
    pub chain_id: u64,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    /// Nonce CSPRNG para impedir colisão entre requests idênticos no mesmo ms.
    pub request_nonce: [u8; 16],
    pub body: Vec<u8>,
}

impl RpcMeshRequest {
    pub fn new(
        requester: NodeId,
        chain_id: u64,
        created_at_ms: u64,
        ttl_ms: u64,
        body: Vec<u8>,
    ) -> Self {
        let mut request_nonce = [0u8; 16];
        OsRng.fill_bytes(&mut request_nonce);
        Self::with_nonce(
            requester,
            chain_id,
            created_at_ms,
            ttl_ms,
            request_nonce,
            body,
        )
    }

    pub fn with_nonce(
        requester: NodeId,
        chain_id: u64,
        created_at_ms: u64,
        ttl_ms: u64,
        request_nonce: [u8; 16],
        body: Vec<u8>,
    ) -> Self {
        let expires_at_ms = created_at_ms.saturating_add(ttl_ms);
        let mut h = blake3::Hasher::new();
        h.update(b"mycelium-rpc-request-v1");
        h.update(&requester.0);
        h.update(&chain_id.to_be_bytes());
        h.update(&created_at_ms.to_be_bytes());
        h.update(&expires_at_ms.to_be_bytes());
        h.update(&request_nonce);
        h.update(&body);
        Self {
            request_id: *h.finalize().as_bytes(),
            requester,
            chain_id,
            created_at_ms,
            expires_at_ms,
            request_nonce,
            body,
        }
    }

    pub fn validate_at(&self, now_ms: u64, policy: &RpcPolicy) -> Result<JsonRpcRequest, RpcError> {
        if self.body.len() > policy.max_body_bytes {
            return Err(RpcError::BodyTooLarge {
                actual: self.body.len(),
                limit: policy.max_body_bytes,
            });
        }
        if self.chain_id != policy.chain_id {
            return Err(RpcError::InvalidJsonRpc(format!(
                "chain_id {} não corresponde à policy {}",
                self.chain_id, policy.chain_id
            )));
        }
        if now_ms > self.expires_at_ms {
            return Err(RpcError::Expired);
        }
        let req = JsonRpcRequest::parse(&self.body)?;
        policy.authorize(&req)?;
        Ok(req)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcMeshResponse {
    pub request_id: [u8; 32],
    pub provider: NodeId,
    pub chain_id: u64,
    pub responded_at_ms: u64,
    pub observed_block: Option<u64>,
    pub body: Vec<u8>,
}

/// Identidade ML-KEM do serviço RPC. A chave privada nunca é serializada no fio.
pub struct RpcKemIdentity {
    keypair: KemKeyPair,
}

impl RpcKemIdentity {
    pub fn generate() -> Self {
        Self {
            keypair: mlkem_keygen(),
        }
    }

    pub fn from_private(private_key: &[u8]) -> Result<Self, RpcError> {
        let keypair = mlkem_keypair_from_private(private_key)
            .map_err(|e| RpcError::Crypto(e.to_string()))?;
        Ok(Self { keypair })
    }

    pub fn public_key(&self) -> &[u8] {
        &self.keypair.public_key
    }

    pub fn private_bytes(&self) -> &[u8] {
        self.keypair.private_bytes()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcEncryptedRequest {
    pub request_id: [u8; 32],
    pub provider: NodeId,
    pub kem_ciphertext: Vec<u8>,
    pub nonce: [u8; 12],
    pub ciphertext: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RpcEncryptedResponse {
    pub request_id: [u8; 32],
    pub provider: NodeId,
    pub nonce: [u8; 12],
    pub ciphertext: Vec<u8>,
}

/// Segredo de resposta derivado do mesmo ML-KEM usado no request, mas com
/// domínio separado. Somente requester e provider legítimo o conhecem.
#[derive(ZeroizeOnDrop)]
pub struct RpcResponseKey([u8; 32]);

impl RpcResponseKey {
    fn from_shared_secret(shared_secret: &[u8]) -> Self {
        Self(blake3::derive_key(
            "mycelium-rpc-response-key-v1",
            shared_secret,
        ))
    }

    fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

pub struct OpenedRpcRequest {
    pub request: RpcMeshRequest,
    pub response_key: RpcResponseKey,
}

fn derive_request_key(shared_secret: &[u8]) -> [u8; 32] {
    blake3::derive_key("mycelium-rpc-request-key-v1", shared_secret)
}

fn request_aad(request_id: &[u8; 32], provider: &NodeId) -> Vec<u8> {
    let mut aad = b"mycelium-rpc-request-aad-v1".to_vec();
    aad.extend_from_slice(request_id);
    aad.extend_from_slice(&provider.0);
    aad
}

fn response_aad(request_id: &[u8; 32], provider: &NodeId) -> Vec<u8> {
    let mut aad = b"mycelium-rpc-response-aad-v1".to_vec();
    aad.extend_from_slice(request_id);
    aad.extend_from_slice(&provider.0);
    aad
}

pub fn seal_request(
    provider: NodeId,
    provider_kem_public_key: &[u8],
    request: RpcMeshRequest,
) -> Result<(RpcEncryptedRequest, RpcResponseKey), RpcError> {
    let enc = mlkem_encapsulate(provider_kem_public_key)
        .map_err(|e| RpcError::Crypto(e.to_string()))?;
    let request_key = derive_request_key(&enc.shared_secret);
    let response_key = RpcResponseKey::from_shared_secret(&enc.shared_secret);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&request_key));
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let plaintext =
        serde_json::to_vec(&request).map_err(|e| RpcError::InvalidJsonRpc(e.to_string()))?;
    let aad = request_aad(&request.request_id, &provider);
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: &plaintext,
                aad: &aad,
            },
        )
        .map_err(|_| RpcError::Crypto("falha ao cifrar request".into()))?;

    Ok((
        RpcEncryptedRequest {
            request_id: request.request_id,
            provider,
            kem_ciphertext: enc.ciphertext,
            nonce,
            ciphertext,
        },
        response_key,
    ))
}

pub fn open_request(
    identity: &RpcKemIdentity,
    expected_provider: NodeId,
    packet: &RpcEncryptedRequest,
    now_ms: u64,
    policy: &RpcPolicy,
) -> Result<OpenedRpcRequest, RpcError> {
    if packet.provider != expected_provider {
        return Err(RpcError::WrongProvider);
    }
    let shared = mlkem_decapsulate(identity.private_bytes(), &packet.kem_ciphertext)
        .map_err(|e| RpcError::Crypto(e.to_string()))?;
    let request_key = derive_request_key(&shared);
    let response_key = RpcResponseKey::from_shared_secret(&shared);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&request_key));
    let aad = request_aad(&packet.request_id, &packet.provider);
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(&packet.nonce),
            Payload {
                msg: &packet.ciphertext,
                aad: &aad,
            },
        )
        .map_err(|_| RpcError::Crypto("request adulterado ou chave incorreta".into()))?;
    let request: RpcMeshRequest =
        serde_json::from_slice(&plaintext).map_err(|e| RpcError::InvalidJsonRpc(e.to_string()))?;
    if request.request_id != packet.request_id {
        return Err(RpcError::ResponseMismatch);
    }
    request.validate_at(now_ms, policy)?;
    Ok(OpenedRpcRequest {
        request,
        response_key,
    })
}

pub fn seal_response(
    response_key: &RpcResponseKey,
    response: RpcMeshResponse,
) -> Result<RpcEncryptedResponse, RpcError> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(response_key.as_bytes()));
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let plaintext =
        serde_json::to_vec(&response).map_err(|e| RpcError::InvalidJsonRpc(e.to_string()))?;
    let aad = response_aad(&response.request_id, &response.provider);
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: &plaintext,
                aad: &aad,
            },
        )
        .map_err(|_| RpcError::Crypto("falha ao cifrar response".into()))?;
    Ok(RpcEncryptedResponse {
        request_id: response.request_id,
        provider: response.provider,
        nonce,
        ciphertext,
    })
}

pub fn open_response(
    response_key: &RpcResponseKey,
    expected_provider: NodeId,
    expected_chain_id: u64,
    packet: &RpcEncryptedResponse,
) -> Result<RpcMeshResponse, RpcError> {
    if packet.provider != expected_provider {
        return Err(RpcError::WrongProvider);
    }
    let cipher = ChaCha20Poly1305::new(Key::from_slice(response_key.as_bytes()));
    let aad = response_aad(&packet.request_id, &packet.provider);
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(&packet.nonce),
            Payload {
                msg: &packet.ciphertext,
                aad: &aad,
            },
        )
        .map_err(|_| RpcError::Crypto("response adulterado ou não autenticado".into()))?;
    let response: RpcMeshResponse =
        serde_json::from_slice(&plaintext).map_err(|e| RpcError::InvalidJsonRpc(e.to_string()))?;
    if response.request_id != packet.request_id
        || response.provider != expected_provider
        || response.chain_id != expected_chain_id
    {
        return Err(RpcError::ResponseMismatch);
    }
    Ok(response)
}

pub fn json_rpc_error(raw_request: &[u8], code: i64, message: impl Into<String>) -> Vec<u8> {
    let id = serde_json::from_slice::<Value>(raw_request)
        .ok()
        .and_then(|v| v.get("id").cloned())
        .unwrap_or(Value::Null);
    serde_json::to_vec(&serde_json::json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": code,
            "message": message.into()
        }
    }))
    .unwrap_or_else(|_| br#"{"jsonrpc":"2.0","id":null,"error":{"code":-32603,"message":"internal error"}}"#.to_vec())
}

#[derive(Clone)]
pub struct LocalBaseProvider {
    upstream: String,
    client: reqwest::Client,
    policy: RpcPolicy,
}

impl LocalBaseProvider {
    pub fn new(upstream: impl Into<String>, policy: RpcPolicy) -> Result<Self, RpcError> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_millis(policy.ttl_ms.max(250)))
            .build()
            .map_err(|e| RpcError::Upstream(e.to_string()))?;
        Ok(Self {
            upstream: upstream.into(),
            client,
            policy,
        })
    }

    pub fn policy(&self) -> &RpcPolicy {
        &self.policy
    }

    pub async fn execute_raw(&self, raw: &[u8]) -> Result<Vec<u8>, RpcError> {
        if raw.len() > self.policy.max_body_bytes {
            return Err(RpcError::BodyTooLarge {
                actual: raw.len(),
                limit: self.policy.max_body_bytes,
            });
        }
        let req = JsonRpcRequest::parse(raw)?;
        self.policy.authorize(&req)?;

        let response = self
            .client
            .post(&self.upstream)
            .header("content-type", "application/json")
            .header("user-agent", "Mycelium-Base-RPC/0.2")
            .body(raw.to_vec())
            .send()
            .await
            .map_err(|e| RpcError::Upstream(e.to_string()))?;

        if !response.status().is_success() {
            return Err(RpcError::Upstream(format!(
                "HTTP {} do nó Base local",
                response.status()
            )));
        }

        let body = response
            .bytes()
            .await
            .map_err(|e| RpcError::Upstream(e.to_string()))?;
        if body.len() > self.policy.max_body_bytes {
            return Err(RpcError::BodyTooLarge {
                actual: body.len(),
                limit: self.policy.max_body_bytes,
            });
        }

        serde_json::from_slice::<Value>(&body)
            .map_err(|e| RpcError::Upstream(format!("resposta JSON inválida: {e}")))?;
        Ok(body.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(label: &[u8]) -> NodeId {
        NodeId::derive(label)
    }

    #[test]
    fn default_policy_allows_reads_and_blocks_submission() {
        let p = RpcPolicy::default();
        let read = JsonRpcRequest {
            jsonrpc: "2.0".into(),
            id: Value::from(1),
            method: "eth_getProof".into(),
            params: Value::Array(vec![]),
        };
        assert_eq!(p.authorize(&read).unwrap(), RpcMethodClass::Read);

        let write = JsonRpcRequest {
            jsonrpc: "2.0".into(),
            id: Value::from(2),
            method: "eth_sendRawTransaction".into(),
            params: Value::Array(vec![]),
        };
        assert!(matches!(
            p.authorize(&write),
            Err(RpcError::MethodDenied(_))
        ));
    }

    #[test]
    fn unsafe_namespaces_are_fail_closed() {
        let p = RpcPolicy::default();
        for method in [
            "debug_traceCall",
            "admin_peers",
            "personal_sign",
            "eth_sign",
        ] {
            let req = JsonRpcRequest {
                jsonrpc: "2.0".into(),
                id: Value::from(1),
                method: method.into(),
                params: Value::Array(vec![]),
            };
            assert!(matches!(
                p.authorize(&req),
                Err(RpcError::MethodDenied(_))
            ));
        }
    }

    #[test]
    fn mesh_request_nonce_prevents_collisions_and_expiration_is_enforced() {
        let body = br#"{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}"#.to_vec();
        let requester = node(b"rpc-test-node");
        let a = RpcMeshRequest::with_nonce(
            requester,
            BASE_MAINNET_CHAIN_ID,
            1_000,
            3_000,
            [1u8; 16],
            body.clone(),
        );
        let b = RpcMeshRequest::with_nonce(
            requester,
            BASE_MAINNET_CHAIN_ID,
            1_000,
            3_000,
            [1u8; 16],
            body.clone(),
        );
        let c = RpcMeshRequest::with_nonce(
            requester,
            BASE_MAINNET_CHAIN_ID,
            1_000,
            3_000,
            [2u8; 16],
            body,
        );
        assert_eq!(a.request_id, b.request_id);
        assert_ne!(a.request_id, c.request_id);

        let p = RpcPolicy::default();
        assert!(a.validate_at(3_999, &p).is_ok());
        assert!(matches!(
            a.validate_at(4_001, &p),
            Err(RpcError::Expired)
        ));
    }

    #[test]
    fn current_security_profile_does_not_overclaim_pq_identity() {
        let sec = RpcSecurityProfile::current_veil_transport();
        assert!(sec.has_pq_transport());
        assert!(!sec.has_pq_identity());
        assert!(sec.ed25519_identity);
    }

    #[test]
    fn pq_request_and_response_roundtrip() {
        let provider = node(b"provider");
        let requester = node(b"requester");
        let provider_kem = RpcKemIdentity::generate();
        let policy = RpcPolicy::default();
        let raw = br#"{"jsonrpc":"2.0","id":7,"method":"eth_chainId","params":[]}"#.to_vec();
        let mesh = RpcMeshRequest::new(
            requester,
            BASE_MAINNET_CHAIN_ID,
            10_000,
            policy.ttl_ms,
            raw,
        );
        let request_id = mesh.request_id;
        let (sealed, response_key) =
            seal_request(provider, provider_kem.public_key(), mesh).unwrap();
        let opened =
            open_request(&provider_kem, provider, &sealed, 10_001, &policy).unwrap();
        assert_eq!(opened.request.request_id, request_id);

        let response = RpcMeshResponse {
            request_id,
            provider,
            chain_id: BASE_MAINNET_CHAIN_ID,
            responded_at_ms: 10_002,
            observed_block: Some(123),
            body: br#"{"jsonrpc":"2.0","id":7,"result":"0x2105"}"#.to_vec(),
        };
        let sealed_response = seal_response(&opened.response_key, response.clone()).unwrap();
        let reopened =
            open_response(&response_key, provider, BASE_MAINNET_CHAIN_ID, &sealed_response)
        .unwrap();
        assert_eq!(reopened, response);
    }

    #[test]
    fn forged_response_with_wrong_secret_is_rejected() {
        let provider = node(b"provider");
        let requester = node(b"requester");
        let provider_kem = RpcKemIdentity::generate();
        let policy = RpcPolicy::default();
        let mesh = RpcMeshRequest::new(
            requester,
            BASE_MAINNET_CHAIN_ID,
            10_000,
            policy.ttl_ms,
            br#"{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}"#.to_vec(),
        );
        let (sealed, client_response_key) =
            seal_request(provider, provider_kem.public_key(), mesh).unwrap();
        let opened =
            open_request(&provider_kem, provider, &sealed, 10_001, &policy).unwrap();

        let response = RpcMeshResponse {
            request_id: sealed.request_id,
            provider,
            chain_id: BASE_MAINNET_CHAIN_ID,
            responded_at_ms: 10_002,
            observed_block: None,
            body: br#"{"jsonrpc":"2.0","id":1,"result":"0x2105"}"#.to_vec(),
        };
        let wrong_key = RpcResponseKey([0x55; 32]);
        let forged = seal_response(&wrong_key, response).unwrap();

        assert!(matches!(
            open_response(
                &client_response_key,
                provider,
                BASE_MAINNET_CHAIN_ID,
                &forged
            ),
            Err(RpcError::Crypto(_))
        ));

        // O provider legítimo, que decapsulou o request, possui a chave correta.
        let legit = RpcMeshResponse {
            request_id: sealed.request_id,
            provider,
            chain_id: BASE_MAINNET_CHAIN_ID,
            responded_at_ms: 10_003,
            observed_block: None,
            body: br#"{"jsonrpc":"2.0","id":1,"result":"0x2105"}"#.to_vec(),
        };
        let packet = seal_response(&opened.response_key, legit).unwrap();
        assert!(open_response(
            &client_response_key,
            provider,
            BASE_MAINNET_CHAIN_ID,
            &packet
        )
        .is_ok());
    }

    #[test]
    fn ciphertext_tampering_is_rejected() {
        let provider = node(b"provider");
        let requester = node(b"requester");
        let provider_kem = RpcKemIdentity::generate();
        let policy = RpcPolicy::default();
        let mesh = RpcMeshRequest::new(
            requester,
            BASE_MAINNET_CHAIN_ID,
            10_000,
            policy.ttl_ms,
            br#"{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}"#.to_vec(),
        );
        let (mut sealed, _) =
            seal_request(provider, provider_kem.public_key(), mesh).unwrap();
        sealed.ciphertext[0] ^= 0x01;
        assert!(matches!(
            open_request(&provider_kem, provider, &sealed, 10_001, &policy),
            Err(RpcError::Crypto(_))
        ));
    }
}
