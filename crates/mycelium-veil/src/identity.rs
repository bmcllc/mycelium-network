//! # Identidade persistente do nó VEIL Ω
//!
//! Um nó de retransmissão (`relay`/`exit`) precisa manter a **mesma** identidade
//! entre reinícios para que os pins pré-distribuídos (`--veil-trust`) continuem
//! válidos e o handshake telescópico ML-KEM-1024 continue funcionando:
//!
//! - **GhostId (Schnorr x-only)** — é o que os clientes fixam fora de banda como
//!   identidade de confiança (anti-substituição de descritores);
//! - **Par de chaves ML-KEM-1024** — é a chave pública KEM assinada no descritor;
//!   se regenerasse a cada reinício, o handshake com o descritor antigo falharia.
//!
//! A identidade é persistida em um arquivo com permissões restritas (`0600`).
//! A **rotação é sempre explícita** (`rotate`); um reinício nunca regenera a
//! identidade silenciosamente.
//!
//! ## Estrutura do arquivo (`veil-identity.json`)
//!
//! ```json
//! { "version": 1, "ghost_secret_hex": "...", "kem_private_hex": "..." }
//! ```

use std::fs;
use std::io::Write;
use std::path::Path;

use mycelium_ghostid::GhostId;
use mycelium_pqc::{mlkem_keygen, mlkem_keypair_from_private, KemKeyPair};
use serde::{Deserialize, Serialize};

use crate::planes::live::{NodeDescriptor, VeilHopRouter};
use crate::VeilError;

/// TTL da identidade GhostId do nó (100 anos — identidade persistente de operação).
pub const VEIL_NODE_IDENTITY_TTL: u64 = 60 * 60 * 24 * 365 * 100;

/// Domínio de derivação do GhostId a partir do seed persistente do nó (gland).
/// Usado apenas quando ainda não existe arquivo de identidade em disco.
const VEIL_IDENTITY_DERIVATION_TAG: &[u8] = b"mycelium-veil-node-identity-v1";

/// Versão do formato de arquivo de identidade (migração futura explícita).
const VEIL_IDENTITY_FILE_VERSION: u32 = 1;

/// Identidade persistente de um nó VEIL Ω: GhostId (pinning) + par ML-KEM-1024 (handshake).
pub struct VeilNodeIdentity {
    pub ghost: GhostId,
    pub keypair: KemKeyPair,
}

#[derive(Serialize, Deserialize)]
struct VeilIdentityFile {
    version: u32,
    ghost_secret_hex: String,
    kem_private_hex: String,
}

impl VeilNodeIdentity {
    /// Gera uma identidade totalmente nova (rotação explícita ou primeiro uso sem seed de nó).
    pub fn generate() -> Self {
        let secret: [u8; 32] = rand::random();
        let ghost = GhostId::from_secret_bytes(secret, VEIL_NODE_IDENTITY_TTL)
            .unwrap_or_else(|_| GhostId::spawn_quick(VEIL_NODE_IDENTITY_TTL).expect("ghost id"));
        Self {
            ghost,
            keypair: mlkem_keygen(),
        }
    }

    /// Gera uma identidade cujo GhostId é **determinístico** a partir do seed persistente
    /// do próprio nó (gland). O par KEM é novo; apenas o GhostId é derivado. Atributo de
    /// resiliência: mesmo que o arquivo de identidade se perca, o pin de identidade continua
    /// válido (o KEM novo exige redistribuir o descritor, mas a identidade fixada sobrevive).
    pub fn derive_from_node_seed(node_seed: [u8; 32]) -> Self {
        let mut hasher = blake3::Hasher::new();
        hasher.update(VEIL_IDENTITY_DERIVATION_TAG);
        hasher.update(&node_seed);
        let secret: [u8; 32] = *hasher.finalize().as_bytes();
        let ghost = GhostId::from_secret_bytes(secret, VEIL_NODE_IDENTITY_TTL)
            .unwrap_or_else(|_| GhostId::spawn_quick(VEIL_NODE_IDENTITY_TTL).expect("ghost id"));
        Self {
            ghost,
            keypair: mlkem_keygen(),
        }
    }

