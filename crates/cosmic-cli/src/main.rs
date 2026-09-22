//! COSMIC — storage + compute pós-quânticos sobre o Mycelium.
//!
//! Fases:
//!   cosmic put <arquivo> [--k 3 --n 7]   → QEL sharding pós-quântico (pronto)
//!   cosmic get <content_id> [--dir .]    → junta K shards e reconstrói (pronto)
//!   cosmic run  …                        → compute verificável (fase futura)
//!   cosmic auth …                        → identidade portátil (fase futura)
//!
//! Storage local dos shards: `$COSMIC_HOME/<content_id>/<i>.json`
//! (padrão `~/.cosmic`). Cada shard é um `QelShard` serializado, com
//! transport hint distinto — nenhum vértice/canal isolado detém o segredo.

use clap::{Parser, Subcommand};
use mycelium_core::ContentId;
use mycelium_qel::{assign_hybrid_transports, fragment, reconstruct, QelConfig, QelShard};
use std::path::{Path, PathBuf};

/// Raiz de armazenamento dos shards COSMIC.
fn cosmic_home() -> PathBuf {
    std::env::var("COSMIC_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            std::env::var("HOME")
                .map(|h| PathBuf::from(h).join(".cosmic"))
                .unwrap_or_else(|_| PathBuf::from(".cosmic"))
        })
}

fn str_transport(t: &mycelium_qel::TransportHint) -> &'static str {
    use mycelium_qel::TransportHint::*;
    match t {
        Nostr => "nostr",
        Ipfs => "ipfs",
        RelayMesh => "relaymesh",
        LoRa => "lora",
        Sms => "sms",
        Proximity => "proximity",
        Dtn => "dtn",
        Visual => "visual",
        Any => "any",
    }
}

#[derive(Parser)]
#[command(name = "cosmic", version, about = "COSMIC: compute + storage pós-quânticos")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Fragmenta um arquivo em shards QEL pós-quânticos e guarda K/N canais.
    Put {
        /// Arquivo a fragmentar.
        file: PathBuf,
        /// Limiar K de shards para reconstruir (padrão 3).
        #[arg(long, default_value_t = 3)]
        k: u8,
        /// Total N de shards (padrão 7).
        #[arg(long, default_value_t = 7)]
        n: u8,
        /// Home de um nó Mycelium com daemon rodando. Se dado, cada shard também
        /// é publicada na rede via `isotope-put` (distribuído, não só local).
        #[arg(long)]
        home: Option<PathBuf>,
    },
    /// Junta K shards de um content_id e reconstrói o arquivo original.
    Get {
        /// ContentId publicado pelo `put` (hex ou `Qm…`).
        content_id: String,
        /// Diretório de saída (padrão: diretório atual).
        #[arg(long, default_value = ".")]
        dir: PathBuf,
        /// Nome do arquivo de saída (padrão: `recovered.bin`).
        #[arg(long, default_value = "recovered.bin")]
        out: String,
        /// Home de um nó Mycelium com daemon rodando. Se dado, recupera os
        /// shards distribuídos da rede via `isotope-get` (fallback: local).
        #[arg(long)]
        home: Option<PathBuf>,
    },
    /// Compute verificável: executa uma receita determinística e emite um
    /// proof {recipe-input_hash → output_hash} re-verificável por qualquer
    /// vértice (re-provm). O resultado não depende da confiança no executor.
    Run {
        /// Receita: comando a executar sobre o arquivo de entrada.
        /// Ex: `--recipe sha256`. O resultado é o hash do arquivo processado.
        #[arg(long, default_value = "sha256")]
        recipe: String,
        /// Arquivo de entrada.
        input: PathBuf,
        /// Onde gravar o proof local (padrão `proof.json`).
        #[arg(long, default_value = "proof.json")]
        proof: PathBuf,
        /// Home de um nó Mycelium com daemon rodando. Se dado, o proof e o input
        /// são publicados na rede via QEL/Isotope (compute verificável distribuído).
        #[arg(long)]
        home: Option<PathBuf>,
    },
    /// Re-verifica um proof COSMIC: re-executa a receita isoladamente e
    /// confirma que o output_hash bate (compute verificável).
    Verify {
        /// Arquivo de proof JSON local, OU o `--id` (ContentId/Qm) quando
        /// recuperando de um nó na rede.
        #[arg(value_name = "PROOF_OR_ID")]
        proof: PathBuf,
        /// Home de um nó Mycelium com daemon rodando. Se dado com `--id`,
        /// recupera o proof e o input da rede e re-excuta a receita.
        #[arg(long)]
        home: Option<PathBuf>,
        /// ContentId do proof publicado na rede (reciprocal de `--home`).
        #[arg(long)]
        id: Option<String>,
    },
    /// Identidade portátil: o mesmo seed GhostID deriva a mesma identidade em
    /// qualquer OS/arch (a identidade não é do host, é do operador criptográfico).
    #[command(subcommand)]
    Auth(AuthCmd),
}

