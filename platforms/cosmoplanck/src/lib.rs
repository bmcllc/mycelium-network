//! cosmoplanck bridge – integração B.A.S.E. ↔ Planck.
//!
//! Exporta recursos de computação e armazenamento da plataforma Planck como
//! serviços consumíveis pela Mycelium Network, permitindo off‑load de
//! workloads via API REST.

use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Erros específicos do client Planck.
#[derive(Debug, thiserror::Error)]
pub enum PlanckError {
    #[error("Erro de rede HTTP: {0}")]
    Http(#[from] reqwest::Error),
    #[error("API Planck retornou erro {status}: {message}")]
    Api { status: u16, message: String },
    #[error("Resposta malformada: {0}")]
    Malformed(String),
}

/// Configuração do cliente Planck.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanckConfig {
    /// URL base (ex.: "https://planck.example.com/api/v1").
    pub base_url: String,
    /// Token Bearer de autenticação.
    pub token: String,
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_timeout() -> u64 { 30 }

/// Cliente HTTP para interagir com a plataforma Planck.
pub struct PlanckClient {
    cfg: PlanckConfig,
    http: Client,
}

impl PlanckClient {
    /// Cria uma nova instância do cliente.
    pub fn new(cfg: PlanckConfig) -> Result<Self, PlanckError> {
        let http = Client::builder()
            .timeout(Duration::from_secs(cfg.timeout_secs))
            .build()?;
        
        Ok(Self { cfg, http })
    }

    /// Método base para chamadas à API (GET/POST/etc).
    async fn request(
        &self,
        method: Method,
        endpoint: &str,
        payload: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, PlanckError> {
        let url = format!("{}/{}", self.cfg.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));
        
        let mut req = self.http.request(method, &url)
            .header("Authorization", format!("Bearer {}", self.cfg.token));
            
        if let Some(body) = payload {
            req = req.json(&body);
        }

        let resp = req.send().await?;
        let status = resp.status();

        if !status.is_success() {
            let err_msg = resp.text().await.unwrap_or_else(|_| "Erro desconhecido".to_string());
            return Err(PlanckError::Api { 
                status: status.as_u16(), 
                message: err_msg 
            });
        }

        resp.json::<serde_json::Value>().await.map_err(PlanckError::Http)
    }

    /// Envia um workload genérico (POST).
    pub async fn invoke(&self, endpoint: &str, payload: serde_json::Value) -> Result<serde_json::Value, PlanckError> {
        self.request(Method::POST, endpoint, Some(payload)).await
    }
}

/// Faz upload do manifesto/metadados de uma layer (exemplo de uso).
pub async fn upload_layer(client: &PlanckClient, layer_id: &str, data_size: usize) -> Result<String, PlanckError> {
    let payload = serde_json::json!({
        "layer_id": layer_id,
        "size": data_size,
    });
    
    let resp = client.invoke("/layers/upload", payload).await?;
    resp["url"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| PlanckError::Malformed("Campo 'url' ausente na resposta".to_string()))
}
