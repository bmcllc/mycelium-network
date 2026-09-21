//! # Inertia — CI/CD que viaja pela rede
//!
//! Um **Vector** é uma unidade de trabalho (build, teste, deploy) que
//! viaja pelas hifas até um nó com CPU ociosa, executa, e devolve o
//! momentum (resultado) ao emissor. Quem executa Vectors ganha ATP.
//!
//! Build/Test locais são reais: `build.sh` ou `cargo build` no workbench
//! materializado a partir das leaves do Plot.

use mycelium_core::{ContentId, NodeId};
use mycelium_ghostid::GhostId;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, VecDeque};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, thiserror::Error)]
pub enum InertiaError {
    #[error("nenhum vector na fila de momentum")]
    QueueEmpty,
    #[error("erro de armazenamento da atestacao: {0}")]
    Io(#[from] std::io::Error),
    #[error("atestado invalido: {0}")]
    InvalidAttestation(String),
    #[error("erro de serializacao: {0}")]
    Codec(#[from] serde_json::Error),
}

/// Fase do pipeline que o Vector carrega.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum Thrust {
    Build,
    Test,
    Deploy { target_ion: String },
}

/// Unidade de trabalho que viaja pela rede.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Vector {
    /// Plot do Giggs que este Vector processa.
    pub plot: ContentId,
    pub thrust: Thrust,
    /// Nó que emitiu o Vector (para devolver o momentum).
    pub emitter: NodeId,
}

/// Evidencia reproduzivel que vincula uma execucao ao seu input e resultado.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AttestationPayload {
    pub input: ContentId,
    pub thrust: Thrust,
    pub commands: Vec<String>,
    pub environment: BTreeMap<String, String>,
    pub executor: NodeId,
    pub success: bool,
    pub atp_earned: u64,
    pub log_digest: ContentId,
    pub artifacts: Vec<ContentId>,
}

/// Assinatura prova autoria do relatorio; nao prova honestidade do executor.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SignedAttestation {
    pub payload: AttestationPayload,
    pub signer: String,
    pub signature: String,
}

impl SignedAttestation {
    pub fn sign(payload: AttestationPayload, identity: &GhostId) -> Result<Self, InertiaError> {
        let bytes = serde_json::to_vec(&payload)?;
        Ok(Self {
            payload,
            signer: identity.nostr_pubkey_hex(),
            signature: hex::encode(identity.sign(&bytes)),
        })
    }

    pub fn verify(&self) -> Result<(), InertiaError> {
        let pubkey = decode_fixed::<32>(&self.signer, "chave publica")?;
        let signature = decode_fixed::<64>(&self.signature, "assinatura")?;
        let bytes = serde_json::to_vec(&self.payload)?;
        GhostId::verify(&pubkey, &bytes, &signature)
            .map_err(|_| InertiaError::InvalidAttestation("assinatura rejeitada".into()))
    }
}

fn decode_fixed<const N: usize>(value: &str, label: &str) -> Result<[u8; N], InertiaError> {
    let bytes = hex::decode(value)
        .map_err(|_| InertiaError::InvalidAttestation(format!("{label} nao e hexadecimal")))?;
    bytes.try_into().map_err(|v: Vec<u8>| {
        InertiaError::InvalidAttestation(format!(
            "{label} deve ter {N} bytes, recebeu {}",
            v.len()
        ))
    })
}

/// Armazena atestacoes por CID e sempre revalida conteudo e assinatura na leitura.
pub struct AttestationStore {
    root: PathBuf,
}

