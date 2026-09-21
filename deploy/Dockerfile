# Dockerfile — nó Mycelium (daemon) para deploy via docker-compose.
#
# Build multi-stage a partir do workspace. Produção recomenda `cargo build --release`.
# Uso: na raiz do repo:
#   docker build -f deploy/Dockerfile -t mycelium-node:latest .
#   docker compose -f deploy/prometheus/docker-compose.yml up

FROM rust:1.88-slim-bookworm AS builder
WORKDIR /src

# O workspace precisa estar completo para que o Cargo consiga resolver todos os
# membros declarados no manifesto raiz.
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY cli ./cli
COPY platforms ./platforms
ENV CARGO_TARGET_DIR=/src/target
# Compila o binário público, não apenas a biblioteca do daemon.
RUN apt-get update && apt-get install -y --no-install-recommends libssl-dev pkg-config git ca-certificates \
    && rustup component add clippy rustfmt 2>/dev/null || true \
    && cargo build --locked --release -p mycelium-cli \
    && strip /src/target/release/mycelium \
    && rm -rf /var/lib/apt/lists/*

# Segunda fase: runtime enxuto.
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates iproute2 curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /home/mycelium
COPY --from=builder /src/target/release/mycelium /usr/local/bin/mycelium
EXPOSE 4001 7474
VOLUME ["/home/mycelium"]
ENTRYPOINT ["/usr/local/bin/mycelium"]