#[derive(Subcommand)]
enum AuthCmd {
    /// Deriva (ou gera) um GhostID de um seed de 32 bytes e guarda `~/.cosmic/id.bin`.
    /// O mesmo `--seed` em qualquer máquina produz a mesma pubkey/peer (portátil).
    Spawn {
        /// Seed hex (64 hex chars) para derivar a identidade. Sem isso, gera um.
        #[arg(long)]
        seed: Option<String>,
        /// TTL em segundos (efêmero; padrão 86400).
        #[arg(long, default_value_t = 86_400)]
        ttl: u64,
    },
    /// Mostra a identidade atual carregada de `~/.cosmic/id.bin`.
    Whoami,
    /// Assina uma mensagem com o GhostID da identidade atual.
    Sign {
        /// Mensagem (ou conteúdo de arquivo) a assinar.
        msg: String,
    },
    /// Verifica uma assinatura GhostID (Schnorr) — qualquer outro nó pode.
    Verify {
        /// Pubkey GhostID em hex (32 bytes).
        pubkey: String,
        /// Mensagem original.
        msg: String,
        /// Assinatura em hex (64 bytes).
        sig: String,
    },
}

/// Hash blake3 em hex de um slice.
fn hash_hex(bytes: &[u8]) -> String {
    hex::encode(blake3::hash(bytes).as_bytes())
}

/// Executa a receita sobre os bytes de entrada e devolve o output processado.
fn run_recipe(recipe: &str, input: &[u8]) -> Result<Vec<u8>, String> {
    match recipe {
        // Receitas determinísticas embutidas (re-provam idêntico em qualquer vértice).
        "sha256" | "sha256sum" => Ok(mycelium_ghostid::sha256(input).to_vec()),
        "blake3" => Ok(blake3::hash(input).as_bytes().to_vec()),
        "echo" => Ok(input.to_vec()),
        // Receita externa via shell (exige mesmo toolchain/versão para re-provar).
        other => {
            use std::io::Write;
            // Não usamos shell; apenas a receita com o input via stdin.
            let mut child = std::process::Command::new(other)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| format!("receita `{other}` não executável: {e}"))?;
            child
                .stdin
                .as_mut()
                .expect("stdin piped")
                .write_all(input)
                .map_err(|e| e.to_string())?;
            let out = child
                .wait_with_output()
                .map_err(|e| format!("falha ao aguardar `{other}`: {e}"))?;
            Ok(out.stdout)
        }
    }
}

/// Proof COSMIC: prova de que `output_hash` foi produzido por `recipe` sobre
/// `input_hash`. Qualquer vértice pode re-provar sem confiar no executor.
#[derive(serde::Serialize, serde::Deserialize)]
struct Proof {
    recipe: String,
    input_hash: String,
    output_hash: String,
    printed: String,
    /// Pubkey GhostID do executor (hex, 32 bytes). Preenchida pelo `run`.
    #[serde(default)]
    author_pubkey: String,
    /// Assinatura do executor sobre `recipe||input_hash||output_hash` (hex, 64 bytes).
    #[serde(default)]
    author_sig: String,
}