impl AttestationStore {
    pub fn open(root: impl Into<PathBuf>) -> Result<Self, InertiaError> {
        let root = root.into();
        std::fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    pub fn persist(&self, attestation: &SignedAttestation) -> Result<ContentId, InertiaError> {
        attestation.verify()?;
        let bytes = serde_json::to_vec_pretty(attestation)?;
        let id = ContentId::of(&bytes);
        let destination = self.root.join(format!("{id}.json"));
        if !destination.exists() {
            let temporary = self.root.join(format!(".{id}.tmp"));
            std::fs::write(&temporary, &bytes)?;
            std::fs::rename(temporary, destination)?;
        }
        Ok(id)
    }

    pub fn get(&self, id: &ContentId) -> Result<SignedAttestation, InertiaError> {
        let bytes = std::fs::read(self.root.join(format!("{id}.json")))?;
        if ContentId::of(&bytes) != *id {
            return Err(InertiaError::InvalidAttestation(
                "CID nao corresponde ao conteudo persistido".into(),
            ));
        }
        let attestation: SignedAttestation = serde_json::from_slice(&bytes)?;
        attestation.verify()?;
        Ok(attestation)
    }
}

/// Comandos efetivamente selecionados para a receita do Vector.
pub fn command_manifest(thrust: &Thrust, work_dir: &Path) -> Vec<String> {
    match thrust {
        Thrust::Build if work_dir.join("build.sh").is_file() => vec!["sh build.sh".into()],
        Thrust::Build if work_dir.join("Cargo.toml").is_file() => {
            vec!["cargo build --release".into()]
        }
        Thrust::Build => vec!["inertia synthetic-build".into()],
        Thrust::Test if work_dir.join("test.sh").is_file() => vec!["sh test.sh".into()],
        Thrust::Test if work_dir.join("Cargo.toml").is_file() => vec!["cargo test".into()],
        Thrust::Test => vec!["inertia test-skip".into()],
        Thrust::Deploy { target_ion } => vec![format!("inertia deploy {target_ion}")],
    }
}

/// Resultado da execução de um Vector.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Momentum {
    pub success: bool,
    pub log: String,
    /// ATP ganho pelo executor.
    pub atp_earned: u64,
}

/// Fila local de Vectors aguardando um nó com CPU.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Flywheel {
    queue: VecDeque<Vector>,
}

impl Flywheel {
    pub fn new() -> Self {
        Self::default()
    }

    /// Injeta um Vector na fila (vindo de um Signal do TheField).
    pub fn inject(&mut self, vector: Vector) {
        self.queue.push_back(vector);
    }

    pub fn pending(&self) -> usize {
        self.queue.len()
    }

    /// Retira o próximo Vector sem executar.
    pub fn take(&mut self) -> Option<Vector> {
        self.queue.pop_front()
    }

    /// Executa o próximo Vector no `work_dir` (build/test/deploy reais).
    pub fn spin(
        &mut self,
        executor: NodeId,
        work_dir: &Path,
    ) -> Result<(Vector, Momentum), InertiaError> {
        let vector = self.take().ok_or(InertiaError::QueueEmpty)?;
        let is_remote = vector.emitter != executor;
        let momentum = execute_sandboxed(&vector.thrust, executor, work_dir, is_remote);
        Ok((vector, momentum))
    }
}

/// Verifica se o runtime isolado Bubblewrap está disponível no host.
pub fn is_sandbox_available() -> bool {
    std::env::var_os("PATH")
        .and_then(|paths| {
            std::env::split_paths(&paths).find_map(|dir| {
                let full = dir.join("bwrap");
                if full.is_file() {
                    Some(full)
                } else {
                    None
                }
            })
        })
        .is_some()
}

/// Constrói comando isolado em sandbox Bubblewrap para builds/testes.
fn sandboxed_command(
    work_dir: &Path,
    program: &str,
    args: &[&str],
    is_remote: bool,
) -> Result<Command, String> {
    if is_sandbox_available() {
        let sandbox_root = Path::new("/workbench");
        let mut cmd = Command::new("bwrap");
        cmd.arg("--die-with-parent")
            .arg("--unshare-all")
            .arg("--ro-bind")
            .arg("/usr")
            .arg("/usr")
            .arg("--ro-bind")
            .arg("/lib")
            .arg("/lib")
            .arg("--ro-bind-try")
            .arg("/lib64")
            .arg("/lib64")
            .arg("--ro-bind-try")
            .arg("/bin")
            .arg("/bin")
            .arg("--dev")
            .arg("/dev")
            .arg("--proc")
            .arg("/proc")
            .arg("--tmpfs")
            .arg("/tmp")
            .arg("--bind")
            .arg(work_dir)
            .arg(sandbox_root)
            .arg("--chdir")
            .arg(sandbox_root)
            .arg("--clearenv")
            .arg("--setenv")
            .arg("PATH")
            .arg("/usr/bin:/bin")
            .arg("--setenv")
            .arg("HOME")
            .arg(sandbox_root)
            .arg(program);
        for arg in args {
            cmd.arg(arg);
        }
        Ok(cmd)
    } else if is_remote
        || std::env::var("MYCELIUM_FAIL_CLOSED")
            .map(|v| v == "1" || v == "true")
            .unwrap_or(false)
    {
        Err("Execução bloqueada por política fail-closed: sandbox Bubblewrap (`bwrap`) indisponível no PATH".into())
    } else {
        let mut cmd = Command::new(program);
        cmd.args(args).current_dir(work_dir);
        Ok(cmd)
    }
}

