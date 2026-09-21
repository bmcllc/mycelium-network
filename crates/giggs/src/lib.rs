//! # Giggs — Versionamento Mesh
//!
//! Commits são **Plots**: snapshots content-addressed que se replicam por
//! gossip entre nós vizinhos. Não há servidor central; o "repositório" é o
//! conjunto de Plots que o micélio conhece.
//!
//! Este é um stub coeso: armazenamento in-memory, replicação real via
//! hifas fica para a próxima fase.

use mycelium_core::{ContentId, NodeId};
use serde::{Deserialize, Serialize};
use mycelium_ghostid::GhostId;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum GiggsError {
    #[error("plot {0} não encontrado no mesh local")]
    PlotNotFound(ContentId),
    #[error("falha de serialização: {0}")]
    Codec(#[from] serde_json::Error),
    #[error("falha de armazenamento: {0}")]
    Io(#[from] std::io::Error),
    #[error("referência inválida: {0}")]
    InvalidRef(String),
    #[error("assinatura da referência inválida")]
    BadSignature,
    #[error("conflito de compare-and-swap: esperado {expected:?}, atual {actual:?}")]
    RefConflict { expected: Option<ContentId>, actual: Option<ContentId> },
}

/// Atualização imutável e assinável de uma referência mutável.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct RefUpdate {
    pub repository: String,
    pub name: String,
    pub target: ContentId,
    pub previous: Option<ContentId>,
    pub sequence: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SignedRefUpdate {
    pub update: RefUpdate,
    pub signer: String,
    pub signature: String,
}

impl SignedRefUpdate {
    pub fn sign(update: RefUpdate, identity: &GhostId) -> Result<Self, GiggsError> {
        let payload = serde_json::to_vec(&update)?;
        Ok(Self { update, signer: identity.nostr_pubkey_hex(), signature: hex::encode(identity.sign(&payload)) })
    }

    pub fn verify(&self) -> Result<(), GiggsError> {
        let pubkey: [u8; 32] = hex::decode(&self.signer).map_err(|_| GiggsError::BadSignature)?.try_into().map_err(|_| GiggsError::BadSignature)?;
        let signature: [u8; 64] = hex::decode(&self.signature).map_err(|_| GiggsError::BadSignature)?.try_into().map_err(|_| GiggsError::BadSignature)?;
        GhostId::verify(&pubkey, &serde_json::to_vec(&self.update)?, &signature).map_err(|_| GiggsError::BadSignature)
    }
}

/// Referências persistentes atualizadas atomicamente por compare-and-swap.
#[derive(Clone, Debug)]
pub struct RefStore { root: PathBuf }

impl RefStore {
    pub fn open(root: impl AsRef<Path>) -> Result<Self, GiggsError> {
        std::fs::create_dir_all(root.as_ref())?;
        Ok(Self { root: root.as_ref().to_path_buf() })
    }

    fn component(value: &str) -> Result<&str, GiggsError> {
        if value.is_empty() || value.len() > 128 || value.contains("..") || !value.bytes().all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b)) {
            return Err(GiggsError::InvalidRef(value.into()));
        }
        Ok(value)
    }

    fn path(&self, repository: &str, name: &str) -> Result<PathBuf, GiggsError> {
        Ok(self.root.join(Self::component(repository)?).join(format!("{}.json", Self::component(name)?)))
    }

    pub fn read(&self, repository: &str, name: &str) -> Result<Option<SignedRefUpdate>, GiggsError> {
        let path = self.path(repository, name)?;
        if !path.exists() { return Ok(None); }
        let value: SignedRefUpdate = serde_json::from_slice(&std::fs::read(path)?)?;
        value.verify()?;
        Ok(Some(value))
    }

    pub fn compare_and_swap(&self, value: SignedRefUpdate) -> Result<(), GiggsError> {
        value.verify()?;
        let current = self.read(&value.update.repository, &value.update.name)?;
        let actual = current.as_ref().map(|v| v.update.target);
        if actual != value.update.previous {
            return Err(GiggsError::RefConflict { expected: value.update.previous, actual });
        }
        let expected_sequence = current.map_or(0, |v| v.update.sequence + 1);
        if value.update.sequence != expected_sequence {
            return Err(GiggsError::InvalidRef("sequência não monotônica".into()));
        }
        let path = self.path(&value.update.repository, &value.update.name)?;
        std::fs::create_dir_all(path.parent().expect("ref parent"))?;
        let tmp = path.with_extension(format!("json.tmp-{}", std::process::id()));
        std::fs::write(&tmp, serde_json::to_vec_pretty(&value)?)?;
        std::fs::rename(tmp, path)?;
        Ok(())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct MergeConflict { pub path: String, pub base: Option<Vec<u8>>, pub ours: Option<Vec<u8>>, pub theirs: Option<Vec<u8>> }

#[derive(Clone, Debug, PartialEq)]
pub struct MergeOutcome { pub leaves: Vec<Leaf>, pub conflicts: Vec<MergeConflict> }

/// Merge de três vias. Conflitos permanecem explícitos e nunca são sobrescritos.
pub fn merge_three_way(base: &[Leaf], ours: &[Leaf], theirs: &[Leaf]) -> MergeOutcome {
    fn map(leaves: &[Leaf]) -> BTreeMap<String, Vec<u8>> { leaves.iter().map(|l| (l.path.clone(), l.content.clone())).collect() }
    let (base, ours, theirs) = (map(base), map(ours), map(theirs));
    let paths: BTreeSet<_> = base.keys().chain(ours.keys()).chain(theirs.keys()).cloned().collect();
    let mut output = MergeOutcome { leaves: Vec::new(), conflicts: Vec::new() };
    for path in paths {
        let (b, o, t) = (base.get(&path), ours.get(&path), theirs.get(&path));
        let selected = if o == t { Some(o) } else if o == b { Some(t) } else if t == b { Some(o) } else { None };
        match selected {
            Some(Some(content)) => output.leaves.push(Leaf { path, content: content.clone() }),
            Some(None) => {}
            None => output.conflicts.push(MergeConflict { path, base: b.cloned(), ours: o.cloned(), theirs: t.cloned() }),
        }
    }
    output
}

/// Um arquivo dentro de um Plot.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Leaf {
    pub path: String,
    pub content: Vec<u8>,
}

/// Um commit no mesh: snapshot imutável e content-addressed.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Plot {
    pub author: NodeId,
    pub message: String,
    pub parents: Vec<ContentId>,
    pub leaves: Vec<Leaf>,
}