    /// Carrega a identidade persistida. Retorna `None` se o arquivo não existir.
    pub fn load(path: &Path) -> Result<Option<Self>, VeilError> {
        let raw = match fs::read(path) {
            Ok(r) => r,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => {
                return Err(VeilError::Crypto(format!(
                    "falha ao ler identidade Veil '{}': {e}",
                    path.display()
                )))
            }
        };
        let file: VeilIdentityFile = serde_json::from_slice(&raw).map_err(|e| {
            VeilError::Crypto(format!(
                "arquivo de identidade Veil '{}' inválido: {e}",
                path.display()
            ))
        })?;
        if file.version != VEIL_IDENTITY_FILE_VERSION {
            return Err(VeilError::Crypto(format!(
                "versão do arquivo de identidade Veil '{}' não suportada: {}",
                path.display(),
                file.version
            )));
        }
        let secret_bytes = hex::decode(&file.ghost_secret_hex).map_err(|e| {
            VeilError::Crypto(format!(
                "ghost_secret_hex inválido em '{}': {e}",
                path.display()
            ))
        })?;
        let secret: [u8; 32] = secret_bytes
            .try_into()
            .map_err(|_| VeilError::Crypto("ghost_secret deve ter 32 bytes".into()))?;
        let ghost = GhostId::from_secret_bytes(secret, VEIL_NODE_IDENTITY_TTL)
            .map_err(|e| VeilError::Crypto(format!("seed GhostId inválido: {e:?}")))?;

        let kem_private = hex::decode(&file.kem_private_hex).map_err(|e| {
            VeilError::Crypto(format!(
                "kem_private_hex inválido em '{}': {e}",
                path.display()
            ))
        })?;
        let keypair = mlkem_keypair_from_private(&kem_private).map_err(|e| {
            VeilError::Crypto(format!(
                "chave KEM persistida em '{}' inválida: {e}",
                path.display()
            ))
        })?;

        Ok(Some(Self { ghost, keypair }))
    }

    /// Carrega a identidade persistida ou cria uma nova (e a persiste).
    /// `node_seed`: seed persistente do nó (gland) para derivação determinística do
    /// GhostId no primeiro uso; `None` gera identidade totalmente aleatória.
    ///
    /// Retorna `(identidade, created)` — `created = true` no primeiro uso.
    pub fn load_or_create(path: &Path, node_seed: Option<[u8; 32]>) -> Result<(Self, bool), VeilError> {
        if let Some(id) = Self::load(path)? {
            return Ok((id, false));
        }
        let identity = match node_seed {
            Some(seed) => Self::derive_from_node_seed(seed),
            None => Self::generate(),
        };
        identity.save(path)?;
        Ok((identity, true))
    }