/// Valida um caminho relativo para impedir path traversal nas leaves do Plot.
pub fn safe_relative_path(path: &str) -> Result<std::path::PathBuf, std::io::Error> {
    let p = Path::new(path);
    if p.as_os_str().is_empty() || p.is_absolute() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("caminho absoluto ou vazio rejeitado: {path}"),
        ));
    }
    for comp in p.components() {
        match comp {
            std::path::Component::Normal(_) => {}
            _ => {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    format!("escape de diretório detectado: {path}"),
                ));
            }
        }
    }
    Ok(p.to_path_buf())
}

/// Materializa leaves do Plot em disco (workbench do Inertia) com validação de caminhos.
pub fn materialize_leaves(
    work_dir: &Path,
    leaves: &[(String, Vec<u8>)],
) -> Result<(), std::io::Error> {
    std::fs::create_dir_all(work_dir)?;
    let canon_work = match work_dir.canonicalize() {
        Ok(c) => c,
        Err(_) => work_dir.to_path_buf(),
    };
    for (path, content) in leaves {
        let safe_rel = safe_relative_path(path)?;
        let dest = canon_work.join(&safe_rel);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
            if let Ok(canon_parent) = parent.canonicalize() {
                if !canon_parent.starts_with(&canon_work) {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        format!("escape via symlink detectado: {path}"),
                    ));
                }
            }
        }
        if dest.is_symlink() {
            let _ = std::fs::remove_file(&dest);
        }
        std::fs::write(dest, content)?;
    }
    Ok(())
}

/// Executa um Thrust no workbench (modo local).
pub fn execute(thrust: &Thrust, executor: NodeId, work_dir: &Path) -> Momentum {
    execute_sandboxed(thrust, executor, work_dir, false)
}

/// Executa um Thrust no workbench com opção de isolamento estrito para cargas remotas.
pub fn execute_sandboxed(
    thrust: &Thrust,
    executor: NodeId,
    work_dir: &Path,
    is_remote: bool,
) -> Momentum {
    match thrust {
        Thrust::Build => run_build(executor, work_dir, is_remote),
        Thrust::Test => run_test(executor, work_dir, is_remote),
        Thrust::Deploy { target_ion } => Momentum {
            success: true,
            log: format!(
                "[inertia] {} pronto para deploy no ion {target_ion}",
                executor.short()
            ),
            atp_earned: 8,
        },
    }
}

fn run_build(executor: NodeId, work_dir: &Path, is_remote: bool) -> Momentum {
    let build_sh = work_dir.join("build.sh");
    let cargo_toml = work_dir.join("Cargo.toml");

    let cmd_result = if build_sh.exists() {
        sandboxed_command(work_dir, "sh", &["build.sh"], is_remote)
    } else if cargo_toml.exists() {
        sandboxed_command(work_dir, "cargo", &["build", "--release"], is_remote)
    } else {
        // Sem receita: gera artefato mínimo a partir das leaves.
        let _ = std::fs::create_dir_all(work_dir.join("dist"));
        let msg = std::fs::read_to_string(work_dir.join("MESSAGE"))
            .or_else(|_| std::fs::read_to_string(work_dir.join("message.txt")))
            .unwrap_or_else(|_| "mycelium".into());
        let html = format!(
            "<!doctype html><html><body><h1>built by inertia</h1><pre>{msg}</pre></body></html>"
        );
        let _ = std::fs::write(work_dir.join("dist/index.html"), html);
        return Momentum {
            success: true,
            log: format!(
                "[inertia] build sintético de {} em {}",
                work_dir.display(),
                executor.short()
            ),
            atp_earned: 5,
        };
    };

    let mut cmd = match cmd_result {
        Ok(c) => c,
        Err(err) => {
            return Momentum {
                success: false,
                log: format!("[inertia] {err}"),
                atp_earned: 0,
            };
        }
    };

    match cmd.output() {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            let log = format!(
                "[inertia] build em {} (exit {:?})\n{stdout}{stderr}",
                executor.short(),
                out.status.code()
            );
            if out.status.success() {
                Momentum {
                    success: true,
                    log,
                    atp_earned: 5,
                }
            } else {
                Momentum {
                    success: false,
                    log,
                    atp_earned: 0,
                }
            }
        }
        Err(e) => Momentum {
            success: false,
            log: format!("[inertia] falha ao spawnar build: {e}"),
            atp_earned: 0,
        },
    }
}

