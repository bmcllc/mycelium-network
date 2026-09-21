//! Camadas content-addressed em disco + arquivo de layer (mapa path→bytes).

use crate::VacuumError;
use mycelium_core::ContentId;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Arquivo de uma layer: ficheiros relativos a aplicar no rootfs.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct LayerArchive {
    pub files: HashMap<String, Vec<u8>>,
}

/// Valida um caminho relativo para impedir path traversal e escapes de diretório.
pub fn safe_relative_path(rel: &str) -> Result<PathBuf, VacuumError> {
    let p = Path::new(rel);
    if p.as_os_str().is_empty() {
        return Err(VacuumError::InvalidPath("caminho vazio".into()));
    }
    if p.is_absolute() {
        return Err(VacuumError::InvalidPath(format!("caminho absoluto rejeitado: {rel}")));
    }
    for comp in p.components() {
        match comp {
            std::path::Component::Normal(_) => {}
            _ => {
                return Err(VacuumError::InvalidPath(format!(
                    "componente inválido ou escape detectado: {rel}"
                )))
            }
        }
    }
    Ok(p.to_path_buf())
}

/// Valida nome de Ion para evitar caracteres perigosos na criação de pastas.
pub fn validate_ion_name(name: &str) -> Result<(), VacuumError> {
    if name.is_empty() || name.len() > 64 {
        return Err(VacuumError::InvalidPath("tamanho de nome de ion inválido".into()));
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        || name.contains("..")
    {
        return Err(VacuumError::InvalidPath(
            "nome de ion com caracteres inválidos".into(),
        ));
    }
    Ok(())
}

impl LayerArchive {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn single(path: impl Into<String>, bytes: impl Into<Vec<u8>>) -> Self {
        let mut files = HashMap::new();
        files.insert(path.into(), bytes.into());
        Self { files }
    }

    pub fn insert(&mut self, path: impl Into<String>, bytes: impl Into<Vec<u8>>) {
        self.files.insert(path.into(), bytes.into());
    }

    pub fn encode(&self) -> Result<Vec<u8>, VacuumError> {
        Ok(serde_json::to_vec(self)?)
    }

    pub fn decode(bytes: &[u8]) -> Result<Self, VacuumError> {
        // Preferência: JSON LayerArchive com `files`. Fallback: blob opaco → app.payload.
        match serde_json::from_slice::<LayerArchive>(bytes) {
            Ok(a) if !a.files.is_empty() => Ok(a),
            _ => Ok(Self::single("app.payload", bytes.to_vec())),
        }
    }

    /// Aplica ficheiros sobre `rootfs/` (layers posteriores sobrescrevem).
    pub fn apply_to(&self, rootfs: &Path) -> Result<(), VacuumError> {
        std::fs::create_dir_all(rootfs)?;
        let canon_root = match rootfs.canonicalize() {
            Ok(c) => c,
            Err(_) => rootfs.to_path_buf(),
        };
        for (rel, bytes) in &self.files {
            let rel_clean = safe_relative_path(rel)?;
            let dest = canon_root.join(&rel_clean);
            if let Some(parent) = dest.parent() {
                std::fs::create_dir_all(parent)?;
                if let Ok(canon_parent) = parent.canonicalize() {
                    if !canon_parent.starts_with(&canon_root) {
                        return Err(VacuumError::InvalidPath(format!(
                            "escape via symlink de diretório: {rel}"
                        )));
                    }
                }
            }
            if dest.is_symlink() {
                let _ = std::fs::remove_file(&dest);
            }
            std::fs::write(&dest, bytes)?;
        }
        Ok(())
    }
}

/// Depósito content-addressed em `{root}/{hex}`.
#[derive(Debug, Clone)]
pub struct LayerStore {
    root: PathBuf,
}

impl LayerStore {
    pub fn open(root: impl AsRef<Path>) -> Result<Self, VacuumError> {
        let root = root.as_ref().to_path_buf();
        std::fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn path_of(&self, id: &ContentId) -> PathBuf {
        self.root.join(id.to_string())
    }

    pub fn put(&self, bytes: &[u8]) -> Result<ContentId, VacuumError> {
        let id = ContentId::of(bytes);
        let path = self.path_of(&id);
        if !path.exists() {
            let tmp = path.with_extension("tmp");
            std::fs::write(&tmp, bytes)?;
            std::fs::rename(tmp, path)?;
        }
        Ok(id)
    }

    pub fn put_archive(&self, archive: &LayerArchive) -> Result<ContentId, VacuumError> {
        let bytes = archive.encode()?;
        self.put(&bytes)
    }

    pub fn get(&self, id: &ContentId) -> Option<Vec<u8>> {
        let bytes = std::fs::read(self.path_of(id)).ok()?;
        // O nome do arquivo não é prova de integridade: não executar nem
        // retransmitir uma layer que foi corrompida no disco local.
        (ContentId::of(&bytes) == *id).then_some(bytes)
    }

    pub fn has(&self, id: &ContentId) -> bool {
        self.path_of(id).is_file()
    }

    pub fn missing<'a>(&self, layers: &'a [ContentId]) -> Vec<&'a ContentId> {
        layers.iter().filter(|id| !self.has(id)).collect()
    }

    /// Extrai cada layer (ordem = bottom → top) para `rootfs`.
    pub fn materialize_rootfs(
        &self,
        layers: &[ContentId],
        rootfs: &Path,
    ) -> Result<(), VacuumError> {
        std::fs::create_dir_all(rootfs)?;
        for id in layers {
            let bytes = self.get(id).ok_or(VacuumError::LayerMissing(*id))?;
            let archive = LayerArchive::decode(&bytes)?;
            archive.apply_to(rootfs)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_put_get_roundtrip() {
        let dir = std::env::temp_dir().join(format!(
            "layers-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let store = LayerStore::open(&dir).unwrap();
        let id = store.put(b"hello-layer").unwrap();
        assert!(store.has(&id));
        assert_eq!(store.get(&id).unwrap(), b"hello-layer");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn archive_stacks_on_rootfs() {
        let dir = std::env::temp_dir().join(format!(
            "rootfs-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let store = LayerStore::open(dir.join("store")).unwrap();
        let base = store
            .put_archive(&LayerArchive::single("MESSAGE", b"base"))
            .unwrap();
        let mut app = LayerArchive::new();
        app.insert("index.html", b"<h1>hi</h1>");
        app.insert("MESSAGE", b"override");
        let app_id = store.put_archive(&app).unwrap();
        let rootfs = dir.join("rootfs");
        store.materialize_rootfs(&[base, app_id], &rootfs).unwrap();
        assert_eq!(
            std::fs::read_to_string(rootfs.join("MESSAGE")).unwrap(),
            "override"
        );
        assert!(rootfs.join("index.html").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn layer_rejects_path_traversal() {
        let dir = std::env::temp_dir().join(format!(
            "rootfs-traversal-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let mut bad_archive = LayerArchive::new();
        bad_archive.insert("../etc/evil.conf", b"malicious");
        let res = bad_archive.apply_to(&dir);
        assert!(res.is_err(), "Deveria ter rejeitado caminho com ../");

        let mut abs_archive = LayerArchive::new();
        abs_archive.insert("/tmp/evil.conf", b"malicious");
        let res_abs = abs_archive.apply_to(&dir);
        assert!(res_abs.is_err(), "Deveria ter rejeitado caminho absoluto");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn layer_corrupted_on_disk_is_not_served() {
        let dir = std::env::temp_dir().join(format!(
            "layers-integrity-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap().as_nanos()
        ));
        let store = LayerStore::open(&dir).unwrap();
        let id = store.put(b"original").unwrap();
        std::fs::write(store.path_of(&id), b"tampered").unwrap();
        assert!(store.get(&id).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
