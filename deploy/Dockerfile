# Dockerfile — nó Mycelium (daemon) para deploy via docker-compose.
#
# Build multi-stage a partir do workspace. Produção recomenda `cargo build --release`.
# Uso: na raiz do repo:
#   docker build -f deploy/Dockerfile -t mycelium-node:latest .
#   docker compose -f deploy/prometheus/docker-compose.yml up

FROM rust:1.82-slim-bookworm AS builder
WORKDIR /src

# Cache de deps por ordem (workspace.lock estável).
COPY Cargo.toml Cargo.lock ./
# Copia crates mínimas para permitir cargo resolver antes do source completo.
COPY crates ./crates
COPY cli ./cli
ENV CARGO_NET_OFFLINE=true
ENV CARGO_TARGET_DIR=/src/target
# Build da toolchain: usa rustup default.
RUN apt-get update && apt-get install -y --no-install-recommends libssl-dev pkg-config git ca-certificates \
    && rustup component add clippy rustfmt 2>/dev/null || true \
    && cargo build --release -p mycelium-node 2>&1 | tail -5

# Segunda fase: runtime enxuto.
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates iproute2 curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /home/mycelium
COPY --from=builder /src/target/release/mycelium /usr/local/bin/mycelium
EXPOSE 4001 7474
VOLUME ["/home/mycelium"]
ENTRYPOINT ["/usr/local/bin/mycelium"]