fn run_test(executor: NodeId, work_dir: &Path, is_remote: bool) -> Momentum {
    let test_sh = work_dir.join("test.sh");
    let cargo_toml = work_dir.join("Cargo.toml");

    let cmd_result = if test_sh.exists() {
        Some(sandboxed_command(work_dir, "sh", &["test.sh"], is_remote))
    } else if cargo_toml.exists() {
        Some(sandboxed_command(work_dir, "cargo", &["test"], is_remote))
    } else if work_dir.join("dist").exists() || work_dir.join("dist/index.html").exists() {
        return Momentum {
            success: true,
            log: format!("[inertia] testes smoke ok (dist presente) em {}", executor.short()),
            atp_earned: 3,
        };
    } else {
        None
    };

    match cmd_result {
        Some(Ok(mut cmd)) => match cmd.output() {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                let log = format!(
                    "[inertia] test em {} (exit {:?})\n{stdout}{stderr}",
                    executor.short(),
                    out.status.code()
                );
                Momentum {
                    success: out.status.success(),
                    log,
                    atp_earned: if out.status.success() { 3 } else { 0 },
                }
            }
            Err(e) => Momentum {
                success: false,
                log: format!("[inertia] falha ao spawnar test: {e}"),
                atp_earned: 0,
            },
        },
        Some(Err(err)) => Momentum {
            success: false,
            log: format!("[inertia] {err}"),
            atp_earned: 0,
        },
        None => Momentum {
            success: true,
            log: format!("[inertia] sem suite de testes — skip em {}", executor.short()),
            atp_earned: 3,
        },
    }
}