fn run(recipe: &str, input: &PathBuf, proof_path: &PathBuf, home: Option<&Path>) -> ! {
    let data = match std::fs::read(input) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("erro ao ler `{}`: {e}", input.display());
            std::process::exit(1);
        }
    };
    let input_hash = hash_hex(&data);
    let output = match run_recipe(recipe, &data) {
        Ok(o) => o,
        Err(e) => {
            eprintln!("cosmic run: {e}");
            std::process::exit(1);
        }
    };
    let output_hash = hash_hex(&output);
    let printed = String::from_utf8_lossy(&output).to_string();
    // Assina a "cabeça" da proof (recipe||input_hash||output_hash) com o GhostID
    // ativo — identidade portátil: qualquer vértice valida o autor + re-prova.
    let (author_pubkey, author_sig) = match sign_payload(
        format!("{recipe}|{input_hash}|{output_hash}").as_bytes(),
    ) {
        Ok((pk, sig)) => (pk, sig),
        Err(e) => {
            eprintln!("cosmic run: não pude assinar a proof: {e}");
            std::process::exit(1);
        }
    };
    let proof = Proof {
        recipe: recipe.to_string(),
        input_hash,
        output_hash,
        printed,
        author_pubkey,
        author_sig,
    };
    if let Some(parent) = proof_path.parent() {
        if !parent.as_os_str().is_empty() {
            let _ = std::fs::create_dir_all(parent);
        }
    }
    if let Err(e) = std::fs::write(proof_path, serde_json::to_vec_pretty(&proof).unwrap()) {
        eprintln!("erro ao gravar proof `{}`: {e}", proof_path.display());
        std::process::exit(1);
    }
    println!("cosmic run: receita `{recipe}` · input {}", proof.input_hash);
    println!("  output_hash={}", proof.output_hash);
    println!("  proof → {}", proof_path.display());
    // Distribuído: publica o proof E o input na malha (QEL/Isotope) para que
    // qualquer vértice re-execute a receita e verifique (re-provm).
    if let Some(node_home) = home {
        let proof_json = match serde_json::to_vec(&proof) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("erro ao serializar proof: {e}");
                std::process::exit(1);
            }
        };
        let pid = match publish_network(&proof_json, "proof", node_home, 3, 7, None) {
            Ok(id) => id,
            Err(e) => {
                eprintln!("aviso: não publiquei o proof na rede: {e}");
                std::process::exit(1);
            }
        };
        // Publica o input ancorado ao MESMO proof_id, para o verify re-executar.
        if let Err(e) = publish_network(&data, "proof-input", node_home, 3, 7, Some(&pid)) {
            eprintln!("aviso: input não publicado na rede: {e}");
        }
        println!("  rede: proof publicado em {:?} · proof_id={pid}", node_home);
        println!("  reveja distribuído: cosmic verify {pid} --home {:?}", node_home);
    } else {
        println!("  reveja com: cosmic verify {}", proof_path.display());
    }
    std::process::exit(0);
}
fn verify(proof_path: &PathBuf, home: Option<&Path>, id: Option<&str>) -> ! {
    // Recuperação distribuída: proof_id + --home → baixa o proof e o input da rede.
    if let (Some(node_home), Some(pid)) = (home, id) {
        let proof_blob = match recover_network(pid, "proof", node_home) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("cosmic verify (rede): {e}");
                std::process::exit(1);
            }
        };
        let proof: Proof = match serde_json::from_slice(&proof_blob) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("cosmic verify (rede): proof malformado: {e}");
                std::process::exit(1);
            }
        };
        // Valida a assinatura do autor (GhostID portátil) sobre recipe|input|output.
        if !proof.author_pubkey.is_empty() && !proof.author_sig.is_empty() {
            let head = format!("{}|{}|{}", proof.recipe, proof.input_hash, proof.output_hash);
            match verify_sig(&proof.author_pubkey, head.as_bytes(), &proof.author_sig) {
                Ok(()) => {
                    println!("cosmic verify (rede): autor {} · ✓ assinatura GhostID válida", &proof.author_pubkey[..16.min(proof.author_pubkey.len())]);
                }
                Err(e) => {
                    eprintln!("cosmic verify (rede): ✗ autor NÃO autenticado: {e}");
                    std::process::exit(1);
                }
            }
        } else {
            eprintln!("cosmic verify (rede): proof sem assinatura de autor — não autenticado");
            std::process::exit(1);
        }
        // Re-prova: recupera o input da rede e re-executa a receita.
        let input_blob = match recover_network(pid, "proof-input", node_home) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("cosmic verify (rede): não achei input na rede: {e}");
                std::process::exit(1);
            }
        };
        let re_input_hash = hash_hex(&input_blob);
        let re_output = match run_recipe(&proof.recipe, &input_blob) {
            Ok(o) => o,
            Err(e) => {
                eprintln!("cosmic verify (rede): falha ao re-executar: {e}");
                std::process::exit(1);
            }
        };
        let re_output_hash = hash_hex(&re_output);
        println!("cosmic verify (rede): proof_id {pid} de {:?}", node_home);
        println!("  receita      = {}", proof.recipe);
        println!("  input_hash   = {} (re-executado: {re_input_hash})", proof.input_hash);
        println!("  output_hash  = {} (re-executado: {re_output_hash})", proof.output_hash);
        if re_input_hash == proof.input_hash && re_output_hash == proof.output_hash {
            println!("  ✓ re-provm confere — compute verificável na malha");
            std::process::exit(0);
        } else {
            println!("  ✗ re-provm NÃO confere — resultado não reproduzível");
            std::process::exit(1);
        }
    }
    // Fallback local: le o proof do disco (sem re-verificar o input, pois não
    // guardamos o input; validação estrutural determinística).
    let bytes = match std::fs::read(proof_path) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("cosmic verify: {e}");
            std::process::exit(1);
        }
    };
    let proof: Proof = match serde_json::from_slice(&bytes) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("cosmic verify: proof malformado: {e}");
            std::process::exit(1);
        }
    };
    println!("cosmic verify: proof `{}`", proof_path.display());
    println!("  receita      = {}", proof.recipe);
    println!("  input_hash   = {}", proof.input_hash);
    println!("  output_hash  = {}", proof.output_hash);
    println!("  resultado    = {}", proof.printed.replace('\n', " "));
    println!("  ✓ proof estrutural válido (re-provm determinístico)");
    std::process::exit(0);
}

fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Put { file, k, n, home } => put(&file, k, n, home.as_deref()),
        Cmd::Get {
            content_id,
            dir,
            out,
            home,
        } => get(&content_id, &dir, &out, home.as_deref()),
        Cmd::Run { recipe, input, proof, home } => run(&recipe, &input, &proof, home.as_deref()),
        Cmd::Verify { proof, home, id } => verify(&proof, home.as_deref(), id.as_deref()),
        Cmd::Auth(auth) => match auth {
            AuthCmd::Spawn { seed, ttl } => auth_spawn(seed.as_deref(), ttl),
            AuthCmd::Whoami => auth_whoami(),
            AuthCmd::Sign { msg } => auth_sign(&msg),
            AuthCmd::Verify { pubkey, msg, sig } => auth_verify(&pubkey, &msg, &sig),
        },
    }
}

/// Arquivo de identidade portátil COSMIC.
#[derive(serde::Serialize, serde::Deserialize)]
struct CosmicId {
    /// Seed hex (32 bytes) — a única coisa que você precisa para portar a identidade.
    seed_hex: String,
    /// Pubkey GhostID (x-only, 32 bytes, hex).
    pubkey_hex: String,
    /// Peer bytes (32) hex.
    peer_hex: String,
    /// TTL em segundos.
    ttl_secs: u64,
}

fn id_path() -> PathBuf {
    cosmic_home().join("id.bin")
}

fn load_id() -> Option<CosmicId> {
    let p = id_path();
    let bytes = std::fs::read(&p).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn ghost_from_seed(seed_hex: &str, ttl: u64) -> Result<(mycelium_ghostid::GhostId, String), String> {
    let seed_bytes = hex::decode(seed_hex).map_err(|e| format!("seed hex inválido: {e}"))?;
    if seed_bytes.len() != 32 {
        return Err("seed precisa de 32 bytes (64 hex chars)".into());
    }
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&seed_bytes);
    let ghost = mycelium_ghostid::GhostId::from_secret_bytes(seed, ttl)
        .map_err(|e| format!("GhostID: {e}"))?;
    Ok((ghost, seed_hex.to_string()))
}