impl Plot {
    /// Endereço do Plot: hash do conteúdo serializado.
    pub fn id(&self) -> Result<ContentId, GiggsError> {
        Ok(ContentId::of(&serde_json::to_vec(self)?))
    }

    /// Política conservadora para a replicação em claro. Plots antigos sem
    /// etiqueta continuam públicos; qualquer etiqueta diferente de [public]
    /// exige um protocolo futuro de autorização/criptografia antes de sair
    /// do nó. Não confundir visibilidade com autenticação do autor.
    pub fn is_public(&self) -> bool {
        let message = self.message.trim_start();
        !message.starts_with('[') || message.starts_with("[public]")
    }
}

/// O mesh local: os Plots que este nó conhece.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Mesh {
    plots: HashMap<ContentId, Plot>,
}

impl Mesh {
    pub fn new() -> Self {
        Self::default()
    }

    /// Semeia um Plot no mesh; retorna seu endereço.
    pub fn sow(&mut self, plot: Plot) -> Result<ContentId, GiggsError> {
        let id = plot.id()?;
        self.plots.insert(id, plot);
        Ok(id)
    }

    pub fn get(&self, id: &ContentId) -> Option<&Plot> {
        self.plots.get(id)
    }

    /// Caminha a linhagem de um Plot até as raízes (histórico).
    pub fn lineage(&self, id: &ContentId) -> Result<Vec<ContentId>, GiggsError> {
        let mut out = Vec::new();
        let mut stack = vec![*id];
        while let Some(current) = stack.pop() {
            let plot = self
                .plots
                .get(&current)
                .ok_or(GiggsError::PlotNotFound(current))?;
            out.push(current);
            stack.extend(&plot.parents);
        }
        Ok(out)
    }

    /// Bytes de um Plot prontos para replicação via gossip pelas hifas.
    pub fn spore_print(&self, id: &ContentId) -> Result<Vec<u8>, GiggsError> {
        let plot = self.plots.get(id).ok_or(GiggsError::PlotNotFound(*id))?;
        Ok(serde_json::to_vec(plot)?)
    }