    /// Persiste a identidade com permissões restritas (`0600`), de forma atômica
    /// (arquivo temporário + rename) para nunca deixar um arquivo parcial.
    pub fn save(&self, path: &Path) -> Result<(), VeilError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                VeilError::Crypto(format!(
                    "falha ao criar diretório de identidade '{}': {e}",
                    parent.display()
                ))
            })?;
        }
        let file = VeilIdentityFile {
            version: VEIL_IDENTITY_FILE_VERSION,
            ghost_secret_hex: hex::encode(self.ghost.secret_key_bytes()),
            kem_private_hex: hex::encode(self.keypair.private_bytes()),
        };
        let json = serde_json::to_vec_pretty(&file)
            .map_err(|e| VeilError::Crypto(format!("serializar identidade Veil: {e}")))?;

        let tmp = path.with_extension("json.tmp");
        Self::write_restricted(&tmp, &json)?;
        fs::rename(&tmp, path).map_err(|e| {
            let _ = fs::remove_file(&tmp);
            VeilError::Crypto(format!(
                "falha ao finalizar identidade Veil '{}': {e}",
                path.display()
            ))
        })?;
        tracing::debug!(path = %path.display(), "identidade Veil persistida");
        Ok(())
    }

    #[cfg(unix)]
    fn write_restricted(path: &Path, bytes: &[u8]) -> Result<(), VeilError> {
        use std::os::unix::fs::OpenOptionsExt;
        let mut f = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600) // dono lê/escreve; grupo e outros sem acesso
            .open(path)
            .map_err(|e| {
                VeilError::Crypto(format!(
                    "falha ao abrir identidade Veil '{}': {e}",
                    path.display()
                ))
            })?;
        f.write_all(bytes).map_err(|e| {
            VeilError::Crypto(format!(
                "falha ao gravar identidade Veil '{}': {e}",
                path.display()
            ))
        })?;
        f.sync_all().map_err(|e| {
            VeilError::Crypto(format!(
                "falha ao sincronizar identidade Veil '{}': {e}",
                path.display()
            ))
        })?;
        Ok(())
    }

    #[cfg(not(unix))]
    fn write_restricted(path: &Path, bytes: &[u8]) -> Result<(), VeilError> {
        tracing::warn!(
            "plataforma sem suporte a permissões POSIX — a chave privada da identidade \
             Veil em '{}' não tem proteção de permissões no sistema de arquivos",
            path.display()
        );
        fs::write(path, bytes).map_err(|e| {
            VeilError::Crypto(format!(
                "falha ao gravar identidade Veil '{}': {e}",
                path.display()
            ))
        })
    }

    /// Rotação **explícita** de identidade: gera um novo GhostId + par KEM e substitui
    /// atomicamente o arquivo persistido. Nunca é invocada implicitamente em um reinício.
    ///
    /// Retorna `(nova identidade, id_público antigo em hex, id_público novo em hex)`
    /// para que o operador redistribua descritores/pins conscientemente.
    pub fn rotate(path: &Path) -> Result<(Self, String, String), VeilError> {
        let old_pubkey = Self::load(path)?
            .map(|id| hex::encode(id.ghost.nostr_pubkey()))
            .unwrap_or_else(|| "nenhuma (primeira emissão)".to_string());

        // Rotação explícita: nova identidade sempre aleatória — o operador decidiu
        // romper a derivação determinística (mesmo com seed de nó disponível).
        let identity = Self::generate();
        let new_pubkey = hex::encode(identity.ghost.nostr_pubkey());
        identity.save(path)?;
        tracing::warn!(
            old_identity = %old_pubkey,
            new_identity = %new_pubkey,
            path = %path.display(),
            "identidade Veil rotacionada explicitamente — redistribua descritores e pins"
        );
        Ok((identity, old_pubkey, new_pubkey))
    }

    /// Assina e emite um descritor com esta identidade persistente.
    pub fn descriptor(&self, node_id: String, endpoint: String) -> NodeDescriptor {
        NodeDescriptor::sign(node_id, &self.ghost, self.keypair.public_key.clone(), endpoint)
    }

    /// Converte em `VeilHopRouter` (consumindo a identidade).
    pub fn into_router(self, exit_policy: Option<crate::config::ExitPolicy>) -> VeilHopRouter {
        VeilHopRouter::with_identity(self.ghost, self.keypair, exit_policy)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_roundtrip_preserves_pubkeys() {
        let dir = std::env::temp_dir().join(format!("veil-identity-test-{}", rand::random::<u64>()));
        let path = dir.join("veil-identity.json");
        let (id, created) = VeilNodeIdentity::load_or_create(&path, Some([7u8; 32])).expect("load_or_create");
        assert!(created, "primeiro uso deve criar a identidade");
        let ghost_hex = hex::encode(id.ghost.nostr_pubkey());
        let kem_hex = hex::encode(&id.keypair.public_key);

        // "Reinício": carrega do disco — identidade e chave KEM idênticas.
        let (id2, created2) = VeilNodeIdentity::load_or_create(&path, Some([7u8; 32])).expect("reload");
        assert!(!created2, "segundo uso deve reutilizar a identidade persistida");
        assert_eq!(ghost_hex, hex::encode(id2.ghost.nostr_pubkey()));
        assert_eq!(kem_hex, hex::encode(&id2.keypair.public_key));

        // O descritor reemitido após o "reinício" mantém a MESMA identidade pública e KEM.
        let desc1 = id.descriptor("relay-01".into(), "203.0.113.9:9050".into());
        let desc2 = id2.descriptor("relay-01".into(), "203.0.113.9:9050".into());
        assert_eq!(desc1.identity_pubkey, desc2.identity_pubkey);
        assert_eq!(desc1.public_kem_key, desc2.public_kem_key);
        assert_eq!(desc1.endpoint, desc2.endpoint);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn identity_rotation_is_explicit_and_breaks_nothing_silently() {
        let dir = std::env::temp_dir().join(format!("veil-identity-rot-{}", rand::random::<u64>()));
        let path = dir.join("veil-identity.json");
        let (id, _) = VeilNodeIdentity::load_or_create(&path, Some([9u8; 32])).expect("create");
        let old_hex = hex::encode(id.ghost.nostr_pubkey());

        let (new_id, old_reported, new_reported) = VeilNodeIdentity::rotate(&path).expect("rotate");
        assert_eq!(old_hex, old_reported);
        assert_eq!(hex::encode(new_id.ghost.nostr_pubkey()), new_reported);
        assert_ne!(old_reported, new_reported, "rotação deve produzir identidade distinta");

        // Depois da rotação, o disco contém a NOVA identidade.
        let (id2, _) = VeilNodeIdentity::load_or_create(&path, Some([9u8; 32])).expect("reload");
        assert_eq!(new_reported, hex::encode(id2.ghost.nostr_pubkey()));

        let _ = fs::remove_dir_all(&dir);
    }

    #[cfg(unix)]
    #[test]
    fn identity_file_permissions_are_restricted() {
        use std::os::unix::fs::PermissionsExt;
        let dir = std::env::temp_dir().join(format!("veil-identity-perm-{}", rand::random::<u64>()));
        let path = dir.join("veil-identity.json");
        let (id, _) = VeilNodeIdentity::load_or_create(&path, Some([1u8; 32])).expect("create");
        let meta = fs::metadata(&path).expect("metadata");
        let mode = meta.permissions().mode();
        assert_eq!(mode & 0o777, 0o600, "arquivo de identidade deve ser 0600, obtido {mode:o}");
        drop(id);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_from_node_seed_is_deterministic() {
        let a = VeilNodeIdentity::derive_from_node_seed([42u8; 32]);
        let b = VeilNodeIdentity::derive_from_node_seed([42u8; 32]);
        assert_eq!(hex::encode(a.ghost.nostr_pubkey()), hex::encode(b.ghost.nostr_pubkey()));
        let c = VeilNodeIdentity::derive_from_node_seed([43u8; 32]);
        assert_ne!(hex::encode(a.ghost.nostr_pubkey()), hex::encode(c.ghost.nostr_pubkey()));
    }
}