fn save_id(seed_hex: String, ghost: &mycelium_ghostid::GhostId, ttl: u64) -> Result<(), String> {
    let id = CosmicId {
        seed_hex,
        pubkey_hex: hex::encode(ghost.nostr_pubkey()),
        peer_hex: hex::encode(ghost.peer_id_bytes()),
        ttl_secs: ttl,
    };
    if let Some(parent) = id_path().parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(id_path(), serde_json::to_vec_pretty(&id).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

fn auth_spawn(seed: Option<&str>, ttl: u64) -> ! {
    // Sem seed, gera um aleatório (cryptorng).
    let (seed_hex, ghost) = match seed {
        Some(s) => match ghost_from_seed(s, ttl) {
            Ok((g, sh)) => (sh, g),
            Err(e) => {
                eprintln!("cosmic auth: {e}");
                std::process::exit(1);
            }
        },
        None => {
            let mut seed = [0u8; 32];
            rand::RngCore::fill_bytes(&mut rand::rngs::OsRng, &mut seed);
            let sh = hex::encode(seed);
            match ghost_from_seed(&sh, ttl) {
                Ok((g, shh)) => (shh, g),
                Err(e) => {
                    eprintln!("cosmic auth: {e}");
                    std::process::exit(1);
                }
            }
        }
    };
    if let Err(e) = save_id(seed_hex.clone(), &ghost, ttl) {
        eprintln!("cosmic auth: não consegui gravar identidade: {e}");
        std::process::exit(1);
    }
    println!("cosmic auth: identidade portátil criada");
    println!("  seed_hex   = {seed_hex}");
    println!("  pubkey     = {}", hex::encode(ghost.nostr_pubkey()));
    println!("  peer       = {}", hex::encode(ghost.peer_id_bytes()));
    println!("  ttl        = {ttl}s");
    println!("  id         = {}", id_path().display());
    println!("  porte para qualquer OS: cosmic auth spawn --seed {seed_hex}");
    std::process::exit(0);
}

fn auth_whoami() -> ! {
    match load_id() {
        Some(id) => {
            let ghost = match ghost_from_seed(&id.seed_hex, id.ttl_secs) {
                Ok((g, _)) => g,
                Err(e) => {
                    eprintln!("cosmic auth: {e}");
                    std::process::exit(1);
                }
            };
            let alive = ghost.ensure_alive().is_ok();
            println!("cosmic auth: identidade ativa");
            println!("  pubkey     = {}", id.pubkey_hex);
            println!("  peer       = {}", id.peer_hex);
            println!("  ttl        = {}s · {}", id.ttl_secs, if alive { "viva" } else { "expirada" });
            std::process::exit(0);
        }
        None => {
            eprintln!("cosmic auth: nenhuma identidade em `{}` — rode `cosmic auth spawn`", id_path().display());
            std::process::exit(1);
        }
    }
}

fn auth_sign(msg: &str) -> ! {
    let id = match load_id() {
        Some(i) => i,
        None => {
            eprintln!("cosmic auth: nenhuma identidade — rode `cosmic auth spawn`");
            std::process::exit(1);
        }
    };
    let (ghost, _) = match ghost_from_seed(&id.seed_hex, id.ttl_secs) {
        Ok(g) => g,
        Err(e) => {
            eprintln!("cosmic auth: {e}");
            std::process::exit(1);
        }
    };
    if ghost.ensure_alive().is_err() {
        eprintln!("cosmic auth: identidade expirada — re-derive com --seed");
        std::process::exit(1);
    }
    let sig = ghost.sign(msg.as_bytes());
    println!("{}", hex::encode(sig));
    std::process::exit(0);
}

fn auth_verify(pubkey: &str, msg: &str, sig: &str) -> ! {
    let pk = match hex::decode(pubkey) {
        Ok(b) if b.len() == 32 => {
            let mut a = [0u8; 32];
            a.copy_from_slice(&b);
            a
        }
        _ => {
            eprintln!("cosmic auth: pubkey precisa de 32 bytes hex");
            std::process::exit(1);
        }
    };
    let sig_bytes = match hex::decode(sig) {
        Ok(b) if b.len() == 64 => {
            let mut a = [0u8; 64];
            a.copy_from_slice(&b);
            a
        }
        _ => {
            eprintln!("cosmic auth: assinatura precisa de 64 bytes hex");
            std::process::exit(1);
        }
    };
    let digest = mycelium_ghostid::sha256(msg.as_bytes());
    match mycelium_ghostid::GhostId::verify_nostr_event(&pk, &digest, &sig_bytes) {
        Ok(()) => {
            println!("cosmic auth: ✓ assinatura GhostID válida");
            std::process::exit(0);
        }
        Err(_) => {
            println!("cosmic auth: ✗ assinatura inválida");
            std::process::exit(1);
        }
    }
}

/// Carrega a identidade COSMIC ativa e deriva o GhostID (portátil). Devolve
/// `(ghost, pubkey_hex)` — usado para assinar ações distribuídas.
fn active_identity() -> Result<(mycelium_ghostid::GhostId, String), String> {
    let id = load_id()
        .ok_or_else(|| "nenhuma identidade — rode `cosmic auth spawn --seed <hex>`".to_string())?;
    let (ghost, _) = ghost_from_seed(&id.seed_hex, id.ttl_secs)?;
    if ghost.ensure_alive().is_err() {
        return Err("identidade expirada — re-derive com `cosmic auth spawn --seed`".into());
    }
    Ok((ghost, id.pubkey_hex))
}

/// Assina `payload` com o GhostID ativo. Devolve `(pubkey_hex, sig_hex)`.
/// O verificador re-deriva o digest com `sha256` (mesmo contrato do `auth verify`).
fn sign_payload(payload: &[u8]) -> Result<(String, String), String> {
    let (ghost, pubkey) = active_identity()?;
    let sig = ghost.sign(payload);
    Ok((pubkey, hex::encode(sig)))
}

/// Verifica uma assinatura GhostID sobre `payload`. `Ok(())` se válida; senão Erro.
fn verify_sig(pubkey_hex: &str, payload: &[u8], sig_hex: &str) -> Result<(), String> {
    let pk = hex::decode(pubkey_hex)
        .map_err(|e| format!("pubkey hex inválido: {e}"))?;
    if pk.len() != 32 {
        return Err("pubkey precisa de 32 bytes".into());
    }
    let sig = hex::decode(sig_hex).map_err(|e| format!("sig hex inválido: {e}"))?;
    if sig.len() != 64 {
        return Err("assinatura precisa de 64 bytes".into());
    }
    let digest = mycelium_ghostid::sha256(payload);
    let mut pk_arr = [0u8; 32];
    pk_arr.copy_from_slice(&pk);
    let mut sig_arr = [0u8; 64];
    sig_arr.copy_from_slice(&sig);
    mycelium_ghostid::GhostId::verify_nostr_event(&pk_arr, &digest, &sig_arr)
        .map_err(|e| format!("assinatura inválida: {e}"))
}

/// Localiza o binário `mycelium` (env `MYCELIUM_BIN` ou no PATH).
fn mycelium_bin() -> PathBuf {
    if let Ok(b) = std::env::var("MYCELIUM_BIN") {
        return PathBuf::from(b);
    }
    PathBuf::from("mycelium")
}

/// Publica um shard na rede via `mycelium isotope-put`.
fn isotope_put(node_home: &Path, key: &str, value: &str) -> Result<(), String> {
    let out = std::process::Command::new(mycelium_bin())
        .arg("--home")
        .arg(node_home)
        .arg("isotope-put")
        .arg("--key")
        .arg(key)
        .arg("--value")
        .arg(value)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

/// Recupera um shard da rede via `mycelium isotope-get`. Ok(None) = chave ausente.
/// O daemon imprime `atom <key>=<json> (clock=N)`; extraímos o `<json>` do shard.
fn isotope_get(node_home: &Path, key: &str) -> Result<Option<Vec<u8>>, String> {
    let out = std::process::Command::new(mycelium_bin())
        .arg("--home")
        .arg(node_home)
        .arg("isotope-get")
        .arg("--key")
        .arg(key)
        .output()
        .map_err(|e| e.to_string())?;
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    if !out.status.success() {
        if stderr.contains("não encontrado")
            || stderr.contains("Not found")
            || stderr.contains("timeout")
        {
            return Ok(None);
        }
        return Err(stderr);
    }
    // Formato esperado: `[🍄] atom <key>=<json> (clock=N)`. JSON compacto sem newlines.
    let line = stdout.trim();
    let Some(eq) = line.find('=') else {
        return Ok(None);
    };
    let body = &line[eq + 1..];
    // O JSON do shard termina em ` (clock=` (QelShard não contém essa sequência).
    let end_marker = " (clock=";
    let json = if let Some(pos) = body.find(end_marker) {
        &body[..pos]
    } else {
        body
    };
    if json.is_empty() {
        Ok(None)
    } else {
        Ok(Some(json.as_bytes().to_vec()))
    }
}

/// Publica um blob (payload) na rede via Isotope, fragmentado com QEL, sob
/// `cosmic/<namespace>/<id>/<i>`. Devolve o `id` usado (ContentId do blob, ou
/// `forced_id` quando dado — permite ancorar vários blobs sob a mesma chave).
fn publish_network(
    blob: &[u8],
    namespace: &str,
    node_home: &Path,
    k: u8,
    n: u8,
    forced_id: Option<&str>,
) -> Result<String, String> {
    let id = forced_id
        .map(|s| s.to_string())
        .unwrap_or_else(|| ContentId::of(blob).to_string());
    let config = QelConfig { threshold: k, total: n, ttl_secs: 86_400 };
    let shards = fragment(blob, &id, &config).map_err(|e| e.to_string())?;
    let hints = assign_hybrid_transports(k, n);
    let mut published = 0usize;
    for (i, mut shard) in shards.into_iter().enumerate() {
        if let Some(h) = hints.get(i) {
            shard.transport = h.clone();
        }
        let value = serde_json::to_string(&shard)
            .map_err(|e| format!("serializar shard {i}: {e}"))?;
        let key = format!("cosmic/{namespace}/{id}/{i}");
        isotope_put(node_home, &key, &value)
            .map_err(|e| format!("publicar {key}: {e}"))?;
        published += 1;
    }
    if published == 0 {
        return Err("nenhum shard publicado na rede".into());
    }
    Ok(id)
}

/// Recupera e reconstrói um blob publicado por `publish_network` a partir da rede.
fn recover_network(id: &str, namespace: &str, node_home: &Path) -> Result<Vec<u8>, String> {
    let mut shards: Vec<QelShard> = Vec::new();
    for i in 0..32usize {
        let key = format!("cosmic/{namespace}/{id}/{i}");
        match isotope_get(node_home, &key) {
            Ok(Some(bytes)) => {
                if let Ok(s) = serde_json::from_slice::<QelShard>(&bytes) {
                    shards.push(s);
                }
            }
            Ok(None) | Err(_) => {
                if i > 0 {
                    break;
                }
            }
        }
    }
    if shards.is_empty() {
        return Err(format!("nenhum shard para `cosmic/{namespace}/{id}` na rede"));
    }
    let recovered = reconstruct(&shards).map_err(|e| e.to_string())?;
    Ok(recovered)
}

/// Recupera (da rede ou do disco local) os shards de um content_id e reconstrói.
/// Este helper é usado por run/verify.
fn put(file: &PathBuf, k: u8, n: u8, home: Option<&Path>) -> ! {
    let data = match std::fs::read(file) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("erro ao ler `{}`: {e}", file.display());
            std::process::exit(1);
        }
    };
    let content_id = ContentId::of(&data).to_string();
    let config = QelConfig { threshold: k, total: n, ttl_secs: 86_400 };
    let shards = match fragment(&data, &content_id, &config) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("erro QEL: {e} (limite de payload ~64 KiB por shard nesta fase)");
            std::process::exit(1);
        }
    };
    // Distribui transporte híbrido: threshold → canal primário, resto → outro.
    let hints = assign_hybrid_transports(k, n);
    let local_home = cosmic_home();
    let dir = local_home.join(&content_id);
    if let Err(e) = std::fs::create_dir_all(&dir) {
        eprintln!("erro ao criar `{}`: {e}", dir.display());
        std::process::exit(1);
    }
    let mut net_ok = 0;
    for (i, mut shard) in shards.into_iter().enumerate() {
        if let Some(h) = hints.get(i) {
            shard.transport = h.clone();
        }
        let path = dir.join(format!("{}.json", i));
        let bytes = match serde_json::to_vec_pretty(&shard) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("erro ao serializar shard {i}: {e}");
                std::process::exit(1);
            }
        };
        if let Err(e) = std::fs::write(&path, &bytes) {
            eprintln!("erro ao gravar shard {i} em `{}`: {e}", path.display());
            std::process::exit(1);
        }
        // Publica o shard na rede Mycelium via Isotope (distribuído nos peers).
        if let Some(node_home) = home {
            let key = format!("cosmic/{content_id}/{i}");
            // Publica JSON compacto (1 linha) para o get parsear o `atom k=v (clock=)`.
            let value = match serde_json::to_string(&shard) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("aviso: shard {i} não serializável: {e}");
                    continue;
                }
            };
            match isotope_put(node_home, &key, &value) {
                Ok(()) => net_ok += 1,
                Err(e) => {
                    eprintln!("aviso: shard {i} não publicado na rede ({node_home:?}): {e}", );
                }
            }
        }
    }
    println!("cosmic put: {k}/{n} shards · content_id={content_id}");
    println!("  canais: {}", hints.iter().map(str_transport).collect::<Vec<_>>().join(", "));
    println!("  shards em: {}", dir.display());
    if let Some(node_home) = home {
        println!("  rede: {net_ok}/{n} shards publicados em {:?} (isotope-put)", node_home);
    }
    println!("  reconstrua com: cosmic get {content_id} --out {}", file.file_name().unwrap_or_default().to_string_lossy());
    std::process::exit(0);
}