    /// Absorve um Plot replicado por um vizinho.
    pub fn absorb(&mut self, bytes: &[u8]) -> Result<ContentId, GiggsError> {
        let plot: Plot = serde_json::from_slice(bytes)?;
        self.sow(plot)
    }

    pub fn len(&self) -> usize {
        self.plots.len()
    }

    pub fn is_empty(&self) -> bool {
        self.plots.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plot(msg: &str, parents: Vec<ContentId>) -> Plot {
        Plot {
            author: NodeId::derive(b"dev"),
            message: msg.into(),
            parents,
            leaves: vec![Leaf {
                path: "main.rs".into(),
                content: msg.as_bytes().to_vec(),
            }],
        }
    }

    #[test]
    fn plots_are_content_addressed() {
        let a = plot("init", vec![]);
        let b = plot("init", vec![]);
        assert_eq!(a.id().unwrap(), b.id().unwrap());
        assert_ne!(a.id().unwrap(), plot("feat", vec![]).id().unwrap());
    }

    #[test]
    fn lineage_walks_history() {
        let mut mesh = Mesh::new();
        let root = mesh.sow(plot("init", vec![])).unwrap();
        let child = mesh.sow(plot("feat", vec![root])).unwrap();
        let lineage = mesh.lineage(&child).unwrap();
        assert_eq!(lineage, vec![child, root]);
    }

    #[test]
    fn replication_roundtrip() {
        let mut alice = Mesh::new();
        let mut bob = Mesh::new();
        let id = alice.sow(plot("init", vec![])).unwrap();
        let bytes = alice.spore_print(&id).unwrap();
        let absorbed = bob.absorb(&bytes).unwrap();
        assert_eq!(id, absorbed);
        assert_eq!(alice.get(&id), bob.get(&id));
    }

    #[test]
    fn explicit_visibility_does_not_publish_restricted_content() {
        let mut item = plot("normal public text", vec![]);
        assert!(item.is_public());
        item.message = "[public] published".into();
        assert!(item.is_public());
        for label in ["[private]", "[community]", "[reserved]", "[archived]", "[unknown]"] {
            item.message = format!("{label} secret");
            assert!(!item.is_public(), "{label} não pode ser replicado em claro");
        }
    }

    #[test]
    fn signed_refs_persist_and_reject_stale_updates() {
        let dir = std::env::temp_dir().join(format!("giggs-refs-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let store = RefStore::open(&dir).unwrap();
        let id = GhostId::from_secret_bytes([7; 32], 3600).unwrap();
        let first = ContentId::of(b"first");
        store.compare_and_swap(SignedRefUpdate::sign(RefUpdate { repository: "repo".into(), name: "main".into(), target: first, previous: None, sequence: 0 }, &id).unwrap()).unwrap();
        assert_eq!(store.read("repo", "main").unwrap().unwrap().update.target, first);
        let stale = SignedRefUpdate::sign(RefUpdate { repository: "repo".into(), name: "main".into(), target: ContentId::of(b"other"), previous: None, sequence: 0 }, &id).unwrap();
        assert!(matches!(store.compare_and_swap(stale), Err(GiggsError::RefConflict { .. })));
        drop(store);
        assert_eq!(RefStore::open(&dir).unwrap().read("repo", "main").unwrap().unwrap().update.target, first);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn tampered_ref_is_fail_closed() {
        let id = GhostId::from_secret_bytes([9; 32], 3600).unwrap();
        let mut signed = SignedRefUpdate::sign(RefUpdate { repository: "repo".into(), name: "main".into(), target: ContentId::of(b"one"), previous: None, sequence: 0 }, &id).unwrap();
        signed.update.target = ContentId::of(b"tampered");
        assert!(matches!(signed.verify(), Err(GiggsError::BadSignature)));
    }

    #[test]
    fn merge_requires_explicit_resolution_of_conflicts() {
        let leaf = |path: &str, value: &str| Leaf { path: path.into(), content: value.as_bytes().to_vec() };
        let result = merge_three_way(&[leaf("a", "base")], &[leaf("a", "ours")], &[leaf("a", "theirs")]);
        assert!(result.leaves.is_empty());
        assert_eq!(result.conflicts.len(), 1);
        let clean = merge_three_way(&[leaf("a", "base")], &[leaf("a", "ours")], &[leaf("a", "base")]);
        assert_eq!(clean.leaves, vec![leaf("a", "ours")]);
        assert!(clean.conflicts.is_empty());
    }
}
