//! # mycelium-rpc
//!
//! Protocolo e provider JSON-RPC para transportar chamadas EVM pela malha
//! Mycelium sem tornar um RPC SaaS um ponto obrigatório.
//!
//! Este crate NÃO afirma que a identidade inteira da rede já é pós-quântica.
//! O perfil atual reutiliza o transporte VEIL (ML-KEM-1024 + ChaCha20-Poly1305)
//! e mantém compatibilidade com a identidade Ed25519 existente. ML-DSA pode ser
//! promovido separadamente quando a identidade híbrida estiver integrada.

use mycelium_core::NodeId;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

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
        "eth_sign" | "eth_signTransaction" | "eth_signTypedData"
        | "eth_signTypedData_v3" | "eth_signTypedData_v4"
        | "eth_subscribe" | "eth_unsubscribe" => RpcMethodClass::Unsafe,
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
    /// Confidencialidade de estabelecimento de sessão resistente a quantum.
    pub ml_kem_1024: bool,
    /// AEAD usado após o KEM.
    pub chacha20_poly1305: bool,
    /// Identidade clássica atualmente usada por partes do Mycelium.
    pub ed25519_identity: bool,
    /// Só deve ser true quando ML-DSA estiver realmente integrado e verificado.
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
        let expires_at_ms = created_at_ms.saturating_add(ttl_ms);
        let mut h = blake3::Hasher::new();
        h.update(b"mycelium-rpc-request-v1");
        h.update(&requester.0);
        h.update(&chain_id.to_be_bytes());
        h.update(&created_at_ms.to_be_bytes());
        h.update(&expires_at_ms.to_be_bytes());
        h.update(&body);
        Self {
            request_id: *h.finalize().as_bytes(),
            requester,
            chain_id,
            created_at_ms,
            expires_at_ms,
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
    /// Número do bloco observado quando o provider puder determiná-lo.
    pub observed_block: Option<u64>,
    pub body: Vec<u8>,
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

    /// Encaminha uma chamada já autorizada para um nó Base local.
    ///
    /// O upstream recomendado é 127.0.0.1 e nunca precisa ser exposto à WAN.
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
            .header("user-agent", "Mycelium-Base-RPC/0.1")
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

    fn node() -> NodeId {
        NodeId::derive(b"rpc-test-node")
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
        assert!(matches!(p.authorize(&write), Err(RpcError::MethodDenied(_))));
    }

    #[test]
    fn unsafe_namespaces_are_fail_closed() {
        let p = RpcPolicy::default();
        for method in ["debug_traceCall", "admin_peers", "personal_sign", "eth_sign"] {
            let req = JsonRpcRequest {
                jsonrpc: "2.0".into(),
                id: Value::from(1),
                method: method.into(),
                params: Value::Array(vec![]),
            };
            assert!(matches!(p.authorize(&req), Err(RpcError::MethodDenied(_))));
        }
    }

    #[test]
    fn mesh_request_is_deterministic_and_expires() {
        let body = br#"{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}"#.to_vec();
        let a = RpcMeshRequest::new(node(), BASE_MAINNET_CHAIN_ID, 1_000, 3_000, body.clone());
        let b = RpcMeshRequest::new(node(), BASE_MAINNET_CHAIN_ID, 1_000, 3_000, body);
        assert_eq!(a.request_id, b.request_id);

        let p = RpcPolicy::default();
        assert!(a.validate_at(3_999, &p).is_ok());
        assert!(matches!(a.validate_at(4_001, &p), Err(RpcError::Expired)));
    }

    #[test]
    fn current_security_profile_does_not_overclaim_pq_identity() {
        let sec = RpcSecurityProfile::current_veil_transport();
        assert!(sec.has_pq_transport());
        assert!(!sec.has_pq_identity());
        assert!(sec.ed25519_identity);
    }
}