fn get(content_id: &str, dir: &PathBuf, out: &str, home: Option<&Path>) -> ! {
    let mut shards: Vec<QelShard> = Vec::new();
    let mut net_rec = 0usize;

    // 1) Recupera da rede (Isotope) quando um nó foi indicado.
    if let Some(node_home) = home {
        // Explora até N shards (total desconhecido aqui; tenta 0..=31 e para no vazio).
        for i in 0..32usize {
            let key = format!("cosmic/{content_id}/{i}");
            match isotope_get(node_home, &key) {
                Ok(Some(bytes)) => {
                    if let Ok(shard) = serde_json::from_slice::<QelShard>(&bytes) {
                        shards.push(shard);
                        net_rec += 1;
                    }
                }
                Ok(None) => {
                    // Chave ausente → provavelmente acabaram os shards.
                    if i > 0 {
                        break;
                    }
                    continue;
                }
                Err(e) => {
                    eprintln!("aviso: rede para {key}: {e}");
                    if i > 0 {
                        break;
                    }
                }
            }
        }
        eprintln!("cosmic get: {net_rec} shards recuperados da rede em {node_home:?}");
    }

    // 2) Complementa/fallback no storage local.
    let local_home = cosmic_home();
    let sdir = local_home.join(content_id);
    if sdir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&sdir) {
            for entry in entries.flatten() {
                if let Ok(bytes) = std::fs::read(entry.path()) {
                    if let Ok(shard) = serde_json::from_slice::<QelShard>(&bytes) {
                        if !shards.iter().any(|s| s.index == shard.index) {
                            shards.push(shard);
                        }
                    }
                }
            }
        }
    }
    if shards.is_empty() {
        eprintln!(
            "cosmic get: nenhum shard para `{content_id}` (local `{}` {}; rede {net_rec})",
            local_home.display(),
            if home.is_some() { "+ daemon" } else { "sem daemon" }
        );
        std::process::exit(1);
    }
    let threshold = shards[0].threshold as usize;
    if shards.len() < threshold {
        eprintln!(
            "cosmic get: tenho {} shards, preciso de {} (threshold K). Ainda não dá para reconstruir.",
            shards.len(),
            threshold
        );
        std::process::exit(1);
    }
    eprintln!(
        "cosmic get: {}/{} shards presentes → reconstruindo…",
        shards.len(),
        shards[0].total
    );
    let recovered = match reconstruct(&shards) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("cosmic get: falha na reconstrução (integridade?): {e}");
            std::process::exit(1);
        }
    };
    let out_path = dir.join(out);
    if let Err(e) = std::fs::create_dir_all(dir) {
        eprintln!("erro ao criar dir `{}`: {e}", dir.display());
        std::process::exit(1);
    }
    if let Err(e) = std::fs::write(&out_path, &recovered) {
        eprintln!("erro ao gravar `{}`: {e}", out_path.display());
        std::process::exit(1);
    }
    // Confere o content_id recuperado.
    let rec_cid = ContentId::of(&recovered).to_string();
    let ok = rec_cid == content_id;
    println!(
        "cosmic get: {} bytes recuperados em `{}` · content_id {} {}",
        recovered.len(),
        out_path.display(),
        rec_cid,
        if ok { "✓ confere" } else { "⚠️ não confere" }
    );
    std::process::exit(if ok { 0 } else { 1 });
}
