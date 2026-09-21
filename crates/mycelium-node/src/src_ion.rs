//! # Src Ion — Browser de código soberano (repos do SporeBank via HTTP)
//!
//! Serve as árvores de código publicadas como Plots multi-leaf no SporeBank,
//! expostas como ion `src` no Singularity Event Horizon — um "GitHub" próprio,
//! content-addressed (blake3) e servido pelo próprio nó.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use giggs::Plot;
use mycelium_core::ContentId;
use serde_json::Value;
use std::path::{Path as FsPath, PathBuf};

#[derive(Clone)]
pub struct SrcState {
    pub home: PathBuf,
}

pub fn create_src_router(home: impl AsRef<FsPath>) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/{cid}", get(list))
        .route("/{cid}/{*path}", get(file))
        .with_state(SrcState {
            home: home.as_ref().to_path_buf(),
        })
}

fn plots_dir(home: &FsPath) -> PathBuf {
    home.join("sporebank").join("plots")
}

fn read_public_plot(home: &FsPath, cid: &str) -> Option<Plot> {
    let id = cid.parse::<ContentId>().ok()?;
    let path = plots_dir(home).join(format!("{}.json", hex::encode(id.0)));
    let bytes = std::fs::read(&path).ok()?;
    let plot: Plot = serde_json::from_slice(&bytes).ok()?;
    plot.is_public().then_some(plot)
}

fn cids(home: &FsPath) -> Vec<String> {
    let mut out: Vec<String> = std::fs::read_dir(plots_dir(home))
        .map(|entries| {
            entries
                .flatten()
                .filter_map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    name.strip_suffix(".json").map(|s| s.to_string())
                })
                .collect()
        })
        .unwrap_or_default();
    out.sort();
    out
}

async fn index(State(state): State<SrcState>) -> impl IntoResponse {
    let entries: Vec<Value> = cids(&state.home)
        .iter()
        .filter_map(|cid| {
            let plot = read_public_plot(&state.home, cid)?;
            Some(serde_json::json!({
                "cid": cid,
                "message": plot.message,
                "leaves": plot.leaves.len(),
                "author": plot.author.to_string(),
                "url": format!("/src/{cid}"),
            }))
        })
        .collect();
    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "application/json; charset=utf-8")],
        serde_json::json!({ "ion": "src", "substrate": "mycelium", "repos": entries }).to_string(),
    )
}

async fn list(State(state): State<SrcState>, Path(cid): Path<String>) -> impl IntoResponse {
    match read_public_plot(&state.home, &cid) {
        Some(plot) => {
            let files: Vec<Value> = plot
                .leaves
                .iter()
                .map(|leaf| {
                    serde_json::json!({
                        "path": leaf.path,
                        "size": leaf.content.len(),
                        "url": format!("/src/{cid}/{}", leaf.path),
                    })
                })
                .collect();
            (
                StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, "application/json; charset=utf-8")],
                serde_json::json!({
                    "cid": cid,
                    "message": plot.message,
                    "files": files,
                })
                .to_string(),
            )
        }
        None => (
            StatusCode::NOT_FOUND,
            [(axum::http::header::CONTENT_TYPE, "application/json; charset=utf-8")],
            serde_json::json!({ "error": format!("repo {cid} não encontrado no SporeBank local") })
                .to_string(),
        ),
    }
}

async fn file(
    State(state): State<SrcState>,
    Path((cid, path)): Path<(String, String)>,
) -> impl IntoResponse {
    match read_public_plot(&state.home, &cid) {
        Some(plot) => {
            match plot
                .leaves
                .iter()
                .find(|leaf| leaf.path == path)
            {
                Some(leaf) => {
                    let mime = mime_for(&path);
                    (
                        StatusCode::OK,
                        [
                            (axum::http::header::CONTENT_TYPE, mime),
                            (axum::http::header::CACHE_CONTROL, "public, max-age=31536000"),
                        ],
                        leaf.content.clone(),
                    )
                }
                None => (
                    StatusCode::NOT_FOUND,
                    [
                        (axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8"),
                        (axum::http::header::CACHE_CONTROL, "no-store"),
                    ],
                    format!("arquivo não encontrado no repo: {path}").into_bytes(),
                ),
            }
        }
        None => (
            StatusCode::NOT_FOUND,
            [
                (axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8"),
                (axum::http::header::CACHE_CONTROL, "no-store"),
            ],
            format!("repo {cid} não encontrado no SporeBank local").into_bytes(),
        ),
    }
}

fn mime_for(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if lower.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if lower.ends_with(".js") || lower.ends_with(".mjs") {
        "application/javascript; charset=utf-8"
    } else if lower.ends_with(".json") {
        "application/json; charset=utf-8"
    } else if lower.ends_with(".rs") || lower.ends_with(".toml") || lower.ends_with(".md")
        || lower.ends_with(".sh") || lower.ends_with(".svg") || lower.ends_with(".txt")
        || lower.ends_with(".yaml") || lower.ends_with(".yml") {
        "text/plain; charset=utf-8"
    } else {
        "application/octet-stream"
    }
}

#[cfg(test)]
mod tests {
    use super::{plots_dir, read_public_plot};
    use giggs::Plot;
    use mycelium_core::NodeId;

    fn store_plot(home: &std::path::Path, plot: &Plot) -> String {
        let id = plot.id().expect("plot válido");
        let cid = id.to_string();
        std::fs::create_dir_all(plots_dir(home)).expect("diretório de teste");
        std::fs::write(
            plots_dir(home).join(format!("{}.json", hex::encode(id.0))),
            serde_json::to_vec(plot).expect("serialização de teste"),
        )
        .expect("gravação de teste");
        cid
    }

    fn plot(message: &str) -> Plot {
        Plot {
            author: NodeId::derive(b"src-ion-test"),
            message: message.into(),
            parents: vec![],
            leaves: vec![],
        }
    }

    #[test]
    fn src_ion_exposes_only_public_plots() {
        let home = tempfile::tempdir().expect("home temporário");
        let public_cid = store_plot(home.path(), &plot("[public] repo"));
        let private_cid = store_plot(home.path(), &plot("[private] repo"));

        assert!(read_public_plot(home.path(), &public_cid).is_some());
        assert!(read_public_plot(home.path(), &private_cid).is_none());
    }

    #[test]
    fn src_ion_rejects_malformed_cids_before_filesystem_access() {
        let home = tempfile::tempdir().expect("home temporário");
        assert!(read_public_plot(home.path(), "../../segredo").is_none());
        assert!(read_public_plot(home.path(), "not-a-content-id").is_none());
    }

    #[test]
    fn src_ion_fails_closed_for_corrupt_plot_data() {
        let home = tempfile::tempdir().expect("home temporário");
        let cid = "a".repeat(64);
        std::fs::create_dir_all(plots_dir(home.path())).expect("diretório de teste");
        std::fs::write(plots_dir(home.path()).join(format!("{cid}.json")), b"not json")
            .expect("gravação de teste");
        assert!(read_public_plot(home.path(), &cid).is_none());
    }
}
