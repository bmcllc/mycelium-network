use anyhow::Result;
use clap::{Parser, Subcommand};
use void_runner::{MapReduceJob, VoidTask, VoidVpsNode};

#[derive(Parser)]
#[command(name = "void-runner", about = "VOID-VPS — executor ANIMUS local")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Executa função WASM simples (ex: calculate_pi)
    Run {
        wasm: String,
        #[arg(long, default_value = "calculate_pi")]
        func: String,
        #[arg(long, default_value = "1000000")]
        iterations: u32,
    },
    /// MapReduce local com N shards
    MapReduce {
        wasm: String,
        #[arg(long, default_value = "calculate_pi")]
        func: String,
        #[arg(long, default_value = "1000000")]
        iterations: u64,
        #[arg(long, default_value = "4")]
        shards: usize,
    },
    /// Publica WASM na EcoNet e executa via URI
    Submit {
        wasm: String,
        #[arg(long, default_value = "calculate_pi")]
        func: String,
        #[arg(long, default_value = "1000000")]
        iterations: u64,
    },
    /// Lista exports de um módulo WASM
    Inspect { wasm: String },
    /// Testa leibniz_partial(start, count)
    TestLeibniz {
        wasm: String,
        start: i32,
        count: i32,
    },
    /// Contração tensorial LUSUS-Q (JSON via --input ou stdin)
    TensorContract {
        #[arg(long)]
        input: Option<String>,
    },
}

fn host_entropy_from_env() -> Vec<u8> {
    if let Ok(hex) = std::env::var("VOID_HOST_ENTROPY_HEX") {
        if let Ok(bytes) = hex::decode(hex.trim()) {
            if !bytes.is_empty() {
                return bytes;
            }
        }
    }
    blake3::hash(b"animus-host-entropy").as_bytes().to_vec()
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let entropy = host_entropy_from_env();
    let mut node = VoidVpsNode::new("animus-local", "ghost-dev", entropy.clone());

    match cli.command {
        Commands::Run { wasm, func, iterations } => {
            let uri = node.publish_wasm(&std::fs::read(&wasm)?);
            let result = node.submit_task(&VoidTask {
                wasm_uri: uri,
                func_name: func,
                input: serde_json::json!({ "iterations": iterations }),
                parallel_shards: 1,
                preferred_region: None,
            })?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Commands::MapReduce { wasm, func, iterations, shards } => {
            let bytes = std::fs::read(&wasm)?;
            let job = MapReduceJob {
                job_id: "cli-mr".into(),
                func_name: func,
                input: serde_json::json!({ "iterations": iterations }),
                shard_count: shards,
            };
            let mr = void_runner::run_local_mapreduce(&bytes, &entropy, &job)?;
            println!("{}", serde_json::to_string_pretty(&mr)?);
        }
        Commands::Submit { wasm, func, iterations } => {
            let uri = node.publish_wasm(&std::fs::read(&wasm)?);
            println!("Publicado: {}", uri);
            let result = node.submit_task(&VoidTask {
                wasm_uri: uri.clone(),
                func_name: func,
                input: serde_json::json!({ "iterations": iterations }),
                parallel_shards: 1,
                preferred_region: Some("BR".into()),
            })?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Commands::Inspect { wasm } => {
            let w = void_runner::WasmWorker::from_file(std::path::Path::new(&wasm))?;
            println!("Exports: {:?}", w.list_exports());
        }
        Commands::TestLeibniz { wasm, start, count } => {
            let w = void_runner::WasmWorker::from_file(std::path::Path::new(&wasm))?;
            let r = w.execute_i32_i32_i64("leibniz_partial", start, count)?;
            println!("leibniz_partial({}, {}) = {}", start, count, r);
        }
        Commands::TensorContract { input } => {
            let json = match input {
                Some(path) => std::fs::read_to_string(path)?,
                None => {
                    use std::io::Read;
                    let mut buf = String::new();
                    std::io::stdin().read_to_string(&mut buf)?;
                    buf
                }
            };
            let req: void_runner::TensorContractRequest = serde_json::from_str(&json)?;
            let result = void_runner::run_tensor_contract(req)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
    }

    Ok(())
}