/// Recolhe o artefato do build para empacotar como layer do Vacuum.
/// Preferência: `dist/` (arquivos), senão `index.html`, senão binário release.
pub fn collect_artifact(work_dir: &Path) -> Option<Vec<(String, Vec<u8>)>> {
    let dist = work_dir.join("dist");
    if dist.is_dir() {
        let mut files = Vec::new();
        if let Ok(entries) = std::fs::read_dir(&dist) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(bytes) = std::fs::read(&path) {
                        let name = path
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or("artifact")
                            .to_string();
                        files.push((name, bytes));
                    }
                }
            }
        }
        if !files.is_empty() {
            return Some(files);
        }
    }
    let index = work_dir.join("index.html");
    if index.is_file() {
        if let Ok(bytes) = std::fs::read(&index) {
            return Some(vec![("index.html".into(), bytes)]);
        }
    }
    let release = work_dir.join("target/release");
    if release.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&release) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file()
                    && path.extension().is_none()
                    && !path
                        .file_name()
                        .and_then(|s| s.to_str())
                        .map(|n| n.starts_with('.'))
                        .unwrap_or(true)
                {
                    if let Ok(bytes) = std::fs::read(&path) {
                        let name = path
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or("app")
                            .to_string();
                        return Some(vec![(name, bytes)]);
                    }
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_attestation(success: bool) -> (GhostId, SignedAttestation) {
        let identity = GhostId::spawn_quick(3_600).unwrap();
        let payload = AttestationPayload {
            input: ContentId::of(b"source-plot"),
            thrust: Thrust::Test,
            commands: vec!["cargo test".into()],
            environment: BTreeMap::from([
                ("arch".into(), "x86_64".into()),
                ("os".into(), "linux".into()),
            ]),
            executor: NodeId::derive(identity.nostr_pubkey_hex().as_bytes()),
            success,
            atp_earned: if success { 5 } else { 0 },
            log_digest: ContentId::of(if success { b"ok" } else { b"failed" }),
            artifacts: vec![ContentId::of(b"artifact")],
        };
        let attestation = SignedAttestation::sign(payload, &identity).unwrap();
        (identity, attestation)
    }

    #[test]
    fn signed_attestation_survives_restart_and_detects_tampering() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-attestations-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let (_, attestation) = test_attestation(true);
        let id = AttestationStore::open(&dir)
            .unwrap()
            .persist(&attestation)
            .unwrap();

        let reopened = AttestationStore::open(&dir).unwrap();
        assert_eq!(reopened.get(&id).unwrap(), attestation);

        let path = dir.join(format!("{id}.json"));
        let mut bytes = std::fs::read(&path).unwrap();
        let index = bytes.iter().position(|byte| *byte == b'{').unwrap();
        bytes[index] = b'[';
        std::fs::write(path, bytes).unwrap();
        assert!(matches!(
            reopened.get(&id),
            Err(InertiaError::InvalidAttestation(_))
        ));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn signature_rejects_a_mutated_payload() {
        let (_, mut attestation) = test_attestation(true);
        attestation.payload.success = false;
        assert!(matches!(
            attestation.verify(),
            Err(InertiaError::InvalidAttestation(_))
        ));
    }

    #[test]
    fn command_manifest_matches_the_selected_recipe() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-manifest-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("build.sh"), b"#!/bin/sh\n").unwrap();
        assert_eq!(command_manifest(&Thrust::Build, &dir), ["sh build.sh"]);
        assert_eq!(
            command_manifest(&Thrust::Deploy { target_ion: "edge".into() }, &dir),
            ["inertia deploy edge"]
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn vectors_spin_in_fifo_order() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("MESSAGE"), b"hi").unwrap();

        let mut wheel = Flywheel::new();
        let plot = ContentId::of(b"code");
        let emitter = NodeId::derive(b"dev");
        wheel.inject(Vector {
            plot,
            thrust: Thrust::Build,
            emitter,
        });
        wheel.inject(Vector {
            plot,
            thrust: Thrust::Test,
            emitter,
        });

        let executor = NodeId::derive(b"worker");
        let (v1, m1) = wheel.spin(executor, &dir).unwrap();
        assert_eq!(v1.thrust, Thrust::Build);
        assert!(m1.success);
        assert_eq!(m1.atp_earned, 5);

        let (v2, m2) = wheel.spin(executor, &dir).unwrap();
        assert_eq!(v2.thrust, Thrust::Test);
        assert!(m2.success);

        assert!(matches!(
            wheel.spin(executor, &dir),
            Err(InertiaError::QueueEmpty)
        ));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn build_sh_produces_dist_artifact() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-sh-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("build.sh"),
            "#!/bin/sh\nmkdir -p dist\necho built > dist/index.html\n",
        )
        .unwrap();
        let m = execute(&Thrust::Build, NodeId::derive(b"w"), &dir);
        assert!(m.success, "{}", m.log);
        let art = collect_artifact(&dir).unwrap();
        assert_eq!(art[0].0, "index.html");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn path_traversal_is_rejected_in_materialize() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-traversal-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let bad_leaves = vec![
            ("../evil.txt".to_string(), b"hacked".to_vec()),
            ("/etc/evil.txt".to_string(), b"hacked".to_vec()),
        ];
        for (path, content) in bad_leaves {
            let res = materialize_leaves(&dir, &[(path, content)]);
            assert!(res.is_err(), "Deveria ter rejeitado path traversal");
        }
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn remote_vector_enforces_fail_closed_without_sandbox() {
        let dir = std::env::temp_dir().join(format!(
            "inertia-remote-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("build.sh"), "#!/bin/sh\nexit 0\n").unwrap();

        // Simula execução remota onde bwrap não está presente ou com fail-closed
        if !is_sandbox_available() {
            let m = execute_sandboxed(&Thrust::Build, NodeId::derive(b"worker"), &dir, true);
            assert!(!m.success);
            assert!(m.log.contains("fail-closed"));
        }
        let _ = std::fs::remove_dir_all(&dir);
    }
}
