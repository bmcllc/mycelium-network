#!/usr/bin/env bash
# Gate reproduzível para preparar uma release pública do Mycelium.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

command -v cargo >/dev/null || {
  echo "cargo não encontrado; instale Rust 1.88+ com rustup." >&2
  exit 1
}

required=(README.md LICENSE docs/release-0.1.0.md deploy/Dockerfile deploy/mycelium-seed.service)
for path in "${required[@]}"; do
  [[ -f "$path" ]] || { echo "arquivo obrigatório ausente: $path" >&2; exit 1; }
done

cargo fmt --all -- --check
cargo build --locked --release -p mycelium-cli
cargo test --locked --workspace
cargo clippy --locked --workspace --all-targets -- -D warnings
./target/release/mycelium --help >/dev/null

echo "release gate aprovado: Mycelium 0.1.0"
